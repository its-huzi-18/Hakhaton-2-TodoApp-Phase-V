// RecurrenceRule entity model for Advanced Cloud Deployment

class RecurrenceRule {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.frequency = data.frequency || 'daily'; // daily, weekly, monthly, yearly
    this.interval = data.interval || 1; // How often to repeat (every N units)
    this.endDate = data.endDate ? new Date(data.endDate) : null; // When to stop recurring
    this.occurrenceCount = data.occurrenceCount || null; // Max number of occurrences
    this.daysOfWeek = data.daysOfWeek || []; // For weekly recurrences (0=Sunday, 1=Monday, etc.)
    this.dayOfMonth = data.dayOfMonth || null; // For monthly recurrences (1-31)
    this.monthOfYear = data.monthOfYear || null; // For yearly recurrences (1-12)
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  // Generate a unique ID for the recurrence rule
  generateId() {
    return 'rrule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate the recurrence rule data
  validate() {
    const errors = [];

    if (!this.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(this.frequency)) {
      errors.push('Frequency must be one of: daily, weekly, monthly, yearly');
    }

    if (typeof this.interval !== 'number' || this.interval < 1) {
      errors.push('Interval must be a positive number');
    }

    if (this.endDate && !(this.endDate instanceof Date)) {
      errors.push('End date must be a valid Date object');
    }

    if (this.occurrenceCount !== null && (typeof this.occurrenceCount !== 'number' || this.occurrenceCount < 1)) {
      errors.push('Occurrence count must be a positive number');
    }

    if (this.frequency === 'weekly' && this.daysOfWeek.length === 0) {
      errors.push('Weekly recurrences must specify at least one day of the week');
    }

    if (this.frequency === 'weekly' && this.daysOfWeek.some(day => day < 0 || day > 6)) {
      errors.push('Days of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    if (this.frequency === 'monthly' && this.dayOfMonth !== null && (this.dayOfMonth < 1 || this.dayOfMonth > 31)) {
      errors.push('Day of month must be between 1 and 31');
    }

    if (this.frequency === 'yearly' && this.monthOfYear !== null && (this.monthOfYear < 1 || this.monthOfYear > 12)) {
      errors.push('Month of year must be between 1 and 12');
    }

    // Check if both endDate and occurrenceCount are set (conflicting)
    if (this.endDate && this.occurrenceCount) {
      errors.push('Only one of endDate or occurrenceCount should be set');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Update recurrence rule properties
  update(updates) {
    const allowedUpdates = [
      'frequency', 'interval', 'endDate', 'occurrenceCount', 
      'daysOfWeek', 'dayOfMonth', 'monthOfYear', 'isActive'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'endDate' && value) {
          this[key] = new Date(value);
        } else {
          this[key] = value;
        }
      }
    }

    this.updatedAt = new Date();
  }

  // Calculate the next occurrence date based on the rule
  getNextOccurrence(startDate) {
    const start = new Date(startDate);
    let nextDate = new Date(start);

    switch (this.frequency) {
      case 'daily':
        nextDate.setDate(start.getDate() + this.interval);
        break;

      case 'weekly':
        // Add weeks based on interval
        nextDate.setDate(start.getDate() + (7 * this.interval));
        
        // If days of week are specified, find the next occurrence on those days
        if (this.daysOfWeek.length > 0) {
          // Find the next occurrence on one of the specified days
          nextDate = this.getNextWeekdayOccurrence(start);
        }
        break;

      case 'monthly':
        // Add months based on interval
        nextDate.setMonth(start.getMonth() + this.interval);
        
        // Adjust for months with fewer days
        if (this.dayOfMonth) {
          nextDate.setDate(this.dayOfMonth);
        }
        break;

      case 'yearly':
        // Add years based on interval
        nextDate.setFullYear(start.getFullYear() + this.interval);
        
        // Adjust for months with fewer days
        if (this.monthOfYear) {
          nextDate.setMonth(this.monthOfYear - 1);
        }
        break;

      default:
        throw new Error(`Unsupported frequency: ${this.frequency}`);
    }

    // Check if the next occurrence exceeds the end date or occurrence count
    if (this.endDate && nextDate > this.endDate) {
      return null;
    }

    return nextDate;
  }

  // Calculate the next occurrence on specified weekdays
  getNextWeekdayOccurrence(startDate) {
    const start = new Date(startDate);
    let candidateDate = new Date(start);
    
    // Add one day to start checking from the next day
    candidateDate.setDate(candidateDate.getDate() + 1);
    
    // Look ahead for up to 100 days to find a matching weekday
    for (let i = 0; i < 100; i++) {
      const dayOfWeek = candidateDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (this.daysOfWeek.includes(dayOfWeek)) {
        return candidateDate;
      }
      
      candidateDate.setDate(candidateDate.getDate() + 1);
    }
    
    // If no matching day is found within the search period, return null
    return null;
  }

  // Check if the rule has ended based on end date or occurrence count
  hasEnded(lastOccurrenceDate, occurrenceCountSoFar) {
    if (this.endDate && new Date() > this.endDate) {
      return true;
    }

    if (this.occurrenceCount && occurrenceCountSoFar >= this.occurrenceCount) {
      return true;
    }

    return false;
  }

  // Get the next N occurrences
  getNextNOccurrences(startDate, n = 5) {
    const occurrences = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < n; i++) {
      const nextOccurrence = this.getNextOccurrence(currentDate);
      
      if (!nextOccurrence) {
        break;
      }
      
      occurrences.push(nextOccurrence);
      currentDate = nextOccurrence;
    }

    return occurrences;
  }

  // Convert recurrence rule to JSON for serialization
  toJSON() {
    return {
      id: this.id,
      frequency: this.frequency,
      interval: this.interval,
      endDate: this.endDate ? this.endDate.toISOString() : null,
      occurrenceCount: this.occurrenceCount,
      daysOfWeek: this.daysOfWeek,
      dayOfMonth: this.dayOfMonth,
      monthOfYear: this.monthOfYear,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      isActive: this.isActive
    };
  }

  // Create a RecurrenceRule instance from JSON data
  static fromJSON(jsonData) {
    return new RecurrenceRule(jsonData);
  }
}

module.exports = RecurrenceRule;