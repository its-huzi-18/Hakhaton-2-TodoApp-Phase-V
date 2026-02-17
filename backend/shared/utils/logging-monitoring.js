// Centralized logging and monitoring infrastructure for Advanced Cloud Deployment

const winston = require('winston');
require('winston-daily-rotate-file');

// Create a unique correlation ID for each request
function generateCorrelationId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create logger with correlation ID support
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'unknown' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.DailyRotateFile({
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      dirname: './logs',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

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

// Metrics collector
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
  }

  increment(name, labels = {}) {
    const key = `${name}_${JSON.stringify(labels)}`;
    const currentValue = this.metrics.get(key) || 0;
    this.metrics.set(key, currentValue + 1);
  }

  timing(name, duration, labels = {}) {
    const key = `${name}_timing_${JSON.stringify(labels)}`;
    const timings = this.metrics.get(key) || [];
    timings.push(duration);
    this.metrics.set(key, timings);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

const metricsCollector = new MetricsCollector();

module.exports = {
  logger,
  generateCorrelationId,
  logWithContext,
  logErrorWithContext,
  metricsCollector
};