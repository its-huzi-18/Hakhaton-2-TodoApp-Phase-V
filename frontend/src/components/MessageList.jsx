// frontend/src/components/MessageList.jsx
import React from 'react';

const MessageList = ({ messages }) => {
  // Helper function to format task lists
  const formatTaskList = (tasks) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return "No tasks found.";
    }

    return (
      <div className="mt-2 space-y-1">
        {tasks.map((task, index) => (
          <div key={task.id || index} className="flex items-center">
            <span className={`mr-2 ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
              {index + 1}. {task.title}
            </span>
            {task.is_completed && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        // Check if this is a message with task data to format
        let formattedContent = message.content;
        if (message.toolCalls && message.toolCalls.length > 0) {
          const getTasksCall = message.toolCalls.find(call => call.name === 'get_tasks' && call.response);
          if (getTasksCall && Array.isArray(getTasksCall.response)) {
            // Format the task list response
            formattedContent = `Here are your tasks:`;
          }
        }

        return (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{formattedContent}</div>

              {/* Display task list if present in tool response */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                message.toolCalls.some(call => call.name === 'get_tasks' && Array.isArray(call.response)) && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    {formatTaskList(message.toolCalls.find(call => call.name === 'get_tasks').response)}
                  </div>
                )
              )}

              {/* Display tool calls if present (but not for get_tasks since we format it separately) */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-semibold">Tool Calls:</div>
                  {message.toolCalls.filter(call => call.name !== 'get_tasks').map((call, idx) => (
                    <div key={idx} className="mt-1 text-xs bg-black bg-opacity-10 p-2 rounded">
                      <div className="font-medium">{call.name}:</div>
                      <div>{JSON.stringify(call.arguments)}</div>
                      {call.response && call.name !== 'get_tasks' && (
                        <div className="mt-1 text-green-700">
                          Response: {JSON.stringify(call.response)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Display task updates if present */}
              {message.taskUpdates && message.taskUpdates.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-semibold">Task Updates:</div>
                  {message.taskUpdates.map((task, idx) => (
                    <div key={idx} className="mt-1 text-xs bg-green-100 p-2 rounded">
                      <div><strong>{task.title || task.id}</strong>: {task.status || 'updated'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;