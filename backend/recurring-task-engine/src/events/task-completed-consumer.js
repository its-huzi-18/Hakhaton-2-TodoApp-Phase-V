// Event consumer for Task events in Recurring Task Engine

const { DaprClient } = require('@dapr/dapr');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class TaskCompletedEventConsumer {
  constructor(recurringTaskEngine) {
    this.client = new DaprClient();
    this.recurringTaskEngine = recurringTaskEngine;
    this.pubsubName = 'task-pubsub';
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

  // Handle TaskCompleted event
  async handleTaskCompleted(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskCompleted event', { eventData });

      // Extract relevant data from the event
      const { taskId, userId, completedAt } = eventData;

      // Get the completed task details (in a real implementation, this would come from the task service)
      const completedTask = await this.recurringTaskEngine.getTaskById(taskId);
      if (!completedTask) {
        logWithContext(correlationId, 'Completed task not found in recurring task engine', { taskId });
        return;
      }

      // Check if the task has a recurrence rule
      if (!completedTask.recurrenceRuleId) {
        logWithContext(correlationId, 'Task does not have a recurrence rule, skipping', { taskId });
        return;
      }

      // Get the recurrence rule
      const recurrenceRule = await this.recurringTaskEngine.getRecurrenceRuleById(completedTask.recurrenceRuleId);
      if (!recurrenceRule) {
        logWithContext(correlationId, 'Recurrence rule not found for completed task', { 
          taskId, 
          recurrenceRuleId: completedTask.recurrenceRuleId 
        });
        
        // Publish an error event
        await this.recurringTaskEngine.publishEvent('recurring-task-events', {
          eventType: 'RecurringTaskProcessingError',
          originalTaskId: taskId,
          userId: userId,
          error: `Recurrence rule ${completedTask.recurrenceRuleId} not found`,
          timestamp: new Date().toISOString(),
          correlationId
        });
        
        return;
      }

      // Check if the rule has ended
      if (recurrenceRule.hasEnded(new Date(completedAt), completedTask.occurrenceCount || 1)) {
        logWithContext(correlationId, 'Recurrence rule has ended, not creating next occurrence', { 
          taskId, 
          recurrenceRuleId: completedTask.recurrenceRuleId 
        });
        return;
      }

      // Generate the next occurrence
      const nextOccurrence = await this.recurringTaskEngine.generateNextOccurrence(
        completedTask, 
        recurrenceRule, 
        correlationId
      );
      
      if (nextOccurrence) {
        logWithContext(correlationId, 'Next occurrence generated successfully', { 
          originalTaskId: taskId, 
          newTaskId: nextOccurrence.id 
        });

        // Publish RecurringTaskGenerated event
        await this.recurringTaskEngine.publishEvent('task-events', {
          eventType: 'RecurringTaskGenerated',
          newTaskId: nextOccurrence.id,
          originalTaskId: taskId,
          userId: userId,
          timestamp: new Date().toISOString(),
          correlationId
        });
      } else {
        logWithContext(correlationId, 'Failed to generate next occurrence', { 
          originalTaskId: taskId 
        });
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskCompleted event', { error: error.message });
      
      // Publish an error event
      try {
        await this.recurringTaskEngine.publishEvent('recurring-task-events', {
          eventType: 'RecurringTaskProcessingError',
          originalTaskId: eventData.taskId,
          userId: eventData.userId,
          error: error.message,
          timestamp: new Date().toISOString(),
          correlationId
        });
      } catch (publishError) {
        logWithContext(correlationId, 'Error publishing processing error event', { 
          error: publishError.message 
        });
      }
    }
  }

  // Handle TaskCreated event
  async handleTaskCreated(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskCreated event in recurring task engine', { eventData });

      // If the created task has a recurrence rule, store it in our engine
      if (eventData.recurrenceRuleId) {
        logWithContext(correlationId, 'Recurring task created, storing rule reference', { 
          taskId: eventData.taskId, 
          recurrenceRuleId: eventData.recurrenceRuleId 
        });
        
        // In a real implementation, we might want to store the task in our local tracking system
        // For now, we'll just log the event
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskCreated event', { error: error.message });
    }
  }

  // Handle TaskUpdated event
  async handleTaskUpdated(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskUpdated event in recurring task engine', { eventData });

      // Check if the recurrence rule was updated
      if (eventData.updates && eventData.updates.recurrenceRuleId) {
        logWithContext(correlationId, 'Task recurrence rule updated', { 
          taskId: eventData.taskId, 
          newRecurrenceRuleId: eventData.updates.recurrenceRuleId 
        });
        
        // In a real implementation, we might need to update our tracking
      }
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskUpdated event', { error: error.message });
    }
  }

  // Handle TaskDeleted event
  async handleTaskDeleted(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Handling TaskDeleted event in recurring task engine', { eventData });

      // If a recurring task is deleted, we might need to clean up our tracking
      logWithContext(correlationId, 'Task deleted, cleaning up recurring task tracking', { 
        taskId: eventData.taskId 
      });
      
      // In a real implementation, we would remove the task from our tracking system
    } catch (error) {
      logWithContext(correlationId, 'Error handling TaskDeleted event', { error: error.message });
    }
  }

  // Initialize all subscriptions
  async initialize() {
    await this.subscribeToTaskCompleted();
    await this.subscribeToTaskCreated();
    await this.subscribeToTaskUpdated();
    await this.subscribeToTaskDeleted();
    
    console.log('All task event subscriptions initialized in recurring task engine');
  }

  // Close the Dapr client connection
  async close() {
    await this.client.stop();
  }
}

module.exports = TaskCompletedEventConsumer;