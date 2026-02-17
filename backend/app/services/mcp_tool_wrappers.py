"""
MCP Tool Wrappers for Phase 2 agents
This module provides wrapper functions that expose existing Phase 2 functionality as MCP tools
accessible to AI agents through the OpenAI Agents SDK.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import json
from uuid import UUID


class TaskSchema(BaseModel):
    """Schema for task operations"""
    title: str
    description: Optional[str] = None
    is_completed: bool = False
    user_id: Optional[UUID] = None


class MCPToolWrappers:
    """
    Wrapper class for Phase 2 agents that exposes functionality as MCP tools
    for AI agents to use when processing natural language commands.
    """

    def __init__(self, db_session):
        self.db = db_session
        # Import and initialize the shared task service
        from app.services.task_service import get_task_service
        self.task_service = get_task_service(db_session)

    async def create_task(self, title: str, description: Optional[str] = None, user_id: str = None) -> Dict[str, Any]:
        """
        Create a new task using the shared task service.

        Args:
            title: The title of the task
            description: Optional description of the task
            user_id: The ID of the user creating the task

        Returns:
            Dictionary containing the created task information
        """
        from app.models import TaskCreate, User
        from sqlmodel import select
        from uuid import UUID as UUID4

        # Convert user_id to UUID if provided
        user_uuid = UUID4(user_id) if user_id and isinstance(user_id, str) else user_id

        # Validate user exists
        if user_uuid:
            user_result = await self.db.execute(select(User).where(User.id == user_uuid))
            user = user_result.scalar_one_or_none()
            if not user:
                raise ValueError(f"User with ID {user_id} not found")

        # Prepare task data
        task_create_data = TaskCreate(
            title=title,
            description=description,
            is_completed=False
        )

        # Use the shared service to create the task
        created_task = await self.task_service.create_task(task_create_data, user_uuid)

        return {
            "id": str(created_task.id),
            "title": created_task.title,
            "description": created_task.description,
            "is_completed": created_task.is_completed,
            "user_id": str(created_task.user_id),
            "created_at": created_task.created_at.isoformat()
        }

    async def get_tasks(self, user_id: str, is_completed: Optional[bool] = None) -> List[Dict[str, Any]]:
        """
        Retrieve tasks for a specific user using the shared task service.

        Args:
            user_id: The ID of the user whose tasks to retrieve
            is_completed: Optional filter for completion status (True for completed, False for pending, None for all)

        Returns:
            List of task dictionaries
        """
        from uuid import UUID as UUID4

        user_uuid = UUID4(user_id)

        # Use the shared service to get tasks
        tasks = await self.task_service.get_tasks(user_uuid, is_completed)

        return [
            {
                "id": str(task.id),
                "title": task.title,
                "description": task.description,
                "is_completed": task.is_completed,
                "user_id": str(task.user_id),
                "created_at": task.created_at.isoformat()
            }
            for task in tasks
        ]

    async def update_task(self, task_id: str, title: Optional[str] = None,
                         description: Optional[str] = None, is_completed: Optional[bool] = None) -> Dict[str, Any]:
        """
        Update an existing task using the shared task service.

        Args:
            task_id: The ID of the task to update
            title: New title (optional)
            description: New description (optional)
            is_completed: New completion status (optional)

        Returns:
            Dictionary containing the updated task information
        """
        from app.models import TaskUpdate
        from uuid import UUID as UUID4

        task_uuid = UUID4(task_id)

        # Prepare update data
        task_update_data = TaskUpdate(
            title=title,
            description=description,
            is_completed=is_completed
        )

        # Since we don't have the user_id here, we'll need to get the task first to determine the user
        from app.models import Task
        from sqlmodel import select

        result = await self.db.execute(select(Task).where(Task.id == task_uuid))
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError(f"Task with ID {task_id} not found")

        # Use the shared service to update the task
        updated_task = await self.task_service.update_task(task_uuid, task_update_data, task.user_id)

        if updated_task is None:
            raise ValueError(f"Task with ID {task_id} not found")

        return {
            "id": str(updated_task.id),
            "title": updated_task.title,
            "description": updated_task.description,
            "is_completed": updated_task.is_completed,
            "user_id": str(updated_task.user_id),
            "created_at": updated_task.created_at.isoformat()
        }

    async def delete_task(self, task_id: str) -> Dict[str, Any]:
        """
        Delete a task using the shared task service.

        Args:
            task_id: The ID of the task to delete

        Returns:
            Dictionary confirming deletion
        """
        from uuid import UUID as UUID4

        task_uuid = UUID4(task_id)

        # Since we don't have the user_id here, we'll need to get the task first to determine the user
        from app.models import Task
        from sqlmodel import select

        result = await self.db.execute(select(Task).where(Task.id == task_uuid))
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError(f"Task with ID {task_id} not found")

        # Store task info before deletion
        deleted_task_info = {
            "id": str(task.id),
            "title": task.title,
            "description": task.description,
            "is_completed": task.is_completed,
            "user_id": str(task.user_id),
            "created_at": task.created_at.isoformat()
        }

        # Use the shared service to delete the task
        success = await self.task_service.delete_task(task_uuid, task.user_id)

        if not success:
            raise ValueError(f"Failed to delete task with ID {task_id}")

        return {
            "deleted": True,
            "task": deleted_task_info
        }

    async def complete_task(self, task_id: str) -> Dict[str, Any]:
        """
        Mark a task as completed using the shared task service.

        Args:
            task_id: The ID of the task to mark as completed

        Returns:
            Dictionary containing the updated task information
        """
        from uuid import UUID as UUID4

        task_uuid = UUID4(task_id)

        # Since we don't have the user_id here, we'll need to get the task first to determine the user
        from app.models import Task
        from sqlmodel import select

        result = await self.db.execute(select(Task).where(Task.id == task_uuid))
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError(f"Task with ID {task_id} not found")

        # Use the shared service to complete the task
        completed_task = await self.task_service.complete_task(task_uuid, task.user_id)

        if completed_task is None:
            raise ValueError(f"Failed to complete task with ID {task_id}")

        return {
            "id": str(completed_task.id),
            "title": completed_task.title,
            "description": completed_task.description,
            "is_completed": completed_task.is_completed,
            "user_id": str(completed_task.user_id),
            "created_at": completed_task.created_at.isoformat()
        }

    async def find_task_by_title(self, user_id: str, title: str) -> Optional[Dict[str, Any]]:
        """
        Find a task by its title for a specific user.

        Args:
            user_id: The ID of the user whose tasks to search
            title: The title of the task to find

        Returns:
            Dictionary containing the task information if found, None otherwise
        """
        from app.models import Task
        from sqlmodel import select
        from uuid import UUID as UUID4

        user_uuid = UUID4(user_id)

        # Search for tasks with similar titles (case-insensitive partial match)
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_uuid,
                Task.title.ilike(f'%{title}%')  # Using ilike for case-insensitive partial match
            ).order_by(Task.created_at.desc())
        )
        tasks = result.scalars().all()

        # Return the most recently created task that matches
        if tasks:
            task = tasks[0]  # Most recent task
            return {
                "id": str(task.id),
                "title": task.title,
                "description": task.description,
                "is_completed": task.is_completed,
                "user_id": str(task.user_id),
                "created_at": task.created_at.isoformat()
            }

        return None


# Tool definitions for AI agent access
TOOLS_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task in the user's todo list",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "The title of the task"},
                    "description": {"type": "string", "description": "Optional description of the task"},
                    "user_id": {"type": "string", "description": "The ID of the user creating the task"}
                },
                "required": ["title", "user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Retrieve tasks for a specific user",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "The ID of the user whose tasks to retrieve"},
                    "is_completed": {"type": "boolean", "description": "Filter for completion status: true for completed tasks, false for pending tasks, null for all tasks"}
                },
                "required": ["user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update an existing task in the user's todo list",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "The ID of the task to update"},
                    "title": {"type": "string", "description": "New title for the task (optional)"},
                    "description": {"type": "string", "description": "New description for the task (optional)"},
                    "is_completed": {"type": "boolean", "description": "New completion status for the task (optional)"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Delete a task from the user's todo list",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "The ID of the task to delete"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "Mark a task as completed",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "The ID of the task to mark as completed"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_task_by_title",
            "description": "Find a task by its title for a specific user",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "The ID of the user whose tasks to search"},
                    "title": {"type": "string", "description": "The title of the task to find"}
                },
                "required": ["user_id", "title"]
            }
        }
    }
]


def get_mcp_tools_wrapper(db_session):
    """
    Factory function to create an instance of MCPToolWrappers with the provided DB session
    """
    return MCPToolWrappers(db_session)