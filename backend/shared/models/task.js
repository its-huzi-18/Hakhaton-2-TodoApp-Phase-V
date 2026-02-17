// Task entity model for Advanced Cloud Deployment

class Task {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.title = data.title;
    this.description = data.description || '';
    this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    this.priority = data.priority || 'medium'; // low, medium, high, urgent
    this.tags = data.tags || [];
    this.status = data.status || 'pending'; // pending, completed, cancelled
    this.userId = data.userId;
    this.recurrenceRuleId = data.recurrenceRuleId || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.completedAt = data.completedAt || null;
  }

  // Generate a unique ID for the task
  generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate the task data
  validate() {
    const errors = [];

    if (!this.title || typeof this.title !== 'string' || this.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }

    if (this.title && this.title.length > 255) {
      errors.push('Title must not exceed 255 characters');
    }

    if (this.description && typeof this.description !== 'string') {
      errors.push('Description must be a string');
    }

    if (this.dueDate && !(this.dueDate instanceof Date)) {
      errors.push('Due date must be a valid Date object');
    }

    if (this.dueDate && this.dueDate < new Date()) {
      errors.push('Due date cannot be in the past');
    }

    if (this.priority && !['low', 'medium', 'high', 'urgent'].includes(this.priority)) {
      errors.push('Priority must be one of: low, medium, high, urgent');
    }

    if (this.tags && !Array.isArray(this.tags)) {
      errors.push('Tags must be an array of strings');
    }

    if (this.status && !['pending', 'completed', 'cancelled'].includes(this.status)) {
      errors.push('Status must be one of: pending, completed, cancelled');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Update task properties
  update(updates) {
    const allowedUpdates = [
      'title', 'description', 'dueDate', 'priority', 'tags', 
      'status', 'recurrenceRuleId', 'completedAt'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'dueDate' && value) {
          this[key] = new Date(value);
        } else {
          this[key] = value;
        }
      }
    }

    this.updatedAt = new Date();

    // If status is updated to completed, set completedAt
    if (updates.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }

    // If status is updated from completed to something else, clear completedAt
    if (this.status !== 'completed' && this.completedAt) {
      this.completedAt = null;
    }
  }

  // Mark task as completed
  complete() {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  // Mark task as cancelled
  cancel() {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  // Check if task is overdue
  isOverdue() {
    if (!this.dueDate || this.status !== 'pending') {
      return false;
    }
    return this.dueDate < new Date();
  }

  // Check if task is due soon (within 24 hours)
  isDueSoon() {
    if (!this.dueDate || this.status !== 'pending') {
      return false;
    }
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.dueDate > now && this.dueDate <= tomorrow;
  }

  // Convert task to JSON for serialization
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate ? this.dueDate.toISOString() : null,
      priority: this.priority,
      tags: this.tags,
      status: this.status,
      userId: this.userId,
      recurrenceRuleId: this.recurrenceRuleId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt ? this.completedAt.toISOString() : null
    };
  }

  // Create a Task instance from JSON data
  static fromJSON(jsonData) {
    return new Task(jsonData);
  }
}

module.exports = Task;