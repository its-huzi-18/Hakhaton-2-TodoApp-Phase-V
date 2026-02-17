// frontend/src/services/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Helper function to get the token from localStorage
  getAuthToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  async sendMessage(userId, message, conversationId = null) {
    try {
      // Determine the appropriate endpoint based on whether conversationId is provided
      const endpoint = conversationId
        ? `${this.baseUrl}/conversations/${conversationId}/chat`
        : `${this.baseUrl}/users/${userId}/chat`;

      const token = this.getAuthToken();

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          content: message  // Changed from 'message' to 'content' to match ChatMessageCreate model
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Return the response in a format compatible with the frontend
      return {
        response: data.content,
        conversation_id: data.conversation_id ? data.conversation_id : conversationId,
        tool_calls: data.tool_calls || [],
        task_updates: data.task_updates || []
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

export default new ApiService();