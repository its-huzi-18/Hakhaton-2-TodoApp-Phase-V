# Data Model: Advanced Cloud Deployment

## Core Entities

### Task
- **Fields**:
  - id: UUID (primary key)
  - title: String (required, max 255 chars)
  - description: Text (optional)
  - dueDate: DateTime (nullable)
  - priority: Enum (low, medium, high, urgent)
  - tags: Array of Strings
  - status: Enum (pending, completed, cancelled)
  - userId: UUID (foreign key to User)
  - recurrenceRuleId: UUID (nullable, foreign key to RecurrenceRule)
  - createdAt: DateTime
  - updatedAt: DateTime
  - completedAt: DateTime (nullable)

- **Validation Rules**:
  - Title must not be empty
  - Due date must be in the future if provided
  - Status transition from pending to completed is allowed
  - Priority must be one of the defined enum values

- **State Transitions**:
  - pending → completed (when user marks task as done)
  - pending → cancelled (when user cancels task)
  - completed → pending (when user reopens task)

### Reminder
- **Fields**:
  - id: UUID (primary key)
  - taskId: UUID (foreign key to Task)
  - userId: UUID (foreign key to User)
  - scheduledTime: DateTime
  - deliveryStatus: Enum (scheduled, delivered, failed)
  - deliveryAttempts: Integer (default 0)
  - deliveredAt: DateTime (nullable)
  - createdAt: DateTime
  - updatedAt: DateTime

- **Validation Rules**:
  - Scheduled time must be in the future
  - Task must have a due date
  - Delivery status must be one of the defined enum values

### RecurrenceRule
- **Fields**:
  - id: UUID (primary key)
  - frequency: Enum (daily, weekly, monthly, yearly)
  - interval: Integer (positive, default 1)
  - endDate: DateTime (nullable)
  - occurrenceCount: Integer (nullable)
  - daysOfWeek: Array of Enums (monday, tuesday, wednesday, thursday, friday, saturday, sunday)
  - createdAt: DateTime
  - updatedAt: DateTime

- **Validation Rules**:
  - Frequency must be one of the defined enum values
  - Interval must be positive
  - Either endDate or occurrenceCount must be specified (not both null)

### AuditLogEntry
- **Fields**:
  - id: UUID (primary key)
  - userId: UUID (foreign key to User)
  - action: String (required, max 100 chars)
  - entityType: String (required, max 50 chars)
  - entityId: UUID
  - oldValues: JSON (nullable)
  - newValues: JSON (nullable)
  - timestamp: DateTime
  - metadata: JSON (nullable)

- **Validation Rules**:
  - Action must be one of: created, updated, deleted, completed
  - Entity type must be one of: Task, Reminder, RecurrenceRule
  - Timestamp must be current or past

### User
- **Fields**:
  - id: UUID (primary key)
  - username: String (unique, required)
  - email: String (unique, required, valid email format)
  - preferences: JSON (nullable, for notification settings)
  - createdAt: DateTime
  - updatedAt: DateTime

- **Validation Rules**:
  - Username must be unique and 3-30 characters
  - Email must be unique and valid format
  - Preferences must conform to defined schema

### Event
- **Fields**:
  - id: UUID (primary key)
  - eventType: String (required, max 100 chars)
  - subjectId: UUID (the entity the event relates to)
  - subjectType: String (required, max 50 chars)
  - payload: JSON (event data)
  - timestamp: DateTime
  - processed: Boolean (default false)

- **Validation Rules**:
  - Event type must be one of: TaskCreated, TaskUpdated, TaskCompleted, TaskDeleted, ReminderScheduled, etc.
  - Subject type must be one of: Task, Reminder, RecurrenceRule
  - Payload must conform to schema for event type

## Relationships
- User has many Tasks
- Task belongs to one User
- Task has zero or one RecurrenceRule
- Task has many Reminders
- Reminder belongs to one Task and one User
- RecurrenceRule has many Tasks
- AuditLogEntry belongs to one User
- Event relates to one subject (Task, Reminder, etc.)

## Indexes
- Task: indexes on userId, status, dueDate, createdAt
- Reminder: indexes on taskId, userId, scheduledTime, deliveryStatus
- AuditLogEntry: indexes on userId, entityType, entityId, timestamp
- Event: indexes on eventType, subjectId, subjectType, processed