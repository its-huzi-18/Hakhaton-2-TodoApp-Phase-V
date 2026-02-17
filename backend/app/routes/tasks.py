from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user_id
from app.db import get_db
from app.models import Task, TaskCreate, TaskRead, TaskUpdate, User

router = APIRouter(prefix="/tasks", tags=["Tasks"]) 


@router.get("", response_model=list[TaskRead])
async def get_tasks(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get all tasks for the current user."""
    result = await db.execute(
        select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
    )
    tasks = result.scalars().all()
    return tasks


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new task for the current user."""
    from uuid import UUID

    new_task = Task(
        **task_data.model_dump(),
        user_id=UUID(user_id),
    )

    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    return new_task


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get a specific task by ID (user-scoped)."""
    from uuid import UUID

    try:
        task_uuid = UUID(task_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID format",
        )

    result = await db.execute(
        select(Task).where(Task.id == task_uuid, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Update a task (user-scoped)."""
    from uuid import UUID

    try:
        task_uuid = UUID(task_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID format",
        )

    result = await db.execute(
        select(Task).where(Task.id == task_uuid, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Update only provided fields
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a task (user-scoped)."""
    from uuid import UUID

    try:
        task_uuid = UUID(task_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID format",
        )

    result = await db.execute(
        select(Task).where(Task.id == task_uuid, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    await db.delete(task)
    await db.commit()

    return None
