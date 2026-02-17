// Shared event schemas for the Advanced Cloud Deployment project

// Task-related events
export const TaskCreatedEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['TaskCreated'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['taskId', 'userId', 'title', 'dueDate'],
      properties: {
        taskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] }
      }
    }
  }
};

export const TaskUpdatedEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['TaskUpdated'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['taskId', 'userId'],
      properties: {
        taskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] }
      }
    }
  }
};

export const TaskCompletedEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['TaskCompleted'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['taskId', 'userId', 'completedAt'],
      properties: {
        taskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        completedAt: { type: 'string', format: 'date-time' }
      }
    }
  }
};

export const TaskDeletedEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['TaskDeleted'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['taskId', 'userId'],
      properties: {
        taskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' }
      }
    }
  }
};

// Reminder-related events
export const ReminderScheduledEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['ReminderScheduled'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['reminderId', 'taskId', 'userId', 'scheduledTime'],
      properties: {
        reminderId: { type: 'string', format: 'uuid' },
        taskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        scheduledTime: { type: 'string', format: 'date-time' }
      }
    }
  }
};

export const ReminderDeliveredEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['ReminderDelivered'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['reminderId', 'taskId', 'userId', 'deliveredAt'],
      properties: {
        reminderId: { type: 'string', format: 'uuid' },
        taskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        deliveredAt: { type: 'string', format: 'date-time' }
      }
    }
  }
};

// Recurring task events
export const RecurringTaskGeneratedEventSchema = {
  type: 'object',
  required: ['id', 'eventType', 'timestamp', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', enum: ['RecurringTaskGenerated'] },
    timestamp: { type: 'string', format: 'date-time' },
    payload: {
      type: 'object',
      required: ['newTaskId', 'originalTaskId', 'userId'],
      properties: {
        newTaskId: { type: 'string', format: 'uuid' },
        originalTaskId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' }
      }
    }
  }
};