// Event consumer for all system events in Advanced Cloud Deployment

const { DaprClient } = require('@dapr/dapr');
const AuditLogEntry = require('../../../shared/models/audit-log-entry');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class AuditEventConsumer {
  constructor(auditService) {
    this.client = new DaprClient();
    this.auditService = auditService;
    this.pubsubName = 'audit-pubsub';
  }

  // Subscribe to task events
  async subscribeToTaskEvents() {
    try {
      await this.client.binding.subscribe('task-events', async (data) => {
        await this.handleTaskEvent(data);
      });
      console.log('Subscribed to task events for audit logging');
    } catch (error) {
      console.error('Failed to subscribe to task events:', error);
      throw error;
    }
  }

  // Subscribe to reminder events
  async subscribeToReminderEvents() {
    try {
      await this.client.binding.subscribe('reminder-events', async (data) => {
        await this.handleReminderEvent(data);
      });
      console.log('Subscribed to reminder events for audit logging');
    } catch (error) {
      console.error('Failed to subscribe to reminder events:', error);
      throw error;
    }
  }

  // Subscribe to notification events
  async subscribeToNotificationEvents() {
    try {
      await this.client.binding.subscribe('notification-events', async (data) => {
        await this.handleNotificationEvent(data);
      });
      console.log('Subscribed to notification events for audit logging');
    } catch (error) {
      console.error('Failed to subscribe to notification events:', error);
      throw error;
    }
  }

  // Subscribe to recurring task events
  async subscribeToRecurringTaskEvents() {
    try {
      await this.client.binding.subscribe('recurring-task-events', async (data) => {
        await this.handleRecurringTaskEvent(data);
      });
      console.log('Subscribed to recurring task events for audit logging');
    } catch (error) {
      console.error('Failed to subscribe to recurring task events:', error);
      throw error;
    }
  }

  // Subscribe to audit events
  async subscribeToAuditEvents() {
    try {
      await this.client.binding.subscribe('audit-events', async (data) => {
        await this.handleAuditEvent(data);
      });
      console.log('Subscribed to audit events for audit logging');
    } catch (error) {
      console.error('Failed to subscribe to audit events:', error);
      throw error;
    }
  }

  // Handle task event
  async handleTaskEvent(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing task event for audit logging', { eventData });

      let auditEntry;
      const { eventType, taskId, userId, timestamp, correlationId: eventCorrelationId } = eventData;
      const eventTimestamp = timestamp ? new Date(timestamp) : new Date();

      switch (eventType) {
        case 'TaskCreated':
          auditEntry = AuditLogEntry.createForCreation(
            userId, 
            'Task', 
            eventData.payload || { id: taskId }, 
            'task-service', 
            eventCorrelationId
          );
          break;

        case 'TaskUpdated':
          auditEntry = AuditLogEntry.createForUpdate(
            userId, 
            'Task', 
            taskId, 
            eventData.previousValues || null, 
            eventData.updates || null, 
            'task-service', 
            eventCorrelationId
          );
          break;

        case 'TaskCompleted':
          auditEntry = AuditLogEntry.createForCompletion(
            userId, 
            'Task', 
            taskId, 
            'task-service', 
            eventCorrelationId
          );
          break;

        case 'TaskDeleted':
          auditEntry = AuditLogEntry.createForDeletion(
            userId, 
            'Task', 
            taskId, 
            'task-service', 
            eventCorrelationId
          );
          break;

        case 'RecurringTaskGenerated':
          // Log the generation of a new recurring task
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'generated', 
            'Task', 
            eventData.newTaskId, 
            { originalTaskId: eventData.originalTaskId },
            'recurring-task-engine', 
            eventCorrelationId
          );
          break;

        default:
          logWithContext(correlationId, 'Unknown task event type, skipping audit', { eventType });
          return;
      }

      // Add the audit entry to the audit service
      this.auditService.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for task event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.auditService.publishEvent('audit-events', {
        eventType: 'AuditEntryCreated',
        auditEntryId: auditEntry.id,
        userId: auditEntry.userId,
        action: auditEntry.action,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        timestamp: eventTimestamp.toISOString(),
        correlationId: eventCorrelationId || correlationId
      });
    } catch (error) {
      logWithContext(correlationId, 'Error processing task event for audit', { error: error.message });
    }
  }

  // Handle reminder event
  async handleReminderEvent(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing reminder event for audit logging', { eventData });

      let auditEntry;
      const { eventType, reminderId, userId, taskId, timestamp, correlationId: eventCorrelationId } = eventData;
      const eventTimestamp = timestamp ? new Date(timestamp) : new Date();

      switch (eventType) {
        case 'ReminderScheduled':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'scheduled', 
            'Reminder', 
            reminderId, 
            { taskId, scheduledTime: eventData.scheduledTime },
            'reminder-service', 
            eventCorrelationId
          );
          break;

        case 'ReminderDelivered':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'delivered', 
            'Reminder', 
            reminderId, 
            { taskId, deliveredAt: eventData.deliveredAt },
            'reminder-service', 
            eventCorrelationId
          );
          break;

        case 'ReminderFailed':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'failed', 
            'Reminder', 
            reminderId, 
            { taskId, error: eventData.error },
            'reminder-service', 
            eventCorrelationId
          );
          break;

        default:
          logWithContext(correlationId, 'Unknown reminder event type, skipping audit', { eventType });
          return;
      }

      // Add the audit entry to the audit service
      this.auditService.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for reminder event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.auditService.publishEvent('audit-events', {
        eventType: 'AuditEntryCreated',
        auditEntryId: auditEntry.id,
        userId: auditEntry.userId,
        action: auditEntry.action,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        timestamp: eventTimestamp.toISOString(),
        correlationId: eventCorrelationId || correlationId
      });
    } catch (error) {
      logWithContext(correlationId, 'Error processing reminder event for audit', { error: error.message });
    }
  }

  // Handle notification event
  async handleNotificationEvent(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing notification event for audit logging', { eventData });

      let auditEntry;
      const { eventType, notificationId, userId, taskId, channel, timestamp, correlationId: eventCorrelationId } = eventData;
      const eventTimestamp = timestamp ? new Date(timestamp) : new Date();

      switch (eventType) {
        case 'NotificationSent':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'sent', 
            'Notification', 
            notificationId, 
            { taskId, channel },
            'notification-service', 
            eventCorrelationId
          );
          break;

        case 'NotificationDelivered':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'delivered', 
            'Notification', 
            notificationId, 
            { taskId, channel },
            'notification-service', 
            eventCorrelationId
          );
          break;

        case 'NotificationFailed':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'failed', 
            'Notification', 
            notificationId, 
            { taskId, channel, error: eventData.error },
            'notification-service', 
            eventCorrelationId
          );
          break;

        default:
          logWithContext(correlationId, 'Unknown notification event type, skipping audit', { eventType });
          return;
      }

      // Add the audit entry to the audit service
      this.auditService.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for notification event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.auditService.publishEvent('audit-events', {
        eventType: 'AuditEntryCreated',
        auditEntryId: auditEntry.id,
        userId: auditEntry.userId,
        action: auditEntry.action,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        timestamp: eventTimestamp.toISOString(),
        correlationId: eventCorrelationId || correlationId
      });
    } catch (error) {
      logWithContext(correlationId, 'Error processing notification event for audit', { error: error.message });
    }
  }

  // Handle recurring task event
  async handleRecurringTaskEvent(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing recurring task event for audit logging', { eventData });

      let auditEntry;
      const { eventType, newTaskId, originalTaskId, userId, timestamp, correlationId: eventCorrelationId } = eventData;
      const eventTimestamp = timestamp ? new Date(timestamp) : new Date();

      switch (eventType) {
        case 'RecurringTaskGenerated':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'generated', 
            'Task', 
            newTaskId, 
            { originalTaskId },
            'recurring-task-engine', 
            eventCorrelationId
          );
          break;

        case 'RecurringTaskRuleCreated':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'created', 
            'RecurrenceRule', 
            eventData.ruleId, 
            eventData.ruleDetails,
            'recurring-task-engine', 
            eventCorrelationId
          );
          break;

        case 'RecurringTaskRuleUpdated':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'updated', 
            'RecurrenceRule', 
            eventData.ruleId, 
            eventData.updates,
            'recurring-task-engine', 
            eventCorrelationId
          );
          break;

        case 'RecurringTaskRuleDeleted':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'deleted', 
            'RecurrenceRule', 
            eventData.ruleId, 
            null,
            'recurring-task-engine', 
            eventCorrelationId
          );
          break;

        case 'RecurringTaskProcessingError':
          auditEntry = AuditLogEntry.createForAction(
            userId, 
            'error', 
            'RecurringTask', 
            eventData.originalTaskId, 
            { error: eventData.error },
            'recurring-task-engine', 
            eventCorrelationId
          );
          break;

        default:
          logWithContext(correlationId, 'Unknown recurring task event type, skipping audit', { eventType });
          return;
      }

      // Add the audit entry to the audit service
      this.auditService.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for recurring task event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.auditService.publishEvent('audit-events', {
        eventType: 'AuditEntryCreated',
        auditEntryId: auditEntry.id,
        userId: auditEntry.userId,
        action: auditEntry.action,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        timestamp: eventTimestamp.toISOString(),
        correlationId: eventCorrelationId || correlationId
      });
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurring task event for audit', { error: error.message });
    }
  }

  // Handle audit event (for recursive audit logging if needed)
  async handleAuditEvent(eventData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing audit event', { eventData });

      // For audit events, we might want to log that an audit entry was created
      // This is mainly for monitoring and debugging the audit system itself
      if (eventData.eventType === 'AuditEntryCreated') {
        logWithContext(correlationId, 'Audit entry created in audit system', { 
          auditEntryId: eventData.auditEntryId,
          action: eventData.action
        });
      }
    } catch (error) {
      logWithContext(correlationId, 'Error processing audit event', { error: error.message });
    }
  }

  // Initialize all event subscriptions
  async initialize() {
    await this.subscribeToTaskEvents();
    await this.subscribeToReminderEvents();
    await this.subscribeToNotificationEvents();
    await this.subscribeToRecurringTaskEvents();
    await this.subscribeToAuditEvents();
    
    console.log('All event subscriptions initialized for audit service');
  }

  // Close the Dapr client connection
  async close() {
    await this.client.stop();
  }
}

module.exports = AuditEventConsumer;