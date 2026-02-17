"""
Test script to verify that the AI agent tools are properly integrated with the task system.
This script simulates what happens when the agent calls the tools.
"""

import asyncio
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.db import create_db_and_tables, get_db
from app.models import User, Task
from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper
from uuid import uuid4


async def test_agent_integration():
    print("Testing AI Agent Integration with Task System...")
    
    # Initialize the database
    await create_db_and_tables()
    
    # Get a database session
    async for db in get_db():
        # Create a test user
        from sqlmodel import select
        existing_users = await db.execute(select(User))
        user = existing_users.first()
        
        if not user:
            # Create a test user if none exists
            from app.models import UserCreate
            from app.routes.auth import get_password_hash
            
            test_user = User(
                email="test@example.com",
                hashed_password=get_password_hash("password123")
            )
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)
            user = test_user
        else:
            user = existing_users.scalar_first()
        
        print(f"Using user: {user.email} (ID: {user.id})")
        
        # Create an instance of the MCP tools wrapper
        tools_wrapper = get_mcp_tools_wrapper(db)
        
        # Test creating a task
        print("\n1. Testing create_task...")
        try:
            created_task = await tools_wrapper.create_task(
                title="Test task from agent",
                description="This task was created by the AI agent",
                user_id=str(user.id)
            )
            print(f"✓ Created task: {created_task['title']} (ID: {created_task['id']})")
            task_id = created_task['id']
        except Exception as e:
            print(f"✗ Failed to create task: {e}")
            return
        
        # Test getting tasks
        print("\n2. Testing get_tasks...")
        try:
            tasks = await tools_wrapper.get_tasks(user_id=str(user.id))
            print(f"✓ Retrieved {len(tasks)} tasks")
            for task in tasks[:2]:  # Show first 2 tasks
                print(f"  - {task['title']} (Completed: {task['is_completed']})")
        except Exception as e:
            print(f"✗ Failed to get tasks: {e}")
            return
        
        # Test updating a task
        print("\n3. Testing update_task...")
        try:
            updated_task = await tools_wrapper.update_task(
                task_id=task_id,
                title="Updated task from agent",
                is_completed=True
            )
            print(f"✓ Updated task: {updated_task['title']} (Completed: {updated_task['is_completed']})")
        except Exception as e:
            print(f"✗ Failed to update task: {e}")
            return
        
        # Test completing a task
        print("\n4. Testing complete_task...")
        try:
            completed_task = await tools_wrapper.complete_task(task_id=task_id)
            print(f"✓ Completed task: {completed_task['title']} (Completed: {completed_task['is_completed']})")
        except Exception as e:
            print(f"✗ Failed to complete task: {e}")
            return
        
        # Test deleting a task
        print("\n5. Testing delete_task...")
        try:
            result = await tools_wrapper.delete_task(task_id=task_id)
            print(f"✓ Deleted task: {result['deleted']}")
        except Exception as e:
            print(f"✗ Failed to delete task: {e}")
            return
        
        print("\n✓ All integration tests passed!")
        break  # Exit the async for loop


if __name__ == "__main__":
    asyncio.run(test_agent_integration())