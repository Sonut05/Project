import { apiClient, setAccessToken } from './client.js';

export const authApi = {
  async register(data) {
    const res = await apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },

  async login(credentials) {
    const res = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },

  async refresh() {
    try {
      const res = await apiClient('/api/auth/refresh', {
        method: 'POST'
      });
      if (res.accessToken) {
        setAccessToken(res.accessToken);
      }
      return res;
    } catch (err) {
      setAccessToken(null);
      throw err;
    }
  },

  async logout() {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe() {
    return apiClient('/api/auth/me');
  }
};
