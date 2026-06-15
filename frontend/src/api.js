import axios from 'axios';

const api = axios.create({
  // In dev, VITE_API_URL is unset so Vite's proxy handles /api → localhost:3001
  // In production, set VITE_API_URL=https://your-backend-url in Vercel env vars
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    'x-api-key': import.meta.env.VITE_API_KEY || '',
  },
});

export const getProducts = () => api.get('/products').then(r => r.data);
export const addProduct = (data) => api.post('/products', data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then(r => r.data);
export const getHistory = (id, limit = 60) => api.get(`/products/${id}/history?limit=${limit}`).then(r => r.data);
export const manualScrape = (id) => api.post(`/products/${id}/scrape`).then(r => r.data);
export const getStats = () => api.get('/stats').then(r => r.data);