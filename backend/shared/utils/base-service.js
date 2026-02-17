// Base service template for Advanced Cloud Deployment
// This template provides common functionality for all services

const express = require('express');
const { DaprClient } = require('@dapr/dapr');

class BaseService {
  constructor(serviceName, port) {
    this.serviceName = serviceName;
    this.port = port;
    this.app = express();
    this.daprClient = new DaprClient();

    // Middleware
    this.app.use(express.json());
    
    // Initialize service
    this.initialize();
  }

  async initialize() {
    // Common initialization for all services
    console.log(`${this.serviceName} initializing...`);
    
    // Setup health check
    this.app.get('/health', (req, res) => {
      res.status(200).send({ status: 'healthy', service: this.serviceName });
    });

    // Setup shutdown handler
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async setupEventHandlers() {
    // Override in child classes to set up specific event handlers
  }

  async publishEvent(topic, event) {
    try {
      await this.daprClient.pubsub.publish(topic, event);
      console.log(`Event published to ${topic}:`, event);
    } catch (error) {
      console.error(`Failed to publish event to ${topic}:`, error);
      throw error;
    }
  }

  async subscribeToEvent(topic, handler) {
    try {
      await this.daprClient.binding.subscribe(topic, handler);
      console.log(`Subscribed to ${topic}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error);
      throw error;
    }
  }

  async start() {
    this.app.listen(this.port, () => {
      console.log(`${this.serviceName} listening on port ${this.port}`);
    });
  }

  async shutdown() {
    console.log(`${this.serviceName} shutting down...`);
    await this.daprClient.stop();
    process.exit(0);
  }
}

module.exports = BaseService;