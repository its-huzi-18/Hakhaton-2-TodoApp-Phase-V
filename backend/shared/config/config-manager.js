// Environment configuration management for Advanced Cloud Deployment

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(envFilePath = '.env') {
    this.config = {};
    this.envFilePath = envFilePath;
    this.loadConfig();
  }

  // Load configuration from environment variables and .env file
  loadConfig() {
    // Load from .env file if it exists
    if (fs.existsSync(this.envFilePath)) {
      const envContent = fs.readFileSync(this.envFilePath, 'utf8');
      const envVars = this.parseEnvFile(envContent);
      Object.assign(process.env, envVars);
    }

    // Load configuration from environment variables
    this.config = {
      // Service configuration
      SERVICE_NAME: process.env.SERVICE_NAME || 'unknown',
      PORT: parseInt(process.env.PORT) || 3000,
      
      // Database configuration
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
      DATABASE_PORT: parseInt(process.env.DATABASE_PORT) || 5432,
      DATABASE_USER: process.env.DATABASE_USER || 'postgres',
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'password',
      DATABASE_NAME: process.env.DATABASE_NAME || 'todo_db',
      
      // Dapr configuration
      DAPR_HTTP_PORT: process.env.DAPR_HTTP_PORT || 3500,
      DAPR_GRPC_PORT: process.env.DAPR_GRPC_PORT || 50001,
      DAPR_APP_ID: process.env.DAPR_APP_ID || 'default-app',
      
      // Event streaming configuration
      KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
      KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'todo-app',
      KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'todo-group',
      
      // Redis configuration
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
      
      // Logging configuration
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      LOG_FORMAT: process.env.LOG_FORMAT || 'json', // 'json' or 'simple'
      
      // Security configuration
      JWT_SECRET: process.env.JWT_SECRET || 'default_secret_for_dev',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      
      // Feature flags
      ENABLE_REMINDERS: process.env.ENABLE_REMINDERS === 'true' || true,
      ENABLE_RECURRING_TASKS: process.env.ENABLE_RECURRING_TASKS === 'true' || true,
      ENABLE_AUDIT_LOGGING: process.env.ENABLE_AUDIT_LOGGING === 'true' || true,
      
      // Performance configuration
      MAX_CONCURRENT_EVENTS: parseInt(process.env.MAX_CONCURRENT_EVENTS) || 10,
      EVENT_PROCESSING_TIMEOUT: parseInt(process.env.EVENT_PROCESSING_TIMEOUT) || 5000,
      
      // External service configuration
      NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000',
      TASK_SERVICE_URL: process.env.TASK_SERVICE_URL || 'http://task-service:3000',
      
      // Monitoring configuration
      METRICS_ENABLED: process.env.METRICS_ENABLED === 'true' || false,
      TRACING_ENABLED: process.env.TRACING_ENABLED === 'true' || false
    };
  }

  // Parse .env file content
  parseEnvFile(content) {
    const lines = content.split('\n');
    const envVars = {};

    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const keyTrimmed = key.trim();
        let value = valueParts.join('=').trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }

        envVars[keyTrimmed] = value;
      }
    }

    return envVars;
  }

  // Get configuration value
  get(key, defaultValue = undefined) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  // Set configuration value
  set(key, value) {
    this.config[key] = value;
  }

  // Check if configuration is valid
  validate() {
    const required = ['DATABASE_URL'];
    const missing = [];

    for (const key of required) {
      if (!this.config[key]) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    return true;
  }

  // Get all configuration
  getAll() {
    return { ...this.config };
  }

  // Reload configuration
  reload() {
    this.loadConfig();
  }

  // Save configuration to file
  saveConfig(filePath = this.envFilePath) {
    const content = Object.entries(this.config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(filePath, content);
  }
}

// Singleton instance
const configManager = new ConfigManager();

module.exports = configManager;