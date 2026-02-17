// AuditService implementation for Advanced Cloud Deployment

const BaseService = require('../../shared/utils/base-service');
const AuditLogEntry = require('../../shared/models/audit-log-entry');
const { logWithContext, generateCorrelationId } = require('../../shared/utils/logging-monitoring');
const config = require('../../shared/config/config-manager');

class AuditService extends BaseService {
  constructor(port = config.get('PORT', 3004)) {
    super('AuditService', port);
    this.auditLogs = new Map(); // In production, use a database
    this.setupEventHandlers();
  }

  async initialize() {
    await super.initialize();
    logWithContext(generateCorrelationId(), 'AuditService initialized');
  }

  async setupEventHandlers() {
    // Subscribe to all system events to create audit entries
    this.subscribeToEvent('task-events', async (data) => {
      await this.handleTaskEvent(data);
    });

    this.subscribeToEvent('reminder-events', async (data) => {
      await this.handleReminderEvent(data);
    });

    this.subscribeToEvent('notification-events', async (data) => {
      await this.handleNotificationEvent(data);
    });

    this.subscribeToEvent('recurring-task-events', async (data) => {
      await this.handleRecurringTaskEvent(data);
    });

    this.subscribeToEvent('audit-events', async (data) => {
      await this.handleAuditEvent(data);
    });
  }

  // Handle task events
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

      // Add the audit entry to our storage
      this.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for task event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.publishEvent('audit-events', {
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

  // Handle reminder events
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

      // Add the audit entry to our storage
      this.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for reminder event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.publishEvent('audit-events', {
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

  // Handle notification events
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

      // Add the audit entry to our storage
      this.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for notification event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.publishEvent('audit-events', {
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

  // Handle recurring task events
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

      // Add the audit entry to our storage
      this.auditLogs.set(auditEntry.id, auditEntry);
      logWithContext(correlationId, 'Audit entry created for recurring task event', { 
        auditEntryId: auditEntry.id, 
        eventType 
      });

      // Publish audit event
      await this.publishEvent('audit-events', {
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

  // Handle audit events (for recursive audit logging if needed)
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

  // Get audit logs for a specific user
  getAuditLogsByUser(userId, limit = 100) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching audit logs for user', { userId, limit });

      const userLogs = Array.from(this.auditLogs.values())
        .filter(log => log.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
        .slice(0, limit); // Limit the results

      logWithContext(correlationId, 'Retrieved audit logs for user', { 
        userId, 
        count: userLogs.length 
      });

      return userLogs;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching audit logs for user', { error: error.message });
      throw error;
    }
  }

  // Get audit logs for a specific entity type
  getAuditLogsByEntityType(entityType, limit = 100) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching audit logs for entity type', { entityType, limit });

      const entityLogs = Array.from(this.auditLogs.values())
        .filter(log => log.entityType === entityType)
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
        .slice(0, limit); // Limit the results

      logWithContext(correlationId, 'Retrieved audit logs for entity type', { 
        entityType, 
        count: entityLogs.length 
      });

      return entityLogs;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching audit logs for entity type', { error: error.message });
      throw error;
    }
  }

  // Get audit logs for a specific entity
  getAuditLogsByEntity(entityType, entityId, limit = 100) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching audit logs for entity', { entityType, entityId, limit });

      const entityLogs = Array.from(this.auditLogs.values())
        .filter(log => log.entityType === entityType && log.entityId === entityId)
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
        .slice(0, limit); // Limit the results

      logWithContext(correlationId, 'Retrieved audit logs for entity', { 
        entityType, 
        entityId, 
        count: entityLogs.length 
      });

      return entityLogs;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching audit logs for entity', { error: error.message });
      throw error;
    }
  }

  // Get audit logs within a date range
  getAuditLogsByDateRange(startDate, endDate, limit = 100) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching audit logs by date range', { 
        startDate, 
        endDate, 
        limit 
      });

      const start = new Date(startDate);
      const end = new Date(endDate);

      const dateRangeLogs = Array.from(this.auditLogs.values())
        .filter(log => log.timestamp >= start && log.timestamp <= end)
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
        .slice(0, limit); // Limit the results

      logWithContext(correlationId, 'Retrieved audit logs by date range', { 
        count: dateRangeLogs.length,
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });

      return dateRangeLogs;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching audit logs by date range', { error: error.message });
      throw error;
    }
  }

  // Get audit logs by action type
  getAuditLogsByAction(action, limit = 100) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching audit logs by action', { action, limit });

      const actionLogs = Array.from(this.auditLogs.values())
        .filter(log => log.action === action)
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
        .slice(0, limit); // Limit the results

      logWithContext(correlationId, 'Retrieved audit logs by action', { 
        action, 
        count: actionLogs.length 
      });

      return actionLogs;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching audit logs by action', { error: error.message });
      throw error;
    }
  }

  // Get all audit logs (with optional limit)
  getAllAuditLogs(limit = 1000) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching all audit logs', { limit });

      const allLogs = Array.from(this.auditLogs.values())
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
        .slice(0, limit); // Limit the results

      logWithContext(correlationId, 'Retrieved all audit logs', { count: allLogs.length });

      return allLogs;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching all audit logs', { error: error.message });
      throw error;
    }
  }

  // Get audit log by ID
  getAuditLogById(logId) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching audit log by ID', { logId });

      const log = this.auditLogs.get(logId);

      if (!log) {
        logWithContext(correlationId, 'Audit log not found', { logId });
        return null;
      }

      logWithContext(correlationId, 'Retrieved audit log by ID', { logId });

      return log;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching audit log by ID', { error: error.message });
      throw error;
    }
  }

  // Count total audit logs
  getAuditLogCount() {
    return this.auditLogs.size;
  }

  // Count audit logs by user
  getAuditLogCountByUser(userId) {
    return Array.from(this.auditLogs.values()).filter(log => log.userId === userId).length;
  }

  // Count audit logs by entity type
  getAuditLogCountByEntityType(entityType) {
    return Array.from(this.auditLogs.values()).filter(log => log.entityType === entityType).length;
  }

  // Count audit logs by action
  getAuditLogCountByAction(action) {
    return Array.from(this.auditLogs.values()).filter(log => log.action === action).length;
  }

  // Get audit statistics
  getAuditStatistics() {
    const allLogs = Array.from(this.auditLogs.values());
    
    const stats = {
      total: allLogs.length,
      byUser: {},
      byEntityType: {},
      byAction: {},
      byDate: {} // Will contain counts by date
    };

    for (const log of allLogs) {
      // Count by user
      stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      
      // Count by entity type
      stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
      
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      
      // Count by date (date only, not time)
      const dateStr = log.timestamp.toISOString().split('T')[0];
      stats.byDate[dateStr] = (stats.byDate[dateStr] || 0) + 1;
    }

    return stats;
  }
}

module.exports = AuditService;