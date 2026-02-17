// Task logging module for Advanced Cloud Deployment

const { logger, logWithContext, logErrorWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class TaskLogger {
  // Log task creation
  static logTaskCreation(task, correlationId) {
    logWithContext(correlationId, 'Task created successfully', {
      taskId: task.id,
      userId: task.userId,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      tags: task.tags,
      status: task.status
    });
  }

  // Log task creation error
  static logTaskCreationError(error, correlationId, taskData) {
    logErrorWithContext(correlationId, error, {
      operation: 'task_creation',
      taskData
    });
  }

  // Log task retrieval
  static logTaskRetrieval(taskId, userId, correlationId) {
    logWithContext(correlationId, 'Task retrieved', {
      taskId,
      userId
    });
  }

  // Log task retrieval error
  static logTaskRetrievalError(error, correlationId, taskId, userId) {
    logErrorWithContext(correlationId, error, {
      operation: 'task_retrieval',
      taskId,
      userId
    });
  }

  // Log task update
  static logTaskUpdate(task, userId, correlationId) {
    logWithContext(correlationId, 'Task updated successfully', {
      taskId: task.id,
      userId,
      updates: this.getTaskUpdates(task)
    });
  }

  // Log task update error
  static logTaskUpdateError(error, correlationId, taskId, userId, updateData) {
    logErrorWithContext(correlationId, error, {
      operation: 'task_update',
      taskId,
      userId,
      updateData
    });
  }

  // Log task deletion
  static logTaskDeletion(taskId, userId, correlationId) {
    logWithContext(correlationId, 'Task deleted successfully', {
      taskId,
      userId
    });
  }

  // Log task deletion error
  static logTaskDeletionError(error, correlationId, taskId, userId) {
    logErrorWithContext(correlationId, error, {
      operation: 'task_deletion',
      taskId,
      userId
    });
  }

  // Log task completion
  static logTaskCompletion(task, userId, correlationId) {
    logWithContext(correlationId, 'Task completed successfully', {
      taskId: task.id,
      userId,
      completedAt: task.completedAt
    });
  }

  // Log task completion error
  static logTaskCompletionError(error, correlationId, taskId, userId) {
    logErrorWithContext(correlationId, error, {
      operation: 'task_completion',
      taskId,
      userId
    });
  }

  // Log task validation
  static logTaskValidation(validationResult, correlationId) {
    if (!validationResult.isValid) {
      logWithContext(correlationId, 'Task validation failed', {
        errors: validationResult.errors
      });
    } else {
      logWithContext(correlationId, 'Task validation passed');
    }
  }

  // Log task search/filter
  static logTaskSearch(filters, userId, correlationId, resultCount) {
    logWithContext(correlationId, 'Task search executed', {
      userId,
      filters,
      resultCount
    });
  }

  // Log task search error
  static logTaskSearchError(error, correlationId, userId, filters) {
    logErrorWithContext(correlationId, error, {
      operation: 'task_search',
      userId,
      filters
    });
  }

  // Helper method to get task updates
  static getTaskUpdates(task) {
    // This would compare the task with its previous state to identify what changed
    // For now, returning a basic representation
    return {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      tags: task.tags,
      status: task.status
    };
  }

  // Log event publishing
  static logEventPublished(eventType, taskId, correlationId) {
    logWithContext(correlationId, 'Event published', {
      eventType,
      taskId
    });
  }

  // Log event publishing error
  static logEventPublishError(error, correlationId, eventType, taskId) {
    logErrorWithContext(correlationId, error, {
      operation: 'event_publishing',
      eventType,
      taskId
    });
  }

  // Log general task operation
  static logOperation(operation, details, correlationId) {
    logWithContext(correlationId, `Task ${operation}`, details);
  }

  // Log operation error
  static logOperationError(operation, error, correlationId, details) {
    logErrorWithContext(correlationId, error, {
      operation,
      details
    });
  }

  // Create a new correlation ID for logging
  static createCorrelationId() {
    return generateCorrelationId();
  }
}

module.exports = TaskLogger;