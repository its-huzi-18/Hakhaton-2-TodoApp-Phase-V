// Event consumer for Task events in Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');
const Reminder = require('../../../shared/models/reminder');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class TaskEventConsumer {
  constructor(reminderService) {
    this.client = new DaprClient();
    this.reminderService = reminderService;
    this.pubsubName = 'task-pubsub';
  }

  // Subscribe to TaskCreated events
  async subscribeToTaskCreated() {
    try {
      await this.client.binding.subscribe('task-created', async (data) => {
        await this.handleTaskCreated(data);
      });
      console.log('Subscribed to TaskCreated events');
    } catch (error) {
      console.error('Failed to subscribe to TaskCreated events:', error);
      throw error;
    }
  }

  // Subscribe to TaskUpdated events
  async subscribeToTaskUpdated() {
    try {
      await this.client.binding.subscribe('task-updated', async (data) => {
        await this.handleTaskUpdated(data);
      });
      console.log('Subscribed to TaskUpdated events');
    } catch (error) {
      console.error('Failed to subscribe to TaskUpdated events:', error);
      throw error;
    }
  }

  // Subscribe to TaskCompleted events
  async subscribeToTaskCompleted() {
    try {
      await this.client.binding.subscribe('task-completed', async (data) => {
        await this.handleTaskCompleted(data);
      });
      console.log('Subscribed to TaskCompleted events');
    } catch (error) {
      console.error('Failed to subscribe to TaskCompleted events:', error);
      throw error;
    }
  }

  // Subscribe to TaskDeleted events
  async subscribeToTaskDeleted() {
    try {
      await this.client.binding.subscribe('task-deleted', async (data) => {
        await this.handleTaskDeleted(data);
      });
      console.log('Subscribed to TaskDeleted events');
    } catch (error) {
      console.error('Failed to subscribe to TaskDeleted events:', error);
      throw error;
    }
  }

  // Handle TaskCreated event
  async handleTaskCreated(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskCreated event', { eventData });

      // Check if the task has a due date to schedule a reminder
      if (eventData.dueDate) {
        // Create a reminder for the task's due date
        const reminder = new Reminder({
          taskId: eventData.taskId,
          userId: eventData.userId,
          scheduledTime: new Date(eventData.dueDate)
        });

        const validation = reminder.validate();
        if (!validation.isValid) {
          logWithContext(correlationId, 'Reminder validation failed', { errors: validation.errors });
          return;
        }

        // Store the reminder in the reminder service
        this.reminderService.reminders.set(reminder.id, reminder);
        logWithContext(correlationId, 'Reminder scheduled for task', { 
          taskId: eventData.taskId, 
          reminderId: reminder.id 
        });

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
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskCreated event', { error: error.message });
      throw error;
    }
  }

  // Handle TaskUpdated event
  async handleTaskUpdated(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskUpdated event', { eventData });

      // Check if the due date was updated
      if (eventData.updates && eventData.updates.dueDate) {
        // Find existing reminder for this task
        const existingReminders = Array.from(this.reminderService.reminders.values())
          .filter(r => r.taskId === eventData.taskId);

        for (const reminder of existingReminders) {
          // Cancel the old reminder if it hasn't been delivered yet
          if (reminder.deliveryStatus === 'scheduled') {
            reminder.update({ deliveryStatus: 'cancelled' });
            this.reminderService.reminders.set(reminder.id, reminder);

            logWithContext(correlationId, 'Old reminder cancelled due to task update', { 
              reminderId: reminder.id 
            });
          }
        }

        // Create a new reminder with the updated due date
        const newReminder = new Reminder({
          taskId: eventData.taskId,
          userId: eventData.userId,
          scheduledTime: new Date(eventData.updates.dueDate.new)
        });

        const validation = newReminder.validate();
        if (!validation.isValid) {
          logWithContext(correlationId, 'New reminder validation failed', { errors: validation.errors });
          return;
        }

        this.reminderService.reminders.set(newReminder.id, newReminder);
        logWithContext(correlationId, 'New reminder scheduled for updated task', { 
          taskId: eventData.taskId, 
          reminderId: newReminder.id 
        });

        // Publish ReminderScheduled event
        await this.reminderService.publishEvent('reminder-events', {
          eventType: 'ReminderScheduled',
          reminderId: newReminder.id,
          taskId: newReminder.taskId,
          userId: newReminder.userId,
          scheduledTime: newReminder.scheduledTime.toISOString(),
          timestamp: new Date().toISOString(),
          correlationId
        });
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskUpdated event', { error: error.message });
      throw error;
    }
  }

  // Handle TaskCompleted event
  async handleTaskCompleted(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskCompleted event', { eventData });

      // Find reminders for this task that are still scheduled
      const scheduledReminders = Array.from(this.reminderService.reminders.values())
        .filter(r => r.taskId === eventData.taskId && r.deliveryStatus === 'scheduled');

      for (const reminder of scheduledReminders) {
        // Mark the reminder as delivered since the task is completed
        reminder.markAsDelivered();
        this.reminderService.reminders.set(reminder.id, reminder);

        logWithContext(correlationId, 'Reminder marked as delivered for completed task', { 
          reminderId: reminder.id, 
          taskId: eventData.taskId 
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
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskCompleted event', { error: error.message });
      throw error;
    }
  }

  // Handle TaskDeleted event
  async handleTaskDeleted(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskDeleted event', { eventData });

      // Find and cancel all reminders for this task
      const taskReminders = Array.from(this.reminderService.reminders.values())
        .filter(r => r.taskId === eventData.taskId);

      for (const reminder of taskReminders) {
        // Update reminder status to cancelled
        reminder.update({ deliveryStatus: 'cancelled' });
        this.reminderService.reminders.set(reminder.id, reminder);

        logWithContext(correlationId, 'Reminder cancelled due to task deletion', { 
          reminderId: reminder.id, 
          taskId: eventData.taskId 
        });
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskDeleted event', { error: error.message });
      throw error;
    }
  }

  // Initialize all subscriptions
  async initialize() {
    await this.subscribeToTaskCreated();
    await this.subscribeToTaskUpdated();
    await this.subscribeToTaskCompleted();
    await this.subscribeToTaskDeleted();
    
    console.log('All task event subscriptions initialized');
  }

  // Close the Dapr client connection
  async close() {
    await this.client.stop();
  }
}

module.exports = TaskEventConsumer;