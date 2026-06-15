import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'x-api-key': import.meta.env.VITE_API_KEY || '' },
});

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : '/auth',
  headers: { 'x-api-key': import.meta.env.VITE_API_KEY || '' },
});

// Attach JWT to every /api request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ph_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If any request gets 401 (expired/invalid token), log the user out
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ph_token');
      localStorage.removeItem('ph_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  authApi.post('/login', { email, password }).then(r => r.data);

export const register = (email, password) =>
  authApi.post('/register', { email, password }).then(r => r.data);

export const getUsers = () => authApi.get('/users', {
  headers: { Authorization: `Bearer ${localStorage.getItem('ph_token')}` }
}).then(r => r.data);

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = () => api.get('/products').then(r => r.data);
export const addProduct = (data) => api.post('/products', data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then(r => r.data);
export const getHistory = (id, limit = 60) => api.get(`/products/${id}/history?limit=${limit}`).then(r => r.data);
export const manualScrape = (id) => api.post(`/products/${id}/scrape`).then(r => r.data);
export const getStats = () => api.get('/stats').then(r => r.data);