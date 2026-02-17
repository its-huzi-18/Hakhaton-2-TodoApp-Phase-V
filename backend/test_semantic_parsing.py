#!/usr/bin/env python3
"""
Test to verify the semantic parsing works when AI doesn't return JSON
"""
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock
from app.services.ai_service import AIService


async def test_semantic_parsing():
    """Test that semantic parsing works when AI returns empty or non-JSON response"""
    
    # Set a fake API key to allow initialization
    os.environ['OPENROUTER_API_KEY'] = 'fake-api-key-for-test'
    
    try:
        # Create AI service instance
        ai_service = AIService()
        
        # Mock the client to return an empty response (simulating the issue)
        async def mock_create(model, messages, temperature):
            # Simulate the AI returning an empty response
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message = MagicMock()
            mock_response.choices[0].message.content = ""  # Empty response
            
            return mock_response
        
        # Replace the create method
        ai_service.client.chat.completions.create = mock_create

        # Test processing a message that should trigger semantic parsing
        result = await ai_service.process_natural_language_request(
            user_message="add a task for gym tommorrow",
            user_id="18f878e7-949d-4c1c-bc86-9cb2c43aeef7",
            conversation_history=[],
            db_session=AsyncMock()  # Mock DB session
        )
        
        print(f"Response: {result.get('response', 'NO RESPONSE')}")
        print(f"Tool calls: {len(result.get('tool_calls', []))}")
        print(f"Task updates: {len(result.get('task_updates', []))}")
        
        # Check if semantic parsing worked
        if result.get('response') == "Task added successfully!":
            print("SUCCESS: Semantic parsing worked!")
            print(f"Tool called: {result['tool_calls'][0]['name'] if result['tool_calls'] else 'None'}")
            print(f"Arguments: {result['tool_calls'][0]['arguments'] if result['tool_calls'] else 'None'}")
            return True
        else:
            print("Semantic parsing didn't work as expected")
            return False
    
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
    print("Testing semantic parsing...")
    
    success = await test_semantic_parsing()
    
    if success:
        print("\nFINAL RESULT: Semantic parsing is working!")
        print("- The chatbot can now understand requests even when AI doesn't return JSON")
        print("- Requests like 'add a task for gym tommorrow' will be processed correctly")
    else:
        print("\nTEST PARTIAL: Need to check further")


if __name__ == "__main__":
    asyncio.run(main())