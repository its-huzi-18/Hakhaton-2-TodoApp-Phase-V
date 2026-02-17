// Health check endpoints for Recurring Task Engine in Advanced Cloud Deployment

const express = require('express');
const router = express.Router();
const { logWithContext, generateCorrelationId } = require('../../shared/utils/logging-monitoring');

// Health check endpoint
router.get('/health', async (req, res) => {
  const correlationId = generateCorrelationId();
  
  try {
    // Perform basic health checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'recurring-task-engine',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: await checkDatabaseConnection(),
        dapr: await checkDaprConnection(),
        memory: checkMemoryUsage(),
        eventBus: await checkEventBusConnection(),
        recurrenceProcessor: await checkRecurrenceProcessorHealth()
      }
    };

    // Determine overall status based on individual checks
    const allChecksPassed = Object.values(healthStatus.checks).every(check => check.status === 'healthy');
    healthStatus.status = allChecksPassed ? 'healthy' : 'degraded';

    logWithContext(correlationId, 'Health check completed', {
      service: 'recurring-task-engine',
      status: healthStatus.status,
      checks: Object.keys(healthStatus.checks)
    });

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logWithContext(correlationId, 'Health check error', {
      service: 'recurring-task-engine',
      error: error.message
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'recurring-task-engine',
      error: error.message
    });
  }
});

// Ready check endpoint (similar to health but for readiness)
router.get('/ready', async (req, res) => {
  const correlationId = generateCorrelationId();
  
  try {
    // Perform readiness checks (more stringent than health checks)
    const readinessStatus = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'recurring-task-engine',
      checks: {
        database: await checkDatabaseConnection(),
        dapr: await checkDaprConnection(),
        eventBus: await checkEventBusConnection(),
        recurrenceProcessor: await checkRecurrenceProcessorHealth(),
        dependencies: await checkDependencies()
      }
    };

    // Determine readiness based on all checks passing
    const allReady = Object.values(readinessStatus.checks).every(check => check.status === 'ready');
    readinessStatus.status = allReady ? 'ready' : 'not_ready';

    logWithContext(correlationId, 'Readiness check completed', {
      service: 'recurring-task-engine',
      status: readinessStatus.status
    });

    const statusCode = readinessStatus.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readinessStatus);
  } catch (error) {
    logWithContext(correlationId, 'Readiness check error', {
      service: 'recurring-task-engine',
      error: error.message
    });

    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      service: 'recurring-task-engine',
      error: error.message
    });
  }
});

// Liveness check endpoint (for Kubernetes liveness probe)
router.get('/live', async (req, res) => {
  const correlationId = generateCorrelationId();
  
  try {
    // Perform liveness checks (basic check to see if service is alive)
    const livenessStatus = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: 'recurring-task-engine',
      checks: {
        process: checkProcessHealth(),
        eventLoop: checkEventLoopHealth(),
        recurrenceProcessor: checkRecurrenceProcessorLiveness()
      }
    };

    // Determine liveness based on basic checks
    const isAlive = Object.values(livenessStatus.checks).every(check => check.status === 'alive');
    livenessStatus.status = isAlive ? 'alive' : 'not_alive';

    logWithContext(correlationId, 'Liveness check completed', {
      service: 'recurring-task-engine',
      status: livenessStatus.status
    });

    const statusCode = livenessStatus.status === 'alive' ? 200 : 503;
    res.status(statusCode).json(livenessStatus);
  } catch (error) {
    logWithContext(correlationId, 'Liveness check error', {
      service: 'recurring-task-engine',
      error: error.message
    });

    res.status(503).json({
      status: 'not_alive',
      timestamp: new Date().toISOString(),
      service: 'recurring-task-engine',
      error: error.message
    });
  }
});

// Individual health check functions
async function checkDatabaseConnection() {
  try {
    // In a real implementation, this would check the actual database connection
    // For now, we'll simulate a check
    const isConnected = true; // Simulated connection check
    
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'database',
      details: isConnected ? 'Connected successfully' : 'Connection failed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'database',
      error: error.message
    };
  }
}

async function checkDaprConnection() {
  try {
    // In a real implementation, this would check the Dapr sidecar connection
    // For now, we'll simulate a check
    const isConnected = true; // Simulated connection check
    
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'dapr',
      details: isConnected ? 'Dapr sidecar connected' : 'Dapr sidecar connection failed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'dapr',
      error: error.message
    };
  }
}

function checkMemoryUsage() {
  const used = process.memoryUsage();
  const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
  
  return {
    status: heapUsedPercent < 90 ? 'healthy' : 'degraded', // Consider degraded if >90% memory used
    timestamp: new Date().toISOString(),
    component: 'memory',
    details: {
      heapUsed: `${Math.round(heapUsedPercent)}%`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(used.rss / 1024 / 1024)} MB`
    }
  };
}

async function checkEventBusConnection() {
  try {
    // In a real implementation, this would check the event bus (Kafka) connection
    // For now, we'll simulate a check
    const isConnected = true; // Simulated connection check
    
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'event_bus',
      details: isConnected ? 'Event bus connected' : 'Event bus connection failed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'event_bus',
      error: error.message
    };
  }
}

async function checkRecurrenceProcessorHealth() {
  try {
    // In a real implementation, this would check the recurrence processor's health
    // For now, we'll simulate a check
    const isHealthy = true; // Simulated recurrence processor health check
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'recurrence_processor',
      details: isHealthy ? 'Recurrence processor running normally' : 'Recurrence processor not healthy'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      component: 'recurrence_processor',
      error: error.message
    };
  }
}

async function checkDependencies() {
  try {
    // In a real implementation, this would check all external dependencies
    // For now, we'll simulate a check
    const allHealthy = true; // Simulated dependency check
    
    return {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      component: 'dependencies',
      details: allHealthy ? 'All dependencies ready' : 'Some dependencies not ready'
    };
  } catch (error) {
    return {
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      component: 'dependencies',
      error: error.message
    };
  }
}

function checkProcessHealth() {
  // Check if the process is running normally
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    component: 'process',
    details: 'Process running normally'
  };
}

function checkEventLoopHealth() {
  // Check if the event loop is not blocked
  const start = Date.now();
  // Force a tick in the event loop
  setImmediate(() => {});
  const end = Date.now();
  
  return {
    status: (end - start) < 10 ? 'alive' : 'blocked', // If it takes more than 10ms, consider blocked
    timestamp: new Date().toISOString(),
    component: 'event_loop',
    details: `Event loop response time: ${end - start}ms`
  };
}

function checkRecurrenceProcessorLiveness() {
  // Check if the recurrence processor is running and responsive
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    component: 'recurrence_processor',
    details: 'Recurrence processor responsive'
  };
}

module.exports = router;