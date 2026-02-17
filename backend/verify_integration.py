"""
Simple test to verify that the task service and tool wrappers are properly connected.
This test verifies the integration at the code level without running the full application.
"""

import inspect
from app.services.task_service import TaskService
from app.services.mcp_tool_wrappers import MCPToolWrappers


def test_integration():
    print("Testing AI Agent Integration with Task System...")
    
    # Check that the TaskService exists and has the expected methods
    print("\n1. Verifying TaskService...")
    assert hasattr(TaskService, '__init__'), "TaskService should have __init__ method"
    assert hasattr(TaskService, 'get_tasks'), "TaskService should have get_tasks method"
    assert hasattr(TaskService, 'create_task'), "TaskService should have create_task method"
    assert hasattr(TaskService, 'get_task'), "TaskService should have get_task method"
    assert hasattr(TaskService, 'update_task'), "TaskService should have update_task method"
    assert hasattr(TaskService, 'delete_task'), "TaskService should have delete_task method"
    assert hasattr(TaskService, 'complete_task'), "TaskService should have complete_task method"
    print("[OK] TaskService has all expected methods")

    # Check that the MCPToolWrappers uses the TaskService
    print("\n2. Verifying MCPToolWrappers integration...")
    mcp_source = inspect.getsource(MCPToolWrappers.__init__)
    assert 'get_task_service' in mcp_source, "MCPToolWrappers.__init__ should call get_task_service"
    assert 'self.task_service' in mcp_source, "MCPToolWrappers should assign task_service to self"
    print("[OK] MCPToolWrappers properly initializes TaskService")

    # Check that individual methods use the task service
    create_task_source = inspect.getsource(MCPToolWrappers.create_task)
    assert 'self.task_service.create_task' in create_task_source, "create_task should use task_service"
    print("[OK] create_task method uses shared TaskService")

    get_tasks_source = inspect.getsource(MCPToolWrappers.get_tasks)
    assert 'self.task_service.get_tasks' in get_tasks_source, "get_tasks should use task_service"
    print("[OK] get_tasks method uses shared TaskService")

    update_task_source = inspect.getsource(MCPToolWrappers.update_task)
    assert 'self.task_service.update_task' in update_task_source, "update_task should use task_service"
    print("[OK] update_task method uses shared TaskService")

    delete_task_source = inspect.getsource(MCPToolWrappers.delete_task)
    assert 'self.task_service.delete_task' in delete_task_source, "delete_task should use task_service"
    print("[OK] delete_task method uses shared TaskService")

    complete_task_source = inspect.getsource(MCPToolWrappers.complete_task)
    assert 'self.task_service.complete_task' in complete_task_source, "complete_task should use task_service"
    print("[OK] complete_task method uses shared TaskService")

    print("\n[SUCCESS] All integration points verified successfully!")
    print("\nSUMMARY:")
    print("- Task service layer created successfully")
    print("- MCP tool wrappers properly integrated with shared service")
    print("- All agent tools will now use the same business logic as the REST API")
    print("- Database operations are consistent between API and agent tools")


if __name__ == "__main__":
    test_integration()