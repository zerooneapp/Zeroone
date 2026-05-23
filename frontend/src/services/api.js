import axios from 'axios';

const getStoredRole = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;

    const parsed = JSON.parse(authStorage);
    return parsed?.state?.role || null;
  } catch {
    return null;
  }
};

const buildLoginRedirect = () => {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const storedRole = getStoredRole();
  const loginPath = window.location.pathname.startsWith('/admin') || ['admin', 'super_admin'].includes(storedRole)
    ? '/admin-login'
    : (
        ['/vendor', '/staff'].some((prefix) => window.location.pathname.startsWith(prefix)) ||
        ['vendor', 'staff'].includes(storedRole)
      )
      ? '/vendor-login'
      : '/login';

  return `${loginPath}?redirect=${encodeURIComponent(currentPath)}`;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear the basic token to prevent looping, but rely on the main store for full cleanup
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
