// Structured logging with correlation IDs for Advanced Cloud Deployment

const winston = require('winston');
const { format } = require('wiston');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format that includes correlation ID
const logFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create logger with correlation ID support
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: process.env.SERVICE_NAME || 'unknown' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      )
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    )
  }));
}

// Generate a unique correlation ID for each request
function generateCorrelationId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Add correlation ID to log context
function logWithContext(correlationId, message, meta = {}) {
  logger.info(message, {
    correlationId,
    ...meta
  });
}

// Error logging with correlation ID
function logErrorWithContext(correlationId, error, meta = {}) {
  logger.error(error.message, {
    correlationId,
    stack: error.stack,
    ...meta
  });
}

// Warn logging with correlation ID
function logWarnWithContext(correlationId, message, meta = {}) {
  logger.warn(message, {
    correlationId,
    ...meta
  });
}

// Debug logging with correlation ID
function logDebugWithContext(correlationId, message, meta = {}) {
  logger.debug(message, {
    correlationId,
    ...meta
  });
}

// Create a logger instance with a specific service name
function createServiceLogger(serviceName) {
  return {
    info: (correlationId, message, meta = {}) => {
      logger.info(message, {
        service: serviceName,
        correlationId,
        ...meta
      });
    },
    error: (correlationId, error, meta = {}) => {
      logger.error(error.message, {
        service: serviceName,
        correlationId,
        stack: error.stack,
        ...meta
      });
    },
    warn: (correlationId, message, meta = {}) => {
      logger.warn(message, {
        service: serviceName,
        correlationId,
        ...meta
      });
    },
    debug: (correlationId, message, meta = {}) => {
      logger.debug(message, {
        service: serviceName,
        correlationId,
        ...meta
      });
    }
  };
}

// Middleware to add correlation ID to requests
function correlationIdMiddleware(req, res, next) {
  // Generate or extract correlation ID from headers
  let correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  
  if (!correlationId) {
    correlationId = generateCorrelationId();
  }
  
  // Add correlation ID to request object
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
}

// Log request middleware
function requestLoggingMiddleware(loggerInstance) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    loggerInstance.info(req.correlationId, 'Incoming request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: req.body
    });
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      loggerInstance.info(req.correlationId, 'Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });
    
    next();
  };
}

// Export the logger and utility functions
module.exports = {
  logger,
  generateCorrelationId,
  logWithContext,
  logErrorWithContext,
  logWarnWithContext,
  logDebugWithContext,
  createServiceLogger,
  correlationIdMiddleware,
  requestLoggingMiddleware
};