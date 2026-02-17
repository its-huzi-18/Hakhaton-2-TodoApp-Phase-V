// Recurrence rule processing for Advanced Cloud Deployment

const RecurrenceRule = require('../../../shared/models/recurrence-rule');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class RuleProcessor {
  constructor(recurringTaskEngine) {
    this.engine = recurringTaskEngine;
  }

  // Process a recurrence rule to determine the next occurrence
  async processRule(ruleId, lastOccurrenceDate, occurrenceCount = 0) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing recurrence rule', { 
        ruleId, 
        lastOccurrenceDate, 
        occurrenceCount 
      });

      // Get the recurrence rule
      const rule = await this.engine.getRecurrenceRuleById(ruleId);
      if (!rule) {
        throw new Error(`Recurrence rule with ID ${ruleId} not found`);
      }

      // Check if the rule has ended
      if (rule.hasEnded(lastOccurrenceDate, occurrenceCount)) {
        logWithContext(correlationId, 'Recurrence rule has ended', { ruleId });
        return null;
      }

      // Calculate the next occurrence
      const nextOccurrence = rule.getNextOccurrence(lastOccurrenceDate);
      if (!nextOccurrence) {
        logWithContext(correlationId, 'Could not calculate next occurrence', { ruleId });
        return null;
      }

      logWithContext(correlationId, 'Next occurrence calculated', { 
        ruleId, 
        nextOccurrence: nextOccurrence.toISOString() 
      });

      return nextOccurrence;
    } catch (error) {
      logWithContext(correlationId, 'Error processing recurrence rule', { 
        ruleId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Process multiple recurrence rules
  async processMultipleRules(rulesWithDates) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing multiple recurrence rules', { 
        count: rulesWithDates.length 
      });

      const results = [];
      for (const { ruleId, lastOccurrenceDate, occurrenceCount } of rulesWithDates) {
        try {
          const nextOccurrence = await this.processRule(ruleId, lastOccurrenceDate, occurrenceCount);
          results.push({
            ruleId,
            nextOccurrence,
            success: !!nextOccurrence
          });
        } catch (error) {
          results.push({
            ruleId,
            error: error.message,
            success: false
          });
        }
      }

      logWithContext(correlationId, 'Multiple rule processing completed', { 
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      logWithContext(correlationId, 'Error processing multiple recurrence rules', { 
        error: error.message 
      });
      throw error;
    }
  }

  // Validate a recurrence rule
  validateRule(ruleData) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Validating recurrence rule', { 
        frequency: ruleData.frequency,
        interval: ruleData.interval
      });

      const rule = new RecurrenceRule(ruleData);
      const validation = rule.validate();

      if (!validation.isValid) {
        logWithContext(correlationId, 'Recurrence rule validation failed', { 
          errors: validation.errors 
        });
        return {
          isValid: false,
          errors: validation.errors
        };
      }

      logWithContext(correlationId, 'Recurrence rule validation passed');

      return {
        isValid: true,
        rule: rule
      };
    } catch (error) {
      logWithContext(correlationId, 'Error validating recurrence rule', { 
        error: error.message 
      });
      throw error;
    }
  }

  // Calculate multiple occurrences for a rule
  async calculateMultipleOccurrences(ruleId, startDate, count = 5) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Calculating multiple occurrences', { 
        ruleId, 
        startDate, 
        count 
      });

      const rule = await this.engine.getRecurrenceRuleById(ruleId);
      if (!rule) {
        throw new Error(`Recurrence rule with ID ${ruleId} not found`);
      }

      const occurrences = [];
      let currentDate = new Date(startDate);

      for (let i = 0; i < count; i++) {
        const nextOccurrence = rule.getNextOccurrence(currentDate);
        
        if (!nextOccurrence) {
          logWithContext(correlationId, 'Could not calculate next occurrence', { 
            ruleId, 
            occurrenceNumber: i 
          });
          break;
        }

        // Check if the occurrence is within bounds
        if (rule.endDate && nextOccurrence > rule.endDate) {
          logWithContext(correlationId, 'Next occurrence exceeds end date', { 
            ruleId, 
            occurrenceDate: nextOccurrence.toISOString(),
            endDate: rule.endDate.toISOString()
          });
          break;
        }

        occurrences.push(nextOccurrence);
        currentDate = nextOccurrence;
      }

      logWithContext(correlationId, 'Calculated occurrences', { 
        ruleId, 
        count: occurrences.length 
      });

      return occurrences;
    } catch (error) {
      logWithContext(correlationId, 'Error calculating multiple occurrences', { 
        ruleId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get occurrences within a date range
  async getOccurrencesInRange(ruleId, startDate, endDate) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Getting occurrences in range', { 
        ruleId, 
        startDate, 
        endDate 
      });

      const rule = await this.engine.getRecurrenceRuleById(ruleId);
      if (!rule) {
        throw new Error(`Recurrence rule with ID ${ruleId} not found`);
      }

      const occurrences = [];
      let currentDate = new Date(startDate);

      // Limit iterations to prevent infinite loops
      let iterationCount = 0;
      const maxIterations = 1000;

      while (currentDate <= endDate && iterationCount < maxIterations) {
        const nextOccurrence = rule.getNextOccurrence(currentDate);
        
        if (!nextOccurrence) {
          logWithContext(correlationId, 'Could not calculate next occurrence', { ruleId });
          break;
        }

        // If the next occurrence is after the end date, we're done
        if (nextOccurrence > endDate) {
          break;
        }

        // Check if the occurrence is within the rule's bounds
        if (rule.endDate && nextOccurrence > rule.endDate) {
          logWithContext(correlationId, 'Next occurrence exceeds rule end date', { 
            ruleId, 
            occurrenceDate: nextOccurrence.toISOString(),
            ruleEndDate: rule.endDate.toISOString()
          });
          break;
        }

        occurrences.push(nextOccurrence);
        currentDate = nextOccurrence;
        iterationCount++;
      }

      if (iterationCount >= maxIterations) {
        logWithContext(correlationId, 'Reached maximum iterations while calculating occurrences', { ruleId });
      }

      logWithContext(correlationId, 'Found occurrences in range', { 
        ruleId, 
        count: occurrences.length 
      });

      return occurrences;
    } catch (error) {
      logWithContext(correlationId, 'Error getting occurrences in range', { 
        ruleId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Update a recurrence rule
  async updateRule(ruleId, updates) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Updating recurrence rule', { 
        ruleId, 
        updates 
      });

      // Validate the updates
      const currentRule = await this.engine.getRecurrenceRuleById(ruleId);
      if (!currentRule) {
        throw new Error(`Recurrence rule with ID ${ruleId} not found`);
      }

      // Create a temporary rule with the updates to validate
      const updatedRuleData = { ...currentRule.toJSON(), ...updates };
      const validation = this.validateRule(updatedRuleData);

      if (!validation.isValid) {
        throw new Error(`Updated rule validation failed: ${validation.errors.join(', ')}`);
      }

      // Update the rule in the engine
      const updatedRule = await this.engine.updateRecurrenceRule(ruleId, updates);

      logWithContext(correlationId, 'Recurrence rule updated successfully', { ruleId });

      return updatedRule;
    } catch (error) {
      logWithContext(correlationId, 'Error updating recurrence rule', { 
        ruleId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Process recurring tasks for a user
  async processUserRecurringTasks(userId) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Processing recurring tasks for user', { userId });

      // Get all recurring tasks for the user
      const recurringTasks = await this.engine.getRecurringTasksByUser(userId);

      const results = [];
      for (const task of recurringTasks) {
        try {
          // Get the recurrence rule for this task
          const rule = await this.engine.getRecurrenceRuleById(task.recurrenceRuleId);
          if (!rule) {
            logWithContext(correlationId, 'Recurrence rule not found for task', { 
              taskId: task.id, 
              ruleId: task.recurrenceRuleId 
            });
            continue;
          }

          // Calculate the next occurrence
          const nextOccurrence = await this.processRule(
            task.recurrenceRuleId, 
            task.completedAt || task.createdAt, 
            task.occurrenceCount || 1
          );

          if (nextOccurrence) {
            results.push({
              taskId: task.id,
              nextOccurrence: nextOccurrence.toISOString(),
              success: true
            });
          } else {
            results.push({
              taskId: task.id,
              success: false,
              message: 'Could not calculate next occurrence'
            });
          }
        } catch (error) {
          results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
        }
      }

      logWithContext(correlationId, 'User recurring tasks processing completed', { 
        userId, 
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      logWithContext(correlationId, 'Error processing user recurring tasks', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Get upcoming recurring tasks for a user
  async getUpcomingRecurringTasks(userId, days = 7) {
    const correlationId = generateCorrelationId();
    try {
      logWithContext(correlationId, 'Getting upcoming recurring tasks', { 
        userId, 
        days 
      });

      // Calculate the date range
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Get all recurring tasks for the user
      const recurringTasks = await this.engine.getRecurringTasksByUser(userId);

      const upcomingOccurrences = [];
      for (const task of recurringTasks) {
        try {
          // Get occurrences in the date range
          const occurrences = await this.getOccurrencesInRange(
            task.recurrenceRuleId,
            startDate,
            endDate
          );

          for (const occurrence of occurrences) {
            upcomingOccurrences.push({
              taskId: task.id,
              title: task.title,
              occurrenceDate: occurrence.toISOString(),
              rule: await this.engine.getRecurrenceRuleById(task.recurrenceRuleId)
            });
          }
        } catch (error) {
          logWithContext(correlationId, 'Error calculating occurrences for task', { 
            taskId: task.id, 
            error: error.message 
          });
        }
      }

      // Sort by occurrence date
      upcomingOccurrences.sort((a, b) => 
        new Date(a.occurrenceDate) - new Date(b.occurrenceDate)
      );

      logWithContext(correlationId, 'Found upcoming recurring tasks', { 
        userId, 
        count: upcomingOccurrences.length 
      });

      return upcomingOccurrences;
    } catch (error) {
      logWithContext(correlationId, 'Error getting upcoming recurring tasks', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = RuleProcessor;