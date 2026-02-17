// Event consumer for Reminder events in Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class ReminderEventConsumer {
  constructor(notificationService) {
    this.client = new DaprClient();
    this.notificationService = notificationService;
    this.pubsubName = 'reminder-pubsub';
  }

  // Subscribe to ReminderScheduled events
  async subscribeToReminderScheduled() {
    try {
      await this.client.binding.subscribe('reminder-scheduled', async (data) => {
        await this.handleReminderScheduled(data);
      });
      console.log('Subscribed to ReminderScheduled events');
    } catch (error) {
      console.error('Failed to subscribe to ReminderScheduled events:', error);
      throw error;
    }
  }

  // Subscribe to ReminderDelivered events
  async subscribeToReminderDelivered() {
    try {
      await this.client.binding.subscribe('reminder-delivered', async (data) => {
        await this.handleReminderDelivered(data);
      });
      console.log('Subscribed to ReminderDelivered events');
    } catch (error) {
      console.error('Failed to subscribe to ReminderDelivered events:', error);
      throw error;
    }
  }

  // Subscribe to ReminderFailed events
  async subscribeToReminderFailed() {
    try {
      await this.client.binding.subscribe('reminder-failed', async (data) => {
        await this.handleReminderFailed(data);
      });
      console.log('Subscribed to ReminderFailed events');
    } catch (error) {
      console.error('Failed to subscribe to ReminderFailed events:', error);
      throw error;
    }
  }

  // Subscribe to ReminderCancelled events
  async subscribeToReminderCancelled() {
    try {
      await this.client.binding.subscribe('reminder-cancelled', async (data) => {
        await this.handleReminderCancelled(data);
      });
      console.log('Subscribed to ReminderCancelled events');
    } catch (error) {
      console.error('Failed to subscribe to ReminderCancelled events:', error);
      throw error;
    }
  }

  // Handle ReminderScheduled event
  async handleReminderScheduled(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling ReminderScheduled event', { eventData });

      // In the reminder service, this event might be used to confirm the reminder was scheduled
      // For the notification service, this would trigger the creation of a notification
      if (this.notificationService) {
        // Create a notification for the scheduled reminder
        const notification = {
          taskId: eventData.taskId,
          userId: eventData.userId,
          reminderId: eventData.reminderId,
          type: 'reminder',
          content: `Reminder scheduled for task: ${eventData.taskTitle || 'Untitled'}`,
          channel: 'email', // Would come from user preferences in a real system
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        // Store the notification
        this.notificationService.notifications.set(notification.id, notification);
        logWithContext(correlationId, 'Notification created for scheduled reminder', { 
          notificationId: notification.id,
          reminderId: eventData.reminderId 
        });
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling ReminderScheduled event', { error: error.message });
      throw error;
    }
  }

  // Handle ReminderDelivered event
  async handleReminderDelivered(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling ReminderDelivered event', { eventData });

      // Update any related notifications or records
      // In a real system, this might update notification status or trigger follow-up actions
      if (this.notificationService) {
        // Find notifications related to this reminder and update their status
        for (const [id, notification] of this.notificationService.notifications) {
          if (notification.reminderId === eventData.reminderId) {
            notification.update({ status: 'delivered', deliveredAt: eventData.deliveredAt });
            logWithContext(correlationId, 'Updated notification status for delivered reminder', { 
              notificationId: id,
              reminderId: eventData.reminderId 
            });
          }
        }
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling ReminderDelivered event', { error: error.message });
      throw error;
    }
  }

  // Handle ReminderFailed event
  async handleReminderFailed(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling ReminderFailed event', { eventData });

      // Handle reminder failure - maybe retry or notify user
      if (this.notificationService) {
        // Find notifications related to this reminder and mark as failed
        for (const [id, notification] of this.notificationService.notifications) {
          if (notification.reminderId === eventData.reminderId) {
            notification.update({ status: 'failed', error: eventData.error });
            logWithContext(correlationId, 'Marked notification as failed due to reminder failure', { 
              notificationId: id,
              reminderId: eventData.reminderId 
            });
          }
        }
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling ReminderFailed event', { error: error.message });
      throw error;
    }
  }

  // Handle ReminderCancelled event
  async handleReminderCancelled(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling ReminderCancelled event', { eventData });

      // Handle reminder cancellation - cancel any related notifications
      if (this.notificationService) {
        // Find and cancel any pending notifications related to this reminder
        for (const [id, notification] of this.notificationService.notifications) {
          if (notification.reminderId === eventData.reminderId && notification.status === 'pending') {
            notification.update({ status: 'cancelled' });
            logWithContext(correlationId, 'Cancelled notification due to reminder cancellation', { 
              notificationId: id,
              reminderId: eventData.reminderId 
            });
          }
        }
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling ReminderCancelled event', { error: error.message });
      throw error;
    }
  }

  // Initialize all subscriptions
  async initialize() {
    await this.subscribeToReminderScheduled();
    await this.subscribeToReminderDelivered();
    await this.subscribeToReminderFailed();
    await this.subscribeToReminderCancelled();
    
    console.log('All reminder event subscriptions initialized');
  }

  // Close the Dapr client connection
  async close() {
    await this.client.stop();
  }
}

module.exports = ReminderEventConsumer;