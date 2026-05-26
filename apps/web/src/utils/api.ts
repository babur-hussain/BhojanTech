import axios from 'axios';

/**
 * Pre-configured Axios instance for the backend REST API.
 * Base URL points to the Express backend (port 8080).
 * A request interceptor automatically attaches the stored JWT token
 * as a Bearer header on every outgoing request.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://server.bhojantech.lfvs.in/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token and branch context on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject the selected branch so the backend can scope data per-outlet
  const selectedBranchId = localStorage.getItem('selectedBranchId');
  if (selectedBranchId) {
    config.headers['x-branch-id'] = selectedBranchId;
    
    // Add a cache buster query parameter so the browser doesn't cache GET requests 
    // across different branches for the same URL.
    if (config.method?.toLowerCase() === 'get') {
      config.params = { ...config.params, _b: selectedBranchId };
    }
  }

  return config;
});

// Global response error handler — logs 401s prominently
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[api] Unauthorized — token may be expired.');
    }
    return Promise.reject(error);
  }
);
