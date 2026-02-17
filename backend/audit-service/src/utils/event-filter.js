// Event filtering for audit logging in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class EventFilter {
  constructor(options = {}) {
    // Configuration for which events to audit
    this.auditConfig = {
      // Task events to audit
      taskEvents: {
        include: ['TaskCreated', 'TaskUpdated', 'TaskCompleted', 'TaskDeleted', 'RecurringTaskGenerated'],
        exclude: [] // Specific events to exclude even if in include list
      },
      
      // Reminder events to audit
      reminderEvents: {
        include: ['ReminderScheduled', 'ReminderDelivered', 'ReminderFailed'],
        exclude: []
      },
      
      // Notification events to audit
      notificationEvents: {
        include: ['NotificationSent', 'NotificationDelivered', 'NotificationFailed'],
        exclude: []
      },
      
      // Recurring task events to audit
      recurringTaskEvents: {
        include: ['RecurringTaskGenerated', 'RecurringTaskRuleCreated', 'RecurringTaskRuleUpdated', 'RecurringTaskRuleDeleted', 'RecurringTaskProcessingError'],
        exclude: []
      },
      
      // Audit events to audit (for recursive auditing if needed)
      auditEvents: {
        include: ['AuditEntryCreated'],
        exclude: []
      },
      
      // User actions to audit
      userActions: {
        include: ['login', 'logout', 'profile_update', 'permission_change'],
        exclude: []
      },
      
      // System events to audit
      systemEvents: {
        include: ['service_start', 'service_stop', 'configuration_change', 'security_violation'],
        exclude: []
      }
    };
    
    // Sensitivity levels for different types of data
    this.sensitivityLevels = {
      low: ['view', 'read'],
      medium: ['update', 'modify', 'change'],
      high: ['delete', 'remove', 'cancel', 'access_sensitive_data'],
      critical: ['create_admin', 'change_permissions', 'disable_security', 'bypass_auth']
    };
    
    // Fields to mask in audit logs
    this.maskedFields = [
      'password', 'token', 'secret', 'key', 'credential', 
      'credit_card', 'ssn', 'social_security', 'bank_account'
    ];
    
    // Apply any custom options
    if (options.auditConfig) {
      this.auditConfig = { ...this.auditConfig, ...options.auditConfig };
    }
    
    if (options.maskedFields) {
      this.maskedFields = [...this.maskedFields, ...options.maskedFields];
    }
  }

  // Check if an event should be audited
  shouldAuditEvent(eventData) {
    const correlationId = generateCorrelationId();
    
    try {
      const { eventType, source } = eventData;
      
      // Determine the category of the event
      let category = this.getEventCategory(source || eventType);
      
      if (!category) {
        logWithContext(correlationId, 'Event category not recognized, skipping audit', { eventType, source });
        return false;
      }
      
      // Get the configuration for this category
      const categoryConfig = this.auditConfig[category];
      
      if (!categoryConfig) {
        logWithContext(correlationId, 'No audit configuration for category, skipping audit', { category, eventType });
        return false;
      }
      
      // Check if the event type is included in auditing
      const isIncluded = categoryConfig.include.includes(eventType);
      const isExcluded = categoryConfig.exclude.includes(eventType);
      
      if (isIncluded && !isExcluded) {
        logWithContext(correlationId, 'Event marked for audit', { eventType, source, category });
        return true;
      } else {
        logWithContext(correlationId, 'Event not marked for audit', { eventType, source, category, isIncluded, isExcluded });
        return false;
      }
    } catch (error) {
      logWithContext(correlationId, 'Error determining if event should be audited', { 
        error: error.message, 
        eventData 
      });
      // In case of error, we'll default to NOT auditing to prevent overwhelming the system
      return false;
    }
  }

  // Get the category of an event based on its source or type
  getEventCategory(eventSourceOrType) {
    if (eventSourceOrType.includes('task') || eventSourceOrType.includes('Task')) {
      return 'taskEvents';
    } else if (eventSourceOrType.includes('reminder') || eventSourceOrType.includes('Reminder')) {
      return 'reminderEvents';
    } else if (eventSourceOrType.includes('notification') || eventSourceOrType.includes('Notification')) {
      return 'notificationEvents';
    } else if (eventSourceOrType.includes('recurring') || eventSourceOrType.includes('Recurring')) {
      return 'recurringTaskEvents';
    } else if (eventSourceOrType.includes('audit') || eventSourceOrType.includes('Audit')) {
      return 'auditEvents';
    } else if (eventSourceOrType.includes('user') || this.auditConfig.userActions.include.some(action => eventSourceOrType.includes(action))) {
      return 'userActions';
    } else if (this.auditConfig.systemEvents.include.some(action => eventSourceOrType.includes(action))) {
      return 'systemEvents';
    }
    
    // If no category is matched, return null
    return null;
  }

  // Filter sensitive data from an event before logging
  filterSensitiveData(eventData) {
    const correlationId = generateCorrelationId();
    
    try {
      // Deep clone the event data to avoid modifying the original
      const filteredData = JSON.parse(JSON.stringify(eventData));
      
      // Mask sensitive fields in the payload
      if (filteredData.payload) {
        filteredData.payload = this.maskSensitiveFields(filteredData.payload);
      }
      
      // Mask sensitive fields in new/old values (for updates)
      if (filteredData.newValues) {
        filteredData.newValues = this.maskSensitiveFields(filteredData.newValues);
      }
      
      if (filteredData.oldValues) {
        filteredData.oldValues = this.maskSensitiveFields(filteredData.oldValues);
      }
      
      // Mask sensitive fields in metadata
      if (filteredData.metadata) {
        filteredData.metadata = this.maskSensitiveFields(filteredData.metadata);
      }
      
      logWithContext(correlationId, 'Sensitive data filtered from event', { 
        originalEventType: eventData.eventType,
        hasPayload: !!eventData.payload,
        hasNewValues: !!eventData.newValues,
        hasOldValues: !!eventData.oldValues
      });
      
      return filteredData;
    } catch (error) {
      logWithContext(correlationId, 'Error filtering sensitive data from event', { 
        error: error.message, 
        eventData 
      });
      // Return the original data if filtering fails
      return eventData;
    }
  }

  // Mask sensitive fields in an object
  maskSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveFields(item));
    }
    
    // Handle objects
    const maskedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        // Mask the value
        maskedObj[key] = this.maskValue(value);
      } else if (value && typeof value === 'object') {
        // Recursively mask nested objects
        maskedObj[key] = this.maskSensitiveFields(value);
      } else {
        // Keep the value as is
        maskedObj[key] = value;
      }
    }
    
    return maskedObj;
  }

  // Check if a field name is considered sensitive
  isSensitiveField(fieldName) {
    const lowerFieldName = fieldName.toLowerCase();
    return this.maskedFields.some(maskedField => 
      lowerFieldName.includes(maskedField.toLowerCase())
    );
  }

  // Mask a value based on its type
  maskValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    
    if (typeof value === 'string') {
      // For strings, return a masked version preserving length
      return '*'.repeat(Math.min(value.length, 8)); // Show up to 8 asterisks
    } else if (typeof value === 'number') {
      // For numbers, return a masked version
      return 0;
    } else if (typeof value === 'object') {
      // For objects, recursively mask sensitive fields
      return this.maskSensitiveFields(value);
    } else {
      // For other types, return a generic masked value
      return '***MASKED***';
    }
  }

  // Determine the sensitivity level of an event
  getEventSensitivity(eventData) {
    const { eventType, action } = eventData;
    
    // Check against sensitivity levels
    for (const [level, actions] of Object.entries(this.sensitivityLevels)) {
      if (actions.some(sensitiveAction => 
        eventType.toLowerCase().includes(sensitiveAction.toLowerCase()) ||
        (action && action.toLowerCase().includes(sensitiveAction.toLowerCase()))
      )) {
        return level;
      }
    }
    
    // Default to low sensitivity
    return 'low';
  }

  // Filter events based on user permissions or roles
  filterByUserPermissions(eventData, userPermissions = []) {
    const correlationId = generateCorrelationId();
    
    try {
      // Determine event sensitivity
      const sensitivity = this.getEventSensitivity(eventData);
      
      // Define minimum permissions required for each sensitivity level
      const minPermissions = {
        low: ['read'],
        medium: ['read', 'modify'],
        high: ['read', 'modify', 'delete'],
        critical: ['admin', 'superuser']
      };
      
      // Check if user has required permissions to view this event
      const requiredPermissions = minPermissions[sensitivity] || minPermissions.low;
      const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
      
      if (!hasPermission) {
        logWithContext(correlationId, 'User lacks permissions to view event, filtering out', { 
          eventType: eventData.eventType,
          sensitivity,
          userPermissions,
          requiredPermissions
        });
        return false;
      }
      
      logWithContext(correlationId, 'User has permissions to view event', { 
        eventType: eventData.eventType,
        sensitivity,
        userPermissions
      });
      
      return true;
    } catch (error) {
      logWithContext(correlationId, 'Error filtering event by user permissions', { 
        error: error.message, 
        eventData 
      });
      // Default to allowing the event if there's an error
      return true;
    }
  }

  // Filter events by date range
  filterByDateRange(events, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return events.filter(event => {
      const eventDate = new Date(event.timestamp || event.createdAt);
      return eventDate >= start && eventDate <= end;
    });
  }

  // Filter events by user
  filterByUser(events, userId) {
    return events.filter(event => event.userId === userId);
  }

  // Filter events by entity type
  filterByEntityType(events, entityType) {
    return events.filter(event => event.entityType === entityType);
  }

  // Filter events by action
  filterByAction(events, action) {
    return events.filter(event => event.action === action);
  }

  // Apply all relevant filters to an event
  applyFilters(eventData, userPermissions = [], filterOptions = {}) {
    const correlationId = generateCorrelationId();
    
    try {
      // Check if the event should be audited at all
      if (!this.shouldAuditEvent(eventData)) {
        logWithContext(correlationId, 'Event not selected for audit, skipping all filters', { 
          eventType: eventData.eventType 
        });
        return null;
      }
      
      // Filter by user permissions if provided
      if (userPermissions.length > 0) {
        if (!this.filterByUserPermissions(eventData, userPermissions)) {
          logWithContext(correlationId, 'Event filtered out due to user permissions', { 
            eventType: eventData.eventType 
          });
          return null;
        }
      }
      
      // Filter sensitive data
      const filteredEvent = this.filterSensitiveData(eventData);
      
      logWithContext(correlationId, 'All filters applied to event', { 
        eventType: eventData.eventType,
        sensitivity: this.getEventSensitivity(eventData)
      });
      
      return filteredEvent;
    } catch (error) {
      logWithContext(correlationId, 'Error applying filters to event', { 
        error: error.message, 
        eventData 
      });
      // Return null to indicate the event should not be audited
      return null;
    }
  }

  // Update audit configuration
  updateAuditConfig(category, newConfig) {
    if (this.auditConfig.hasOwnProperty(category)) {
      this.auditConfig[category] = { ...this.auditConfig[category], ...newConfig };
      return true;
    }
    return false;
  }

  // Add a field to the masked fields list
  addMaskedField(field) {
    if (!this.maskedFields.includes(field)) {
      this.maskedFields.push(field);
      return true;
    }
    return false;
  }

  // Get current audit configuration
  getAuditConfig() {
    return { ...this.auditConfig };
  }

  // Get current masked fields
  getMaskedFields() {
    return [...this.maskedFields];
  }
}

module.exports = EventFilter;