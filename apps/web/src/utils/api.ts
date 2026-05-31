import axios from 'axios';
import { useBranchStore } from '../store/branchStore';

const API_BASE = import.meta.env.VITE_API_URL || 'https://server.bhojantech.lfvs.in/api';

/**
 * Pre-configured Axios instance for the backend REST API.
 * Base URL points to the Express backend (port 8080).
 * A request interceptor automatically attaches the stored JWT token
 * as a Bearer header on every outgoing request.
 */
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Resolve an image URL for display. Handles:
 * 1. Relative proxy URLs (/api/media/...) → prepends the API server origin
 * 2. Legacy direct S3 URLs (*.s3.*.amazonaws.com) → converts to proxy URL
 * 3. Other absolute URLs (https://...) → passed through unchanged
 */
export const getMediaUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  
  // If it's a relative proxy URL, prepend the API server origin
  if (url.startsWith('/api/media/')) {
    // Extract origin from API_BASE (e.g. "https://server.bhojantech.lfvs.in" from ".../api")
    const origin = API_BASE.replace(/\/api\/?$/, '');
    return `${origin}${url}`;
  }

  // If it's a direct S3 URL, convert to proxy URL
  const s3Match = url.match(/https?:\/\/[^/]*\.s3[^/]*\.amazonaws\.com\/(.+)$/);
  if (s3Match) {
    const key = s3Match[1];
    const origin = API_BASE.replace(/\/api\/?$/, '');
    return `${origin}/api/media/${key}`;
  }

  // Otherwise return as-is (e.g. https://... external URLs)
  return url;
};

// Attach JWT token and branch context on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject the selected branch so the backend can scope data per-outlet
  const selectedBranchId = useBranchStore.getState().selectedBranchId;
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

