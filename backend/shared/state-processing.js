// State management for processing status in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class ProcessingStateManager {
  constructor(serviceName = 'generic-service') {
    this.serviceName = serviceName;
    this.stateStore = new Map(); // Store processing states
    this.stateTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Start periodic cleanup
    this.startCleanup();
  }

  // Generate a unique key for state management
  generateKey(entityType, entityId, operationType = 'default') {
    // Create a unique key based on entity type, ID, and operation type
    return `${entityType}:${entityId}:${operationType}`;
  }

  // Check if an entity is currently being processed
  async isBeingProcessed(entityType, entityId, operationType = 'default') {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(entityType, entityId, operationType);
    
    try {
      const state = this.stateStore.get(key);
      
      if (state) {
        // Check if the state has expired
        const now = new Date();
        const timeDiff = now - state.timestamp;
        
        if (timeDiff > this.stateTimeout) {
          // State has expired, remove it and return false
          this.stateStore.delete(key);
          logWithContext(correlationId, 'Processing state expired, removed from store', {
            key,
            service: this.serviceName
          });
          return false;
        }
        
        logWithContext(correlationId, 'Entity is currently being processed', {
          entityType,
          entityId,
          operationType,
          service: this.serviceName,
          state: state.status
        });
        
        return {
          isProcessing: true,
          status: state.status,
          timestamp: state.timestamp,
          context: state.context
        };
      }
      
      logWithContext(correlationId, 'Entity is not currently being processed', {
        entityType,
        entityId,
        operationType,
        service: this.serviceName
      });
      
      return { isProcessing: false };
    } catch (error) {
      logWithContext(correlationId, 'Error checking if entity is being processed', {
        error: error.message,
        entityType,
        entityId,
        operationType
      });
      throw error;
    }
  }

  // Set the processing state for an entity
  async setProcessingState(entityType, entityId, operationType = 'default', status = 'processing', context = {}) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(entityType, entityId, operationType);
    
    try {
      // Store the processing state
      this.stateStore.set(key, {
        status,
        timestamp: new Date(),
        context,
        operationType,
        entityType,
        entityId
      });
      
      logWithContext(correlationId, 'Processing state set for entity', {
        key,
        status,
        service: this.serviceName,
        context: Object.keys(context)
      });
    } catch (error) {
      logWithContext(correlationId, 'Error setting processing state for entity', {
        error: error.message,
        entityType,
        entityId,
        operationType,
        status
      });
      throw error;
    }
  }

  // Update the processing state for an entity
  async updateProcessingState(entityType, entityId, operationType = 'default', newStatus, contextUpdates = {}) {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(entityType, entityId, operationType);
    
    try {
      const currentState = this.stateStore.get(key);
      
      if (!currentState) {
        logWithContext(correlationId, 'No existing processing state found, creating new one', {
          key,
          newStatus,
          service: this.serviceName
        });
        
        // If no state exists, create a new one
        await this.setProcessingState(entityType, entityId, operationType, newStatus, contextUpdates);
        return;
      }
      
      // Update the existing state
      this.stateStore.set(key, {
        ...currentState,
        status: newStatus,
        timestamp: new Date(),
        context: { ...currentState.context, ...contextUpdates }
      });
      
      logWithContext(correlationId, 'Processing state updated for entity', {
        key,
        newStatus,
        service: this.serviceName,
        contextUpdates: Object.keys(contextUpdates)
      });
    } catch (error) {
      logWithContext(correlationId, 'Error updating processing state for entity', {
        error: error.message,
        entityType,
        entityId,
        operationType,
        newStatus
      });
      throw error;
    }
  }

  // Remove the processing state for an entity
  async removeProcessingState(entityType, entityId, operationType = 'default') {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(entityType, entityId, operationType);
    
    try {
      const existed = this.stateStore.delete(key);
      
      if (existed) {
        logWithContext(correlationId, 'Processing state removed for entity', {
          key,
          service: this.serviceName
        });
      } else {
        logWithContext(correlationId, 'No processing state found to remove for entity', {
          key,
          service: this.serviceName
        });
      }
    } catch (error) {
      logWithContext(correlationId, 'Error removing processing state for entity', {
        error: error.message,
        entityType,
        entityId,
        operationType
      });
      throw error;
    }
  }

  // Get the processing state for an entity
  async getProcessingState(entityType, entityId, operationType = 'default') {
    const correlationId = generateCorrelationId();
    const key = this.generateKey(entityType, entityId, operationType);
    
    try {
      const state = this.stateStore.get(key);
      
      if (state) {
        // Check if the state has expired
        const now = new Date();
        const timeDiff = now - state.timestamp;
        
        if (timeDiff > this.stateTimeout) {
          // State has expired, remove it and return null
          this.stateStore.delete(key);
          logWithContext(correlationId, 'Processing state expired, removed from store', {
            key,
            service: this.serviceName
          });
          return null;
        }
        
        logWithContext(correlationId, 'Retrieved processing state for entity', {
          key,
          service: this.serviceName,
          status: state.status
        });
        
        return state;
      }
      
      logWithContext(correlationId, 'No processing state found for entity', {
        key,
        service: this.serviceName
      });
      
      return null;
    } catch (error) {
      logWithContext(correlationId, 'Error getting processing state for entity', {
        error: error.message,
        entityType,
        entityId,
        operationType
      });
      throw error;
    }
  }

  // Cleanup expired processing states
  cleanup() {
    const correlationId = generateCorrelationId();
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [key, state] of this.stateStore.entries()) {
        const timeDiff = now - state.timestamp;
        
        if (timeDiff > this.stateTimeout) {
          this.stateStore.delete(key);
          cleanedCount++;
        }
      }
      
      logWithContext(correlationId, 'Processing state manager cleanup completed', {
        cleanedCount,
        remainingCount: this.stateStore.size,
        service: this.serviceName
      });
    } catch (error) {
      logWithContext(correlationId, 'Error during processing state manager cleanup', {
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

  // Process an entity with state management
  async processWithStateManagement(entityType, entityId, operationType, processorFn, context = {}) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the entity is already being processed
      const processingCheck = await this.isBeingProcessed(entityType, entityId, operationType);
      
      if (processingCheck.isProcessing) {
        logWithContext(correlationId, 'Entity is already being processed, skipping', {
          entityType,
          entityId,
          operationType,
          currentStatus: processingCheck.status
        });
        
        // Return the current state to indicate it's already being processed
        return {
          alreadyProcessing: true,
          status: processingCheck.status,
          timestamp: processingCheck.timestamp
        };
      }
      
      // Set the processing state to 'processing'
      await this.setProcessingState(entityType, entityId, operationType, 'processing', {
        ...context,
        startedAt: new Date().toISOString(),
        correlationId
      });
      
      try {
        // Process the entity
        const result = await processorFn();
        
        // Update the state to 'completed'
        await this.updateProcessingState(
          entityType, 
          entityId, 
          operationType, 
          'completed', 
          { 
            completedAt: new Date().toISOString(), 
            result: typeof result === 'object' ? Object.keys(result) : result 
          }
        );
        
        logWithContext(correlationId, 'Entity processed successfully with state management', {
          entityType,
          entityId,
          operationType,
          service: this.serviceName
        });
        
        return {
          success: true,
          result,
          status: 'completed'
        };
      } catch (error) {
        // Update the state to 'failed'
        await this.updateProcessingState(
          entityType, 
          entityId, 
          operationType, 
          'failed', 
          { 
            failedAt: new Date().toISOString(), 
            error: error.message 
          }
        );
        
        logWithContext(correlationId, 'Entity processing failed with state management', {
          entityType,
          entityId,
          operationType,
          service: this.serviceName,
          error: error.message
        });
        
        throw error;
      } finally {
        // Optionally, remove the state after processing is complete
        // This is commented out to keep the final state for a while
        // await this.removeProcessingState(entityType, entityId, operationType);
      }
    } catch (error) {
      logWithContext(correlationId, 'Error processing entity with state management', {
        error: error.message,
        entityType,
        entityId,
        operationType
      });
      throw error;
    }
  }

  // Get statistics about processing states
  getStats() {
    return {
      stateCount: this.stateStore.size,
      serviceName: this.serviceName,
      stateTimeout: this.stateTimeout,
      cleanupInterval: this.cleanupInterval
    };
  }

  // Clear all processing states (for testing purposes)
  clearAll() {
    this.stateStore.clear();
  }
}

module.exports = ProcessingStateManager;