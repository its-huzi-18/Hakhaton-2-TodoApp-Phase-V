// Reminder scheduler using Dapr Jobs API for Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');
const Reminder = require('../../../shared/models/reminder');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class ReminderScheduler {
  constructor(reminderService) {
    this.client = new DaprClient();
    this.reminderService = reminderService;
    this.jobComponent = 'dapr-jobs'; // This would be configured in Dapr
  }

  // Schedule a reminder using Dapr Jobs API
  async scheduleReminder(reminder) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Scheduling reminder', { 
        reminderId: reminder.id, 
        taskId: reminder.taskId, 
        scheduledTime: reminder.scheduledTime 
      });

      // Prepare job data
      const jobData = {
        reminderId: reminder.id,
        taskId: reminder.taskId,
        userId: reminder.userId,
        scheduledTime: reminder.scheduledTime.toISOString(),
        correlationId
      };

      // Create a Dapr job to trigger at the scheduled time
      const jobName = `reminder-${reminder.id}`;
      const jobPayload = {
        name: jobName,
        schedule: this.convertToCronExpression(reminder.scheduledTime),
        target: {
          type: 'service',
          name: 'notification-service',
          method: 'trigger-reminder'
        },
        data: jobData,
        retries: 3,
        ttl: '24h' // Job expires after 24 hours if not executed
      };

      // Submit the job to Dapr
      await this.client.job.submit(jobPayload);
      
      logWithContext(correlationId, 'Reminder job submitted to Dapr', { jobName });
      
      // Update reminder status to indicate it's scheduled
      reminder.update({ deliveryStatus: 'scheduled' });
      this.reminderService.reminders.set(reminder.id, reminder);

      return true;
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

      // Cancel the Dapr job
      const jobName = `reminder-${reminderId}`;
      await this.client.job.cancel(jobName);

      logWithContext(correlationId, 'Reminder cancelled successfully', { jobName });
      return true;
    } catch (error) {
      logWithContext(correlationId, 'Error cancelling reminder', { error: error.message });
      throw error;
    }
  }

  // Reschedule a reminder to a new time
  async rescheduleReminder(reminderId, newScheduledTime) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Rescheduling reminder', { 
        reminderId, 
        newScheduledTime 
      });

      const reminder = this.reminderService.reminders.get(reminderId);
      if (!reminder) {
        throw new Error(`Reminder with ID ${reminderId} not found`);
      }

      // Cancel the existing job
      await this.cancelReminder(reminderId);

      // Update the reminder with the new scheduled time
      reminder.update({ 
        scheduledTime: newScheduledTime,
        deliveryStatus: 'scheduled' // Reset status to scheduled
      });

      // Schedule a new job with the updated time
      await this.scheduleReminder(reminder);

      logWithContext(correlationId, 'Reminder rescheduled successfully', { 
        reminderId, 
        newScheduledTime 
      });
      return true;
    } catch (error) {
      logWithContext(correlationId, 'Error rescheduling reminder', { error: error.message });
      throw error;
    }
  }

  // Get all scheduled reminders
  getScheduledReminders() {
    return Array.from(this.reminderService.reminders.values())
      .filter(reminder => reminder.deliveryStatus === 'scheduled');
  }

  // Get reminders that are overdue
  getOverdueReminders() {
    const now = new Date();
    return Array.from(this.reminderService.reminders.values())
      .filter(reminder => 
        reminder.deliveryStatus === 'scheduled' && 
        reminder.scheduledTime < now
      );
  }

  // Convert JavaScript Date to Cron expression
  // Note: This is a simplified conversion - in practice, you might need more sophisticated handling
  convertToCronExpression(date) {
    // For exact time scheduling, we'll use a more specific approach
    // Since cron doesn't support exact datetime, we'll use Dapr's specific time scheduling
    
    // Format: "YYYY-MM-DDTHH:mm:ss.sssZ" for ISO string
    // But Dapr Jobs might expect a different format depending on the implementation
    // This is a placeholder - the actual implementation depends on Dapr Jobs API specifics
    return date.toISOString();
  }

  // Alternative approach: Use a more standard cron expression for recurring reminders
  convertToCronForRecurring(frequency, interval = 1) {
    switch (frequency.toLowerCase()) {
      case 'minute':
        return `*/${interval} * * * *`;
      case 'hourly':
        return `0 */${interval} * * *`;
      case 'daily':
        return `0 9 */${interval} * *`; // Daily at 9 AM
      case 'weekly':
        return `0 9 * * 1`; // Weekly on Monday at 9 AM
      case 'monthly':
        return `0 9 1 */${interval} *`; // Monthly on the 1st at 9 AM
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  // Process overdue reminders
  async processOverdueReminders() {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing overdue reminders');

      const overdueReminders = this.getOverdueReminders();
      
      for (const reminder of overdueReminders) {
        // Mark reminder as delivered since it's overdue
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

      return overdueReminders.length;
    } catch (error) {
      logWithContext(correlationId, 'Error processing overdue reminders', { error: error.message });
      throw error;
    }
  }

  // Initialize the scheduler
  async initialize() {
    // Set up any necessary background processes
    console.log('Reminder Scheduler initialized');
  }

  // Close the Dapr client connection
  async close() {
    await this.client.stop();
  }
}

module.exports = ReminderScheduler;