// Idempotency checker for NotificationService in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class NotificationIdempotencyChecker {
  constructor() {
    this.serviceName = 'notification-service';
    this.processedNotifications = new Map(); // Store processed notifications
    this.notificationTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Start periodic cleanup
    this.startCleanup();
  }

  // Generate a unique key for idempotency checking
  generateKey(notificationId, operationType, userId = null) {
    // Create a unique key based on notification ID, operation type, and optionally user ID
    const baseKey = `${notificationId}:${operationType}`;
    return userId ? `${baseKey}:${userId}` : baseKey;
  }

  // Check if a notification operation has already been processed
  async isNotificationOperationProcessed(notificationId, operationType, userId = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(notificationId, operationType, userId);
    
    try {
      // Check if the notification operation has been processed before
      const processedNotification = this.processedNotifications.get(key);
      
      if (processedNotification) {
        logWithContext(correlationId, 'Notification operation already processed (idempotency check)', {
          notificationId,
          operationType,
          userId,
          service: this.serviceName,
          result: processedNotification.result
        });
        
        return {
          isProcessed: true,
          result: processedNotification.result,
          timestamp: processedNotification.timestamp
        };
      }
      
      logWithContext(correlationId, 'Notification operation not previously processed', {
        notificationId,
        operationType,
        userId,
        service: this.serviceName
      });
      
      return { isProcessed: false };
    } catch (error) {
      logWithContext(correlationId, 'Error checking if notification operation was processed', {
        error: error.message,
        notificationId,
        operationType,
        userId
      });
      throw error;
    }
  }

  // Mark a notification operation as processed
  async markNotificationOperationProcessed(notificationId, operationType, userId = null, result = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(notificationId, operationType, userId);
    
    try {
      // Store the notification operation as processed with its result
      this.processedNotifications.set(key, {
        result,
        timestamp: new Date(),
        operationType,
        userId
      });
      
      logWithContext(correlationId, 'Notification operation marked as processed', {
        notificationId,
        operationType,
        userId,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error marking notification operation as processed', {
        error: error.message,
        notificationId,
        operationType,
        userId
      });
      throw error;
    }
  }

  // Remove a processed notification operation (for cleanup purposes)
  removeProcessed(notificationId, operationType, userId = null) {
    const key = this.generateKey(notificationId, operationType, userId);
    this.processedNotifications.delete(key);
  }

  // Cleanup old processed notification operations
  cleanup() {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [key, notification] of this.processedNotifications.entries()) {
        const timeDiff = now - notification.timestamp;
        
        if (timeDiff > this.notificationTimeout) {
          this.processedNotifications.delete(key);
          cleanedCount++;
        }
      }
      
      logWithContext(correlationId, 'Notification idempotency checker cleanup completed', {
        cleanedCount,
        remainingCount: this.processedNotifications.size,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error during notification idempotency checker cleanup', {
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

  // Process a notification sending operation with idempotency checking
  async processSendNotificationWithIdempotency(notificationId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the notification sending has already been processed
      const processedCheck = await this.isNotificationOperationProcessed(notificationId, 'send_notification', userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the sending operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markNotificationOperationProcessed(notificationId, 'send_notification', userId, result);
      
      logWithContext(correlationId, 'Notification sending processed successfully with idempotency', {
        notificationId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing notification sending with idempotency', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  // Process a notification delivery operation with idempotency checking
  async processDeliverNotificationWithIdempotency(notificationId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the notification delivery has already been processed
      const processedCheck = await this.isNotificationOperationProcessed(notificationId, 'deliver_notification', userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the delivery operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markNotificationOperationProcessed(notificationId, 'deliver_notification', userId, result);
      
      logWithContext(correlationId, 'Notification delivery processed successfully with idempotency', {
        notificationId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing notification delivery with idempotency', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  // Process a notification status update operation with idempotency checking
  async processUpdateNotificationStatusWithIdempotency(notificationId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the notification status update has already been processed
      const processedCheck = await this.isNotificationOperationProcessed(notificationId, 'update_status', userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the status update operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markNotificationOperationProcessed(notificationId, 'update_status', userId, result);
      
      logWithContext(correlationId, 'Notification status update processed successfully with idempotency', {
        notificationId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing notification status update with idempotency', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  // Process a notification creation operation with idempotency checking
  async processCreateNotificationWithIdempotency(notificationId, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the notification creation has already been processed
      const processedCheck = await this.isNotificationOperationProcessed(notificationId, 'create_notification', userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the creation operation
      const result = await processorFn();
      
      // Mark the operation as processed with its result
      await this.markNotificationOperationProcessed(notificationId, 'create_notification', userId, result);
      
      logWithContext(correlationId, 'Notification creation processed successfully with idempotency', {
        notificationId,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing notification creation with idempotency', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  // Get statistics about processed notification operations
  getStats() {
    return {
      processedCount: this.processedNotifications.size,
      serviceName: this.serviceName,
      notificationTimeout: this.notificationTimeout,
      cleanupInterval: this.cleanupInterval
    };
  }

  // Clear all processed notification operations (for testing purposes)
  clearAll() {
    this.processedNotifications.clear();
  }
}

module.exports = NotificationIdempotencyChecker;