import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sif_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      
      // Auto-logout on 401
      if (status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sif_token');
          if (window.location.pathname !== '/login') {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/login';
          }
        }
      }
      
      // Normalize error messages based on status codes
      let message = error.response.data?.error?.message || error.response.data?.detail || 'An unexpected error occurred';
      
      if (status === 403) {
        message = 'You do not have permission to perform this action.';
      } else if (status === 409) {
        // Conflict
        message = error.response.data?.error?.message || 'The resource was modified by another user. Please refresh and try again.';
      } else if (status === 422) {
        // Validation error
        if (error.response.data?.detail && Array.isArray(error.response.data.detail)) {
          interface ValidationError { loc?: string[]; msg: string; }
          message = (error.response.data.detail as ValidationError[]).map((e) => `${e.loc?.join('.')} ${e.msg}`).join(', ');
        }
      } else if (status >= 500) {
        message = 'The server encountered an error. Please try again later.';
      }
      
      // We can attach the normalized message to the error object so components can just use it
      error.normalizedMessage = message;
    } else if (error.request) {
      error.normalizedMessage = 'Network error. Please check your connection and try again.';
    } else {
      error.normalizedMessage = error.message;
    }
    
    return Promise.reject(error);
  }
);
