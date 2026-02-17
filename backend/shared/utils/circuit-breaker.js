// Circuit Breaker implementation for Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default-circuit-breaker';
    this.failureThreshold = options.failureThreshold || 5; // Number of failures before opening
    this.timeout = options.timeout || 60000; // Time in ms to wait before attempting reset
    this.resetTimeout = options.resetTimeout || 30000; // Time in ms to wait after half-open state
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.successOnHalfOpen = false;
    
    // Statistics
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }

  // Execute a function with circuit breaker protection
  async call(fn, ...args) {
    const correlationId = generateCorrelationId();
    
    this.totalCalls++;
    
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (new Date() >= this.nextAttemptTime) {
        // Transition to half-open state
        this.state = 'HALF_OPEN';
        logWithContext(correlationId, 'Circuit breaker transitioning to HALF_OPEN state', {
          name: this.name,
          failureCount: this.failureCount
        });
      } else {
        // Still in open state, fail fast
        logWithContext(correlationId, 'Circuit breaker is OPEN, failing fast', {
          name: this.name
        });
        
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.code = 'CIRCUIT_BREAKER_OPEN';
        this.totalFailures++;
        throw error;
      }
    }
    
    try {
      // Execute the function
      const result = await fn(...args);
      
      // Handle success
      this.onSuccess();
      this.totalSuccesses++;
      
      logWithContext(correlationId, 'Circuit breaker call succeeded', {
        name: this.name,
        state: this.state
      });
      
      return result;
    } catch (error) {
      // Handle failure
      this.onFailure(error);
      this.totalFailures++;
      
      logWithContext(correlationId, 'Circuit breaker call failed', {
        name: this.name,
        state: this.state,
        error: error.message
      });
      
      throw error;
    }
  }

  // Handle successful execution
  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      // If we're in half-open state and the call succeeded, reset the circuit
      this.reset();
    }
  }

  // Handle failed execution
  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === 'HALF_OPEN') {
      // If we're in half-open state and the call failed, open the circuit again
      this.openCircuit();
    } else if (this.failureCount >= this.failureThreshold) {
      // If we've reached the failure threshold, open the circuit
      this.openCircuit();
    }
  }

  // Open the circuit
  openCircuit() {
    this.state = 'OPEN';
    this.nextAttemptTime = new Date(Date.now() + this.timeout);
    
    logWithContext(generateCorrelationId(), 'Circuit breaker opened', {
      name: this.name,
      failureCount: this.failureCount,
      timeout: this.timeout
    });
  }

  // Reset the circuit
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    logWithContext(generateCorrelationId(), 'Circuit breaker reset', {
      name: this.name
    });
  }

  // Transition to half-open state for testing
  attemptReset() {
    if (this.state === 'OPEN' && new Date() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
      logWithContext(generateCorrelationId(), 'Circuit breaker transitioning to HALF_OPEN for reset attempt', {
        name: this.name
      });
      return true;
    }
    return false;
  }

  // Get current state
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      name: this.name
    };
  }

  // Get statistics
  getStats() {
    return {
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      failureRate: this.totalCalls > 0 ? (this.totalFailures / this.totalCalls) * 100 : 0,
      name: this.name
    };
  }

  // Force open the circuit (for testing purposes)
  forceOpen() {
    this.state = 'OPEN';
    this.nextAttemptTime = new Date(Date.now() + this.timeout);
    logWithContext(generateCorrelationId(), 'Circuit breaker forced OPEN', {
      name: this.name
    });
  }

  // Force closed the circuit (for testing purposes)
  forceClose() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    logWithContext(generateCorrelationId(), 'Circuit breaker forced CLOSED', {
      name: this.name
    });
  }
}

module.exports = CircuitBreaker;