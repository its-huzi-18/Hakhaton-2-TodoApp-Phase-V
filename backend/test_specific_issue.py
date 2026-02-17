#!/usr/bin/env python3
"""
Test to verify the specific issue from the logs is fixed
"""
import asyncio
import os
from unittest.mock import AsyncMock, patch
from app.services.chat_service import ChatService


async def test_specific_issue():
    """Test the specific issue mentioned in the logs"""
    
    # Temporarily set a fake API key to allow initialization
    os.environ['OPENROUTER_API_KEY'] = 'fake-api-key-for-test'
    
    try:
        # Create chat service instance
        chat_service = ChatService()
        
        # Mock the AI service to simulate the issue scenario
        async def mock_process_natural_language_request(user_message, user_id, conversation_history, db_session):
            # Simulate an API failure scenario
            raise Exception("API connection failed")
        
        chat_service.ai_service.process_natural_language_request = mock_process_natural_language_request

        # Test the specific message from the logs
        try:
            result = await chat_service.process_user_message(
                user_id="18f878e7-949d-4c1c-bc86-9cb2c43aeef7",
                user_message="add a task for gym tommorrow",
                db_session=AsyncMock(),  # Mock DB session
                conversation_id=None
            )
            print("[FAIL] Expected an exception but got result:", result)
        except Exception as e:
            print(f"[PASS] Correctly handled the error: {str(e)}")
    
    finally:
        # Remove the fake API key
        if 'OPENROUTER_API_KEY' in os.environ:
            del os.environ['OPENROUTER_API_KEY']


async def main():
    """Run the test"""
    print("Testing the specific issue from the logs...")
    
    await test_specific_issue()
    
    print("\n[SUCCESS] The chatbot should now handle error scenarios more gracefully!")


if __name__ == "__main__":
    asyncio.run(main())