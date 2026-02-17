// Retry mechanism with exponential backoff for Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class RetryMechanism {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second base delay
    this.maxDelay = options.maxDelay || 60000; // 60 seconds max delay
    this.jitter = options.jitter || true; // Add random jitter to prevent thundering herd
    this.retryableErrors = options.retryableErrors || [
      'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
      'NetworkError', 'TimeoutError', 'ServerError'
    ];
  }

  // Execute a function with retry logic
  async execute(fn, options = {}) {
    const correlationId = generateCorrelationId();
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    const operationName = options.operationName || 'unknown-operation';
    
    let lastError;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      attempt++;
      
      try {
        logWithContext(correlationId, 'Executing operation with retry mechanism', {
          operation: operationName,
          attempt,
          maxRetries
        });
        
        const result = await fn(attempt);
        
        logWithContext(correlationId, 'Operation succeeded', {
          operation: operationName,
          attempt,
          success: true
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        logWithContext(correlationId, 'Operation failed, checking if retry is possible', {
          operation: operationName,
          attempt,
          maxRetries,
          error: error.message,
          errorCode: error.code
        });
        
        // Check if we should retry
        if (attempt >= maxRetries || !this.shouldRetry(error)) {
          logWithContext(correlationId, 'Operation failed and will not be retried', {
            operation: operationName,
            attempt,
            maxRetries,
            error: error.message
          });
          
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        
        logWithContext(correlationId, 'Waiting before retry', {
          operation: operationName,
          attempt,
          delay: `${delay}ms`,
          nextAttempt: new Date(Date.now() + delay).toISOString()
        });
        
        // Wait before retrying
        await this.wait(delay);
      }
    }
    
    // If we've exhausted all retries, throw the last error
    logWithContext(correlationId, 'Operation failed after all retry attempts', {
      operation: operationName,
      attemptsMade: attempt,
      maxRetries,
      finalError: lastError.message
    });
    
    throw lastError;
  }

  // Check if an error is retryable
  shouldRetry(error) {
    // Check if error code is in retryable list
    if (error.code && this.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check if error message indicates a retryable condition
    const errorMessage = error.message ? error.message.toLowerCase() : '';
    if (this.retryableErrors.some(retryable => 
      errorMessage.includes(retryable.toLowerCase()))) {
      return true;
    }
    
    // Check if error name indicates a retryable condition
    if (error.name && this.retryableErrors.includes(error.name)) {
      return true;
    }
    
    // Check for specific HTTP status codes if error has statusCode
    if (error.statusCode) {
      // Retry on 5xx server errors and 429 (rate limit)
      if (error.statusCode >= 500 || error.statusCode === 429) {
        return true;
      }
    }
    
    // Default to not retrying
    return false;
  }

  // Calculate delay with exponential backoff
  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * (2 ^ (attempt - 1))
    let delay = this.baseDelay * Math.pow(2, attempt - 1);
    
    // Cap the delay at maxDelay
    delay = Math.min(delay, this.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      // Add random jitter of up to 25% of the calculated delay
      const jitter = Math.random() * 0.25 * delay;
      delay += jitter;
    }
    
    return Math.round(delay);
  }

  // Wait for a specified amount of time
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Execute multiple operations with retry logic
  async executeAll(operations, options = {}) {
    const correlationId = generateCorrelationId();
    const results = [];
    const errors = [];
    
    logWithContext(correlationId, 'Executing multiple operations with retry mechanism', {
      operationCount: operations.length
    });
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const operationName = `${options.operationName || 'batch-operation'}-${i}`;
      
      try {
        const result = await this.execute(operation, { ...options, operationName });
        results.push({ index: i, result, success: true });
      } catch (error) {
        errors.push({ index: i, error, success: false });
        results.push({ index: i, error, success: false });
      }
    }
    
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.length - successfulCount;
    
    logWithContext(correlationId, 'Multiple operations execution completed', {
      totalCount: operations.length,
      successfulCount,
      failedCount
    });
    
    return {
      results,
      successful: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      allSuccessful: failedCount === 0
    };
  }

  // Execute operations in parallel with retry logic
  async executeParallel(operations, options = {}) {
    const correlationId = generateCorrelationId();
    
    logWithContext(correlationId, 'Executing operations in parallel with retry mechanism', {
      operationCount: operations.length
    });
    
    const promises = operations.map(async (operation, index) => {
      const operationName = `${options.operationName || 'parallel-operation'}-${index}`;
      
      try {
        const result = await this.execute(operation, { ...options, operationName });
        return { index, result, success: true };
      } catch (error) {
        return { index, error, success: false };
      }
    });
    
    const results = await Promise.all(promises);
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.length - successfulCount;
    
    logWithContext(correlationId, 'Parallel operations execution completed', {
      totalCount: operations.length,
      successfulCount,
      failedCount
    });
    
    return {
      results,
      successful: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      allSuccessful: failedCount === 0
    };
  }

  // Execute with custom retry condition
  async executeWithCondition(fn, retryCondition, options = {}) {
    const correlationId = generateCorrelationId();
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    const operationName = options.operationName || 'conditional-retry-operation';
    
    let lastResult;
    let lastError;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      attempt++;
      
      try {
        logWithContext(correlationId, 'Executing conditional retry operation', {
          operation: operationName,
          attempt,
          maxRetries
        });
        
        const result = await fn(attempt);
        lastResult = result;
        
        // Check if we should retry based on the custom condition
        if (attempt <= maxRetries && retryCondition(result, attempt)) {
          logWithContext(correlationId, 'Custom retry condition met, retrying', {
            operation: operationName,
            attempt,
            result: typeof result === 'object' ? Object.keys(result) : result
          });
          
          const delay = this.calculateDelay(attempt);
          await this.wait(delay);
          continue;
        }
        
        logWithContext(correlationId, 'Conditional operation succeeded', {
          operation: operationName,
          attempt,
          success: true
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        logWithContext(correlationId, 'Conditional operation failed', {
          operation: operationName,
          attempt,
          maxRetries,
          error: error.message
        });
        
        // Check if we should retry based on error
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateDelay(attempt);
          await this.wait(delay);
          continue;
        }
        
        break;
      }
    }
    
    if (lastError) {
      logWithContext(correlationId, 'Conditional operation failed after all attempts', {
        operation: operationName,
        attemptsMade: attempt,
        maxRetries,
        finalError: lastError.message
      });
      
      throw lastError;
    }
    
    logWithContext(correlationId, 'Conditional operation completed after retries', {
      operation: operationName,
      attemptsMade: attempt,
      maxRetries,
      finalResult: typeof lastResult === 'object' ? Object.keys(lastResult) : lastResult
    });
    
    return lastResult;
  }

  // Get configuration details
  getConfig() {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      jitter: this.jitter,
      retryableErrors: [...this.retryableErrors]
    };
  }
}

module.exports = RetryMechanism;