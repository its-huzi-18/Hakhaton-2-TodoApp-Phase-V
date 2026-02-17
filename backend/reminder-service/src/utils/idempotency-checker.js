// Idempotency checker for ReminderService in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class ReminderIdempotencyChecker {
  constructor() {
    this.serviceName = 'reminder-service';
    this.processedOperations = new Map(); // Store processed operations
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

  // Check if an operation has already been processed
  async isOperationProcessed(operationType, operationId, userId = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(operationType, operationId, userId);
    
    try {
      // Check if the operation has been processed before
      const processedOp = this.processedOperations.get(key);
      
      if (processedOp) {
        logWithContext(correlationId, 'Operation already processed (idempotency check)', {
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
      
      logWithContext(correlationId, 'Operation not previously processed', {
        operationType,
        operationId,
        userId,
        service: this.serviceName
      });
      
      return { isProcessed: false };
    } catch (error) {
      logWithContext(correlationId, 'Error checking if operation was processed', {
        error: error.message,
        operationType,
        operationId,
        userId
      });
      throw error;
    }
  }

  // Mark an operation as processed
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
      
      logWithContext(correlationId, 'Operation marked as processed', {
        operationType,
        operationId,
        userId,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error marking operation as processed', {
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
      
      logWithContext(correlationId, 'Reminder idempotency checker cleanup completed', {
        cleanedCount,
        remainingCount: this.processedOperations.size,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error during reminder idempotency checker cleanup', {
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

  // Process a reminder scheduling operation with idempotency checking
  async processScheduleReminderWithIdempotency(requestId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the reminder scheduling has already been processed
      const processedCheck = await this.isOperationProcessed('schedule_reminder', requestId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the scheduling operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('schedule_reminder', requestId, userId, result);
      
      logWithContext(correlationId, 'Reminder scheduling processed successfully with idempotency', {
        requestId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing reminder scheduling with idempotency', {
        error: error.message,
        requestId,
        userId
      });
      throw error;
    }
  }

  // Process a reminder delivery operation with idempotency checking
  async processDeliverReminderWithIdempotency(reminderId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the reminder delivery has already been processed
      const processedCheck = await this.isOperationProcessed('deliver_reminder', reminderId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the delivery operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('deliver_reminder', reminderId, userId, result);
      
      logWithContext(correlationId, 'Reminder delivery processed successfully with idempotency', {
        reminderId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing reminder delivery with idempotency', {
        error: error.message,
        reminderId,
        userId
      });
      throw error;
    }
  }

  // Process a reminder cancellation operation with idempotency checking
  async processCancelReminderWithIdempotency(reminderId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the reminder cancellation has already been processed
      const processedCheck = await this.isOperationProcessed('cancel_reminder', reminderId, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the cancellation operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markOperationProcessed('cancel_reminder', reminderId, userId, result);
      
      logWithContext(correlationId, 'Reminder cancellation processed successfully with idempotency', {
        reminderId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing reminder cancellation with idempotency', {
        error: error.message,
        reminderId,
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

module.exports = ReminderIdempotencyChecker;