// TaskService implementation for Advanced Cloud Deployment

const BaseService = require('../../shared/utils/base-service');
const Task = require('../../shared/models/task');
const { logWithContext, generateCorrelationId } = require('../../shared/utils/logging-monitoring');
const config = require('../../shared/config/config-manager');

class TaskService extends BaseService {
  constructor(port = config.get('PORT', 3000)) {
    super('TaskService', port);
    this.tasks = new Map(); // In production, use a database
    this.setupRoutes();
  }

  async initialize() {
    await super.initialize();
    logWithContext(generateCorrelationId(), 'TaskService initialized');
  }

  setupRoutes() {
    // Create a new task
    this.app.post('/tasks', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        logWithContext(correlationId, 'Creating new task', { body: req.body });

        const taskData = { ...req.body, userId: req.user?.id };
        const task = new Task(taskData);

        const validation = task.validate();
        if (!validation.isValid) {
          logWithContext(correlationId, 'Task validation failed', { errors: validation.errors });
          return res.status(400).json({ errors: validation.errors });
        }

        this.tasks.set(task.id, task);
        logWithContext(correlationId, 'Task created successfully', { taskId: task.id });

        // Publish TaskCreated event
        await this.publishEvent('task-events', {
          eventType: 'TaskCreated',
          taskId: task.id,
          userId: task.userId,
          timestamp: new Date().toISOString(),
          correlationId
        });

        res.status(201).json(task.toJSON());
      } catch (error) {
        logWithContext(correlationId, 'Error creating task', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Get all tasks for a user
    this.app.get('/tasks', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        logWithContext(correlationId, 'Fetching tasks for user', { userId });

        const userTasks = Array.from(this.tasks.values())
          .filter(task => task.userId === userId);

        // Apply filters if provided
        const { status, priority, dueDateFrom, dueDateTo, tag } = req.query;

        if (status) userTasks = userTasks.filter(task => task.status === status);
        if (priority) userTasks = userTasks.filter(task => task.priority === priority);
        if (dueDateFrom) userTasks = userTasks.filter(task => task.dueDate >= new Date(dueDateFrom));
        if (dueDateTo) userTasks = userTasks.filter(task => task.dueDate <= new Date(dueDateTo));
        if (tag) userTasks = userTasks.filter(task => task.tags.includes(tag));

        // Apply sorting if provided
        const { sortBy, sortOrder } = req.query;
        if (sortBy) {
          userTasks.sort((a, b) => {
            let comparison = 0;
            if (a[sortBy] > b[sortBy]) comparison = 1;
            if (a[sortBy] < b[sortBy]) comparison = -1;
            return sortOrder === 'desc' ? -comparison : comparison;
          });
        }

        res.json(userTasks.map(task => task.toJSON()));
      } catch (error) {
        logWithContext(correlationId, 'Error fetching tasks', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Get a specific task
    this.app.get('/tasks/:id', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        const task = this.tasks.get(id);

        if (!task || task.userId !== userId) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task.toJSON());
      } catch (error) {
        logWithContext(correlationId, 'Error fetching task', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Update a task
    this.app.put('/tasks/:id', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        const task = this.tasks.get(id);

        if (!task || task.userId !== userId) {
          return res.status(404).json({ error: 'Task not found' });
        }

        task.update(req.body);
        task.updatedAt = new Date();

        const validation = task.validate();
        if (!validation.isValid) {
          logWithContext(correlationId, 'Task validation failed after update', { errors: validation.errors });
          return res.status(400).json({ errors: validation.errors });
        }

        this.tasks.set(id, task);

        logWithContext(correlationId, 'Task updated successfully', { taskId: id });

        // Publish TaskUpdated event
        await this.publishEvent('task-events', {
          eventType: 'TaskUpdated',
          taskId: task.id,
          userId: task.userId,
          timestamp: new Date().toISOString(),
          correlationId
        });

        res.json(task.toJSON());
      } catch (error) {
        logWithContext(correlationId, 'Error updating task', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Delete a task
    this.app.delete('/tasks/:id', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        const task = this.tasks.get(id);

        if (!task || task.userId !== userId) {
          return res.status(404).json({ error: 'Task not found' });
        }

        this.tasks.delete(id);

        logWithContext(correlationId, 'Task deleted successfully', { taskId: id });

        // Publish TaskDeleted event
        await this.publishEvent('task-events', {
          eventType: 'TaskDeleted',
          taskId: task.id,
          userId: task.userId,
          timestamp: new Date().toISOString(),
          correlationId
        });

        res.status(204).send();
      } catch (error) {
        logWithContext(correlationId, 'Error deleting task', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Mark a task as completed
    this.app.post('/tasks/:id/complete', async (req, res) => {
      const correlationId = generateCorrelationId();
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        const task = this.tasks.get(id);

        if (!task || task.userId !== userId) {
          return res.status(404).json({ error: 'Task not found' });
        }

        if (task.status === 'completed') {
          return res.status(400).json({ error: 'Task is already completed' });
        }

        if (task.status === 'cancelled') {
          return res.status(400).json({ error: 'Cannot complete a cancelled task' });
        }

        task.complete();

        this.tasks.set(id, task);

        logWithContext(correlationId, 'Task completed successfully', { taskId: id });

        // Publish TaskCompleted event
        await this.publishEvent('task-events', {
          eventType: 'TaskCompleted',
          taskId: task.id,
          userId: task.userId,
          completedAt: task.completedAt.toISOString(),
          timestamp: new Date().toISOString(),
          correlationId
        });

        res.json(task.toJSON());
      } catch (error) {
        logWithContext(correlationId, 'Error completing task', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });
  }

  // Method to get all tasks (used internally)
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  // Method to get task by ID (used internally)
  getTaskById(taskId) {
    return this.tasks.get(taskId);
  }

  // Method to get tasks by user ID (used internally)
  getTasksByUserId(userId) {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }
}

module.exports = TaskService;