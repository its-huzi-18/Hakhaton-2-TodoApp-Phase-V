"""
Chat Service for handling chatbot logic
This service orchestrates the interaction between user input, AI processing, and task management.
"""

from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Conversation, ChatMessage
from app.services.ai_service import get_ai_service


class ChatService:
    """
    Service class for handling chatbot logic, including conversation management,
    message processing, and interaction with the AI service.
    """

    def __init__(self):
        self.ai_service = get_ai_service()

    async def process_user_message(
        self,
        user_id: str,
        user_message: str,
        db_session: AsyncSession,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a user's message and generate an AI response.

        Args:
            user_id: The ID of the user sending the message
            user_message: The message content from the user
            db_session: Database session for persistence
            conversation_id: Optional conversation ID (creates new if not provided)

        Returns:
            Dictionary containing the AI response and conversation info
        """
        # Validate that user_id is a proper UUID string
        from uuid import UUID as UUID4

        try:
            # Validate that the user_id is a proper UUID
            user_uuid = UUID4(user_id)
        except ValueError:
            # Log the error for debugging purposes
            print(f"ERROR: Invalid user ID format received: '{user_id}'. Expected a valid UUID.")
            raise ValueError(f"Invalid user ID format: {user_id}. User ID must be a valid UUID.")

        # Get or create conversation
        conversation = await self._get_or_create_conversation(
            user_uuid, db_session, conversation_id
        )

        # Add user's message to the conversation
        user_chat_message = ChatMessage(
            role="user",
            content=user_message,
            conversation_id=conversation.id,
        )
        db_session.add(user_chat_message)
        await db_session.commit()
        await db_session.refresh(user_chat_message)

        # Get conversation history for context
        conversation_history = await self._get_conversation_history(
            conversation.id, db_session
        )

        # Process the message with AI service
        ai_result = await self.ai_service.process_natural_language_request(
            user_message=user_message,
            user_id=user_id,
            conversation_history=conversation_history,
            db_session=db_session
        )

        # Add AI's response to the conversation
        ai_chat_message = ChatMessage(
            role="assistant",
            content=ai_result["response"],
            conversation_id=conversation.id,
        )
        db_session.add(ai_chat_message)
        await db_session.commit()
        await db_session.refresh(ai_chat_message)

        return {
            "response": ai_result["response"],
            "conversation_id": str(conversation.id),
            "tool_calls": ai_result.get("tool_calls", []),
            "task_updates": ai_result.get("task_updates", []),
            "ai_message": ai_chat_message  # Return the actual AI message from DB
        }

    async def _get_or_create_conversation(
        self,
        user_id: UUID,
        db_session: AsyncSession,
        conversation_id: Optional[str] = None
    ) -> Conversation:
        """
        Get an existing conversation or create a new one.

        Args:
            user_id: The ID of the user
            db_session: Database session
            conversation_id: Optional conversation ID to retrieve

        Returns:
            Conversation object
        """
        if conversation_id:
            # Try to get the specific conversation
            try:
                conv_uuid = UUID(conversation_id)
                result = await db_session.execute(
                    select(Conversation).where(
                        Conversation.id == conv_uuid,
                        Conversation.user_id == user_id
                    )
                )
                conversation = result.scalar_one_or_none()

                if conversation:
                    return conversation
            except ValueError:
                # Invalid UUID format, will create a new conversation
                pass

        # Find the most recent conversation for this user, or create a new one
        result = await db_session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
            .limit(1)
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            # Create a new conversation
            from app.models import ConversationCreate
            conversation_data = ConversationCreate(
                title=f"Chat with {user_id}",
                user_id=user_id,
            )
            conversation = Conversation(
                **conversation_data.model_dump(),
            )
            db_session.add(conversation)
            await db_session.commit()
            await db_session.refresh(conversation)

        return conversation

    async def _get_conversation_history(
        self,
        conversation_id: UUID,
        db_session: AsyncSession,
        limit: int = 20
    ) -> List[Dict[str, str]]:
        """
        Retrieve the conversation history for context.

        Args:
            conversation_id: The ID of the conversation
            db_session: Database session
            limit: Maximum number of messages to retrieve

        Returns:
            List of message dictionaries
        """
        result = await db_session.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()

        # Reverse the order to have oldest first (chronological)
        history = []
        for msg in reversed(messages):
            history.append({
                "role": msg.role,
                "content": msg.content
            })

        return history


# Singleton instance
chat_service = ChatService()


def get_chat_service():
    """
    Returns the singleton chat service instance
    """
    return chat_service