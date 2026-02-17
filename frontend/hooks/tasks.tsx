'use client';

import { create } from 'zustand';
import { createContext, useContext, ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  is_completed?: boolean;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (task: { title: string; description?: string; priority?: string; due_date?: string }) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearError: () => void;
}

const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      set({ tasks: data.tasks || data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  createTask: async (task: { title: string; description?: string; priority?: string; due_date?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const newTask = await response.json();
      set({
        tasks: [...get().tasks, newTask],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
        isLoading: false,
      });
      throw error;
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      const updatedTask = await response.json();
      set({
        tasks: get().tasks.map((task) => (task.id === id ? updatedTask : task)),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
        isLoading: false,
      });
      throw error;
    }
  },

  toggleTaskComplete: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    
    await get().updateTask(id, {
      status: task.status === 'completed' ? 'pending' : 'completed',
    });
  },

  deleteTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }

      set({
        tasks: get().tasks.filter((task) => task.id !== id),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Context and Provider
const TasksContext = createContext<TaskState | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const tasks = useTaskStore();

  return (
    <TasksContext.Provider value={tasks}>
      {children}
    </TasksContext.Provider>
  );
}

// Hook for components
export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
