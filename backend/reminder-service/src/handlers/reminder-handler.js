// Reminder delivery logic for Advanced Cloud Deployment

const Reminder = require('../../../shared/models/reminder');
const Notification = require('../../../shared/models/notification');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class ReminderHandler {
  constructor(reminderService, notificationService) {
    this.reminderService = reminderService;
    this.notificationService = notificationService;
    this.processingQueue = []; // Queue for reminders to be processed
  }

  // Process all scheduled reminders that are ready for delivery
  async processReadyReminders() {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Starting reminder processing cycle');

      // Get all reminders that are scheduled and ready for delivery
      const readyReminders = this.reminderService.getReadyForDeliveryReminders();

      logWithContext(correlationId, `Found ${readyReminders.length} reminders ready for delivery`);

      for (const reminder of readyReminders) {
        await this.processReminder(reminder, correlationId);
      }

      return readyReminders.length;
    } catch (error) {
      logWithContext(correlationId, 'Error in reminder processing cycle', { error: error.message });
      throw error;
    }
  }

  // Process a single reminder
  async processReminder(reminder, correlationId) {
    try {
      logWithContext(correlationId, 'Processing reminder', {
        reminderId: reminder.id,
        taskId: reminder.taskId,
        userId: reminder.userId
      });

      // Check if reminder is still scheduled (not already processed)
      if (reminder.deliveryStatus !== 'scheduled') {
        logWithContext(correlationId, 'Reminder is not in scheduled state, skipping', {
          reminderId: reminder.id,
          status: reminder.deliveryStatus
        });
        return;
      }

      // Create a notification for the reminder
      const notification = new Notification({
        taskId: reminder.taskId,
        userId: reminder.userId,
        reminderId: reminder.id,
        type: 'reminder',
        content: `Reminder: Task "${this.getTaskTitle(reminder.taskId) || 'Untitled'}" is due now`,
        channel: this.getUserPreferredChannel(reminder.userId) // Get user's preferred channel
      });

      const validation = notification.validate();
      if (!validation.isValid) {
        logWithContext(correlationId, 'Notification validation failed', { errors: validation.errors });
        // Still mark reminder as delivered even if notification creation failed
        reminder.markAsDelivered();
        this.reminderService.reminders.set(reminder.id, reminder);
        return;
      }

      // Store the notification
      this.notificationService.notifications.set(notification.id, notification);

      // Send the notification
      await this.notificationService.sendNotification(notification, correlationId);

      // Mark the reminder as delivered
      reminder.markAsDelivered();
      this.reminderService.reminders.set(reminder.id, reminder);

      logWithContext(correlationId, 'Reminder processed and delivered', {
        reminderId: reminder.id,
        notificationId: notification.id
      });

      // Publish ReminderDelivered event
      await this.reminderService.publishEvent('reminder-events', {
        eventType: 'ReminderDelivered',
        reminderId: reminder.id,
        taskId: reminder.taskId,
        userId: reminder.userId,
        deliveredAt: reminder.deliveredAt.toISOString(),
        timestamp: new Date().toISOString(),
        correlationId
      });

      // Publish NotificationSent event
      await this.notificationService.publishEvent('notification-events', {
        eventType: 'NotificationSent',
        notificationId: notification.id,
        taskId: notification.taskId,
        userId: notification.userId,
        channel: notification.channel,
        timestamp: new Date().toISOString(),
        correlationId
      });
    } catch (error) {
      logWithContext(correlationId, 'Error processing reminder', {
        reminderId: reminder.id,
        error: error.message
      });

      // Increment delivery attempt counter
      reminder.incrementDeliveryAttempt();
      this.reminderService.reminders.set(reminder.id, reminder);

      // If too many attempts, mark as failed
      if (reminder.deliveryAttempts >= 3) {
        reminder.markAsFailed();
        this.reminderService.reminders.set(reminder.id, reminder);

        logWithContext(correlationId, 'Reminder marked as failed after multiple attempts', {
          reminderId: reminder.id,
          attempts: reminder.deliveryAttempts
        });
      }
    }
  }

  // Get task title by ID (in a real implementation, this would fetch from task service)
  getTaskTitle(taskId) {
    // In a real implementation, this would call the task service to get the task details
    // For now, we'll return a placeholder
    return `Task ${taskId}`;
  }

  // Get user's preferred notification channel (in a real implementation, this would fetch from user preferences)
  getUserPreferredChannel(userId) {
    // In a real implementation, this would fetch user preferences from a user service
    // For now, default to email
    return 'email';
  }

  // Schedule a reminder for future delivery
  async scheduleReminder(reminder) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Scheduling reminder', {
        reminderId: reminder.id,
        taskId: reminder.taskId,
        scheduledTime: reminder.scheduledTime
      });

      // Store the reminder in the service
      this.reminderService.reminders.set(reminder.id, reminder);

      // Publish ReminderScheduled event
      await this.reminderService.publishEvent('reminder-events', {
        eventType: 'ReminderScheduled',
        reminderId: reminder.id,
        taskId: reminder.taskId,
        userId: reminder.userId,
        scheduledTime: reminder.scheduledTime.toISOString(),
        timestamp: new Date().toISOString(),
        correlationId
      });

      logWithContext(correlationId, 'Reminder scheduled successfully', { reminderId: reminder.id });
    } catch (error) {
      logWithContext(correlationId, 'Error scheduling reminder', { error: error.message });
      throw error;
    }
  }

  // Cancel a scheduled reminder
  async cancelReminder(reminderId) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Cancelling reminder', { reminderId });

      const reminder = this.reminderService.reminders.get(reminderId);
      if (!reminder) {
        throw new Error(`Reminder with ID ${reminderId} not found`);
      }

      // Update reminder status to cancelled
      reminder.update({ deliveryStatus: 'cancelled' });
      this.reminderService.reminders.set(reminderId, reminder);

      logWithContext(correlationId, 'Reminder cancelled successfully', { reminderId });
    } catch (error) {
      logWithContext(correlationId, 'Error cancelling reminder', { error: error.message });
      throw error;
    }
  }

  // Process overdue reminders
  async processOverdueReminders() {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing overdue reminders');

      const overdueReminders = this.reminderService.getOverdueReminders();

      for (const reminder of overdueReminders) {
        // For overdue reminders, we treat them as delivered to avoid repeated processing
        if (reminder.deliveryStatus === 'scheduled') {
          reminder.markAsDelivered();
          this.reminderService.reminders.set(reminder.id, reminder);

          logWithContext(correlationId, 'Overdue reminder marked as delivered', {
            reminderId: reminder.id
          });

          // Publish ReminderDelivered event
          await this.reminderService.publishEvent('reminder-events', {
            eventType: 'ReminderDelivered',
            reminderId: reminder.id,
            taskId: reminder.taskId,
            userId: reminder.userId,
            deliveredAt: reminder.deliveredAt.toISOString(),
            timestamp: new Date().toISOString(),
            correlationId
          });
        }
      }

      return overdueReminders.length;
    } catch (error) {
      logWithContext(correlationId, 'Error processing overdue reminders', { error: error.message });
      throw error;
    }
  }

  // Get reminders by user
  getRemindersByUser(userId) {
    return this.reminderService.getRemindersByUserId(userId);
  }

  // Get reminders by task
  getRemindersByTask(taskId) {
    return this.reminderService.getRemindersByTaskId(taskId);
  }

  // Get upcoming reminders for a user (within next 24 hours)
  getUpcomingReminders(userId) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return Array.from(this.reminderService.reminders.values())
      .filter(reminder => 
        reminder.userId === userId &&
        reminder.deliveryStatus === 'scheduled' &&
        reminder.scheduledTime >= now &&
        reminder.scheduledTime <= tomorrow
      );
  }

  // Initialize the reminder handler
  async initialize() {
    console.log('Reminder Handler initialized');
  }
}

module.exports = ReminderHandler;