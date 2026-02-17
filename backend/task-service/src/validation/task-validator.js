// Task validation module for Advanced Cloud Deployment

class TaskValidator {
  // Validate task creation data
  static validateTaskCreation(data) {
    const errors = [];

    // Validate title
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    } else if (data.title.length > 255) {
      errors.push('Title must not exceed 255 characters');
    }

    // Validate description
    if (data.description && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }

    // Validate due date
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.push('Due date must be a valid date');
      } else if (dueDate < new Date()) {
        errors.push('Due date cannot be in the past');
      }
    }

    // Validate priority
    if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.push('Priority must be one of: low, medium, high, urgent');
    }

    // Validate tags
    if (data.tags && !Array.isArray(data.tags)) {
      errors.push('Tags must be an array of strings');
    } else if (data.tags) {
      for (const tag of data.tags) {
        if (typeof tag !== 'string') {
          errors.push('Each tag must be a string');
          break;
        }
      }
    }

    // Validate status
    if (data.status && !['pending', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Status must be one of: pending, completed, cancelled');
    }

    // Validate user ID
    if (!data.userId) {
      errors.push('User ID is required');
    }

    // Validate recurrence rule ID
    if (data.recurrenceRuleId && typeof data.recurrenceRuleId !== 'string') {
      errors.push('Recurrence rule ID must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate task update data
  static validateTaskUpdate(data) {
    const errors = [];

    // Validate title if provided
    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('Title must be a non-empty string');
      } else if (data.title.length > 255) {
        errors.push('Title must not exceed 255 characters');
      }
    }

    // Validate description if provided
    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }

    // Validate due date if provided
    if (data.dueDate !== undefined) {
      if (data.dueDate) {
        const dueDate = new Date(data.dueDate);
        if (isNaN(dueDate.getTime())) {
          errors.push('Due date must be a valid date');
        } else if (dueDate < new Date()) {
          errors.push('Due date cannot be in the past');
        }
      }
    }

    // Validate priority if provided
    if (data.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.push('Priority must be one of: low, medium, high, urgent');
    }

    // Validate tags if provided
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push('Tags must be an array of strings');
      } else {
        for (const tag of data.tags) {
          if (typeof tag !== 'string') {
            errors.push('Each tag must be a string');
            break;
          }
        }
      }
    }

    // Validate status if provided
    if (data.status !== undefined && !['pending', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Status must be one of: pending, completed, cancelled');
    }

    // Validate recurrence rule ID if provided
    if (data.recurrenceRuleId !== undefined && typeof data.recurrenceRuleId !== 'string') {
      errors.push('Recurrence rule ID must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate due date specifically
  static validateDueDate(dueDate) {
    if (!dueDate) {
      return {
        isValid: true,
        errors: []
      };
    }

    const errors = [];
    const parsedDate = new Date(dueDate);

    if (isNaN(parsedDate.getTime())) {
      errors.push('Due date must be a valid date');
    } else if (parsedDate < new Date()) {
      errors.push('Due date cannot be in the past');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate recurrence rule
  static validateRecurrenceRule(rule) {
    const errors = [];

    if (!rule) {
      return {
        isValid: true,
        errors: []
      };
    }

    // Validate frequency
    if (!rule.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency)) {
      errors.push('Frequency must be one of: daily, weekly, monthly, yearly');
    }

    // Validate interval
    if (rule.interval !== undefined && (typeof rule.interval !== 'number' || rule.interval < 1)) {
      errors.push('Interval must be a positive number');
    }

    // Validate end date
    if (rule.endDate) {
      const endDate = new Date(rule.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push('End date must be a valid date');
      }
    }

    // Validate occurrence count
    if (rule.occurrenceCount !== undefined && 
        (typeof rule.occurrenceCount !== 'number' || rule.occurrenceCount < 1)) {
      errors.push('Occurrence count must be a positive number');
    }

    // Validate days of week for weekly recurrences
    if (rule.frequency === 'weekly' && rule.daysOfWeek) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of rule.daysOfWeek) {
        if (!validDays.includes(day.toLowerCase())) {
          errors.push(`Invalid day of week: ${day}. Must be one of: ${validDays.join(', ')}`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate user permissions for task operations
  static validateUserPermissions(user, task, operation) {
    const errors = [];

    if (!user) {
      errors.push('User authentication required');
    } else if (task && task.userId !== user.id) {
      errors.push('User does not have permission to perform this operation on this task');
    }

    // Additional permission checks based on operation
    switch (operation) {
      case 'update':
        // Check if user can update the task
        if (task && task.status === 'completed') {
          errors.push('Cannot update a completed task');
        }
        break;
      case 'complete':
        // Check if user can complete the task
        if (task && task.status === 'completed') {
          errors.push('Task is already completed');
        } else if (task && task.status === 'cancelled') {
          errors.push('Cannot complete a cancelled task');
        }
        break;
      case 'delete':
        // Check if user can delete the task
        if (task && task.status === 'completed') {
          errors.push('Cannot delete a completed task');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TaskValidator;