import { apiClient } from './client.js';

export const reviewsApi = {
  async createReview(requestId, data) {
    return apiClient(`/api/requests/${requestId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getItemReviews(itemId) {
    return apiClient(`/api/items/${itemId}/reviews`);
  }
};
