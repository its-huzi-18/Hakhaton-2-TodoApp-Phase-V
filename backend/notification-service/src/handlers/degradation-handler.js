// Graceful degradation handler for Notification Service in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');
const CircuitBreaker = require('../../../shared/utils/circuit-breaker');
const RetryMechanism = require('../../../shared/utils/retry-mechanism');

class DegradationHandler {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.serviceName = 'notification-service';
    
    // Create circuit breakers for different notification channels
    this.circuitBreakers = {
      email: new CircuitBreaker({ name: 'email-channel', failureThreshold: 3, timeout: 30000 }),
      push: new CircuitBreaker({ name: 'push-channel', failureThreshold: 3, timeout: 30000 }),
      sms: new CircuitBreaker({ name: 'sms-channel', failureThreshold: 2, timeout: 60000 }),
      in_app: new CircuitBreaker({ name: 'in-app-channel', failureThreshold: 5, timeout: 15000 })
    };
    
    // Create retry mechanisms for different operations
    this.retryMechanisms = {
      send: new RetryMechanism({ maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }),
      delivery: new RetryMechanism({ maxRetries: 2, baseDelay: 2000, maxDelay: 5000 })
    };
  }

  // Handle notification sending with degradation
  async handleSendNotification(notification) {
    const correlationId = generateCorrelationId();
    
    try {
      logWithContext(correlationId, 'Handling notification send with degradation support', {
        notificationId: notification.id,
        channel: notification.channel,
        userId: notification.userId
      });

      // Check if the channel's circuit breaker is open
      const circuitBreaker = this.circuitBreakers[notification.channel];
      if (circuitBreaker.getState().state === 'OPEN') {
        logWithContext(correlationId, 'Channel circuit breaker is open, degrading gracefully', {
          channel: notification.channel,
          notificationId: notification.id
        });
        
        // Try alternative channels if available
        const alternativeResult = await this.tryAlternativeChannels(notification, correlationId);
        if (alternativeResult.success) {
          return alternativeResult;
        }
        
        // If no alternatives work, store for later delivery
        await this.storeForLaterDelivery(notification, 'circuit_breaker_open');
        return { success: false, degraded: true, reason: 'circuit_breaker_open' };
      }

      // Attempt to send with retry mechanism
      const result = await this.retryMechanisms.send.execute(
        async () => {
          return await this.notificationService.providers[notification.channel].send(notification);
        },
        { operationName: `send-notification-${notification.channel}` }
      );

      logWithContext(correlationId, 'Notification sent successfully', {
        notificationId: notification.id,
        channel: notification.channel,
        result: result.messageId ? { messageId: result.messageId } : result
      });

      return { success: true, result };
    } catch (error) {
      logWithContext(correlationId, 'Notification sending failed, triggering degradation', {
        notificationId: notification.id,
        channel: notification.channel,
        error: error.message
      });

      // Record the failure in the circuit breaker
      const circuitBreaker = this.circuitBreakers[notification.channel];
      circuitBreaker.onFailure(error);

      // Try alternative channels
      const alternativeResult = await this.tryAlternativeChannels(notification, correlationId);
      if (alternativeResult.success) {
        return alternativeResult;
      }

      // If all channels fail, store for later delivery
      await this.storeForLaterDelivery(notification, error.message);
      return { success: false, degraded: true, reason: error.message };
    }
  }

  // Try alternative channels when primary channel fails
  async tryAlternativeChannels(notification, correlationId) {
    // Define channel priority for fallback
    const channelFallbackOrder = {
      'email': ['in_app', 'push'],
      'push': ['email', 'in_app'],
      'sms': ['email', 'in_app'],
      'in_app': ['email', 'push']
    };

    const fallbackChannels = channelFallbackOrder[notification.channel] || [];

    for (const fallbackChannel of fallbackChannels) {
      try {
        const circuitBreaker = this.circuitBreakers[fallbackChannel];
        if (circuitBreaker.getState().state === 'OPEN') {
          continue; // Skip if circuit breaker is open
        }

        logWithContext(correlationId, 'Attempting fallback channel', {
          originalChannel: notification.channel,
          fallbackChannel,
          notificationId: notification.id
        });

        const result = await this.retryMechanisms.send.execute(
          async () => {
            return await this.notificationService.providers[fallbackChannel].send({
              ...notification,
              channel: fallbackChannel // Update channel to fallback channel
            });
          },
          { operationName: `fallback-send-${fallbackChannel}` }
        );

        logWithContext(correlationId, 'Notification sent via fallback channel', {
          notificationId: notification.id,
          originalChannel: notification.channel,
          fallbackChannel,
          result: result.messageId ? { messageId: result.messageId } : result
        });

        return { success: true, result, fallbackUsed: true, fallbackChannel };
      } catch (fallbackError) {
        logWithContext(correlationId, 'Fallback channel also failed', {
          fallbackChannel,
          error: fallbackError.message
        });

        // Record the failure in the fallback channel's circuit breaker
        const circuitBreaker = this.circuitBreakers[fallbackChannel];
        circuitBreaker.onFailure(fallbackError);
      }
    }

    return { success: false, fallbackUsed: false };
  }

  // Store notification for later delivery
  async storeForLaterDelivery(notification, reason) {
    const correlationId = generateCorrelationId();
    
    // In a real implementation, this would store the notification in a database
    // or message queue for later processing
    logWithContext(correlationId, 'Storing notification for later delivery', {
      notificationId: notification.id,
      channel: notification.channel,
      reason,
      userId: notification.userId
    });

    // Add to a delayed delivery queue (in-memory for this example)
    if (!this.delayedDeliveryQueue) {
      this.delayedDeliveryQueue = [];
    }

    this.delayedDeliveryQueue.push({
      notification,
      reason,
      scheduledTime: new Date(Date.now() + 5 * 60 * 1000), // Try again in 5 minutes
      attempts: 0,
      maxAttempts: 3
    });

    // Set up a delayed retry
    setTimeout(() => {
      this.processDelayedDelivery();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Process delayed delivery queue
  async processDelayedDelivery() {
    const correlationId = generateCorrelationId();
    
    if (!this.delayedDeliveryQueue || this.delayedDeliveryQueue.length === 0) {
      return;
    }

    const now = new Date();
    const readyForRetry = this.delayedDeliveryQueue.filter(item => item.scheduledTime <= now);

    for (const item of readyForRetry) {
      try {
        // Remove from queue temporarily
        this.delayedDeliveryQueue = this.delayedDeliveryQueue.filter(i => i !== item);

        // Increment attempt count
        item.attempts++;

        logWithContext(correlationId, 'Retrying delayed notification', {
          notificationId: item.notification.id,
          attempt: item.attempts,
          maxAttempts: item.maxAttempts
        });

        // Try to send again
        const result = await this.handleSendNotification(item.notification);

        if (result.success) {
          logWithContext(correlationId, 'Delayed notification sent successfully on retry', {
            notificationId: item.notification.id,
            attempt: item.attempts
          });
        } else if (item.attempts < item.maxAttempts) {
          // Put back in queue for another retry later
          item.scheduledTime = new Date(Date.now() + Math.pow(2, item.attempts) * 5 * 60 * 1000); // Exponential backoff
          this.delayedDeliveryQueue.push(item);
          
          logWithContext(correlationId, 'Delayed notification retry failed, rescheduling', {
            notificationId: item.notification.id,
            nextRetry: item.scheduledTime
          });
        } else {
          logWithContext(correlationId, 'Delayed notification failed after all retries, giving up', {
            notificationId: item.notification.id,
            attempts: item.attempts
          });
          // In a real system, we might want to notify the user or log permanently
        }
      } catch (error) {
        logWithContext(correlationId, 'Error processing delayed notification', {
          notificationId: item.notification.id,
          error: error.message
        });
        
        // Put back in queue for another retry
        this.delayedDeliveryQueue.push(item);
      }
    }
  }

  // Handle bulk notification sending with degradation
  async handleBulkSendNotifications(notifications) {
    const correlationId = generateCorrelationId();
    
    logWithContext(correlationId, 'Handling bulk notification send with degradation', {
      notificationCount: notifications.length
    });

    const results = [];
    let successfulCount = 0;
    let degradedCount = 0;

    for (const notification of notifications) {
      try {
        const result = await this.handleSendNotification(notification);
        results.push({ notificationId: notification.id, ...result });
        
        if (result.success) {
          successfulCount++;
        } else if (result.degraded) {
          degradedCount++;
        }
      } catch (error) {
        logWithContext(correlationId, 'Unexpected error sending notification', {
          notificationId: notification.id,
          error: error.message
        });
        
        results.push({ 
          notificationId: notification.id, 
          success: false, 
          degraded: true, 
          reason: error.message 
        });
        degradedCount++;
      }
    }

    logWithContext(correlationId, 'Bulk notification processing completed', {
      totalNotifications: notifications.length,
      successfulCount,
      degradedCount,
      failureRate: ((degradedCount / notifications.length) * 100).toFixed(2) + '%'
    });

    return {
      results,
      summary: {
        total: notifications.length,
        successful: successfulCount,
        degraded: degradedCount,
        successRate: (successfulCount / notifications.length) * 100
      }
    };
  }

  // Get degradation statistics
  getStats() {
    const circuitStats = {};
    for (const [channel, circuitBreaker] of Object.entries(this.circuitBreakers)) {
      circuitStats[channel] = circuitBreaker.getStats();
    }

    return {
      circuitBreakerStates: Object.fromEntries(
        Object.entries(this.circuitBreakers).map(([channel, cb]) => [channel, cb.getState().state])
      ),
      circuitBreakerStats: circuitStats,
      delayedQueueSize: this.delayedDeliveryQueue ? this.delayedDeliveryQueue.length : 0,
      serviceName: this.serviceName
    };
  }

  // Force reset a circuit breaker (for testing purposes)
  resetCircuitBreaker(channel) {
    if (this.circuitBreakers[channel]) {
      this.circuitBreakers[channel].forceClose();
      logWithContext(generateCorrelationId(), 'Circuit breaker reset', {
        channel,
        serviceName: this.serviceName
      });
      return true;
    }
    return false;
  }

  // Get the status of all circuit breakers
  getCircuitBreakerStatus() {
    const status = {};
    for (const [channel, circuitBreaker] of Object.entries(this.circuitBreakers)) {
      status[channel] = circuitBreaker.getState();
    }
    return status;
  }
}

module.exports = DegradationHandler;