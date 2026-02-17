// Distributed tracing configuration for Advanced Cloud Deployment

const { trace, context, propagation } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Initialize the OpenTelemetry SDK
class TracingConfig {
  constructor(serviceName) {
    this.serviceName = serviceName || process.env.SERVICE_NAME || 'unknown-service';
    this.sdk = null;
  }

  // Initialize the tracing SDK
  async initialize() {
    // Create the trace exporter (using OTLP HTTP for Jaeger/Zipkin)
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTLP_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces'
    });

    // Create the resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });

    // Initialize the SDK
    this.sdk = new NodeSDK({
      traceExporter,
      instrumentations: [getNodeAutoInstrumentations()],
      resource
    });

    try {
      await this.sdk.start();
      console.log(`Tracing initialized for service: ${this.serviceName}`);
    } catch (error) {
      console.error('Error initializing tracing:', error);
    }
  }

  // Get the current tracer
  getTracer() {
    if (!this.sdk) {
      throw new Error('Tracing SDK not initialized. Call initialize() first.');
    }
    
    return trace.getTracer(this.serviceName);
  }

  // Create a span with the given name and options
  async startSpan(spanName, options = {}, parentContext = null) {
    const tracer = this.getTracer();
    
    // Use parent context if provided, otherwise use current context
    const ctx = parentContext || context.active();
    
    return tracer.startActiveSpan(spanName, options, ctx, (span) => {
      return span;
    });
  }

  // Execute a function within a trace context
  async traceFunction(func, spanName, attributes = {}) {
    const tracer = this.getTracer();
    
    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        // Set attributes on the span
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value);
        }

        // Execute the function
        const result = await func();

        // Set status as OK
        span.setStatus({ code: 0 }); // 0 = OK

        return result;
      } catch (error) {
        // Set status as error
        span.setStatus({ code: 2, message: error.message }); // 2 = ERROR
        span.recordException(error);
        
        throw error;
      } finally {
        // End the span
        span.end();
      }
    });
  }

  // Extract context from incoming request headers
  extractContext(headers) {
    const carrier = {};
    
    // Copy headers to carrier object
    for (const [key, value] of Object.entries(headers)) {
      carrier[key.toLowerCase()] = value;
    }
    
    // Extract context using propagator
    return propagation.extract(context.active(), carrier, {
      keys: (carrier) => Object.keys(carrier),
      get: (carrier, key) => carrier[key]
    });
  }

  // Inject context into outgoing request headers
  injectContext(headers, ctx = context.active()) {
    propagation.inject(ctx, headers, {
      set: (carrier, key, value) => {
        carrier[key] = value;
      }
    });
  }

  // Shutdown the tracing SDK
  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log('Tracing SDK shut down successfully');
    }
  }
}

// Export a singleton instance for each service
const tracingConfig = new TracingConfig();
module.exports = tracingConfig;