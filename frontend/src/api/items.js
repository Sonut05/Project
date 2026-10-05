import { apiClient } from './client.js';

export const itemsApi = {
  async getItems(filters = {}, signal) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const queryString = params.toString();
    const endpoint = queryString ? `/api/items?${queryString}` : '/api/items';
    return apiClient(endpoint, { signal });
  },

  async getItemById(id) {
    return apiClient(`/api/items/${id}`);
  },

  async createItem(data) {
    return apiClient('/api/items', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateItem(id, data) {
    return apiClient(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteItem(id) {
    return apiClient(`/api/items/${id}`, {
      method: 'DELETE'
    });
  }
};
