// Recurrence rule validation for Advanced Cloud Deployment

class RecurrenceRuleValidator {
  // Validate recurrence rule creation data
  static validateRuleCreation(data) {
    const errors = [];

    // Validate frequency
    if (!data.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(data.frequency)) {
      errors.push('Frequency must be one of: daily, weekly, monthly, yearly');
    }

    // Validate interval
    if (data.interval === undefined || data.interval === null) {
      data.interval = 1; // Default to 1
    } else if (typeof data.interval !== 'number' || data.interval < 1) {
      errors.push('Interval must be a positive number (default is 1)');
    }

    // Validate end date
    if (data.endDate) {
      const endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push('End date must be a valid date');
      } else if (endDate < new Date()) {
        errors.push('End date cannot be in the past');
      }
    }

    // Validate occurrence count
    if (data.occurrenceCount !== undefined && data.occurrenceCount !== null) {
      if (typeof data.occurrenceCount !== 'number' || data.occurrenceCount < 1) {
        errors.push('Occurrence count must be a positive number');
      }
    }

    // Validate days of week for weekly recurrences
    if (data.frequency === 'weekly') {
      if (!data.daysOfWeek || !Array.isArray(data.daysOfWeek) || data.daysOfWeek.length === 0) {
        errors.push('Weekly recurrences must specify at least one day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)');
      } else {
        for (const day of data.daysOfWeek) {
          if (typeof day !== 'number' || day < 0 || day > 6) {
            errors.push('Days of week must be between 0 (Sunday) and 6 (Saturday)');
            break;
          }
        }
        // Check for duplicate days
        const uniqueDays = [...new Set(data.daysOfWeek)];
        if (uniqueDays.length !== data.daysOfWeek.length) {
          errors.push('Days of week must not contain duplicates');
        }
      }
    } else if (data.daysOfWeek && data.daysOfWeek.length > 0) {
      errors.push('Days of week can only be specified for weekly recurrences');
    }

    // Validate day of month for monthly recurrences
    if (data.frequency === 'monthly') {
      if (data.dayOfMonth !== undefined && data.dayOfMonth !== null) {
        if (typeof data.dayOfMonth !== 'number' || data.dayOfMonth < 1 || data.dayOfMonth > 31) {
          errors.push('Day of month must be between 1 and 31');
        }
      }
    } else if (data.dayOfMonth !== undefined && data.dayOfMonth !== null) {
      errors.push('Day of month can only be specified for monthly recurrences');
    }

    // Validate month of year for yearly recurrences
    if (data.frequency === 'yearly') {
      if (data.monthOfYear !== undefined && data.monthOfYear !== null) {
        if (typeof data.monthOfYear !== 'number' || data.monthOfYear < 1 || data.monthOfYear > 12) {
          errors.push('Month of year must be between 1 and 12');
        }
      }
    } else if (data.monthOfYear !== undefined && data.monthOfYear !== null) {
      errors.push('Month of year can only be specified for yearly recurrences');
    }

    // Check that only one of endDate or occurrenceCount is set (not both)
    if (data.endDate && data.occurrenceCount !== undefined && data.occurrenceCount !== null) {
      errors.push('Only one of endDate or occurrenceCount should be set, not both');
    }

    // Validate isActive
    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      errors.push('isActive must be a boolean value');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate recurrence rule update data
  static validateRuleUpdate(updates) {
    // Only validate the fields that are being updated
    const dataToValidate = {};
    
    // Copy only the fields that are being updated
    const fieldsToCheck = [
      'frequency', 'interval', 'endDate', 'occurrenceCount', 
      'daysOfWeek', 'dayOfMonth', 'monthOfYear', 'isActive'
    ];
    
    for (const field of fieldsToCheck) {
      if (updates[field] !== undefined) {
        dataToValidate[field] = updates[field];
      }
    }
    
    // Add required fields that shouldn't change during update
    if (updates.frequency) {
      dataToValidate.frequency = updates.frequency;
    }
    
    return this.validateRuleCreation(dataToValidate);
  }

  // Validate a complete recurrence rule object
  static validateCompleteRule(rule) {
    // Create a data object from the rule properties
    const data = {
      frequency: rule.frequency,
      interval: rule.interval,
      endDate: rule.endDate,
      occurrenceCount: rule.occurrenceCount,
      daysOfWeek: rule.daysOfWeek,
      dayOfMonth: rule.dayOfMonth,
      monthOfYear: rule.monthOfYear,
      isActive: rule.isActive
    };

    return this.validateRuleCreation(data);
  }

  // Validate that a date is valid for a recurrence rule
  static validateDateForRule(date, rule) {
    const errors = [];
    const checkDate = new Date(date);

    if (isNaN(checkDate.getTime())) {
      errors.push('Date must be valid');
    }

    // Check if date is in the past (for future occurrences)
    if (checkDate < new Date()) {
      errors.push('Date cannot be in the past');
    }

    // For weekly rules, check if the date falls on a valid day of the week
    if (rule.frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      if (!rule.daysOfWeek.includes(dayOfWeek)) {
        errors.push(`Date does not fall on a valid day of the week for this rule. Rule requires: ${rule.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`);
      }
    }

    // For monthly rules, check if the date has a valid day of the month
    if (rule.frequency === 'monthly' && rule.dayOfMonth) {
      if (checkDate.getDate() !== rule.dayOfMonth) {
        errors.push(`Date does not match the required day of the month (${rule.dayOfMonth}) for this rule`);
      }
    }

    // For yearly rules, check if the date has a valid month
    if (rule.frequency === 'yearly' && rule.monthOfYear) {
      if (checkDate.getMonth() + 1 !== rule.monthOfYear) { // getMonth() returns 0-11
        errors.push(`Date does not match the required month of the year (${rule.monthOfYear}) for this rule`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate that a recurrence rule is compatible with a task's due date
  static validateRuleCompatibilityWithTask(rule, taskDueDate) {
    const errors = [];
    const dueDate = new Date(taskDueDate);

    if (isNaN(dueDate.getTime())) {
      errors.push('Task due date must be valid');
    }

    // Check if the rule's constraints are compatible with the due date
    const dateValidation = this.validateDateForRule(taskDueDate, rule);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate that a recurrence rule will eventually end (to prevent infinite loops)
  static validateRuleWillEnd(rule) {
    const errors = [];

    // A rule should have some termination condition
    if (!rule.endDate && (!rule.occurrenceCount || rule.occurrenceCount === null)) {
      errors.push('Rule must have either an end date or a maximum occurrence count to prevent infinite recurrence');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate that a recurrence rule is active
  static validateRuleIsActive(rule) {
    const errors = [];

    if (rule.isActive === false) {
      errors.push('Rule is not active');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Comprehensive validation combining multiple checks
  static validateRuleComprehensive(rule, taskDueDate = null) {
    const allErrors = [];

    // Basic rule validation
    const basicValidation = this.validateCompleteRule(rule);
    if (!basicValidation.isValid) {
      allErrors.push(...basicValidation.errors);
    }

    // Check if rule will end
    const willEndValidation = this.validateRuleWillEnd(rule);
    if (!willEndValidation.isValid) {
      allErrors.push(...willEndValidation.errors);
    }

    // Check if rule is active
    const isActiveValidation = this.validateRuleIsActive(rule);
    if (!isActiveValidation.isValid) {
      allErrors.push(...isActiveValidation.errors);
    }

    // Validate against task due date if provided
    if (taskDueDate) {
      const compatibilityValidation = this.validateRuleCompatibilityWithTask(rule, taskDueDate);
      if (!compatibilityValidation.isValid) {
        allErrors.push(...compatibilityValidation.errors);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

module.exports = RecurrenceRuleValidator;