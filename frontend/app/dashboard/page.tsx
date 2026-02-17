"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/auth";
import { useTasks } from "@/hooks/tasks";
import { useRouter } from "next/navigation";


export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    toggleTaskComplete,
    deleteTask,
  } = useTasks();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    fetchTasks();
  }, [isAuthenticated]); // Removed fetchTasks and router from dependencies to prevent infinite loop

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      // The context state should update automatically, no need to fetch again
    } catch (error) {
      // Error is handled by the context
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-gradient-to-br from-blue-900 to-indigo-900">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/10 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/10 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Welcome section */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
            Welcome back, <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.email}</span>
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Tasks"
            value={tasks.length}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
          />
          <StatCard
            title="Completed"
            value={tasks.filter((t) => t.is_completed || t.status === 'completed').length}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          <StatCard
            title="Pending"
            value={tasks.filter((t) => !t.is_completed && t.status !== 'completed').length}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="amber"
          />
        </div>

        {/* Create Task Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 mb-8 card-hover animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Task
          </h2>
          
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title *
              </label>
              <input
                id="task-title"
                type="text"
                placeholder="What needs to be done?"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent input-focus"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            
            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="task-description"
                placeholder="Add more details..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent input-focus"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                disabled={isCreating}
              />
            </div>
            
            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center btn-transition disabled:opacity-70"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Task
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center animate-fade-in">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Tasks List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 card-hover animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Your Tasks
            </h2>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new task.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    task.is_completed || task.status === 'completed'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 hover:shadow-md'
                  } animate-fade-in`}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={task.is_completed || task.status === 'completed'}
                      onChange={() => toggleTaskComplete(task.id)}
                      className={`h-5 w-5 mt-1 rounded ${
                        task.is_completed || task.status === 'completed'
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 dark:border-slate-500 text-blue-600'
                      } focus:ring-blue-500`}
                    />
                    <div className="ml-4 flex-1 min-w-0">
                      <p
                        className={`text-lg font-medium truncate ${
                          task.is_completed || task.status === 'completed'
                            ? 'text-green-800 dark:text-green-200 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Created: {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}</span>
                        {(task.is_completed || task.status === 'completed') && (
                          <span className="ml-3 flex items-center">
                            <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="ml-4 p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      aria-label="Delete task"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* 🔹 Enhanced stat card component */
function StatCard({
  title,
  value,
  icon,
  color = "blue",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "blue" | "green" | "amber";
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-200 dark:ring-blue-800"
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-600 dark:text-green-400",
      ring: "ring-green-200 dark:ring-green-800"
    },
    amber: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-200 dark:ring-amber-800"
    }
  };

  const colorClass = colorClasses[color];

  return (
    <div className={`rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800 card-hover ${colorClass.ring} ring-1 ring-opacity-50`}>
      <div className="flex items-center">
        <div className={`${colorClass.bg} p-3 rounded-xl`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <p className={`text-3xl font-bold ${colorClass.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
