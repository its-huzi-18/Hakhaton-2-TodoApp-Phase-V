// AuditLogEntry entity model for Advanced Cloud Deployment

class AuditLogEntry {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.userId = data.userId; // Who performed the action
    this.action = data.action; // What action was performed (created, updated, deleted, completed)
    this.entityType = data.entityType; // What type of entity was affected (Task, Reminder, RecurrenceRule)
    this.entityId = data.entityId; // The ID of the entity that was affected
    this.oldValues = data.oldValues || null; // Previous values before the change (for updates)
    this.newValues = data.newValues || null; // New values after the change (for updates/creations)
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {}; // Additional contextual information
    this.source = data.source || 'system'; // Where the action originated (user, system, etc.)
    this.correlationId = data.correlationId; // ID to correlate related events
  }

  // Generate a unique ID for the audit log entry
  generateId() {
    return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate the audit log entry data
  validate() {
    const errors = [];

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.action || !['created', 'updated', 'deleted', 'completed', 'scheduled', 'delivered', 'failed'].includes(this.action)) {
      errors.push('Action must be one of: created, updated, deleted, completed, scheduled, delivered, failed');
    }

    if (!this.entityType || !['Task', 'Reminder', 'RecurrenceRule', 'Notification', 'AuditLogEntry'].includes(this.entityType)) {
      errors.push('Entity type must be one of: Task, Reminder, RecurrenceRule, Notification, AuditLogEntry');
    }

    if (!this.entityId) {
      errors.push('Entity ID is required');
    }

    if (!(this.timestamp instanceof Date)) {
      errors.push('Timestamp must be a valid Date object');
    }

    if (this.oldValues && typeof this.oldValues !== 'object') {
      errors.push('Old values must be an object');
    }

    if (this.newValues && typeof this.newValues !== 'object') {
      errors.push('New values must be an object');
    }

    if (this.metadata && typeof this.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create an audit log entry for a creation event
  static createForCreation(userId, entityType, entity, source = 'system', correlationId = null) {
    return new AuditLogEntry({
      userId,
      action: 'created',
      entityType,
      entityId: entity.id,
      newValues: this.extractValues(entity),
      source,
      correlationId,
      timestamp: new Date()
    });
  }

  // Create an audit log entry for an update event
  static createForUpdate(userId, entityType, entityId, oldValues, newValues, source = 'system', correlationId = null) {
    return new AuditLogEntry({
      userId,
      action: 'updated',
      entityType,
      entityId,
      oldValues,
      newValues,
      source,
      correlationId,
      timestamp: new Date()
    });
  }

  // Create an audit log entry for a deletion event
  static createForDeletion(userId, entityType, entityId, source = 'system', correlationId = null) {
    return new AuditLogEntry({
      userId,
      action: 'deleted',
      entityType,
      entityId,
      source,
      correlationId,
      timestamp: new Date()
    });
  }

  // Create an audit log entry for a completion event
  static createForCompletion(userId, entityType, entityId, source = 'system', correlationId = null) {
    return new AuditLogEntry({
      userId,
      action: 'completed',
      entityType,
      entityId,
      source,
      correlationId,
      timestamp: new Date()
    });
  }

  // Create an audit log entry for other actions
  static createForAction(userId, action, entityType, entityId, values = null, source = 'system', correlationId = null) {
    const entryData = {
      userId,
      action,
      entityType,
      entityId,
      source,
      correlationId,
      timestamp: new Date()
    };

    if (values) {
      entryData.newValues = values;
    }

    return new AuditLogEntry(entryData);
  }

  // Extract values from an entity for logging
  static extractValues(entity) {
    // Create a copy of the entity without methods
    const values = {};
    for (const [key, value] of Object.entries(entity)) {
      // Skip functions and undefined values
      if (typeof value !== 'function' && value !== undefined) {
        values[key] = value;
      }
    }
    return values;
  }

  // Convert audit log entry to JSON for serialization
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      oldValues: this.oldValues,
      newValues: this.newValues,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      source: this.source,
      correlationId: this.correlationId
    };
  }

  // Create an AuditLogEntry instance from JSON data
  static fromJSON(jsonData) {
    return new AuditLogEntry({
      ...jsonData,
      timestamp: jsonData.timestamp ? new Date(jsonData.timestamp) : new Date()
    });
  }

  // Format the audit log entry for display
  formatForDisplay() {
    const actionText = this.action.charAt(0).toUpperCase() + this.action.slice(1);
    const entityText = this.entityType.toLowerCase();
    
    let description = `${actionText} ${entityText} ID: ${this.entityId}`;
    
    if (this.action === 'updated' && this.oldValues && this.newValues) {
      description += ' - Changes: ';
      const changes = [];
      
      for (const [key, newValue] of Object.entries(this.newValues)) {
        const oldValue = this.oldValues[key];
        if (oldValue !== newValue) {
          changes.push(`${key} (${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)})`);
        }
      }
      
      description += changes.join(', ');
    }
    
    return {
      id: this.id,
      description,
      userId: this.userId,
      timestamp: this.timestamp.toLocaleString(),
      source: this.source,
      correlationId: this.correlationId
    };
  }
}

module.exports = AuditLogEntry;