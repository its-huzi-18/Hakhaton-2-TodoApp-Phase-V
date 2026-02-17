// Duplicate prevention logic for reminders in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class DuplicateChecker {
  constructor(reminderService) {
    this.reminderService = reminderService;
    this.processedEvents = new Set(); // Track processed event IDs
    this.pendingReminders = new Map(); // Track reminders being processed
  }

  // Check if an event has already been processed
  isEventProcessed(eventId) {
    return this.processedEvents.has(eventId);
  }

  // Mark an event as processed
  markEventProcessed(eventId) {
    this.processedEvents.add(eventId);
    
    // Clean up old entries periodically to prevent memory leaks
    if (this.processedEvents.size > 10000) { // Arbitrary threshold
      this.cleanupOldEvents();
    }
  }

  // Clean up old event IDs
  cleanupOldEvents() {
    // In a real implementation, this would remove events older than a certain time
    // For this implementation, we'll just clear and reset
    this.processedEvents.clear();
  }

  // Check if a reminder already exists for a task at a specific time
  hasDuplicateReminder(taskId, scheduledTime, userId) {
    const reminders = this.reminderService.getRemindersByTaskId(taskId);
    
    // Normalize the scheduled time to compare properly
    const normalizedTime = new Date(scheduledTime).getTime();
    
    for (const reminder of reminders) {
      // Check if there's already a scheduled reminder for the same task at the same time
      if (reminder.taskId === taskId && 
          Math.abs(new Date(reminder.scheduledTime).getTime() - normalizedTime) < 60000 && // Within 1 minute
          reminder.userId === userId &&
          reminder.deliveryStatus === 'scheduled') {
        return true;
      }
    }
    
    return false;
  }

  // Check if a reminder is a duplicate before creating it
  async checkAndPreventDuplicate(taskId, scheduledTime, userId) {
    const correlationId = generateCorrelationId();
    
    // Check if we're already processing a reminder for this task at this time
    const processingKey = `${taskId}-${scheduledTime}-${userId}`;
    if (this.pendingReminders.has(processingKey)) {
      logWithContext(correlationId, 'Duplicate reminder creation attempt detected', {
        taskId,
        scheduledTime,
        userId
      });
      return { isDuplicate: true, message: 'Reminder creation is already in progress for this task at this time' };
    }

    // Check if a reminder already exists for this task at this time
    if (this.hasDuplicateReminder(taskId, scheduledTime, userId)) {
      logWithContext(correlationId, 'Duplicate reminder detected', {
        taskId,
        scheduledTime,
        userId
      });
      return { isDuplicate: true, message: 'A reminder already exists for this task at the specified time' };
    }

    // Mark this reminder creation as pending
    this.pendingReminders.set(processingKey, new Date());
    
    // Set a timeout to clear the pending status after a reasonable time
    setTimeout(() => {
      this.pendingReminders.delete(processingKey);
    }, 30000); // Clear after 30 seconds

    return { isDuplicate: false };
  }

  // Check if a notification is a duplicate
  isDuplicateNotification(taskId, userId, type, content) {
    // Get all notifications for this user and task
    const userNotifications = this.reminderService.getNotificationsByUser(userId);
    const taskNotifications = userNotifications.filter(n => n.taskId === taskId);
    
    // Check for similar notifications
    for (const notification of taskNotifications) {
      if (notification.type === type && 
          notification.content === content &&
          notification.status === 'pending') {
        return true;
      }
    }
    
    return false;
  }

  // Process an event with duplicate checking
  async processEventWithDuplicateCheck(eventId, processorFn) {
    const correlationId = generateCorrelationId();
    
    // Check if event was already processed
    if (this.isEventProcessed(eventId)) {
      logWithContext(correlationId, 'Event already processed, skipping', { eventId });
      return { processed: false, reason: 'duplicate_event' };
    }

    try {
      // Mark event as processed before executing the processor
      this.markEventProcessed(eventId);
      
      // Execute the actual processing
      const result = await processorFn();
      
      logWithContext(correlationId, 'Event processed successfully', { eventId });
      return { processed: true, result };
    } catch (error) {
      logWithContext(correlationId, 'Error processing event', { eventId, error: error.message });
      
      // If there was an error, we might want to unmark the event
      // depending on the error type (e.g., temporary failure vs permanent failure)
      if (this.isTransientError(error)) {
        // For transient errors, we might not want to mark as processed
        this.processedEvents.delete(eventId);
      }
      
      throw error;
    }
  }

  // Check if an error is transient (temporary) vs permanent
  isTransientError(error) {
    // Common transient error indicators
    const transientIndicators = [
      'network',
      'timeout',
      'connection',
      'retry',
      'temporary'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return transientIndicators.some(indicator => errorMessage.includes(indicator));
  }

  // Validate reminder uniqueness before scheduling
  async validateReminderUniqueness(reminderData) {
    const { taskId, scheduledTime, userId } = reminderData;
    
    // Check for duplicates
    const duplicateCheck = await this.checkAndPreventDuplicate(taskId, scheduledTime, userId);
    
    if (duplicateCheck.isDuplicate) {
      return {
        isValid: false,
        error: duplicateCheck.message
      };
    }
    
    return {
      isValid: true
    };
  }

  // Get statistics about duplicate prevention
  getStats() {
    return {
      processedEventsCount: this.processedEvents.size,
      pendingRemindersCount: this.pendingReminders.size
    };
  }

  // Clear all tracked events (for testing purposes)
  clearTrackedEvents() {
    this.processedEvents.clear();
    this.pendingReminders.clear();
  }
}

module.exports = DuplicateChecker;