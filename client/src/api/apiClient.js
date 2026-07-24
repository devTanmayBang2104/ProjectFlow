import axios from 'axios';

// Helper to extract a cookie value by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

// Initialize Axios client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Allow cookies to be sent
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach CSRF token on every request
apiClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Handle automatic token refreshing (RTR)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized) and request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid token refreshing for public authentication endpoints (login, register, refresh)
      const bypassRefreshUrls = ['/auth/login', '/auth/register', '/auth/refresh'];
      if (bypassRefreshUrls.some(url => originalRequest.url.includes(url))) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        isRefreshing = false;
        
        // Re-run original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        
        console.warn('[Session] Token refresh failed. Logging out...');
        localStorage.removeItem('user');
        
        // Prevent redirect loop if already on a public page
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/google-callback'];
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
