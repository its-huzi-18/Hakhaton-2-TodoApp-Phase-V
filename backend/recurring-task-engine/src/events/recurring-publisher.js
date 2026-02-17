// Event publisher for Recurring Task events in Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');

class RecurringTaskEventPublisher {
  constructor() {
    this.client = new DaprClient();
    this.pubsubName = 'recurring-task-pubsub';
  }

  // Publish RecurringTaskGenerated event
  async publishRecurringTaskGenerated(newTaskId, originalTaskId, userId) {
    const event = {
      eventType: 'RecurringTaskGenerated',
      newTaskId: newTaskId,
      originalTaskId: originalTaskId,
      userId: userId,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'recurring-task-generated', event);
      console.log(`RecurringTaskGenerated event published for new task ${newTaskId} from original task ${originalTaskId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish RecurringTaskGenerated event:', error);
      throw error;
    }
  }

  // Publish RecurringTaskRuleCreated event
  async publishRecurringTaskRuleCreated(ruleId, userId, ruleDetails) {
    const event = {
      eventType: 'RecurringTaskRuleCreated',
      ruleId: ruleId,
      userId: userId,
      ruleDetails: ruleDetails,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'recurring-task-rule-created', event);
      console.log(`RecurringTaskRuleCreated event published for rule ${ruleId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish RecurringTaskRuleCreated event:', error);
      throw error;
    }
  }

  // Publish RecurringTaskRuleUpdated event
  async publishRecurringTaskRuleUpdated(ruleId, userId, updates) {
    const event = {
      eventType: 'RecurringTaskRuleUpdated',
      ruleId: ruleId,
      userId: userId,
      updates: updates,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'recurring-task-rule-updated', event);
      console.log(`RecurringTaskRuleUpdated event published for rule ${ruleId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish RecurringTaskRuleUpdated event:', error);
      throw error;
    }
  }

  // Publish RecurringTaskRuleDeleted event
  async publishRecurringTaskRuleDeleted(ruleId, userId) {
    const event = {
      eventType: 'RecurringTaskRuleDeleted',
      ruleId: ruleId,
      userId: userId,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'recurring-task-rule-deleted', event);
      console.log(`RecurringTaskRuleDeleted event published for rule ${ruleId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish RecurringTaskRuleDeleted event:', error);
      throw error;
    }
  }

  // Publish RecurringTaskProcessingError event
  async publishRecurringTaskProcessingError(originalTaskId, userId, error) {
    const event = {
      eventType: 'RecurringTaskProcessingError',
      originalTaskId: originalTaskId,
      userId: userId,
      error: error.message,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'recurring-task-processing-error', event);
      console.log(`RecurringTaskProcessingError event published for task ${originalTaskId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish RecurringTaskProcessingError event:', error);
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

module.exports = RecurringTaskEventPublisher;