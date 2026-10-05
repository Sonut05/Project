import { apiClient } from './client.js';

export const messagesApi = {
  async getConversations() {
    return apiClient('/api/conversations');
  },

  async startConversation(recipientId) {
    return apiClient('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
  },

  async getMessages(conversationId) {
    return apiClient(`/api/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId, body) {
    return apiClient(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  }
};
