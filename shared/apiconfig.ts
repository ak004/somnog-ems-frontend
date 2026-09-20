import axios from 'axios';

/**
 * Talk to the gateway only. :3001 is auth-service health, not the public API.
 */
const apiConfig = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiConfig.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiConfig.interceptors.response.use((response) => {
  return response;
}, (error) => {
  const status = error.response?.status;
  const url = error.config?.url ?? '';
  const isAuthForm =
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/me/change-password');

  if (status === 401 && !isAuthForm) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/';
  }
  return Promise.reject(error);
});
export default apiConfig;