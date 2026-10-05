import { apiClient } from './client.js';

export const activitiesApi = {
  async getActivities() {
    return apiClient('/api/activities');
  },

  async deleteActivity(id) {
    return apiClient(`/api/activities/${id}`, {
      method: 'DELETE'
    });
  }
};
