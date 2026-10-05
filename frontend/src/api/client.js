export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let inMemoryToken = null;
let singleFlightRefreshPromise = null;

export function setAccessToken(token) {
  inMemoryToken = token;
}

export function getAccessToken() {
  return inMemoryToken;
}

/**
 * Single-flight token refresh:
 * When multiple requests receive 401 simultaneously, only ONE refresh request is executed.
 * All waiting callers await the exact same promise and then retry with the new token.
 */
export async function requestTokenRefresh() {
  if (singleFlightRefreshPromise) {
    return singleFlightRefreshPromise;
  }

  singleFlightRefreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.accessToken) {
          setAccessToken(refreshData.accessToken);
          return refreshData.accessToken;
        }
      }
      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      singleFlightRefreshPromise = null;
    }
  })();

  return singleFlightRefreshPromise;
}

export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...options.headers
  };

  // If body is not FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  // Attach Authorization header if access token exists in memory
  if (inMemoryToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include' // Sends httpOnly cookies for refresh token
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    if (netErr.name === 'AbortError') {
      throw netErr;
    }
    throw new Error('Network error. Unable to reach server. Please check your connection.', { cause: netErr });
  }

  // Single-flight silent refresh on 401 Unauthorized for non-auth endpoints
  if (response.status === 401 && !endpoint.startsWith('/api/auth/login') && !endpoint.startsWith('/api/auth/refresh')) {
    const newToken = await requestTokenRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        response = await fetch(url, { ...config, headers });
      } catch (retryErr) {
        if (retryErr.name === 'AbortError') throw retryErr;
        throw new Error('Network error. Unable to reach server.', { cause: retryErr });
      }
    }
  }

  // Handle responses
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (data && data.error && data.error.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;
    const err = new Error(errorMessage);
    err.status = response.status;
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}
