import { NextRequest } from 'next/server';

// Import the shared storage (in a real app, this would be a database)
// For this demo, we'll use a global Map
declare global {
  var __tasks_storage__: Map<string, any>;
}

if (!global.__tasks_storage__) {
  global.__tasks_storage__ = new Map();
}

const tasksStorage = global.__tasks_storage__;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    
    // Get the token from headers to verify authentication
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the update data from the request
    const body = await request.json();
    const { is_completed } = body;

    // Find the task
    if (!tasksStorage.has(taskId)) {
      return Response.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get the existing task
    const existingTask = tasksStorage.get(taskId);
    
    // Update the task
    const updatedTask = {
      ...existingTask,
      is_completed,
      updated_at: new Date().toISOString(),
    };

    // Save back to storage
    tasksStorage.set(taskId, updatedTask);

    // Log for debugging
    console.log(`Updated task with ID: ${taskId}`);

    return Response.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return Response.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    
    // Get the token from headers to verify authentication
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the task exists
    if (!tasksStorage.has(taskId)) {
      return Response.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Remove the task
    tasksStorage.delete(taskId);

    // Log for debugging
    console.log(`Deleted task with ID: ${taskId}. Remaining tasks: ${tasksStorage.size}`);

    return Response.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return Response.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}