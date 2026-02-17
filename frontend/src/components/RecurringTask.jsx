// Recurring Task UI Component for Advanced Cloud Deployment

import React, { useState } from 'react';
import axios from 'axios';

const RecurringTask = ({ userId, onRecurringTaskCreated }) => {
  const [task, setTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    tags: [],
    recurrence: {
      frequency: 'daily',
      interval: 1,
      endDate: '',
      occurrenceCount: null,
      daysOfWeek: [],
      dayOfMonth: null,
      monthOfYear: null
    }
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('recurrence.')) {
      // Handle recurrence rule changes
      const recurrenceField = name.split('.')[1];
      setTask(prev => ({
        ...prev,
        recurrence: {
          ...prev.recurrence,
          [recurrenceField]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name === 'daysOfWeek') {
      // Handle days of week selection
      const dayValue = parseInt(value);
      setTask(prev => {
        const currentDays = [...prev.recurrence.daysOfWeek];
        const dayIndex = currentDays.indexOf(dayValue);
        
        if (checked && dayIndex === -1) {
          currentDays.push(dayValue);
        } else if (!checked && dayIndex !== -1) {
          currentDays.splice(dayIndex, 1);
        }
        
        return {
          ...prev,
          recurrence: {
            ...prev.recurrence,
            daysOfWeek: currentDays
          }
        };
      });
    } else {
      // Handle regular task changes
      setTask(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
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
      // Prepare task data with recurrence rule
      const taskData = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        recurrenceRule: {
          ...task.recurrence,
          endDate: task.recurrence.endDate ? new Date(task.recurrence.endDate).toISOString() : null
        }
      };

      // Make API request to create recurring task
      const response = await axios.post('http://localhost:8000/recurring-tasks', taskData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Call callback function to notify parent component
      if (onRecurringTaskCreated) {
        onRecurringTaskCreated(response.data);
      }

      // Reset form
      setTask({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        tags: [],
        recurrence: {
          frequency: 'daily',
          interval: 1,
          endDate: '',
          occurrenceCount: null,
          daysOfWeek: [],
          dayOfMonth: null,
          monthOfYear: null
        }
      });
    } catch (err) {
      console.error('Error creating recurring task:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create recurring task');
    } finally {
      setLoading(false);
    }
  };

  // Get day name from day number
  const getDayName = (dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  };

  // Get month name from month number
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
  };

  return (
    <div className="recurring-task">
      <form onSubmit={handleSubmit} className="space-y-6">
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
              Initial Due Date *
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={task.dueDate}
              onChange={handleChange}
              required
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

        <div className="pt-4 border-t border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Recurrence Settings</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="recurrence.frequency" className="block text-sm font-medium text-slate-300">
                Frequency *
              </label>
              <select
                id="recurrence.frequency"
                name="recurrence.frequency"
                value={task.recurrence.frequency}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="daily" className="bg-slate-800">Daily</option>
                <option value="weekly" className="bg-slate-800">Weekly</option>
                <option value="monthly" className="bg-slate-800">Monthly</option>
                <option value="yearly" className="bg-slate-800">Yearly</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Repeat Every
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  id="recurrence.interval"
                  name="recurrence.interval"
                  value={task.recurrence.interval}
                  onChange={handleChange}
                  min="1"
                  placeholder="1"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <span className="flex items-center px-4 py-2.5 rounded-lg bg-slate-700/50 border border-white/20 text-slate-300 min-w-[100px] text-center">
                  {task.recurrence.frequency === 'daily' && 'day(s)'}
                  {task.recurrence.frequency === 'weekly' && 'week(s)'}
                  {task.recurrence.frequency === 'monthly' && 'month(s)'}
                  {task.recurrence.frequency === 'yearly' && 'year(s)'}
                </span>
              </div>
            </div>

            {task.recurrence.frequency === 'weekly' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Days of Week
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <label key={day} className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/30 border border-white/10 cursor-pointer hover:bg-slate-700/50">
                      <input
                        type="checkbox"
                        name="daysOfWeek"
                        value={day}
                        checked={task.recurrence.daysOfWeek.includes(day)}
                        onChange={handleChange}
                        className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500 focus:ring-offset-slate-800"
                      />
                      <span className="text-slate-300">{getDayName(day)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {task.recurrence.frequency === 'monthly' && (
              <div className="space-y-2">
                <label htmlFor="recurrence.dayOfMonth" className="block text-sm font-medium text-slate-300">
                  Day of Month
                </label>
                <input
                  type="number"
                  id="recurrence.dayOfMonth"
                  name="recurrence.dayOfMonth"
                  value={task.recurrence.dayOfMonth || ''}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  placeholder="Leave blank for same day as initial task"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            )}

            {task.recurrence.frequency === 'yearly' && (
              <div className="space-y-2">
                <label htmlFor="recurrence.monthOfYear" className="block text-sm font-medium text-slate-300">
                  Month of Year
                </label>
                <select
                  id="recurrence.monthOfYear"
                  name="recurrence.monthOfYear"
                  value={task.recurrence.monthOfYear || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="" className="bg-slate-800">Same month as initial task</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month} className="bg-slate-800">{getMonthName(month)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="recurrence.endDate" className="block text-sm font-medium text-slate-300">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  id="recurrence.endDate"
                  name="recurrence.endDate"
                  value={task.recurrence.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="recurrence.occurrenceCount" className="block text-sm font-medium text-slate-300">
                  Max Occurrences (optional)
                </label>
                <input
                  type="number"
                  id="recurrence.occurrenceCount"
                  name="recurrence.occurrenceCount"
                  value={task.recurrence.occurrenceCount || ''}
                  onChange={handleChange}
                  min="1"
                  placeholder="Leave blank for no limit"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-medium transition-opacity"
        >
          {loading ? 'Creating...' : 'Create Recurring Task'}
        </button>
      </form>
    </div>
  );
};

export default RecurringTask;