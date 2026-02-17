// Timezone handling for reminders in Advanced Cloud Deployment

const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class TimezoneHandler {
  constructor() {
    // Default timezone for the application
    this.defaultTimezone = 'UTC';
  }

  // Get user's timezone (in a real implementation, this would fetch from user preferences)
  getUserTimezone(userId) {
    // In a real implementation, this would fetch from a user service
    // For now, return a default timezone or UTC
    return 'UTC';
  }

  // Convert a date to the user's timezone
  convertToUserTimezone(date, userId) {
    const userTimezone = this.getUserTimezone(userId);
    const utcDate = new Date(date);
    
    // Convert to user's timezone
    const userDate = new Date(utcDate.toLocaleString('en-US', { timeZone: userTimezone }));
    
    return userDate;
  }

  // Convert a date from user's timezone to UTC
  convertFromUserTimezone(userDate, userId) {
    const userTimezone = this.getUserTimezone(userId);
    
    // Create a date object in the user's timezone
    const utcDate = new Date(userDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    return utcDate;
  }

  // Format a date for display in the user's timezone
  formatForDisplay(date, userId, options = {}) {
    const userTimezone = this.getUserTimezone(userId);
    
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: userTimezone
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(new Date(date));
  }

  // Check if a date is in the past considering the user's timezone
  isPast(date, userId) {
    const userTimezone = this.getUserTimezone(userId);
    const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
    const nowUserTimezone = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
    
    return userDate < nowUserTimezone;
  }

  // Calculate time difference between now and a date in the user's timezone
  getTimeUntil(date, userId) {
    const userTimezone = this.getUserTimezone(userId);
    const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
    const nowUserTimezone = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
    
    return userDate - nowUserTimezone;
  }

  // Adjust a date to account for timezone differences
  adjustForTimezone(date, userId, targetTimezone = null) {
    const timezone = targetTimezone || this.getUserTimezone(userId);
    
    // Create a date in the target timezone
    const adjustedDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    return adjustedDate;
  }

  // Validate that a scheduled time is valid for the user's timezone
  validateScheduledTime(scheduledTime, userId) {
    const correlationId = generateCorrelationId();
    
    try {
      const userTimezone = this.getUserTimezone(userId);
      const userScheduledTime = this.convertToUserTimezone(scheduledTime, userId);
      const nowInUserTimezone = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
      
      // Check if the scheduled time is in the past
      if (userScheduledTime < nowInUserTimezone) {
        const timeDiff = nowInUserTimezone - userScheduledTime;
        const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
        
        logWithContext(correlationId, 'Scheduled time is in the past', {
          userId,
          userTimezone,
          scheduledTime: userScheduledTime.toISOString(),
          currentTime: nowInUserTimezone.toISOString(),
          hoursDifference: hoursDiff
        });
        
        return {
          isValid: false,
          error: `Scheduled time is ${hoursDiff} hours in the past for user's timezone (${userTimezone})`
        };
      }
      
      // Check if the scheduled time is too far in the future (optional validation)
      const maxFutureDays = 365; // Max 1 year in the future
      const maxFutureTime = new Date(nowInUserTimezone);
      maxFutureTime.setDate(maxFutureTime.getDate() + maxFutureDays);
      
      if (userScheduledTime > maxFutureTime) {
        logWithContext(correlationId, 'Scheduled time is too far in the future', {
          userId,
          userTimezone,
          scheduledTime: userScheduledTime.toISOString(),
          maxAllowedTime: maxFutureTime.toISOString()
        });
        
        return {
          isValid: false,
          error: `Scheduled time is too far in the future (maximum allowed: ${maxFutureDays} days)`
        };
      }
      
      return {
        isValid: true
      };
    } catch (error) {
      logWithContext(correlationId, 'Error validating scheduled time for timezone', {
        userId,
        scheduledTime,
        error: error.message
      });
      
      return {
        isValid: false,
        error: 'Error validating scheduled time: ' + error.message
      };
    }
  }

  // Get the current time in a user's timezone
  getCurrentTimeInUserTimezone(userId) {
    const userTimezone = this.getUserTimezone(userId);
    return new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
  }

  // Format a date as ISO string in the user's timezone
  formatAsIsoInUserTimezone(date, userId) {
    const userTimezone = this.getUserTimezone(userId);
    const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
    
    return userDate.toISOString();
  }

  // Parse a date string considering the user's timezone
  parseDateInUserTimezone(dateString, userId) {
    const userTimezone = this.getUserTimezone(userId);
    
    // Create a date in the user's timezone
    const userDate = new Date(dateString);
    
    // Convert to UTC for storage
    const utcDate = new Date(userDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    return utcDate;
  }

  // Get timezone offset for a user
  getTimezoneOffset(userId) {
    const userTimezone = this.getUserTimezone(userId);
    const date = new Date();
    
    // Get the offset in minutes
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
    
    // Calculate the offset
    const offsetMs = userDate.getTime() - utcDate.getTime();
    const offsetMinutes = offsetMs / (1000 * 60);
    
    return offsetMinutes;
  }

  // Format time until a reminder in user-friendly format
  formatTimeUntilReadable(date, userId) {
    const timeUntil = this.getTimeUntil(date, userId);
    
    if (timeUntil < 0) {
      return 'Time has passed';
    }
    
    const days = Math.floor(timeUntil / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }
}

module.exports = TimezoneHandler;