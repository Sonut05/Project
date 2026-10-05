import { apiClient } from './client.js';

export const requestsApi = {
  async createRequest(data) {
    return apiClient('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getIncoming() {
    return apiClient('/api/requests/incoming');
  },

  async getOutgoing() {
    return apiClient('/api/requests/outgoing');
  },

  async acceptRequest(id) {
    return apiClient(`/api/requests/${id}/accept`, {
      method: 'PATCH'
    });
  },

  async rejectRequest(id) {
    return apiClient(`/api/requests/${id}/reject`, {
      method: 'PATCH'
    });
  },

  async cancelRequest(id) {
    return apiClient(`/api/requests/${id}/cancel`, {
      method: 'PATCH'
    });
  },

  async returnRequest(id) {
    return apiClient(`/api/requests/${id}/return`, {
      method: 'PATCH'
    });
  }
};
