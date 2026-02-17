#!/usr/bin/env python3
"""
Test to verify the updated AI service handles user ID properly
"""
import asyncio
import os
import json
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_service import AIService


async def test_ai_service_with_proper_json():
    """Test that the AI service generates proper JSON for tool calls"""
    
    # Set a fake API key to allow initialization
    os.environ['OPENROUTER_API_KEY'] = 'fake-api-key-for-test'
    
    try:
        # Create AI service instance
        ai_service = AIService()
        
        # Mock the client to return a proper JSON response for task creation
        async def mock_create(model, messages, temperature):
            # Find the user message from the messages array
            user_msg = None
            for msg in messages:
                if msg["role"] == "user":
                    user_msg = msg["content"]
                    break
            
            # If the user is asking to create a task, return the appropriate JSON
            if "add a task" in user_msg.lower() or "create task" in user_msg.lower():
                # Return a response that contains the JSON for creating a task
                mock_response = MagicMock()
                mock_response.choices = [MagicMock()]
                mock_response.choices[0].message = MagicMock()
                
                # Create the JSON response for the create_task tool
                json_response = {
                    "tool_name": "create_task",
                    "arguments": {
                        "title": "Go to gym tomorrow",
                        "description": "Workout session"
                    }
                }
                
                mock_response.choices[0].message.content = json.dumps(json_response)
                return mock_response
            else:
                # For other messages, return a plain text response
                mock_response = MagicMock()
                mock_response.choices = [MagicMock()]
                mock_response.choices[0].message = MagicMock()
                mock_response.choices[0].message.content = "I understood your request."
                return mock_response
        
        # Replace the create method
        ai_service.client.chat.completions.create = mock_create

        # Test processing a message that should trigger task creation
        result = await ai_service.process_natural_language_request(
            user_message="add a task for gym tommorrow",
            user_id="18f878e7-949d-4c1c-bc86-9cb2c43aeef7",
            conversation_history=[],
            db_session=AsyncMock()  # Mock DB session
        )
        
        # Verify that the result contains the expected response
        print(f"Response: {result['response']}")
        print(f"Tool calls: {result['tool_calls']}")
        print(f"Task updates: {result['task_updates']}")
        
        # Check that a tool was called
        assert len(result["tool_calls"]) > 0, "Expected at least one tool call"
        
        # Check that the create_task tool was called
        tool_call = result["tool_calls"][0]
        assert tool_call["name"] == "create_task", f"Expected create_task, got {tool_call['name']}"
        
        # Check that the user_id was added to the arguments automatically
        assert "user_id" in tool_call["arguments"], "user_id should be added to arguments automatically"
        assert tool_call["arguments"]["user_id"] == "18f878e7-949d-4c1c-bc86-9cb2c43aeef7", "user_id should match the provided user_id"
        
        print("SUCCESS: AI service correctly adds user_id to tool arguments automatically")
        print(f"Tool called: {tool_call['name']}")
        print(f"Arguments: {tool_call['arguments']}")
        
        return True
    
    except Exception as e:
        print(f"ERROR in test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Remove the fake API key
        if 'OPENROUTER_API_KEY' in os.environ:
            del os.environ['OPENROUTER_API_KEY']


async def main():
    """Run the test"""
    print("Testing the updated AI service...")
    
    success = await test_ai_service_with_proper_json()
    
    if success:
        print("\nFINAL RESULT: The AI service now correctly handles user ID automatically!")
        print("- No need to ask users for their ID")
        print("- User ID is automatically added to tool calls")
        print("- The chatbot should respond properly to requests like 'add a task for gym tommorrow'")
    else:
        print("\nTEST FAILED")


if __name__ == "__main__":
    asyncio.run(main())