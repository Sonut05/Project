import { apiClient } from './client.js';

export const usersApi = {
  async getProfile(id) {
    return apiClient(`/api/users/${id}`);
  },

  async getUserListings(id) {
    return apiClient(`/api/users/${id}/listings`);
  },

  async getUserReviews(id) {
    return apiClient(`/api/users/${id}/reviews`);
  },

  async updateMe(data) {
    return apiClient('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
};
