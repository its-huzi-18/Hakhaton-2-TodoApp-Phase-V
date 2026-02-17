from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user_id
from app.db import get_db
from app.models import (
    ChatMessage,
    ChatMessageCreate,
    ChatMessageRead,
    ChatMessageRequest,
    ChatRequest,
    Conversation,
    ConversationCreate,
    ConversationRead,
    ConversationUpdate,
    ToolCallResponse,
    TaskUpdateResponse,
    User
)
from app.services.chat_service import get_chat_service

router = APIRouter(prefix="/api", tags=["Chatbot"])


@router.post("/users/{user_id}/chat", response_model=ChatMessageRead)
async def chat_with_bot(
    user_id: str,
    user_message: ChatRequest,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the chatbot and receive a response."""
    # Verify that the request is for the current user
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to chat for another user",
        )

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID format: {user_id}. Expected a valid UUID.",
        )

    # Validate that the message content is provided
    if not user_message.content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty",
        )

    try:
        # Use the chat service to process the message
        chat_service = get_chat_service()
        result = await chat_service.process_user_message(
            user_id=user_id,
            user_message=user_message.content,
            db_session=db,
            conversation_id=None  # Will create or use most recent conversation
        )

        # Get the actual AI message from the database
        ai_message = result["ai_message"]

        # Convert the tool calls and task updates to the proper format
        tool_calls = [
            ToolCallResponse(
                name=call.get("name", ""),
                arguments=call.get("arguments", {}),
                response=call.get("response", {})
            )
            for call in result.get("tool_calls", [])
        ]

        task_updates = [
            TaskUpdateResponse(
                action=update.get("action", ""),
                task=update.get("task"),
                tasks=update.get("tasks")
            )
            for update in result.get("task_updates", [])
        ]

        # Create the response object using the actual message from DB
        response_message = ChatMessageRead(
            id=ai_message.id,
            role=ai_message.role,
            content=ai_message.content,
            conversation_id=ai_message.conversation_id,
            created_at=ai_message.created_at,
            tool_calls=tool_calls,
            task_updates=task_updates
        )

        return response_message
    except ValueError as ve:
        # Handle value errors (like invalid UUID format) specifically
        print(f"ValueError in chat_with_bot: {str(ve)}")
        import traceback
        print(traceback.format_exc())  # Print full traceback for debugging
        await db.rollback()  # Explicitly rollback on error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(ve)}"
        )
    except Exception as e:
        # Log the error for debugging
        print(f"Error in chat_with_bot: {str(e)}")
        import traceback
        print(traceback.format_exc())  # Print full traceback for debugging
        await db.rollback()  # Explicitly rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your message: {str(e)}"
        )


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversation for the current user."""
    from uuid import UUID as UUID4

    try:
        # Ensure the conversation belongs to the current user
        user_uuid = UUID4(user_id)

        new_conversation = Conversation(
            **conversation_data.model_dump(),
            user_id=user_uuid,
        )

        db.add(new_conversation)
        await db.commit()
        await db.refresh(new_conversation)

        return new_conversation
    except Exception as e:
        # Log the error for debugging
        print(f"Error in create_conversation: {str(e)}")
        import traceback
        print(traceback.format_exc())  # Print full traceback for debugging
        await db.rollback()  # Explicitly rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the conversation: {str(e)}"
        )


@router.get("/conversations", response_model=List[ConversationRead])
async def get_conversations(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get all conversations for the current user."""
    result = await db.execute(
        select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.created_at.desc())
    )
    conversations = result.scalars().all()
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get a specific conversation by ID (user-scoped)."""
    try:
        conv_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == user_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return conversation


@router.patch("/conversations/{conversation_id}", response_model=ConversationRead)
async def update_conversation(
    conversation_id: str,
    conversation_update: ConversationUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Update a conversation (user-scoped)."""
    try:
        conv_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == user_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Update only provided fields
    update_data = conversation_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(conversation, field, value)

    await db.commit()
    await db.refresh(conversation)

    return conversation


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation (user-scoped)."""
    try:
        conv_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == user_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    await db.delete(conversation)
    await db.commit()

    return None


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED)
async def create_message(
    conversation_id: str,
    message_data: ChatMessageCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Add a message to a conversation."""
    try:
        conv_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    # Verify that the conversation belongs to the current user
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == user_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Validate that the message content is provided
    if not message_data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty",
        )

    # Create the new message
    new_message = ChatMessage(
        **message_data.model_dump(),
        conversation_id=conv_uuid,
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    return new_message


@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessageRead])
async def get_messages(
    conversation_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a conversation."""
    try:
        conv_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    # Verify that the conversation belongs to the current user
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == user_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Get all messages in the conversation
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.conversation_id == conv_uuid).order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return messages


@router.post("/conversations/{conversation_id}/chat", response_model=ChatMessageRead)
async def chat_with_bot_in_conversation(
    conversation_id: str,
    user_message: ChatMessageRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the chatbot in a specific conversation and receive a response."""
    try:
        conv_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    # Verify that the conversation belongs to the current user
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == user_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Validate that the message content is provided
    if not user_message.content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty",
        )

    try:
        # Use the chat service to process the message in the specific conversation
        chat_service = get_chat_service()
        result = await chat_service.process_user_message(
            user_id=user_id,
            user_message=user_message.content,
            db_session=db,
            conversation_id=str(conv_uuid)  # Use the specific conversation
        )

        # Get the actual AI message from the database
        ai_message = result["ai_message"]

        # Convert the tool calls and task updates to the proper format
        tool_calls = [
            ToolCallResponse(
                name=call.get("name", ""),
                arguments=call.get("arguments", {}),
                response=call.get("response", {})
            )
            for call in result.get("tool_calls", [])
        ]

        task_updates = [
            TaskUpdateResponse(
                action=update.get("action", ""),
                task=update.get("task"),
                tasks=update.get("tasks")
            )
            for update in result.get("task_updates", [])
        ]

        # Create the response object using the actual message from DB
        response_message = ChatMessageRead(
            id=ai_message.id,
            role=ai_message.role,
            content=ai_message.content,
            conversation_id=ai_message.conversation_id,
            created_at=ai_message.created_at,
            tool_calls=tool_calls,
            task_updates=task_updates
        )

        return response_message
    except ValueError as ve:
        # Handle value errors (like invalid UUID format) specifically
        print(f"ValueError in chat_with_bot_in_conversation: {str(ve)}")
        import traceback
        print(traceback.format_exc())  # Print full traceback for debugging
        await db.rollback()  # Explicitly rollback on error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(ve)}"
        )
    except Exception as e:
        # Log the error for debugging
        print(f"Error in chat_with_bot_in_conversation: {str(e)}")
        import traceback
        print(traceback.format_exc())  # Print full traceback for debugging
        await db.rollback()  # Explicitly rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your message: {str(e)}"
        )