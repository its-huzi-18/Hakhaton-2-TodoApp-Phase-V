"""
Task Service Layer for shared task operations
This service provides reusable business logic for task operations that can be used
by both the REST API endpoints and the AI agent tools.
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Task, TaskCreate, TaskUpdate, TaskRead


class TaskService:
    """
    Service class containing reusable business logic for task operations.
    This ensures consistent behavior between REST API and AI agent tools.
    """

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_tasks(self, user_id: UUID, is_completed: Optional[bool] = None) -> List[Task]:
        """
        Retrieve tasks for a specific user with optional completion status filter.

        Args:
            user_id: The ID of the user whose tasks to retrieve
            is_completed: Optional filter for completion status (True for completed, False for pending, None for all)

        Returns:
            List of Task objects
        """
        query = select(Task).where(Task.user_id == user_id)

        # Apply completion status filter if specified
        if is_completed is not None:
            query = query.where(Task.is_completed == is_completed)

        query = query.order_by(Task.created_at.desc())

        result = await self.db.execute(query)
        tasks = result.scalars().all()

        return tasks

    async def create_task(self, task_data: TaskCreate, user_id: UUID) -> Task:
        """
        Create a new task for the specified user.

        Args:
            task_data: TaskCreate object containing task information
            user_id: The ID of the user creating the task

        Returns:
            Created Task object
        """
        new_task = Task(
            **task_data.model_dump(),
            user_id=user_id,
        )

        self.db.add(new_task)
        await self.db.commit()
        await self.db.refresh(new_task)

        return new_task

    async def get_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        """
        Get a specific task by ID for the specified user.

        Args:
            task_id: The ID of the task to retrieve
            user_id: The ID of the user who owns the task

        Returns:
            Task object if found, None otherwise
        """
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()

        return task

    async def update_task(self, task_id: UUID, task_update: TaskUpdate, user_id: UUID) -> Optional[Task]:
        """
        Update an existing task for the specified user.

        Args:
            task_id: The ID of the task to update
            task_update: TaskUpdate object containing update information
            user_id: The ID of the user who owns the task

        Returns:
            Updated Task object if successful, None if task not found
        """
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()

        if task is None:
            return None

        # Update only provided fields
        update_data = task_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.commit()
        await self.db.refresh(task)

        return task

    async def delete_task(self, task_id: UUID, user_id: UUID) -> bool:
        """
        Delete a task for the specified user.

        Args:
            task_id: The ID of the task to delete
            user_id: The ID of the user who owns the task

        Returns:
            True if task was deleted, False if task not found
        """
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()

        if task is None:
            return False

        await self.db.delete(task)
        await self.db.commit()

        return True

    async def complete_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        """
        Mark a task as completed for the specified user.

        Args:
            task_id: The ID of the task to mark as completed
            user_id: The ID of the user who owns the task

        Returns:
            Updated Task object if successful, None if task not found
        """
        task_update = TaskUpdate(is_completed=True)
        return await self.update_task(task_id, task_update, user_id)


def get_task_service(db_session: AsyncSession) -> TaskService:
    """
    Factory function to create a TaskService instance with the provided DB session
    """
    return TaskService(db_session)