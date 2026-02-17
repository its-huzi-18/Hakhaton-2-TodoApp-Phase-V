// Reminder Notification Component for Advanced Cloud Deployment

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReminderNotification = ({ userId, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch notifications for the user
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get('http://localhost:8000/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          status_filter: 'pending'
        }
      });

      // Filter to only show unread notifications
      const unreadNotifications = response.data.filter(n => n.status === 'pending');
      
      setNotifications(unreadNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`http://localhost:8000/notifications/${notificationId}/read`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.patch('http://localhost:8000/notifications/mark-all-read', {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Clear all notifications from local state
      setNotifications([]);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);
    
    // Call the parent callback if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  // Refresh notifications periodically
  useEffect(() => {
    fetchNotifications();

    // Set up interval to refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [userId]);

  // Render loading state
  if (loading) {
    return (
      <div className="reminder-notification">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="reminder-notification">
        <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-4">
          <p className="text-red-200">Error: {error}</p>
          <button 
            onClick={fetchNotifications}
            className="mt-3 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reminder-notification">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-200">Notifications</h3>
        {notifications.length > 0 && (
          <button 
            onClick={markAllAsRead} 
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="mt-3 text-slate-400">No new notifications</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 transition-colors cursor-pointer group"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-200 capitalize">{notification.type}</h4>
                    <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300 truncate">{notification.content}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded-full hover:bg-slate-600 text-slate-400 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification preferences */}
      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <h4 className="text-md font-medium text-slate-300 mb-3">Notification Preferences</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                defaultChecked 
                className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500 focus:ring-offset-slate-800"
              /> 
              Email Notifications
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                defaultChecked 
                className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500 focus:ring-offset-slate-800"
              /> 
              Push Notifications
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500 focus:ring-offset-slate-800"
              /> 
              SMS Notifications
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderNotification;