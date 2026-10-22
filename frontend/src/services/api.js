import axios from 'axios';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const isLocalApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiUrl);

// Never let a production build call the visitor's own localhost. If the
// frontend and API share a domain, /api is the correct production fallback;
// otherwise VITE_API_URL must be set to the deployed backend URL.
const apiBaseUrl = import.meta.env.PROD && isLocalApiUrl
  ? '/api'
  : configuredApiUrl || '/api';

if (import.meta.env.PROD && isLocalApiUrl) {
  console.error('[API-CONFIG] Production build contains a localhost VITE_API_URL. Falling back to /api. Set VITE_API_URL to the live backend URL.');
}

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
  baseURL: apiBaseUrl,
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
  const activeVendorId = localStorage.getItem('activeVendorId');
  const hasVendorId = config.headers['x-vendor-id'] || 
                      config.headers['X-Vendor-Id'] || 
                      (config.headers.has && config.headers.has('x-vendor-id')) ||
                      (config.headers.get && config.headers.get('x-vendor-id'));
  if (activeVendorId && !hasVendorId) {
    config.headers['x-vendor-id'] = activeVendorId;
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
