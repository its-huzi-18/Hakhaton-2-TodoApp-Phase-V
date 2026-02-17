// Metrics collection for all services in Advanced Cloud Deployment

const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { UpDownCounter, Histogram, Counter } = require('@opentelemetry/api');

class MetricsCollector {
  constructor(serviceName) {
    this.serviceName = serviceName || process.env.SERVICE_NAME || 'unknown-service';
    this.meter = null;
    this.metrics = {};
    this.resource = null;
    this.meterProvider = null;
  }

  // Initialize the metrics collector
  async initialize() {
    // Create the resource with service information
    this.resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });

    // Create the metric exporter (using OTLP HTTP for Prometheus/other backends)
    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTLP_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/metrics'
    });

    // Create the metric reader
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000 // Export every 5 seconds
    });

    // Initialize the meter provider
    this.meterProvider = new MeterProvider({
      resource: this.resource,
      readers: [metricReader]
    });

    // Set the global meter provider
    // api.metrics.setGlobalMeterProvider(this.meterProvider);

    // Create the meter
    this.meter = this.meterProvider.getMeter(this.serviceName);

    // Initialize common metrics
    this.initializeCommonMetrics();

    console.log(`Metrics collector initialized for service: ${this.serviceName}`);
  }

  // Initialize common metrics
  initializeCommonMetrics() {
    // Request counters
    this.metrics.requestCounter = this.meter.createCounter('service.requests.total', {
      description: 'Total number of requests to the service'
    });

    // Error counters
    this.metrics.errorCounter = this.meter.createCounter('service.errors.total', {
      description: 'Total number of errors in the service'
    });

    // Response time histogram
    this.metrics.responseTimeHistogram = this.meter.createHistogram('service.response.time', {
      description: 'Response time of service requests',
      unit: 'milliseconds'
    });

    // Active connections gauge
    this.metrics.activeConnectionsGauge = this.meter.createUpDownCounter('service.connections.active', {
      description: 'Number of active connections to the service'
    });

    // Task-related metrics
    this.metrics.taskCreatedCounter = this.meter.createCounter('task.created.total', {
      description: 'Total number of tasks created'
    });

    this.metrics.taskUpdatedCounter = this.meter.createCounter('task.updated.total', {
      description: 'Total number of tasks updated'
    });

    this.metrics.taskCompletedCounter = this.meter.createCounter('task.completed.total', {
      description: 'Total number of tasks completed'
    });

    this.metrics.taskDeletedCounter = this.meter.createCounter('task.deleted.total', {
      description: 'Total number of tasks deleted'
    });

    // Event-related metrics
    this.metrics.eventPublishedCounter = this.meter.createCounter('event.published.total', {
      description: 'Total number of events published'
    });

    this.metrics.eventProcessedCounter = this.meter.createCounter('event.processed.total', {
      description: 'Total number of events processed'
    });

    // Database-related metrics
    this.metrics.dbQueryDurationHistogram = this.meter.createHistogram('database.query.duration', {
      description: 'Duration of database queries',
      unit: 'milliseconds'
    });

    this.metrics.dbConnectionPoolUsage = this.meter.createUpDownCounter('database.connection.pool.usage', {
      description: 'Current usage of database connection pool'
    });
  }

  // Record a request
  recordRequest(method, path, statusCode, duration) {
    this.metrics.requestCounter.add(1, {
      method,
      path,
      status_code: statusCode.toString()
    });

    this.metrics.responseTimeHistogram.record(duration, {
      method,
      path,
      status_code: statusCode.toString()
    });
  }

  // Record an error
  recordError(errorType, method, path) {
    this.metrics.errorCounter.add(1, {
      error_type: errorType,
      method,
      path
    });
  }

  // Record task creation
  recordTaskCreated(userId) {
    this.metrics.taskCreatedCounter.add(1, {
      user_id: userId
    });
  }

  // Record task update
  recordTaskUpdated(userId) {
    this.metrics.taskUpdatedCounter.add(1, {
      user_id: userId
    });
  }

  // Record task completion
  recordTaskCompleted(userId) {
    this.metrics.taskCompletedCounter.add(1, {
      user_id: userId
    });
  }

  // Record task deletion
  recordTaskDeleted(userId) {
    this.metrics.taskDeletedCounter.add(1, {
      user_id: userId
    });
  }

  // Record event published
  recordEventPublished(eventType, topic) {
    this.metrics.eventPublishedCounter.add(1, {
      event_type: eventType,
      topic
    });
  }

  // Record event processed
  recordEventProcessed(eventType, topic) {
    this.metrics.eventProcessedCounter.add(1, {
      event_type: eventType,
      topic
    });
  }

  // Record database query duration
  recordDbQueryDuration(duration, operation, tableName) {
    this.metrics.dbQueryDurationHistogram.record(duration, {
      operation,
      table: tableName
    });
  }

  // Update database connection pool usage
  updateDbConnectionPoolUsage(usage) {
    this.metrics.dbConnectionPoolUsage.add(usage);
  }

  // Update active connections
  updateActiveConnections(connections) {
    this.metrics.activeConnectionsGauge.add(connections);
  }

  // Get a specific metric by name
  getMetric(metricName) {
    return this.metrics[metricName];
  }

  // Get all registered metrics
  getAllMetrics() {
    return { ...this.metrics };
  }

  // Add a custom metric
  addCustomMetric(name, type, options) {
    switch (type) {
      case 'counter':
        this.metrics[name] = this.meter.createCounter(name, options);
        break;
      case 'histogram':
        this.metrics[name] = this.meter.createHistogram(name, options);
        break;
      case 'up_down_counter':
        this.metrics[name] = this.meter.createUpDownCounter(name, options);
        break;
      default:
        throw new Error(`Unsupported metric type: ${type}`);
    }
  }

  // Record custom metric value
  recordCustomMetric(name, value, attributes = {}) {
    const metric = this.metrics[name];
    if (!metric) {
      throw new Error(`Metric not found: ${name}`);
    }

    // Determine the appropriate recording method based on metric type
    if (metric.constructor.name === 'Counter' || metric.constructor.name === 'UpDownCounter') {
      metric.add(value, attributes);
    } else if (metric.constructor.name === 'Histogram') {
      metric.record(value, attributes);
    }
  }

  // Create a timer for measuring durations
  startTimer() {
    return {
      startTime: process.hrtime.bigint(),
      end: (callback, attributes = {}) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - this.startTime) / 1000000; // Convert nanoseconds to milliseconds
        callback(duration, attributes);
      }
    };
  }

  // Record execution time of a function
  async recordFunctionExecution(func, metricName, attributes = {}) {
    const timer = this.startTimer();
    
    try {
      const result = await func();
      timer.end((duration) => {
        this.recordCustomMetric(metricName, duration, { ...attributes, success: 'true' });
      });
      return result;
    } catch (error) {
      timer.end((duration) => {
        this.recordCustomMetric(metricName, duration, { ...attributes, success: 'false', error: error.message });
      });
      throw error;
    }
  }

  // Shutdown the metrics collector
  async shutdown() {
    if (this.meterProvider) {
      await this.meterProvider.shutdown();
      console.log('Metrics collector shut down successfully');
    }
  }

  // Get service name
  getServiceName() {
    return this.serviceName;
  }
}

// Export a singleton instance for each service
const metricsCollector = new MetricsCollector();
module.exports = metricsCollector;