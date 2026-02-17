// Notification entity model for Advanced Cloud Deployment

class Notification {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.taskId = data.taskId;
    this.userId = data.userId;
    this.reminderId = data.reminderId;
    this.type = data.type || 'reminder'; // reminder, update, completion, etc.
    this.content = data.content || '';
    this.channel = data.channel || 'email'; // email, push, sms, etc.
    this.status = data.status || 'pending'; // pending, sent, delivered, failed
    this.sentAt = data.sentAt ? new Date(data.sentAt) : null;
    this.deliveredAt = data.deliveredAt ? new Date(data.deliveredAt) : null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {}; // Additional channel-specific data
  }

  // Generate a unique ID for the notification
  generateId() {
    return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate the notification data
  validate() {
    const errors = [];

    if (!this.taskId) {
      errors.push('Task ID is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.reminderId) {
      errors.push('Reminder ID is required');
    }

    if (!this.type || !['reminder', 'update', 'completion', 'custom'].includes(this.type)) {
      errors.push('Type must be one of: reminder, update, completion, custom');
    }

    if (!this.content || typeof this.content !== 'string' || this.content.trim().length === 0) {
      errors.push('Content is required and must be a non-empty string');
    }

    if (!this.channel || !['email', 'push', 'sms', 'in_app'].includes(this.channel)) {
      errors.push('Channel must be one of: email, push, sms, in_app');
    }

    if (this.status && !['pending', 'sent', 'delivered', 'failed'].includes(this.status)) {
      errors.push('Status must be one of: pending, sent, delivered, failed');
    }

    if (this.metadata && typeof this.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Update notification properties
  update(updates) {
    const allowedUpdates = [
      'status', 'sentAt', 'deliveredAt', 'content', 'channel', 'metadata'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if ((key === 'sentAt' || key === 'deliveredAt') && value) {
          this[key] = new Date(value);
        } else {
          this[key] = value;
        }
      }
    }

    this.updatedAt = new Date();
  }

  // Mark notification as sent
  markAsSent() {
    this.status = 'sent';
    this.sentAt = new Date();
    this.updatedAt = new Date();
  }

  // Mark notification as delivered
  markAsDelivered() {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  // Mark notification as failed
  markAsFailed() {
    this.status = 'failed';
    this.updatedAt = new Date();
  }

  // Check if notification is overdue for delivery
  isOverdue() {
    if (!this.sentAt) {
      return false;
    }
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes
    return this.sentAt < tenMinutesAgo && this.status === 'sent';
  }

  // Convert notification to JSON for serialization
  toJSON() {
    return {
      id: this.id,
      taskId: this.taskId,
      userId: this.userId,
      reminderId: this.reminderId,
      type: this.type,
      content: this.content,
      channel: this.channel,
      status: this.status,
      sentAt: this.sentAt ? this.sentAt.toISOString() : null,
      deliveredAt: this.deliveredAt ? this.deliveredAt.toISOString() : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  // Create a Notification instance from JSON data
  static fromJSON(jsonData) {
    return new Notification(jsonData);
  }
}

module.exports = Notification;