// Logging for recurring task operations in Advanced Cloud Deployment

const { logger, logWithContext, logErrorWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class RecurringTaskLogger {
  // Log recurring task creation
  static logRecurringTaskCreation(task, rule, correlationId) {
    logWithContext(correlationId, 'Recurring task created', {
      taskId: task.id,
      title: task.title,
      userId: task.userId,
      ruleId: rule.id,
      frequency: rule.frequency,
      interval: rule.interval
    });
  }

  // Log recurring task creation error
  static logRecurringTaskCreationError(error, correlationId, taskData, ruleData) {
    logErrorWithContext(correlationId, error, {
      operation: 'recurring_task_creation',
      taskData,
      ruleData
    });
  }

  // Log next occurrence generation
  static logNextOccurrenceGeneration(originalTaskId, newTaskId, nextOccurrenceDate, correlationId) {
    logWithContext(correlationId, 'Next occurrence generated for recurring task', {
      originalTaskId,
      newTaskId,
      nextOccurrenceDate
    });
  }

  // Log next occurrence generation error
  static logNextOccurrenceGenerationError(error, correlationId, originalTaskId) {
    logErrorWithContext(correlationId, error, {
      operation: 'next_occurrence_generation',
      originalTaskId
    });
  }

  // Log recurrence rule validation
  static logRuleValidation(validationResult, ruleId, correlationId) {
    if (!validationResult.isValid) {
      logWithContext(correlationId, 'Recurrence rule validation failed', {
        ruleId,
        errors: validationResult.errors
      });
    } else {
      logWithContext(correlationId, 'Recurrence rule validation passed', {
        ruleId
      });
    }
  }

  // Log recurrence rule creation
  static logRuleCreation(rule, userId, correlationId) {
    logWithContext(correlationId, 'Recurrence rule created', {
      ruleId: rule.id,
      userId,
      frequency: rule.frequency,
      interval: rule.interval,
      endDate: rule.endDate,
      occurrenceCount: rule.occurrenceCount
    });
  }

  // Log recurrence rule creation error
  static logRuleCreationError(error, correlationId, userId, ruleData) {
    logErrorWithContext(correlationId, error, {
      operation: 'rule_creation',
      userId,
      ruleData
    });
  }

  // Log recurrence rule update
  static logRuleUpdate(ruleId, userId, updates, correlationId) {
    logWithContext(correlationId, 'Recurrence rule updated', {
      ruleId,
      userId,
      updates
    });
  }

  // Log recurrence rule update error
  static logRuleUpdateError(error, correlationId, ruleId, userId, updates) {
    logErrorWithContext(correlationId, error, {
      operation: 'rule_update',
      ruleId,
      userId,
      updates
    });
  }

  // Log recurrence rule deletion
  static logRuleDeletion(ruleId, userId, correlationId) {
    logWithContext(correlationId, 'Recurrence rule deleted', {
      ruleId,
      userId
    });
  }

  // Log recurrence rule deletion error
  static logRuleDeletionError(error, correlationId, ruleId, userId) {
    logErrorWithContext(correlationId, error, {
      operation: 'rule_deletion',
      ruleId,
      userId
    });
  }

  // Log processing of completed recurring task
  static logCompletedTaskProcessing(taskId, userId, correlationId) {
    logWithContext(correlationId, 'Processing completed recurring task', {
      taskId,
      userId
    });
  }

  // Log completed task processing error
  static logCompletedTaskProcessingError(error, correlationId, taskId, userId) {
    logErrorWithContext(correlationId, error, {
      operation: 'completed_task_processing',
      taskId,
      userId
    });
  }

  // Log recurrence rule ending
  static logRuleEnding(ruleId, reason, correlationId) {
    logWithContext(correlationId, 'Recurrence rule ending', {
      ruleId,
      reason
    });
  }

  // Log recurrence calculation
  static logRecurrenceCalculation(ruleId, startDate, nextDate, correlationId) {
    logWithContext(correlationId, 'Recurrence calculated', {
      ruleId,
      startDate,
      nextDate
    });
  }

  // Log recurrence calculation error
  static logRecurrenceCalculationError(error, correlationId, ruleId, startDate) {
    logErrorWithContext(correlationId, error, {
      operation: 'recurrence_calculation',
      ruleId,
      startDate
    });
  }

  // Log multiple occurrences calculation
  static logMultipleOccurrencesCalculation(ruleId, count, dateRange, correlationId) {
    logWithContext(correlationId, 'Multiple occurrences calculated', {
      ruleId,
      count,
      dateRange
    });
  }

  // Log recurring tasks retrieval
  static logRecurringTasksRetrieval(userId, count, correlationId) {
    logWithContext(correlationId, 'Recurring tasks retrieved', {
      userId,
      count
    });
  }

  // Log recurring tasks retrieval error
  static logRecurringTasksRetrievalError(error, correlationId, userId) {
    logErrorWithContext(correlationId, error, {
      operation: 'recurring_tasks_retrieval',
      userId
    });
  }

  // Log upcoming occurrences calculation
  static logUpcomingOccurrencesCalculation(userId, days, count, correlationId) {
    logWithContext(correlationId, 'Upcoming occurrences calculated', {
      userId,
      days,
      count
    });
  }

  // Log upcoming occurrences calculation error
  static logUpcomingOccurrencesCalculationError(error, correlationId, userId, days) {
    logErrorWithContext(correlationId, error, {
      operation: 'upcoming_occurrences_calculation',
      userId,
      days
    });
  }

  // Log event publishing
  static logEventPublished(eventType, taskId, correlationId) {
    logWithContext(correlationId, 'Recurring task event published', {
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

  // Log rule compatibility check
  static logRuleCompatibilityCheck(ruleId, taskId, isCompatible, correlationId) {
    logWithContext(correlationId, 'Rule compatibility check', {
      ruleId,
      taskId,
      isCompatible
    });
  }

  // Log rule termination check
  static logRuleTerminationCheck(ruleId, hasEnded, correlationId) {
    logWithContext(correlationId, 'Rule termination check', {
      ruleId,
      hasEnded
    });
  }

  // Log bulk processing
  static logBulkProcessing(count, processed, successful, failed, correlationId) {
    logWithContext(correlationId, 'Bulk recurring task processing completed', {
      total: count,
      processed,
      successful,
      failed
    });
  }

  // Log bulk processing error
  static logBulkProcessingError(error, correlationId, count) {
    logErrorWithContext(correlationId, error, {
      operation: 'bulk_processing',
      count
    });
  }

  // Create a new correlation ID for logging
  static createCorrelationId() {
    return generateCorrelationId();
  }

  // Log general recurring task operation
  static logOperation(operation, details, correlationId) {
    logWithContext(correlationId, `Recurring task ${operation}`, details);
  }

  // Log recurring task operation error
  static logOperationError(operation, error, correlationId, details) {
    logErrorWithContext(correlationId, error, {
      operation,
      details
    });
  }
}

module.exports = RecurringTaskLogger;