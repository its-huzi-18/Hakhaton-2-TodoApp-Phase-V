#!/usr/bin/env python3
"""
Test script to verify that the AI service fix works correctly
"""
import asyncio
import os
from app.services.ai_service import get_ai_service

async def test_ai_service():
    # Temporarily unset the API key to simulate the issue
    original_key = os.environ.get('OPENROUTER_API_KEY')
    if 'OPENROUTER_API_KEY' in os.environ:
        del os.environ['OPENROUTER_API_KEY']

    try:
        ai_service = get_ai_service()

        # Test the scenario from the logs: user says "add a task buy milk"
        result = await ai_service.process_natural_language_request(
            user_message="add a task buy milk",
            user_id="9b5a0932-93fb-4f16-a01f-2129a95f4ea7",
            conversation_history=[],
            db_session=None  # This will be mocked in the actual service
        )

        print("Test Result:")
        print(f"Response: {result['response']}")
        print(f"Tool Calls: {result['tool_calls']}")
        print(f"Task Updates: {result['task_updates']}")

        # Verify that we got a proper response - when db_session is None,
        # we should get a helpful message rather than an error
        assert "database connection is not available" in result['response'], f"Expected helpful message about missing DB connection, got: {result['response']}"
        assert len(result['tool_calls']) == 0, "Expected no tool calls when DB session is None"

        print("\nTEST PASSED: AI service correctly handles 'add a task buy milk' without API key and DB session!")

    except Exception as e:
        print(f"\nTEST FAILED with error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Restore the original key if it existed
        if original_key:
            os.environ['OPENROUTER_API_KEY'] = original_key

if __name__ == "__main__":
    asyncio.run(test_ai_service())