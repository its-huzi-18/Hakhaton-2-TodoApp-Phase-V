from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID, uuid4
from typing import ClassVar

from pydantic import EmailStr, Field
from sqlalchemy import JSON
from sqlmodel import Column, DateTime, Field as SQLField, SQLModel


# Base model for common fields
class BaseModel(SQLModel):
    id: UUID = SQLField(default_factory=uuid4, primary_key=True)
    created_at: datetime = SQLField(default_factory=datetime.utcnow)


class UserBase(SQLModel):
    email: EmailStr = Field(index=True, unique=True)


class User(UserBase, BaseModel, table=True):
    hashed_password: str


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserRead(UserBase):
    id: UUID
    created_at: datetime


class TaskBase(SQLModel):
    title: str = Field(min_length=1)
    description: Optional[str] = Field(default=None)
    is_completed: bool = Field(default=False)


class Task(TaskBase, BaseModel, table=True):
    user_id: UUID = Field(foreign_key="user.id", index=True)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = Field(default=None)
    is_completed: Optional[bool] = None


class TaskRead(TaskBase):
    id: UUID
    user_id: UUID
    created_at: datetime


# Chatbot models
class ChatMessageBase(SQLModel):
    role: str  # 'user' or 'assistant'
    content: str
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)


class ChatMessage(ChatMessageBase, BaseModel, table=True):
    pass


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageRequest(SQLModel):
    """Request model for chat messages where conversation_id comes from URL path"""
    role: str = "user"  # Default to user role
    content: str


class ChatRequest(SQLModel):
    content: str


class ToolCallResponse(SQLModel):
    name: str
    arguments: dict
    response: dict


class TaskUpdateResponse(SQLModel):
    action: str
    task: Optional[dict] = None
    tasks: Optional[List[dict]] = None


class ChatMessageRead(ChatMessageBase):
    id: UUID
    created_at: datetime
    tool_calls: List[ToolCallResponse] = []
    task_updates: List[TaskUpdateResponse] = []


class ConversationBase(SQLModel):
    title: str = Field(default="New Conversation")
    user_id: UUID = Field(foreign_key="user.id", index=True)


class Conversation(ConversationBase, BaseModel, table=True):
    pass


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(SQLModel):
    title: Optional[str] = Field(default=None, max_length=200)


class ConversationRead(ConversationBase):
    id: UUID
    created_at: datetime


# Recurring Task Models
class RecurrenceRuleBase(SQLModel):
    frequency: str = Field(pattern=r"^(daily|weekly|monthly|yearly)$")  # daily, weekly, monthly, yearly
    interval: int = Field(default=1, ge=1)  # repeat every N days/weeks/months/years
    end_date: Optional[datetime] = Field(default=None)  # optional end date
    occurrence_count: Optional[int] = Field(default=None, ge=1)  # optional max occurrences
    # days_of_week is handled separately in the table class due to JSON column requirement
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)  # for monthly
    month_of_year: Optional[int] = Field(default=None, ge=1, le=12)  # for yearly


class RecurrenceRule(BaseModel, table=True):
    frequency: str = Field(pattern=r"^(daily|weekly|monthly|yearly)$")  # daily, weekly, monthly, yearly
    interval: int = Field(default=1, ge=1)  # repeat every N days/weeks/months/years
    end_date: Optional[datetime] = Field(default=None)  # optional end date
    occurrence_count: Optional[int] = Field(default=None, ge=1)  # optional max occurrences
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)  # for monthly
    month_of_year: Optional[int] = Field(default=None, ge=1, le=12)  # for yearly
    
    days_of_week: ClassVar[Optional[list]] = Column(JSON, nullable=True)


class RecurrenceRuleCreate(RecurrenceRuleBase):
    days_of_week: Optional[list] = Field(default=None)  # for weekly: 0=Sunday, 1=Monday, etc.


class RecurrenceRuleUpdate(SQLModel):
    frequency: Optional[str] = Field(default=None, pattern=r"^(daily|weekly|monthly|yearly)$")
    interval: Optional[int] = Field(default=None, ge=1)
    end_date: Optional[datetime] = Field(default=None)
    occurrence_count: Optional[int] = Field(default=None, ge=1)
    days_of_week: Optional[list] = Field(default=None)  # This field is only for Pydantic validation
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    month_of_year: Optional[int] = Field(default=None, ge=1, le=12)


class RecurrenceRuleRead(RecurrenceRuleBase):
    id: UUID
    created_at: datetime


class RecurringTaskBase(TaskBase):
    recurrence_rule_id: UUID = Field(foreign_key="recurrencerule.id")


class RecurringTask(TaskBase, BaseModel, table=True):
    user_id: UUID = Field(foreign_key="user.id", index=True)
    recurrence_rule_id: UUID = Field(foreign_key="recurrencerule.id")


class RecurringTaskCreate(TaskBase):
    recurrence_rule: RecurrenceRuleCreate


class RecurringTaskUpdate(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = Field(default=None)
    is_completed: Optional[bool] = None
    recurrence_rule: Optional[RecurrenceRuleUpdate] = None


class RecurringTaskRead(TaskBase):
    id: UUID
    user_id: UUID
    recurrence_rule_id: UUID
    created_at: datetime


# Notification Models
class NotificationBase(SQLModel):
    user_id: UUID = Field(foreign_key="user.id", index=True)
    title: str = Field(min_length=1)
    content: str
    type: str = Field(pattern=r"^(info|warning|error|reminder|task)$")  # notification type
    status: str = Field(pattern=r"^(pending|sent|delivered|failed)$", default="pending")
    scheduled_time: Optional[datetime] = Field(default=None)  # for scheduled notifications
    sent_time: Optional[datetime] = Field(default=None)  # when actually sent


class Notification(NotificationBase, BaseModel, table=True):
    pass


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(SQLModel):
    status: Optional[str] = Field(default=None, pattern=r"^(pending|sent|delivered|failed)$")
    sent_time: Optional[datetime] = Field(default=None)


class NotificationRead(NotificationBase):
    id: UUID
    created_at: datetime


# Export Base for SQLAlchemy metadata
from sqlmodel.main import SQLModelMetaclass

Base = SQLModelMetaclass(
    "Base",
    (BaseModel,),
    {},
)
