// Event publisher for Reminder events in Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');

class ReminderEventPublisher {
  constructor() {
    this.client = new DaprClient();
    this.pubsubName = 'reminder-pubsub';
  }

  // Publish ReminderScheduled event
  async publishReminderScheduled(reminder) {
    const event = {
      eventType: 'ReminderScheduled',
      reminderId: reminder.id,
      taskId: reminder.taskId,
      userId: reminder.userId,
      scheduledTime: reminder.scheduledTime.toISOString(),
      taskTitle: reminder.taskTitle, // Optional: include task title for context
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'reminder-scheduled', event);
      console.log(`ReminderScheduled event published for reminder ${reminder.id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish ReminderScheduled event:', error);
      throw error;
    }
  }

  // Publish ReminderDelivered event
  async publishReminderDelivered(reminder) {
    const event = {
      eventType: 'ReminderDelivered',
      reminderId: reminder.id,
      taskId: reminder.taskId,
      userId: reminder.userId,
      deliveredAt: reminder.deliveredAt.toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'reminder-delivered', event);
      console.log(`ReminderDelivered event published for reminder ${reminder.id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish ReminderDelivered event:', error);
      throw error;
    }
  }

  // Publish ReminderFailed event
  async publishReminderFailed(reminder, error) {
    const event = {
      eventType: 'ReminderFailed',
      reminderId: reminder.id,
      taskId: reminder.taskId,
      userId: reminder.userId,
      error: error.message,
      failedAt: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'reminder-failed', event);
      console.log(`ReminderFailed event published for reminder ${reminder.id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish ReminderFailed event:', error);
      throw error;
    }
  }

  // Publish ReminderCancelled event
  async publishReminderCancelled(reminderId, taskId, userId) {
    const event = {
      eventType: 'ReminderCancelled',
      reminderId: reminderId,
      taskId: taskId,
      userId: userId,
      cancelledAt: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'reminder-cancelled', event);
      console.log(`ReminderCancelled event published for reminder ${reminderId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish ReminderCancelled event:', error);
      throw error;
    }
  }

  // Generate correlation ID for tracking events
  generateCorrelationId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Close the Dapr client connection
  async close() {
    await this.client.stop();
  }
}

module.exports = ReminderEventPublisher;