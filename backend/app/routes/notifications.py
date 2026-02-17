from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user_id
from app.db import get_db
from app.models import (
    Notification,
    NotificationCreate,
    NotificationRead,
    NotificationUpdate,
    User
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationRead])
async def get_notifications(
    user_id: Annotated[str, Depends(get_current_user_id)],
    status_filter: Optional[str] = Query(None, regex=r"^(pending|sent|delivered|failed)$"),
    notification_type: Optional[str] = Query(None, regex=r"^(info|warning|error|reminder|task)$"),
    db: AsyncSession = Depends(get_db),
):
    """Get all notifications for the current user, with optional filters."""
    query = select(Notification).where(Notification.user_id == UUID(user_id))
    
    if status_filter:
        query = query.where(Notification.status == status_filter)
    
    if notification_type:
        query = query.where(Notification.type == notification_type)
    
    query = query.order_by(Notification.created_at.desc())
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    return [NotificationRead.from_orm(n) for n in notifications]


@router.post("", response_model=NotificationRead, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new notification for the current user."""
    notification = Notification(
        **notification_data.model_dump(),
        user_id=UUID(user_id)
    )
    
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return NotificationRead.from_orm(notification)


@router.get("/{notification_id}", response_model=NotificationRead)
async def get_notification(
    notification_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get a specific notification by ID (user-scoped)."""
    try:
        notification_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_uuid, 
            Notification.user_id == UUID(user_id)
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return NotificationRead.from_orm(notification)


@router.patch("/{notification_id}", response_model=NotificationRead)
async def update_notification(
    notification_id: str,
    notification_update: NotificationUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Update a notification (user-scoped)."""
    try:
        notification_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_uuid, 
            Notification.user_id == UUID(user_id)
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Update only provided fields
    update_data = notification_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(notification, field, value)

    await db.commit()
    await db.refresh(notification)

    return NotificationRead.from_orm(notification)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_as_read(
    notification_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read (update status to 'sent')."""
    try:
        notification_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_uuid, 
            Notification.user_id == UUID(user_id)
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Update status to 'sent' to indicate it's been read
    notification.status = "sent"
    notification.sent_time = notification.sent_time or notification.created_at

    await db.commit()
    await db.refresh(notification)

    return NotificationRead.from_orm(notification)


@router.patch("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_as_read(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Mark all pending notifications as read for the current user."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == UUID(user_id),
            Notification.status == "pending"
        )
    )
    notifications = result.scalars().all()
    
    for notification in notifications:
        notification.status = "sent"
        notification.sent_time = notification.sent_time or notification.created_at

    await db.commit()


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification (user-scoped)."""
    try:
        notification_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_uuid, 
            Notification.user_id == UUID(user_id)
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    await db.delete(notification)
    await db.commit()

    return None