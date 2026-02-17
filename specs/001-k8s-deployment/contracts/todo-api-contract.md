# Todo Chatbot API Contract

## Overview
This document defines the API contract for the Todo Chatbot application backend service. It specifies the endpoints, request/response formats, and data models for communication between the frontend and backend services.

## Base URL
```
http://todo-backend-service:8000/api/v1
```

## Authentication
No authentication required for basic operations. Future extensions may include JWT-based authentication.

## Common Headers
- `Content-Type: application/json`
- `Accept: application/json`

## API Endpoints

### Todos

#### GET /todos
Retrieve all todos

**Request**:
- Method: GET
- Endpoint: `/todos`
- Query Parameters:
  - `completed` (optional, boolean): Filter by completion status
  - `limit` (optional, integer): Limit number of results
  - `offset` (optional, integer): Offset for pagination

**Response**:
- Status: 200 OK
- Body:
```json
[
  {
    "id": "uuid-string",
    "title": "Sample Todo",
    "description": "Detailed description of the todo",
    "completed": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "due_date": "2023-12-31T23:59:59Z"
  }
]
```

#### POST /todos
Create a new todo

**Request**:
- Method: POST
- Endpoint: `/todos`
- Body:
```json
{
  "title": "New Todo Item",
  "description": "Detailed description of the new todo",
  "due_date": "2023-12-31T23:59:59Z"
}
```

**Response**:
- Status: 201 Created
- Body:
```json
{
  "id": "uuid-string",
  "title": "New Todo Item",
  "description": "Detailed description of the new todo",
  "completed": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "due_date": "2023-12-31T23:59:59Z"
}
```

#### GET /todos/{id}
Retrieve a specific todo by ID

**Request**:
- Method: GET
- Endpoint: `/todos/{id}`
- Path Parameter:
  - `id` (string, required): The UUID of the todo item

**Response**:
- Status: 200 OK
- Body:
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

#### PUT /todos/{id}
Update a specific todo completely

**Request**:
- Method: PUT
- Endpoint: `/todos/{id}`
- Path Parameter:
  - `id` (string, required): The UUID of the todo item
- Body:
```json
{
  "title": "Updated Todo Title",
  "description": "Updated description of the todo",
  "completed": true,
  "due_date": "2023-12-31T23:59:59Z"
}
```

**Response**:
- Status: 200 OK
- Body:
```json
{
  "id": "uuid-string",
  "title": "Updated Todo Title",
  "description": "Updated description of the todo",
  "completed": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-02T10:30:00Z",
  "due_date": "2023-12-31T23:59:59Z"
}
```

#### PATCH /todos/{id}
Partially update a specific todo

**Request**:
- Method: PATCH
- Endpoint: `/todos/{id}`
- Path Parameter:
  - `id` (string, required): The UUID of the todo item
- Body:
```json
{
  "title": "Partially Updated Title",
  "completed": true
}
```

**Response**:
- Status: 200 OK
- Body:
```json
{
  "id": "uuid-string",
  "title": "Partially Updated Title",
  "description": "Previous description unchanged",
  "completed": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-02T10:30:00Z",
  "due_date": "2023-12-31T23:59:59Z"
}
```

#### DELETE /todos/{id}
Delete a specific todo

**Request**:
- Method: DELETE
- Endpoint: `/todos/{id}`
- Path Parameter:
  - `id` (string, required): The UUID of the todo item

**Response**:
- Status: 204 No Content

#### PATCH /todos/{id}/toggle
Toggle the completion status of a todo

**Request**:
- Method: PATCH
- Endpoint: `/todos/{id}/toggle`
- Path Parameter:
  - `id` (string, required): The UUID of the todo item

**Response**:
- Status: 200 OK
- Body:
```json
{
  "id": "uuid-string",
  "title": "Sample Todo",
  "description": "Detailed description of the todo",
  "completed": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-02T10:30:00Z",
  "due_date": "2023-12-31T23:59:59Z"
}
```

### Health Check

#### GET /health
Check the health status of the backend service

**Request**:
- Method: GET
- Endpoint: `/health`

**Response**:
- Status: 200 OK
- Body:
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

## Error Responses

### Common Error Format
```json
{
  "detail": "Error message describing the issue"
}
```

### HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Request successful, no content to return
- `400 Bad Request`: Invalid request format or parameters
- `404 Not Found`: Requested resource does not exist
- `422 Unprocessable Entity`: Request valid but semantically incorrect
- `500 Internal Server Error`: Server error occurred

## Data Models

### Todo Object
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique identifier for the todo |
| title | string | Yes | Title of the todo (max 255 chars) |
| description | string | No | Detailed description (max 1000 chars) |
| completed | boolean | No | Completion status (default: false) |
| created_at | datetime (ISO 8601) | Yes | Creation timestamp |
| updated_at | datetime (ISO 8601) | Yes | Last update timestamp |
| due_date | datetime (ISO 8601) | No | Optional due date |

## Validation Rules
- `title` must be between 1 and 255 characters
- `description` must be between 0 and 1000 characters if provided
- `completed` must be a boolean value
- `due_date` must be in ISO 8601 format if provided
- `id` must be a valid UUID