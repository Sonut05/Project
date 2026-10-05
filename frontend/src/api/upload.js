import { apiClient } from './client.js';

export const uploadApi = {
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient('/api/upload', {
      method: 'POST',
      body: formData
    });
  }
};
