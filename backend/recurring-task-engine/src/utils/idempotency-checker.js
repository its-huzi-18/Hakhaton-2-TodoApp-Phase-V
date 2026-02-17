// Idempotency checker for RecurringTaskEngine in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class RecurringTaskIdempotencyChecker {
  constructor() {
    this.serviceName = 'recurring-task-engine';
    this.processedOperations = new Map(); // Store processed recurring task operations
    this.operationTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Start periodic cleanup
    this.startCleanup();
  }

  // Generate a unique key for idempotency checking
  generateKey(operationType, operationId, userId = null) {
    // Create a unique key based on operation type, ID, and optionally user ID
    const baseKey = `${operationType}:${operationId}`;
    return userId ? `${baseKey}:${userId}` : baseKey;
  }

  // Check if a recurring task operation has already been processed
  async isOperationProcessed(operationType, operationId, userId = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(operationType, operationId, userId);
    
    try {
      // Check if the operation has been processed before
      const processedOp = this.processedOperations.get(key);
      
      if (processedOp) {
        logWithContext(correlationId, 'Recurring task operation already processed (idempotency check)', {
          operationType,
          operationId,
          userId,
          service: this.serviceName,
          result: processedOp.result
        });
        
        return {
          isProcessed: true,
          result: processedOp.result,
          timestamp: processedOp.timestamp
        };
      }
      
      logWithContext(correlationId, 'Recurring task operation not previously processed', {
        operationType,
        operationId,
        userId,
        service: this.serviceName
      });
      
      return { isProcessed: false };
    } catch (error) {
      logWithContext(correlationId, 'Error checking if recurring task operation was processed', {
        error: error.message,
        operationType,
        operationId,
        userId
      });
      throw error;
    }
  }

  // Mark a recurring task operation as processed
  async markOperationProcessed(operationType, operationId, userId = null, result = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(operationType, operationId, userId);
    
    try {
      // Store the operation as processed with its result
      this.processedOperations.set(key, {
        result,
        timestamp: new Date(),
        operationType,
        userId
      });
      
      logWithContext(correlationId, 'Recurring task operation marked as processed', {
        operationType,
        operationId,
        userId,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error marking recurring task operation as processed', {
        error: error.message,
        operationType,
        operationId,
        userId
      });
      throw error;
    }
  }

  // Remove a processed operation (for cleanup purposes)
  removeProcessed(operationType, operationId, userId = null) {
    const key = this.generateKey(operationType, operationId, userId);
    this.processedOperations.delete(key);
  }

  // Cleanup old processed operations
  cleanup() {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [key, operation] of this.processedOperations.entries()) {
        const timeDiff = now - operation.timestamp;
        
        if (timeDiff > this.operationTimeout) {
          this.processedOperations.delete(key);
          cleanedCount++;
        }
      }
      
      logWithContext(correlationId, 'Recurring task idempotency checker cleanup completed', {
        cleanedCount,
        remainingCount: this.processedOperations.size,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error during recurring task idempotency checker cleanup', {
        error: error.message
      });
    }
  }

  // Start periodic cleanup
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Process a recurring task generation operation with idempotency checking
  async processGenerateRecurringTaskWithIdempotency(originalTaskId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the recurring task generation has already been processed
      const processedCheck = await this.isOperationProcessed('generate_recurring_task', originalTaskId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the generation operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('generate_recurring_task', originalTaskId, userId, result);
      
      logWithContext(correlationId, 'Recurring task generation processed successfully with idempotency', {
        originalTaskId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurring task generation with idempotency', {
        error: error.message,
        originalTaskId,
        userId
      });
      throw error;
    }
  }

  // Process a recurring task rule creation operation with idempotency checking
  async processCreateRecurringTaskRuleWithIdempotency(ruleId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the recurring task rule creation has already been processed
      const processedCheck = await this.isOperationProcessed('create_recurring_rule', ruleId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the rule creation operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('create_recurring_rule', ruleId, userId, result);
      
      logWithContext(correlationId, 'Recurring task rule creation processed successfully with idempotency', {
        ruleId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurring task rule creation with idempotency', {
        error: error.message,
        ruleId,
        userId
      });
      throw error;
    }
  }

  // Process a recurring task rule update operation with idempotency checking
  async processUpdateRecurringTaskRuleWithIdempotency(ruleId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the recurring task rule update has already been processed
      const processedCheck = await this.isOperationProcessed('update_recurring_rule', ruleId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the rule update operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('update_recurring_rule', ruleId, userId, result);
      
      logWithContext(correlationId, 'Recurring task rule update processed successfully with idempotency', {
        ruleId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurring task rule update with idempotency', {
        error: error.message,
        ruleId,
        userId
      });
      throw error;
    }
  }

  // Process a recurring task rule deletion operation with idempotency checking
  async processDeleteRecurringTaskRuleWithIdempotency(ruleId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the recurring task rule deletion has already been processed
      const processedCheck = await this.isOperationProcessed('delete_recurring_rule', ruleId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the rule deletion operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('delete_recurring_rule', ruleId, userId, result);
      
      logWithContext(correlationId, 'Recurring task rule deletion processed successfully with idempotency', {
        ruleId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurring task rule deletion with idempotency', {
        error: error.message,
        ruleId,
        userId
      });
      throw error;
    }
  }

  // Process a recurring task processing operation with idempotency checking
  async processRecurringTaskWithIdempotency(taskId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the recurring task processing has already been processed
      const processedCheck = await this.isOperationProcessed('process_recurring_task', taskId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the recurring task operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('process_recurring_task', taskId, userId, result);
      
      logWithContext(correlationId, 'Recurring task processing processed successfully with idempotency', {
        taskId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurring task with idempotency', {
        error: error.message,
        taskId,
        userId
      });
      throw error;
    }
  }

  // Get statistics about processed operations
  getStats() {
    return {
      processedCount: this.processedOperations.size,
      serviceName: this.serviceName,
      operationTimeout: this.operationTimeout,
      cleanupInterval: this.cleanupInterval
    };
  }

  // Clear all processed operations (for testing purposes)
  clearAll() {
    this.processedOperations.clear();
  }
}

module.exports = RecurringTaskIdempotencyChecker;