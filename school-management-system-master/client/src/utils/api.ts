import axios from 'axios';

// Dev: leave REACT_APP_API_BASE_URL unset → baseURL '' so requests go to the CRA dev server
// and package.json "proxy" forwards /api to the backend (default http://localhost:9999).
// Prod: set REACT_APP_API_BASE_URL to your API origin, or rely on the localhost:9999 fallback.
function getResolvedBaseURL(): string {
  const fromEnv = process.env.REACT_APP_API_BASE_URL;
  if (fromEnv != null && fromEnv !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  return 'http://localhost:9999';
}

const resolvedBaseURL = getResolvedBaseURL();

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Same origin as API calls: use for `fetch` / `window.open` that need an absolute URL. */
export function getApiBaseUrl(): string {
  if (resolvedBaseURL) {
    return resolvedBaseURL;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:9999';
}

/**
 * Origin for /uploads and other static files served by the API server. In CRA dev, /api is
 * proxied to :9999 but /uploads is not — so relative /uploads/... URLs need this host, not
 * the React dev server (localhost:3000).
 */
export function getBackendPublicOrigin(): string {
  const fromEnv = process.env.REACT_APP_API_BASE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:9999';
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:9999';
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 401 → clear session and go to login. Guard: only one redirect (parallel list calls can all 401).
let authRedirectScheduled = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url ?? '');
    const isLoginRequest = requestUrl.includes('/api/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path !== '/login' && !path.endsWith('/login') && !authRedirectScheduled) {
        authRedirectScheduled = true;
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api; 