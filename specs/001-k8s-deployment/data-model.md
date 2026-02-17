# Data Model: Todo Chatbot Application

## Overview
This document defines the data models for the Todo Chatbot application, including entities, fields, relationships, and validation rules required for the Kubernetes deployment.

## Entities

### Todo
The primary entity representing a todo item in the system.

**Fields**:
- `id` (string/UUID): Unique identifier for the todo item
- `title` (string): Title or subject of the todo item (required, max 255 chars)
- `description` (string): Detailed description of the todo item (optional, max 1000 chars)
- `completed` (boolean): Status indicating if the todo is completed (default: false)
- `created_at` (datetime): Timestamp when the todo was created (auto-generated)
- `updated_at` (datetime): Timestamp when the todo was last updated (auto-generated)
- `due_date` (datetime): Optional deadline for the todo item (nullable)

**Validation Rules**:
- `title` must be between 1 and 255 characters
- `description` must be between 0 and 1000 characters if provided
- `completed` must be a boolean value
- `created_at` and `updated_at` are automatically managed by the system

**State Transitions**:
- `active` → `completed`: When user marks todo as completed
- `completed` → `active`: When user unmarks completed todo

### User (Optional for future extension)
Entity representing a user of the todo application.

**Fields**:
- `id` (string/UUID): Unique identifier for the user
- `username` (string): Unique username (required, max 50 chars)
- `email` (string): User's email address (required, valid email format)
- `created_at` (datetime): Timestamp when the user account was created
- `updated_at` (datetime): Timestamp when the user account was last updated

**Validation Rules**:
- `username` must be unique and between 3 and 50 characters
- `email` must be unique and in valid email format

## Relationships
- One `User` can have many `Todo` items (one-to-many relationship)
- Note: In the current implementation, todos may not be associated with users (simple todo list)

## API Contract Requirements

### Todo Endpoints
- `GET /todos`: Retrieve all todos
- `POST /todos`: Create a new todo
- `GET /todos/{id}`: Retrieve a specific todo
- `PUT /todos/{id}`: Update a specific todo
- `DELETE /todos/{id}`: Delete a specific todo
- `PATCH /todos/{id}/toggle`: Toggle completion status

### Expected Request/Response Formats

**Create Todo Request**:
```json
{
  "title": "Sample Todo",
  "description": "Detailed description of the todo",
  "due_date": "2023-12-31T23:59:59Z"
}
```

**Todo Response**:
```json
{
  "id": "uuid-string",
  "title": "Sample Todo",
  "description": "Detailed description of the todo",
  "completed": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "due_date": "2023-12-31T23:59:59Z"
}
```

## Database Schema (for SQLite)

```sql
CREATE TABLE todos (
    id TEXT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME
);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_todos_updated_at
AFTER UPDATE ON todos
FOR EACH ROW
BEGIN
    UPDATE todos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## Configuration Requirements

### Environment Variables
- `DATABASE_URL`: Connection string for the database (e.g., "sqlite:///./todo.db")
- `DEBUG`: Boolean flag to enable/disable debug mode
- `SECRET_KEY`: Secret key for signing sessions/tokens
- `ALGORITHM`: Algorithm for token encoding (if authentication is implemented)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time in minutes

### Resource Requirements (for Kubernetes)
- CPU: Minimum 100m, Limit 500m
- Memory: Minimum 128Mi, Limit 512Mi
- Storage: 1Gi for persistent storage (if using persistent volumes)

## Validation Rules Summary
- All required fields must be present in requests
- String lengths must conform to defined limits
- Date/time fields must be in ISO 8601 format
- IDs must be valid UUIDs
- Boolean fields must be true/false values