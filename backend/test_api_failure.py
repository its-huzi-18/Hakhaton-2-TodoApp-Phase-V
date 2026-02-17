#!/usr/bin/env python3
"""
Simple test to verify the chatbot fix works when API calls fail
"""
import asyncio
import os
from unittest.mock import AsyncMock, patch
from app.services.ai_service import AIService


async def test_ai_service_with_failing_api_call():
    """Test the AI service when API call fails"""
    
    # Set a fake API key to allow client initialization
    os.environ['OPENROUTER_API_KEY'] = 'fake-api-key-for-test'
    
    try:
        # Create AI service instance
        ai_service = AIService()
        
        # Mock the client.chat.completions.create method to raise an exception
        async def mock_create_that_fails(*args, **kwargs):
            raise Exception("API call failed")
        
        # Replace the create method with our failing mock
        ai_service.client.chat.completions.create = mock_create_that_fails

        # Test processing a message that should trigger an API call
        result = await ai_service.process_natural_language_request(
            user_message="add a task for gym tomorrow",
            user_id="test-user-id",
            conversation_history=[],
            db_session=None
        )
        
        # Check that the response contains the error message
        assert "❌ Error:" in result["response"]
        assert result["tool_calls"] == []
        assert result["task_updates"] == []
        
        print("[PASS] Test passed: AI service handles API call failures gracefully")
        
    finally:
        # Remove the fake API key
        if 'OPENROUTER_API_KEY' in os.environ:
            del os.environ['OPENROUTER_API_KEY']


async def main():
    """Run the test"""
    print("Testing AI service failure handling...")
    
    await test_ai_service_with_failing_api_call()
    
    print("\n[SUCCESS] Test passed! The chatbot should now handle API failures gracefully.")


if __name__ == "__main__":
    asyncio.run(main())