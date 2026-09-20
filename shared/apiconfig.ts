import axios from 'axios';

/**
 * Talk to the gateway only. :3001 is auth-service health, not the public API.
 *
 * Empty baseURL means every call is same-origin: in production nginx sits in
 * front of both this app and the gateway and hands anything under /api to the
 * gateway, so the bundle never has to know the domain (and there is no CORS
 * preflight, and no rebuild when the domain changes). Local `next dev` has no
 * proxy, so there NEXT_PUBLIC_API_URL points at http://localhost:3000.
 */
const apiConfig = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
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