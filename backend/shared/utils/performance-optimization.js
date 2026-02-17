// Performance optimization for Advanced Cloud Deployment

// 1. Caching Layer Implementation
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 }); // 10 min TTL

// Cache middleware for frequently accessed data
const cacheMiddleware = (ttl = 600) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      res.json(cachedResponse);
      return;
    }
    
    // Override res.json to capture response for caching
    const originalJson = res.json;
    res.json = function(body) {
      cache.set(key, body, ttl);
      originalJson.call(this, body);
    };
    
    next();
  };
};

// 2. Database Query Optimization
// Connection pooling configuration
const { Pool } = require('pg');

const dbPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // Maximum number of clients in the pool
  min: 5,  // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Optimized database query with indexing hints
async function getTasksWithOptimization(userId, filters = {}) {
  const { status, priority, dueDateFrom, dueDateTo, limit = 50, offset = 0 } = filters;
  
  // Build dynamic query with proper indexing
  let query = `
    SELECT id, title, description, due_date, priority, tags, status, user_id, 
           created_at, updated_at, completed_at
    FROM tasks 
    WHERE user_id = $1
  `;
  const params = [userId];
  let paramIndex = 2;
  
  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }
  
  if (priority) {
    query += ` AND priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }
  
  if (dueDateFrom) {
    query += ` AND due_date >= $${paramIndex}`;
    params.push(dueDateFrom);
    paramIndex++;
  }
  
  if (dueDateTo) {
    query += ` AND due_date <= $${paramIndex}`;
    params.push(dueDateTo);
    paramIndex++;
  }
  
  // Add ordering and pagination
  query += ` ORDER BY due_date ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  try {
    const result = await dbPool.query(query, params);
    return result.rows;
  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
}

// 3. Event Processing Optimization
// Batch event processing to reduce overhead
class EventBatchProcessor {
  constructor(batchSize = 100, flushInterval = 1000) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.eventQueue = [];
    this.flushTimer = null;
  }
  
  async addEvent(event) {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }
  
  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    if (this.eventQueue.length === 0) {
      return;
    }
    
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // Process events in batch
      await this.processEventsBatch(eventsToProcess);
    } catch (error) {
      console.error('Error processing event batch:', error);
      // Requeue events for retry
      this.eventQueue = [...eventsToProcess, ...this.eventQueue];
    }
  }
  
  async processEventsBatch(events) {
    // In a real implementation, this would process the batch of events
    // For example, publish them to the event bus in a single operation
    for (const event of events) {
      await this.publishEvent(event);
    }
  }
  
  async publishEvent(event) {
    // Placeholder for actual event publishing logic
    console.log('Publishing event:', event);
  }
  
  // Cleanup function to be called when shutting down
  async cleanup() {
    await this.flush();
  }
}

// 4. Memory Management Optimization
// Efficient data structures and memory management
class OptimizedTaskManager {
  constructor() {
    // Use Map for better performance with frequent additions/removals
    this.tasks = new Map();
    this.taskIndex = {
      byUser: new Map(), // userId -> Set of taskIds
      byStatus: new Map(), // status -> Set of taskIds
      byDueDate: new Map() // date -> Set of taskIds
    };
  }
  
  addTask(task) {
    // Add to main collection
    this.tasks.set(task.id, task);
    
    // Update indices
    this._addToIndex('byUser', task.userId, task.id);
    this._addToIndex('byStatus', task.status, task.id);
    if (task.dueDate) {
      const dateKey = new Date(task.dueDate).toISOString().split('T')[0]; // Just the date part
      this._addToIndex('byDueDate', dateKey, task.id);
    }
  }
  
  removeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Remove from indices
    this._removeFromIndex('byUser', task.userId, task.id);
    this._removeFromIndex('byStatus', task.status, task.id);
    if (task.dueDate) {
      const dateKey = new Date(task.dueDate).toISOString().split('T')[0];
      this._removeFromIndex('byDueDate', dateKey, task.id);
    }
    
    // Remove from main collection
    this.tasks.delete(taskId);
  }
  
  getTasksByUser(userId) {
    const taskIds = this.taskIndex.byUser.get(userId) || new Set();
    return Array.from(taskIds).map(id => this.tasks.get(id)).filter(Boolean);
  }
  
  getTasksByStatus(status) {
    const taskIds = this.taskIndex.byStatus.get(status) || new Set();
    return Array.from(taskIds).map(id => this.tasks.get(id)).filter(Boolean);
  }
  
  getTasksByDueDate(date) {
    const dateKey = new Date(date).toISOString().split('T')[0];
    const taskIds = this.taskIndex.byDueDate.get(dateKey) || new Set();
    return Array.from(taskIds).map(id => this.tasks.get(id)).filter(Boolean);
  }
  
  _addToIndex(indexName, key, value) {
    if (!this.taskIndex[indexName].has(key)) {
      this.taskIndex[indexName].set(key, new Set());
    }
    this.taskIndex[indexName].get(key).add(value);
  }
  
  _removeFromIndex(indexName, key, value) {
    const index = this.taskIndex[indexName].get(key);
    if (index) {
      index.delete(value);
      if (index.size === 0) {
        this.taskIndex[indexName].delete(key);
      }
    }
  }
}

// 5. Async Operation Optimization
// Optimized async operations with proper error handling
async function optimizedAsyncOperation(data) {
  try {
    // Use Promise.all for truly parallel operations
    const [result1, result2] = await Promise.all([
      performOperation1(data),
      performOperation2(data)
    ]);
    
    // Process results together
    return combineResults(result1, result2);
  } catch (error) {
    // Proper error handling with context
    throw new Error(`Optimized operation failed: ${error.message}`);
  }
}

// 6. Dapr Component Optimization
// Optimized Dapr component configurations for performance
const daprOptimizedConfig = {
  // Configuration for pubsub component with optimized settings
  pubsub: {
    name: 'pubsub',
    type: 'pubsub.kafka',
    version: 'v1',
    metadata: [
      {
        name: 'brokers',
        value: process.env.KAFKA_BROKERS || 'localhost:9092'
      },
      {
        name: 'consumerGroup',
        value: 'optimized-consumer-group'
      },
      {
        name: 'clientID',
        value: 'optimized-client'
      },
      {
        name: 'authType',
        value: 'none'
      },
      // Performance optimizations
      {
        name: 'maxMessageBytes',
        value: '2097152' // 2MB
      },
      {
        name: 'timeoutInSec',
        value: '30'
      },
      {
        name: 'concurrency',
        value: '10'
      },
      // Batch processing settings
      {
        name: 'maxMessageCount',
        value: '100'
      },
      {
        name: 'maxWaitTime',
        value: '1000' // 1 second
      }
    ]
  },
  
  // Configuration for state store with optimized settings
  statestore: {
    name: 'statestore',
    type: 'state.redis',
    version: 'v1',
    metadata: [
      {
        name: 'redisHost',
        value: process.env.REDIS_HOST || 'localhost:6379'
      },
      {
        name: 'redisPassword',
        value: ''
      },
      {
        name: 'actorStateStore',
        value: 'true'
      },
      // Performance optimizations
      {
        name: 'maxRetries',
        value: '3'
      },
      {
        name: 'minRetryInterval',
        value: '1000' // 1 second
      },
      {
        name: 'maxRetryInterval',
        value: '5000' // 5 seconds
      },
      {
        name: 'dialTimeout',
        value: '5000' // 5 seconds
      },
      {
        name: 'readTimeout',
        value: '3000' // 3 seconds
      },
      {
        name: 'writeTimeout',
        value: '3000' // 3 seconds
      }
    ]
  }
};

// 7. Resource Optimization
// Optimized resource allocation for services
const resourceOptimization = {
  // CPU and memory limits based on actual usage patterns
  taskService: {
    limits: {
      cpu: '500m',
      memory: '512Mi'
    },
    requests: {
      cpu: '250m',
      memory: '256Mi'
    }
  },
  reminderService: {
    limits: {
      cpu: '300m',
      memory: '256Mi'
    },
    requests: {
      cpu: '150m',
      memory: '128Mi'
    }
  },
  recurringTaskEngine: {
    limits: {
      cpu: '400m',
      memory: '384Mi'
    },
    requests: {
      cpu: '200m',
      memory: '192Mi'
    }
  },
  notificationService: {
    limits: {
      cpu: '300m',
      memory: '256Mi'
    },
    requests: {
      cpu: '150m',
      memory: '128Mi'
    }
  },
  auditService: {
    limits: {
      cpu: '200m',
      memory: '256Mi'
    },
    requests: {
      cpu: '100m',
      memory: '128Mi'
    }
  }
};

// 8. Network Optimization
// Optimized network settings for service communication
const networkOptimization = {
  // Connection pooling for service invocations
  connectionPool: {
    maxConnections: 50,
    minConnections: 5,
    connectionTimeout: 5000, // 5 seconds
    idleTimeout: 300000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },
  
  // Optimized timeouts for service calls
  timeouts: {
    serviceCall: 10000, // 10 seconds
    eventPublish: 5000, // 5 seconds
    stateOperation: 3000, // 3 seconds
    secretOperation: 2000 // 2 seconds
  }
};

// Export optimized components
module.exports = {
  cacheMiddleware,
  getTasksWithOptimization,
  EventBatchProcessor,
  OptimizedTaskManager,
  optimizedAsyncOperation,
  daprOptimizedConfig,
  resourceOptimization,
  networkOptimization
};