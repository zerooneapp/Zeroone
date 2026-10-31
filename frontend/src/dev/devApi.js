import axios from 'axios';
import { ROUTE_KEY, DEV_TOKEN_KEY } from './devConfig';

// Mirror api.js base resolution, then append the hidden route key.
const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const isLocalApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiUrl);
const apiBaseUrl = import.meta.env.PROD && isLocalApiUrl ? '/api' : (configuredApiUrl || '/api');

const devApi = axios.create({
  baseURL: `${apiBaseUrl.replace(/\/$/, '')}/${ROUTE_KEY}`,
  headers: { 'Content-Type': 'application/json' }
});

// Attach the developer token; deliberately NOT the normal app token.
devApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(DEV_TOKEN_KEY);
  if (token) config.headers['x-dev-token'] = token;
  return config;
});

export const getDevToken = () => localStorage.getItem(DEV_TOKEN_KEY);
export const setDevToken = (token) => localStorage.setItem(DEV_TOKEN_KEY, token);
export const clearDevToken = () => localStorage.removeItem(DEV_TOKEN_KEY);

export default devApi;
