// Idempotency checker for TaskService in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class IdempotencyChecker {
  constructor(serviceName = 'generic') {
    this.serviceName = serviceName;
    this.processedRequests = new Map(); // Store processed request IDs
    this.requestTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Start periodic cleanup
    this.startCleanup();
  }

  // Generate a unique key for idempotency checking
  generateKey(requestId, operation, userId = null) {
    // Create a unique key based on request ID, operation, and optionally user ID
    const baseKey = `${requestId}:${operation}`;
    return userId ? `${baseKey}:${userId}` : baseKey;
  }

  // Check if a request has already been processed
  async isProcessed(requestId, operation, userId = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(requestId, operation, userId);
    
    try {
      // Check if the request has been processed before
      const processedRequest = this.processedRequests.get(key);
      
      if (processedRequest) {
        logWithContext(correlationId, 'Request already processed (idempotency check)', {
          requestId,
          operation,
          userId,
          service: this.serviceName,
          result: processedRequest.result
        });
        
        return {
          isProcessed: true,
          result: processedRequest.result,
          timestamp: processedRequest.timestamp
        };
      }
      
      logWithContext(correlationId, 'Request not previously processed', {
        requestId,
        operation,
        userId,
        service: this.serviceName
      });
      
      return { isProcessed: false };
    } catch (error) {
      logWithContext(correlationId, 'Error checking if request was processed', {
        error: error.message,
        requestId,
        operation,
        userId
      });
      throw error;
    }
  }

  // Mark a request as processed
  async markProcessed(requestId, operation, userId = null, result = null) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(requestId, operation, userId);
    
    try {
      // Store the request as processed with its result
      this.processedRequests.set(key, {
        result,
        timestamp: new Date(),
        operation,
        userId
      });
      
      logWithContext(correlationId, 'Request marked as processed', {
        requestId,
        operation,
        userId,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error marking request as processed', {
        error: error.message,
        requestId,
        operation,
        userId
      });
      throw error;
    }
  }

  // Remove a processed request (for cleanup purposes)
  removeProcessed(requestId, operation, userId = null) {
    const key = this.generateKey(requestId, operation, userId);
    this.processedRequests.delete(key);
  }

  // Cleanup old processed requests
  cleanup() {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [key, request] of this.processedRequests.entries()) {
        const timeDiff = now - request.timestamp;
        
        if (timeDiff > this.requestTimeout) {
          this.processedRequests.delete(key);
          cleanedCount++;
        }
      }
      
      logWithContext(correlationId, 'Idempotency checker cleanup completed', {
        cleanedCount,
        remainingCount: this.processedRequests.size,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error during idempotency checker cleanup', {
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

  // Process a request with idempotency checking
  async processWithIdempotency(requestId, operation, userId, processorFn) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the request has already been processed
      const processedCheck = await this.isProcessed(requestId, operation, userId);
      
      if (processedCheck.isProcessed) {
        // Return the previous result to maintain idempotency
        return processedCheck.result;
      }
      
      // Process the request
      const result = await processorFn();
      
      // Mark the request as processed with its result
      await this.markProcessed(requestId, operation, userId, result);
      
      logWithContext(correlationId, 'Request processed successfully with idempotency', {
        requestId,
        operation,
        userId,
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      logWithContext(correlationId, 'Error processing request with idempotency', {
        error: error.message,
        requestId,
        operation,
        userId
      });
      throw error;
    }
  }

  // Get statistics about processed requests
  getStats() {
    return {
      processedCount: this.processedRequests.size,
      serviceName: this.serviceName,
      requestTimeout: this.requestTimeout,
      cleanupInterval: this.cleanupInterval
    };
  }

  // Clear all processed requests (for testing purposes)
  clearAll() {
    this.processedRequests.clear();
  }
}

module.exports = IdempotencyChecker;