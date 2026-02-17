# Data Model: Phase II Todo App

## Entities

### User
Represents an authenticated user.
- `id`: UUID (Primary Key)
- `email`: String (Unique, Indexed)
- `hashed_password`: String
- `created_at`: DateTime
- `tasks`: Relationship (One-to-Many with Task)

### Task
Represents a todo item belonging to a user.
- `id`: UUID (Primary Key)
- `title`: String (1-200 chars, Required)
- `description`: String (Max 1000 chars, Optional)
- `is_completed`: Boolean (Default: False)
- `created_at`: DateTime (Auto-populated)
- `user_id`: UUID (Foreign Key -> User.id, Indexed, Required)

## Persistence Strategy
- **Database**: Neon PostgreSQL.
- **ORM**: SQLModel.
- **Migrations**: Alembic.

## Security Constraints
- Each Task MUST belong to a User.
- Cascading delete: Deleting a User MUST delete all their associated Tasks.
