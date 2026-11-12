import axios from 'axios';

// Resolve API base URL: Priority to VITE_API_BASE_URL, fallback to VITE_API_URL or production live Render backend
const LIVE_BACKEND_URL = 'https://college-issue-backend-t72o.onrender.com';
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL 
  || import.meta.env.VITE_API_URL 
  || (import.meta.env.PROD ? LIVE_BACKEND_URL : '/api');
const trimmedBase = rawBaseUrl.trim().replace(/\/+$/, '');
const baseURL = (trimmedBase.endsWith('/api') || trimmedBase === '/api')
  ? trimmedBase
  : `${trimmedBase}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to catch unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if session expired
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
