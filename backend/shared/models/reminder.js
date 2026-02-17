// Reminder entity model for Advanced Cloud Deployment

class Reminder {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.taskId = data.taskId;
    this.userId = data.userId;
    this.scheduledTime = data.scheduledTime ? new Date(data.scheduledTime) : null;
    this.deliveryStatus = data.deliveryStatus || 'scheduled'; // scheduled, delivered, failed
    this.deliveryAttempts = data.deliveryAttempts || 0;
    this.deliveredAt = data.deliveredAt ? new Date(data.deliveredAt) : null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Generate a unique ID for the reminder
  generateId() {
    return 'reminder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate the reminder data
  validate() {
    const errors = [];

    if (!this.taskId) {
      errors.push('Task ID is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.scheduledTime || !(this.scheduledTime instanceof Date)) {
      errors.push('Scheduled time must be a valid Date object');
    }

    if (this.scheduledTime && this.scheduledTime < new Date()) {
      errors.push('Scheduled time cannot be in the past');
    }

    if (this.deliveryStatus && !['scheduled', 'delivered', 'failed'].includes(this.deliveryStatus)) {
      errors.push('Delivery status must be one of: scheduled, delivered, failed');
    }

    if (typeof this.deliveryAttempts !== 'number' || this.deliveryAttempts < 0) {
      errors.push('Delivery attempts must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Update reminder properties
  update(updates) {
    const allowedUpdates = [
      'scheduledTime', 'deliveryStatus', 'deliveryAttempts', 'deliveredAt'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'scheduledTime' && value) {
          this[key] = new Date(value);
        } else if (key === 'deliveredAt' && value) {
          this[key] = new Date(value);
        } else {
          this[key] = value;
        }
      }
    }

    this.updatedAt = new Date();
  }

  // Mark reminder as delivered
  markAsDelivered() {
    this.deliveryStatus = 'delivered';
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  // Mark reminder as failed
  markAsFailed() {
    this.deliveryStatus = 'failed';
    this.updatedAt = new Date();
  }

  // Increment delivery attempt count
  incrementDeliveryAttempt() {
    this.deliveryAttempts++;
    this.updatedAt = new Date();
  }

  // Check if reminder is overdue for delivery
  isOverdue() {
    if (!this.scheduledTime) {
      return false;
    }
    return this.scheduledTime < new Date() && this.deliveryStatus === 'scheduled';
  }

  // Check if reminder is ready for delivery (within 1 minute window)
  isReadyForDelivery() {
    if (!this.scheduledTime) {
      return false;
    }
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    return this.scheduledTime >= oneMinuteAgo && this.scheduledTime <= now && this.deliveryStatus === 'scheduled';
  }

  // Convert reminder to JSON for serialization
  toJSON() {
    return {
      id: this.id,
      taskId: this.taskId,
      userId: this.userId,
      scheduledTime: this.scheduledTime ? this.scheduledTime.toISOString() : null,
      deliveryStatus: this.deliveryStatus,
      deliveryAttempts: this.deliveryAttempts,
      deliveredAt: this.deliveredAt ? this.deliveredAt.toISOString() : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  // Create a Reminder instance from JSON data
  static fromJSON(jsonData) {
    return new Reminder(jsonData);
  }
}

module.exports = Reminder;