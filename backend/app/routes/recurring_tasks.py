from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user_id
from app.db import get_db
from app.models import (
    RecurringTask,
    RecurringTaskCreate,
    RecurringTaskRead,
    RecurringTaskUpdate,
    RecurrenceRule,
    RecurrenceRuleCreate,
    TaskCreate,
    User
)

router = APIRouter(prefix="/recurring-tasks", tags=["Recurring Tasks"])


@router.post("", response_model=RecurringTaskRead, status_code=status.HTTP_201_CREATED)
async def create_recurring_task(
    recurring_task_data: RecurringTaskCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new recurring task for the current user."""
    
    # Create the recurrence rule first
    recurrence_rule = RecurrenceRule(**recurring_task_data.recurrence_rule.model_dump())
    db.add(recurrence_rule)
    await db.flush()  # Get the ID for the rule
    
    # Create the recurring task
    recurring_task = RecurringTask(
        **recurring_task_data.model_dump(exclude={'recurrence_rule'}),
        user_id=UUID(user_id),
        recurrence_rule_id=recurrence_rule.id
    )
    
    db.add(recurring_task)
    await db.commit()
    await db.refresh(recurring_task)
    
    # Return the recurring task with the associated rule ID
    return RecurringTaskRead.from_orm(recurring_task)


@router.get("", response_model=List[RecurringTaskRead])
async def get_recurring_tasks(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get all recurring tasks for the current user."""
    result = await db.execute(
        select(RecurringTask).where(RecurringTask.user_id == UUID(user_id))
    )
    recurring_tasks = result.scalars().all()
    return [RecurringTaskRead.from_orm(rt) for rt in recurring_tasks]


@router.get("/{recurring_task_id}", response_model=RecurringTaskRead)
async def get_recurring_task(
    recurring_task_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get a specific recurring task by ID (user-scoped)."""
    try:
        task_uuid = UUID(recurring_task_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recurring task ID format",
        )

    result = await db.execute(
        select(RecurringTask).where(
            RecurringTask.id == task_uuid, 
            RecurringTask.user_id == UUID(user_id)
        )
    )
    recurring_task = result.scalar_one_or_none()

    if recurring_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring task not found",
        )

    return RecurringTaskRead.from_orm(recurring_task)


@router.patch("/{recurring_task_id}", response_model=RecurringTaskRead)
async def update_recurring_task(
    recurring_task_id: str,
    recurring_task_update: RecurringTaskUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Update a recurring task (user-scoped)."""
    try:
        task_uuid = UUID(recurring_task_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recurring task ID format",
        )

    result = await db.execute(
        select(RecurringTask).where(
            RecurringTask.id == task_uuid, 
            RecurringTask.user_id == UUID(user_id)
        )
    )
    recurring_task = result.scalar_one_or_none()

    if recurring_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring task not found",
        )

    # Update only provided fields
    update_data = recurring_task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field != 'recurrence_rule':
            setattr(recurring_task, field, value)

    # Update recurrence rule if provided
    if 'recurrence_rule' in update_data and update_data['recurrence_rule']:
        rule_result = await db.execute(
            select(RecurrenceRule).where(RecurrenceRule.id == recurring_task.recurrence_rule_id)
        )
        rule = rule_result.scalar_one_or_none()
        if rule:
            rule_update_data = update_data['recurrence_rule'].model_dump(exclude_unset=True)
            for field, value in rule_update_data.items():
                setattr(rule, field, value)

    await db.commit()
    await db.refresh(recurring_task)

    return RecurringTaskRead.from_orm(recurring_task)


@router.delete("/{recurring_task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_task(
    recurring_task_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a recurring task (user-scoped)."""
    try:
        task_uuid = UUID(recurring_task_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recurring task ID format",
        )

    result = await db.execute(
        select(RecurringTask).where(
            RecurringTask.id == task_uuid, 
            RecurringTask.user_id == UUID(user_id)
        )
    )
    recurring_task = result.scalar_one_or_none()

    if recurring_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring task not found",
        )

    # Also delete the associated recurrence rule
    await db.execute(
        select(RecurrenceRule).where(RecurrenceRule.id == recurring_task.recurrence_rule_id)
    )
    rule_result = await db.execute(
        select(RecurrenceRule).where(RecurrenceRule.id == recurring_task.recurrence_rule_id)
    )
    rule = rule_result.scalar_one_or_none()
    if rule:
        await db.delete(rule)

    await db.delete(recurring_task)
    await db.commit()

    return None