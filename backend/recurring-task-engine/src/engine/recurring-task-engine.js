// RecurringTaskEngine implementation for Advanced Cloud Deployment

const BaseService = require('../../shared/utils/base-service');
const Task = require('../../shared/models/task');
const RecurrenceRule = require('../../shared/models/recurrence-rule');
const { logWithContext, generateCorrelationId } = require('../../shared/utils/logging-monitoring');
const config = require('../../shared/config/config-manager');

class RecurringTaskEngine extends BaseService {
  constructor(port = config.get('PORT', 3002)) {
    super('RecurringTaskEngine', port);
    this.tasks = new Map(); // In production, use a database
    this.recurrenceRules = new Map(); // Store recurrence rules
    this.setupEventHandlers();
  }

  async initialize() {
    await super.initialize();
    logWithContext(generateCorrelationId(), 'RecurringTaskEngine initialized');
  }

  async setupEventHandlers() {
    // Subscribe to task events to process recurring tasks
    this.subscribeToEvent('task-events', async (data) => {
      const correlationId = generateCorrelationId();
      try {
        logWithContext(correlationId, 'Processing task event for recurring tasks', { data });

        if (data.eventType === 'TaskCompleted') {
          await this.handleTaskCompleted(data, correlationId);
        } else if (data.eventType === 'TaskCreated') {
          await this.handleTaskCreated(data, correlationId);
        }
      } catch (error) {
        logWithContext(correlationId, 'Error processing task event for recurring tasks', { error: error.message });
      }
    });
  }

  // Handle task completion event
  async handleTaskCompleted(eventData, correlationId) {
    const { taskId, userId } = eventData;

    // Get the completed task
    const completedTask = await this.getTaskById(taskId);
    if (!completedTask) {
      logWithContext(correlationId, 'Completed task not found', { taskId });
      return;
    }

    // Check if the task has a recurrence rule
    if (!completedTask.recurrenceRuleId) {
      logWithContext(correlationId, 'Task does not have a recurrence rule, skipping', { taskId });
      return;
    }

    // Get the recurrence rule
    const recurrenceRule = await this.getRecurrenceRuleById(completedTask.recurrenceRuleId);
    if (!recurrenceRule) {
      logWithContext(correlationId, 'Recurrence rule not found for task', { 
        taskId, 
        recurrenceRuleId: completedTask.recurrenceRuleId 
      });
      return;
    }

    // Check if the rule has ended
    if (recurrenceRule.hasEnded(new Date(), completedTask.occurrenceCount || 1)) {
      logWithContext(correlationId, 'Recurrence rule has ended, not creating next occurrence', { 
        taskId, 
        recurrenceRuleId: completedTask.recurrenceRuleId 
      });
      return;
    }

    // Generate the next occurrence
    const nextOccurrence = await this.generateNextOccurrence(completedTask, recurrenceRule, correlationId);
    if (nextOccurrence) {
      logWithContext(correlationId, 'Next occurrence generated', { 
        originalTaskId: taskId, 
        newTaskId: nextOccurrence.id 
      });

      // Publish RecurringTaskGenerated event
      await this.publishEvent('task-events', {
        eventType: 'RecurringTaskGenerated',
        newTaskId: nextOccurrence.id,
        originalTaskId: taskId,
        userId: userId,
        timestamp: new Date().toISOString(),
        correlationId
      });
    }
  }

  // Handle task creation event
  async handleTaskCreated(eventData, correlationId) {
    // If the created task is a recurring task, store its recurrence rule
    if (eventData.recurrenceRuleId) {
      // In a real implementation, we might want to store the rule in our local map
      // For now, we'll just log the event
      logWithContext(correlationId, 'Recurring task created', { 
        taskId: eventData.taskId, 
        recurrenceRuleId: eventData.recurrenceRuleId 
      });
    }
  }

  // Generate the next occurrence of a recurring task
  async generateNextOccurrence(originalTask, recurrenceRule, correlationId) {
    try {
      // Calculate the next occurrence date
      const nextOccurrenceDate = recurrenceRule.getNextOccurrence(originalTask.completedAt || new Date());

      if (!nextOccurrenceDate) {
        logWithContext(correlationId, 'Could not calculate next occurrence date', { 
          taskId: originalTask.id 
        });
        return null;
      }

      // Create a new task with the same properties as the original
      const newTaskData = {
        title: originalTask.title,
        description: originalTask.description,
        dueDate: nextOccurrenceDate,
        priority: originalTask.priority,
        tags: [...originalTask.tags], // Copy tags
        status: 'pending', // New task starts as pending
        userId: originalTask.userId,
        recurrenceRuleId: originalTask.recurrenceRuleId, // Carry over the recurrence rule
        // Note: We don't copy the completedAt field as this is a new task
      };

      // Create the new task
      const newTask = new Task(newTaskData);

      // Validate the new task
      const validation = newTask.validate();
      if (!validation.isValid) {
        logWithContext(correlationId, 'New recurring task validation failed', { 
          errors: validation.errors,
          taskId: originalTask.id
        });
        return null;
      }

      // Store the new task
      this.tasks.set(newTask.id, newTask);
      logWithContext(correlationId, 'New recurring task created', { 
        originalTaskId: originalTask.id,
        newTaskId: newTask.id,
        dueDate: nextOccurrenceDate.toISOString()
      });

      // Publish TaskCreated event for the new task
      await this.publishEvent('task-events', {
        eventType: 'TaskCreated',
        taskId: newTask.id,
        userId: newTask.userId,
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : null,
        priority: newTask.priority,
        tags: newTask.tags,
        status: newTask.status,
        timestamp: new Date().toISOString(),
        correlationId
      });

      return newTask;
    } catch (error) {
      logWithContext(correlationId, 'Error generating next occurrence', { 
        error: error.message,
        originalTaskId: originalTask.id
      });
      throw error;
    }
  }

  // Get a task by ID (in a real implementation, this would fetch from a service)
  async getTaskById(taskId) {
    // In a real implementation, this would fetch from the task service
    // For this example, we'll return a mock task
    return this.tasks.get(taskId);
  }

  // Get a recurrence rule by ID
  async getRecurrenceRuleById(ruleId) {
    return this.recurrenceRules.get(ruleId);
  }

  // Store a recurrence rule
  async storeRecurrenceRule(rule) {
    this.recurrenceRules.set(rule.id, rule);
  }

  // Create a recurring task
  async createRecurringTask(taskData, recurrenceRuleData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Creating recurring task', { 
        title: taskData.title,
        recurrenceRule: recurrenceRuleData
      });

      // Validate recurrence rule
      const recurrenceRule = new RecurrenceRule(recurrenceRuleData);
      const ruleValidation = recurrenceRule.validate();
      if (!ruleValidation.isValid) {
        throw new Error(`Recurrence rule validation failed: ${ruleValidation.errors.join(', ')}`);
      }

      // Store the recurrence rule
      await this.storeRecurrenceRule(recurrenceRule);

      // Create the initial task with the recurrence rule ID
      const taskWithRule = {
        ...taskData,
        recurrenceRuleId: recurrenceRule.id
      };

      // Create the task
      const task = new Task(taskWithRule);
      const taskValidation = task.validate();
      if (!taskValidation.isValid) {
        throw new Error(`Task validation failed: ${taskValidation.errors.join(', ')}`);
      }

      // Store the task
      this.tasks.set(task.id, task);

      logWithContext(correlationId, 'Recurring task created successfully', { 
        taskId: task.id,
        ruleId: recurrenceRule.id
      });

      return { task, recurrenceRule };
    } catch (error) {
      logWithContext(correlationId, 'Error creating recurring task', { error: error.message });
      throw error;
    }
  }

  // Update a recurrence rule
  async updateRecurrenceRule(ruleId, updates) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Updating recurrence rule', { ruleId, updates });

      const existingRule = this.recurrenceRules.get(ruleId);
      if (!existingRule) {
        throw new Error(`Recurrence rule with ID ${ruleId} not found`);
      }

      // Update the rule
      existingRule.update(updates);

      // Validate the updated rule
      const validation = existingRule.validate();
      if (!validation.isValid) {
        throw new Error(`Updated recurrence rule validation failed: ${validation.errors.join(', ')}`);
      }

      // Update in storage
      this.recurrenceRules.set(ruleId, existingRule);

      logWithContext(correlationId, 'Recurrence rule updated successfully', { ruleId });

      return existingRule;
    } catch (error) {
      logWithContext(correlationId, 'Error updating recurrence rule', { error: error.message });
      throw error;
    }
  }

  // Get all recurring tasks for a user
  async getRecurringTasksByUser(userId) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Fetching recurring tasks for user', { userId });

      const userTasks = Array.from(this.tasks.values()).filter(task => task.userId === userId);
      const recurringTasks = userTasks.filter(task => task.recurrenceRuleId);

      logWithContext(correlationId, 'Found recurring tasks', { 
        userId, 
        count: recurringTasks.length 
      });

      return recurringTasks;
    } catch (error) {
      logWithContext(correlationId, 'Error fetching recurring tasks', { error: error.message });
      throw error;
    }
  }

  // Get next occurrences for all recurring tasks
  async getNextOccurrences(userId, days = 7) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Calculating next occurrences', { userId, days });

      const recurringTasks = await this.getRecurringTasksByUser(userId);
      const nextOccurrences = [];

      for (const task of recurringTasks) {
        const rule = await this.getRecurrenceRuleById(task.recurrenceRuleId);
        if (rule) {
          const nextDates = rule.getNextNOccurrences(new Date(), 5); // Get next 5 occurrences
          
          for (const date of nextDates) {
            if (date <= new Date(new Date().setDate(new Date().getDate() + days))) {
              nextOccurrences.push({
                taskId: task.id,
                title: task.title,
                nextOccurrence: date,
                rule: rule.toJSON()
              });
            }
          }
        }
      }

      logWithContext(correlationId, 'Calculated next occurrences', { 
        userId, 
        count: nextOccurrences.length 
      });

      return nextOccurrences;
    } catch (error) {
      logWithContext(correlationId, 'Error calculating next occurrences', { error: error.message });
      throw error;
    }
  }
}

module.exports = RecurringTaskEngine;