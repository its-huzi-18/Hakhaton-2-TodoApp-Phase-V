// ReminderService implementation for Advanced Cloud Deployment

const BaseService = require('../../shared/utils/base-service');
const Reminder = require('../../shared/models/reminder');
const { logWithContext, generateCorrelationId } = require('../../shared/utils/logging-monitoring');
const config = require('../../shared/config/config-manager');

class ReminderService extends BaseService {
  constructor(port = config.get('PORT', 3001)) {
    super('ReminderService', port);
    this.reminders = new Map(); // In production, use a database
    this.setupRoutes();
    this.setupEventHandlers();
  }

  async initialize() {
    await super.initialize();
    logWithContext(generateCorrelationId(), 'ReminderService initialized');
  }

  setupRoutes() {
    // Get all reminders for a user
    this.app.get('/reminders', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        logWithContext(correlationId, 'Fetching reminders for user', { userId });

        const userReminders = Array.from(this.reminders.values())
          .filter(reminder => reminder.userId === userId);

        res.json(userReminders.map(reminder => reminder.toJSON()));
      } catch (error) {
        logWithContext(correlationId, 'Error fetching reminders', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Get a specific reminder
    this.app.get('/reminders/:id', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        const reminder = this.reminders.get(id);

        if (!reminder || reminder.userId !== userId) {
          return res.status(404).json({ error: 'Reminder not found' });
        }

        res.json(reminder.toJSON());
      } catch (error) {
        logWithContext(correlationId, 'Error fetching reminder', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });
  }

  async setupEventHandlers() {
    // Subscribe to task events to schedule reminders
    this.subscribeToEvent('task-events', async (data) => {
      const correlationId = generateCorrelationId();
      try {
        logWithContext(correlationId, 'Processing task event', { data });

        if (data.eventType === 'TaskCreated' && data.payload.dueDate) {
          // Schedule a reminder for the task's due date
          const reminder = new Reminder({
            taskId: data.payload.taskId,
            userId: data.payload.userId,
            scheduledTime: new Date(data.payload.dueDate)
          });

          const validation = reminder.validate();
          if (!validation.isValid) {
            logWithContext(correlationId, 'Reminder validation failed', { errors: validation.errors });
            return;
          }

          this.reminders.set(reminder.id, reminder);
          logWithContext(correlationId, 'Reminder scheduled', { reminderId: reminder.id });

          // Publish ReminderScheduled event
          await this.publishEvent('reminder-events', {
            eventType: 'ReminderScheduled',
            reminderId: reminder.id,
            taskId: reminder.taskId,
            userId: reminder.userId,
            scheduledTime: reminder.scheduledTime.toISOString(),
            timestamp: new Date().toISOString(),
            correlationId
          });
        } else if (data.eventType === 'TaskCompleted') {
          // Handle task completion - potentially cancel related reminders
          const remindersForTask = Array.from(this.reminders.values())
            .filter(r => r.taskId === data.payload.taskId && r.deliveryStatus === 'scheduled');

          for (const reminder of remindersForTask) {
            reminder.markAsDelivered(); // Mark as delivered since task is completed
            this.reminders.set(reminder.id, reminder);

            logWithContext(correlationId, 'Reminder marked as delivered for completed task', { 
              reminderId: reminder.id, 
              taskId: data.payload.taskId 
            });

            // Publish ReminderDelivered event
            await this.publishEvent('reminder-events', {
              eventType: 'ReminderDelivered',
              reminderId: reminder.id,
              taskId: reminder.taskId,
              userId: reminder.userId,
              deliveredAt: reminder.deliveredAt.toISOString(),
              timestamp: new Date().toISOString(),
              correlationId
            });
          }
        }
      } catch (error) {
        logWithContext(correlationId, 'Error processing task event', { error: error.message });
      }
    });
  }

  // Method to get all reminders (used internally)
  getAllReminders() {
    return Array.from(this.reminders.values());
  }

  // Method to get reminder by ID (used internally)
  getReminderById(reminderId) {
    return this.reminders.get(reminderId);
  }

  // Method to get reminders by user ID (used internally)
  getRemindersByUserId(userId) {
    return Array.from(this.reminders.values()).filter(reminder => reminder.userId === userId);
  }

  // Method to get reminders by task ID (used internally)
  getRemindersByTaskId(taskId) {
    return Array.from(this.reminders.values()).filter(reminder => reminder.taskId === taskId);
  }

  // Method to check for overdue reminders (used internally)
  getOverdueReminders() {
    return Array.from(this.reminders.values()).filter(reminder => reminder.isOverdue());
  }

  // Method to check for reminders ready for delivery (used internally)
  getReadyForDeliveryReminders() {
    return Array.from(this.reminders.values()).filter(reminder => reminder.isReadyForDelivery());
  }
}

module.exports = ReminderService;