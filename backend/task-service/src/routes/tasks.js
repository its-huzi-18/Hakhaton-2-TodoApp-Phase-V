// Task creation endpoint for Advanced Cloud Deployment

const express = require('express');
const TaskService = require('./services/task-service');
const { generateCorrelationId, logWithContext } = require('../../shared/utils/logging-monitoring');

const router = express.Router();
const taskService = new TaskService();

// Create a new task
router.post('/', async (req, res) => {
  const correlationId = generateCorrelationId();
  try {
    logWithContext(correlationId, 'Creating new task', { body: req.body });

    const taskData = { ...req.body, userId: req.user?.id };
    
    // Validate required fields
    if (!taskData.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create task instance
    const task = new Task(taskData);

    // Validate task
    const validation = task.validate();
    if (!validation.isValid) {
      logWithContext(correlationId, 'Task validation failed', { errors: validation.errors });
      return res.status(400).json({ errors: validation.errors });
    }

    // Store task
    taskService.tasks.set(task.id, task);
    logWithContext(correlationId, 'Task created successfully', { taskId: task.id });

    // Publish TaskCreated event
    await taskService.publishEvent('task-events', {
      eventType: 'TaskCreated',
      taskId: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      priority: task.priority,
      tags: task.tags,
      status: task.status,
      timestamp: new Date().toISOString(),
      correlationId
    });

    res.status(201).json(task.toJSON());
  } catch (error) {
    logWithContext(correlationId, 'Error creating task', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks for the authenticated user
router.get('/', async (req, res) => {
  const correlationId = generateCorrelationId();
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    logWithContext(correlationId, 'Fetching tasks for user', { userId });

    const userTasks = Array.from(taskService.tasks.values())
      .filter(task => task.userId === userId);

    // Apply filters if provided
    const { status, priority, dueDateFrom, dueDateTo, tag } = req.query;

    if (status) userTasks.filter(t => t.status === status);
    if (priority) userTasks.filter(t => t.priority === priority);
    if (dueDateFrom) userTasks.filter(t => t.dueDate >= new Date(dueDateFrom));
    if (dueDateTo) userTasks.filter(t => t.dueDate <= new Date(dueDateTo));
    if (tag) userTasks.filter(t => t.tags.includes(tag));

    res.json(userTasks.map(task => task.toJSON()));
  } catch (error) {
    logWithContext(correlationId, 'Error fetching tasks', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get a specific task
router.get('/:id', async (req, res) => {
  const correlationId = generateCorrelationId();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const task = taskService.tasks.get(id);

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
router.put('/:id', async (req, res) => {
  const correlationId = generateCorrelationId();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const task = taskService.tasks.get(id);

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

    taskService.tasks.set(id, task);

    logWithContext(correlationId, 'Task updated successfully', { taskId: id });

    // Publish TaskUpdated event
    await taskService.publishEvent('task-events', {
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
router.delete('/:id', async (req, res) => {
  const correlationId = generateCorrelationId();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const task = taskService.tasks.get(id);

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    taskService.tasks.delete(id);

    logWithContext(correlationId, 'Task deleted successfully', { taskId: id });

    // Publish TaskDeleted event
    await taskService.publishEvent('task-events', {
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
router.post('/:id/complete', async (req, res) => {
  const correlationId = generateCorrelationId();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const task = taskService.tasks.get(id);

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

    taskService.tasks.set(id, task);

    logWithContext(correlationId, 'Task completed successfully', { taskId: id });

    // Publish TaskCompleted event
    await taskService.publishEvent('task-events', {
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

module.exports = router;