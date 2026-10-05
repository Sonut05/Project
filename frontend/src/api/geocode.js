import { apiClient } from './client.js';

export const geocodeApi = {
  async search(query, signal) {
    if (!query || query.trim().length < 2) return [];
    return apiClient(`/api/geocode?q=${encodeURIComponent(query.trim())}`, {
      signal
    });
  },

  async reverse(lat, lng, signal) {
    return apiClient(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
      signal
    });
  }
};
