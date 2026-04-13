import axios from 'axios';
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://test-production-7665.up.railway.app',
});
export default api;