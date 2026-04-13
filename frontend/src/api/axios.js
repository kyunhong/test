import axios from 'axios';

const api = axios.create({
  baseURL: 'https://test-production-7665.up.railway.app/api',
});

export default api;