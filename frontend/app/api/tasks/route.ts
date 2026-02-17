import { NextRequest } from 'next/server';

// Global in-memory storage for demo purposes
// In a real application, you would use a database
declare global {
  var __tasks_storage__: Map<string, any>;
}

if (!global.__tasks_storage__) {
  global.__tasks_storage__ = new Map();
}

const tasksStorage = global.__tasks_storage__;

export async function GET(request: NextRequest) {
  try {
    // Get the token from headers to verify authentication
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Convert Map to array for response
    const tasksArray = Array.from(tasksStorage.values());

    // Log for debugging
    console.log(`Returning ${tasksArray.length} tasks`);

    return Response.json({ tasks: tasksArray });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return Response.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the token from headers to verify authentication
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the task data from the request
    const body = await request.json();
    const { title, description, is_completed } = body;

    // Basic validation
    if (!title) {
      return Response.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create a new task
    const newTask = {
      id: Math.random().toString(36).substring(2, 15),
      title,
      description: description || '',
      is_completed: is_completed || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to in-memory storage
    tasksStorage.set(newTask.id, newTask);

    // Log for debugging
    console.log(`Created task with ID: ${newTask.id}. Total tasks: ${tasksStorage.size}`);

    return Response.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return Response.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}