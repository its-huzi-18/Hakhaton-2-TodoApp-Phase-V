#!/usr/bin/env python3
"""
Debug test to see what the AI model is actually returning
"""
import asyncio
import os
import re
import json
from unittest.mock import AsyncMock, MagicMock
from app.services.ai_service import AIService


async def debug_ai_response():
    """Debug what the AI model is returning"""
    
    # Set a fake API key to allow initialization
    os.environ['OPENROUTER_API_KEY'] = 'fake-api-key-for-test'
    
    try:
        # Create AI service instance
        ai_service = AIService()
        
        # Mock the client to simulate what a real AI model might return
        # This will help us understand the format
        async def mock_create(model, messages, temperature):
            # Print the messages to see what's sent to the AI
            print("Messages sent to AI:")
            for i, msg in enumerate(messages):
                print(f"  {i}: {msg['role']} - {msg['content'][:100]}...")
            
            # Simulate a response that might be returned by the AI
            # Sometimes AI models return responses that don't match our expected format
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message = MagicMock()
            
            # This simulates what might happen - an empty response
            mock_response.choices[0].message.content = ""
            
            return mock_response
        
        # Replace the create method
        ai_service.client.chat.completions.create = mock_create

        # Test processing a message
        result = await ai_service.process_natural_language_request(
            user_message="add a task for gym tommorrow",
            user_id="18f878e7-949d-4c1c-bc86-9cb2c43aeef7",
            conversation_history=[],
            db_session=AsyncMock()  # Mock DB session
        )
        
        print(f"\nResult from AI service:")
        print(f"  Response: '{result.get('response', 'NO RESPONSE')}'")
        print(f"  Tool calls: {len(result.get('tool_calls', []))}")
        print(f"  Task updates: {len(result.get('task_updates', []))}")
        
        return result
    
    except Exception as e:
        print(f"ERROR in debug: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    
    finally:
        # Remove the fake API key
        if 'OPENROUTER_API_KEY' in os.environ:
            del os.environ['OPENROUTER_API_KEY']


async def main():
    """Run the debug test"""
    print("Debugging AI response...")
    
    result = await debug_ai_response()
    
    if result:
        print("\nDebug completed.")
    else:
        print("\nDebug failed.")


if __name__ == "__main__":
    asyncio.run(main())