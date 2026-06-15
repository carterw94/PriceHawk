import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    // Vite exposes VITE_* vars to the browser via import.meta.env
    'x-api-key': import.meta.env.VITE_API_KEY || '',
  },
});

export const getProducts = () => api.get('/products').then(r => r.data);
export const addProduct = (data) => api.post('/products', data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then(r => r.data);
export const getHistory = (id, limit = 60) => api.get(`/products/${id}/history?limit=${limit}`).then(r => r.data);
export const manualScrape = (id) => api.post(`/products/${id}/scrape`).then(r => r.data);
export const getStats = () => api.get('/stats').then(r => r.data);