#!/usr/bin/env python3
"""
Test script to verify the chatbot functionality is working correctly after the fixes
"""
import asyncio
import os
from unittest.mock import AsyncMock, patch
from app.services.ai_service import AIService


async def test_ai_service_without_api_key():
    """Test the AI service when API key is not set"""
    
    # Temporarily unset the API key to simulate the issue
    original_key = os.environ.get('OPENROUTER_API_KEY')
    if 'OPENROUTER_API_KEY' in os.environ:
        del os.environ['OPENROUTER_API_KEY']
    
    try:
        # Create AI service instance
        ai_service = AIService()
        
        # Verify that client is None when API key is not set
        assert ai_service.client is None, "Client should be None when API key is not set"
        
        # Test processing a message that mentions tasks
        result = await ai_service.process_natural_language_request(
            user_message="add a task for gym tomorrow",
            user_id="test-user-id",
            conversation_history=[],
            db_session=None
        )
        
        # Check that the response contains the appropriate warning
        assert "AI service is not configured" in result["response"]
        assert "set the OPENROUTER_API_KEY" in result["response"]
        assert result["tool_calls"] == []
        assert result["task_updates"] == []
        
        print("[PASS] Test passed: AI service handles missing API key correctly for task requests")
        
        # Test processing a general message
        result = await ai_service.process_natural_language_request(
            user_message="hello how are you?",
            user_id="test-user-id",
            conversation_history=[],
            db_session=None
        )
        
        # Check that the response contains the appropriate warning
        assert "AI service is not configured" in result["response"]
        assert "set the OPENROUTER_API_KEY" in result["response"]
        assert result["tool_calls"] == []
        assert result["task_updates"] == []
        
        print("[PASS] Test passed: AI service handles missing API key correctly for general requests")
        
    finally:
        # Restore the original API key if it existed
        if original_key is not None:
            os.environ['OPENROUTER_API_KEY'] = original_key


async def test_ai_service_with_mock_client():
    """Test the AI service with a mock client to simulate API responses"""
    
    # Set a fake API key to allow client initialization
    os.environ['OPENROUTER_API_KEY'] = 'fake-api-key'
    
    try:
        # Create AI service instance
        ai_service = AIService()
        
        # Mock the client.chat.completions.create method
        mock_response = AsyncMock()
        mock_response.choices = [AsyncMock()]
        mock_response.choices[0].message = AsyncMock()
        mock_response.choices[0].message.content = '{"tool_name": "create_task", "arguments": {"title": "Gym session", "user_id": "test-user-id"}}'
        
        with patch.object(ai_service.client.chat.completions, 'create', return_value=mock_response):
            result = await ai_service.process_natural_language_request(
                user_message="add a task for gym tomorrow",
                user_id="test-user-id",
                conversation_history=[],
                db_session=None
            )
            
            # Check that the response contains the expected values
            assert result["response"] == "✅ Task added successfully!"
            assert len(result["tool_calls"]) == 1
            assert result["tool_calls"][0]["name"] == "create_task"
            assert result["task_updates"][0]["action"] == "create"
            
            print("[PASS] Test passed: AI service processes tool calls correctly when API key is set")
    
    finally:
        # Remove the fake API key
        if 'OPENROUTER_API_KEY' in os.environ:
            del os.environ['OPENROUTER_API_KEY']


async def main():
    """Run all tests"""
    print("Testing AI service fixes...")
    
    await test_ai_service_without_api_key()
    await test_ai_service_with_mock_client()
    
    print("\n[SUCCESS] All tests passed! The chatbot should now handle missing API keys gracefully.")


if __name__ == "__main__":
    asyncio.run(main())