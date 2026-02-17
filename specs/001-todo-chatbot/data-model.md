# Data Model: Todo Chatbot

**Feature**: Todo Chatbot
**Date**: 2026-01-10
**Author**: AI Assistant

## Overview

This document defines the data models for the AI-powered Todo Chatbot feature, detailing the entities, their attributes, relationships, and validation rules based on the feature requirements.

## Entity Definitions

### 1. Conversation

Represents a series of interactions between a user and the AI assistant.

**Attributes**:
- `id` (UUID/string): Unique identifier for the conversation
- `user_id` (string): Reference to the user who owns this conversation
- `created_at` (datetime): Timestamp when the conversation was initiated
- `updated_at` (datetime): Timestamp when the conversation was last updated
- `title` (string, optional): Auto-generated or user-defined title for the conversation

**Relationships**:
- One Conversation has many Messages
- One Conversation belongs to one User

**Validation Rules**:
- `user_id` must exist in the User table
- `created_at` must be in the past
- `updated_at` must be >= `created_at`
- `title` must be <= 200 characters if provided

**State Transitions**:
- Active (ongoing conversation)
- Archived (inactive conversation)

### 2. Message

Individual exchanges within a conversation, containing the user's input or the AI's response.

**Attributes**:
- `id` (UUID/string): Unique identifier for the message
- `conversation_id` (string): Reference to the parent conversation
- `sender_type` (enum: 'user', 'ai'): Identifies whether the message is from user or AI
- `content` (string): The actual text content of the message
- `timestamp` (datetime): When the message was sent/received
- `tool_calls` (JSON object, optional): Details of any tools called by the AI in response to this message
- `tool_responses` (JSON object, optional): Results of tool calls made in response to this message

**Relationships**:
- One Message belongs to one Conversation
- One Message has zero or more ToolCall records (embedded in JSON)

**Validation Rules**:
- `conversation_id` must exist in the Conversation table
- `sender_type` must be either 'user' or 'ai'
- `content` must not be empty
- `timestamp` must be in the past
- `tool_calls` must follow the expected MCP tool call format if present
- `tool_responses` must follow the expected format if present

**State Transitions**:
- Pending (message received, awaiting processing)
- Processing (currently being handled by AI)
- Completed (AI response generated)
- Error (processing failed)

### 3. TodoTask

Represents individual tasks in the user's todo list, reusing existing Phase 2 structure where possible.

**Attributes**:
- `id` (UUID/string): Unique identifier for the task
- `user_id` (string): Reference to the user who owns this task
- `title` (string): Brief description of the task
- `description` (string, optional): Detailed description of the task
- `status` (enum: 'pending', 'in_progress', 'completed'): Current status of the task
- `priority` (enum: 'low', 'medium', 'high', 'urgent'): Priority level of the task
- `due_date` (datetime, optional): Deadline for completing the task
- `created_at` (datetime): Timestamp when the task was created
- `updated_at` (datetime): Timestamp when the task was last updated
- `completed_at` (datetime, optional): Timestamp when the task was marked as completed

**Relationships**:
- One TodoTask belongs to one User
- Many TodoTasks belong to one User

**Validation Rules**:
- `user_id` must exist in the User table
- `title` must not be empty
- `status` must be one of the allowed values
- `priority` must be one of the allowed values
- `due_date` must be in the future if provided
- `completed_at` must be >= `created_at` if provided
- `updated_at` must be >= `created_at`

**State Transitions**:
- From 'pending' to 'in_progress' to 'completed'
- From any state back to 'pending' (reopening)
- From 'in_progress' back to 'pending'

## Relationship Diagram

```
User ||--o{ Conversation
Conversation ||--o{ Message
User ||--o{ TodoTask
```

## Indexes

For performance optimization:

1. **Conversation table**:
   - Index on `user_id` for efficient user-specific queries
   - Index on `updated_at` for chronological sorting

2. **Message table**:
   - Index on `conversation_id` for efficient conversation retrieval
   - Index on `timestamp` for chronological ordering
   - Composite index on (`conversation_id`, `timestamp`) for efficient conversation timeline queries

3. **TodoTask table**:
   - Index on `user_id` for efficient user-specific queries
   - Index on `status` for filtering by task status
   - Index on `due_date` for deadline-based queries
   - Index on `priority` for priority-based sorting

## Constraints

1. **Referential Integrity**:
   - Foreign key constraints ensure data consistency between related entities
   - Cascade deletion for Messages when Conversation is deleted
   - Restrict deletion of Users if they have associated Conversations or TodoTasks

2. **Data Validation**:
   - Check constraints enforce domain-specific rules (e.g., status values)
   - Not-null constraints ensure required fields are always populated

3. **Unique Constraints**:
   - No unique constraints needed beyond primary keys for this feature

## Migration Considerations

Since we're building on Phase 2, we'll reuse existing TodoTask table structure where possible, potentially adding new columns if needed. The Conversation and Message tables will be new additions to support the chatbot functionality.

## Privacy & Security

- Personal data in messages and tasks should be encrypted at rest
- Access controls ensure users can only access their own data
- Audit logs track access to sensitive information