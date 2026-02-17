// Event publisher for Task events in Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');

class TaskEventPublisher {
  constructor() {
    this.client = new DaprClient();
    this.pubsubName = 'task-pubsub';
  }

  // Publish TaskCreated event
  async publishTaskCreated(task) {
    const event = {
      eventType: 'TaskCreated',
      taskId: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      priority: task.priority,
      tags: task.tags,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'task-created', event);
      console.log(`TaskCreated event published for task ${task.id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish TaskCreated event:', error);
      throw error;
    }
  }

  // Publish TaskUpdated event
  async publishTaskUpdated(task, oldTask) {
    const event = {
      eventType: 'TaskUpdated',
      taskId: task.id,
      userId: task.userId,
      updates: this.getTaskUpdates(task, oldTask),
      updatedAt: task.updatedAt.toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'task-updated', event);
      console.log(`TaskUpdated event published for task ${task.id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish TaskUpdated event:', error);
      throw error;
    }
  }

  // Publish TaskCompleted event
  async publishTaskCompleted(task) {
    const event = {
      eventType: 'TaskCompleted',
      taskId: task.id,
      userId: task.userId,
      completedAt: task.completedAt.toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'task-completed', event);
      console.log(`TaskCompleted event published for task ${task.id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish TaskCompleted event:', error);
      throw error;
    }
  }

  // Publish TaskDeleted event
  async publishTaskDeleted(taskId, userId) {
    const event = {
      eventType: 'TaskDeleted',
      taskId: taskId,
      userId: userId,
      deletedAt: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    try {
      await this.client.pubsub.publish(this.pubsubName, 'task-deleted', event);
      console.log(`TaskDeleted event published for task ${taskId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish TaskDeleted event:', error);
      throw error;
    }
  }

  // Helper method to get task updates
  getTaskUpdates(newTask, oldTask) {
    const updates = {};
    if (newTask.title !== oldTask.title) updates.title = { old: oldTask.title, new: newTask.title };
    if (newTask.description !== oldTask.description) updates.description = { old: oldTask.description, new: newTask.description };
    if (newTask.dueDate !== oldTask.dueDate) updates.dueDate = { old: oldTask.dueDate, new: newTask.dueDate };
    if (newTask.priority !== oldTask.priority) updates.priority = { old: oldTask.priority, new: newTask.priority };
    if (JSON.stringify(newTask.tags) !== JSON.stringify(oldTask.tags)) updates.tags = { old: oldTask.tags, new: newTask.tags };
    if (newTask.status !== oldTask.status) updates.status = { old: oldTask.status, new: newTask.status };

    return updates;
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

module.exports = TaskEventPublisher;