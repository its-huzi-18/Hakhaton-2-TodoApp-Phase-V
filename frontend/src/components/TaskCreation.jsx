// Task Creation Component for Advanced Cloud Deployment

import React, { useState } from 'react';
import axios from 'axios';

const TaskCreation = ({ onTaskCreated }) => {
  const [task, setTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle tag input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !task.tags.includes(tagInput.trim())) {
      setTask(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (indexToRemove) => {
    setTask(prev => ({
      ...prev,
      tags: prev.tags.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare task data
      const taskData = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null
      };

      // Make API request to create task
      const response = await axios.post('http://localhost:8000/tasks', taskData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Call callback function to notify parent component
      if (onTaskCreated) {
        onTaskCreated(response.data);
      }

      // Reset form
      setTask({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        tags: []
      });
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-creation">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-slate-300">
            Task Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={task.title}
            onChange={handleChange}
            required
            placeholder="Enter task title"
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-slate-300">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={task.description}
            onChange={handleChange}
            placeholder="Enter task description"
            rows="3"
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={task.dueDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="block text-sm font-medium text-slate-300">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={task.priority}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="low" className="bg-slate-800">Low</option>
              <option value="medium" className="bg-slate-800">Medium</option>
              <option value="high" className="bg-slate-800">High</option>
              <option value="urgent" className="bg-slate-800">Urgent</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={handleTagInputChange}
              placeholder="Enter a tag and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <button 
              type="button" 
              onClick={addTag}
              className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {task.tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {tag}
                <button 
                  type="button" 
                  onClick={() => removeTag(index)}
                  className="text-sky-300 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-medium transition-opacity"
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
};

export default TaskCreation;