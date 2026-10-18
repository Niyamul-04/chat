import axios from 'axios';

export const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string) || 'http://localhost:5000';
export const API_BASE_URL = `${SERVER_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('chatsphere_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Helper to resolve media URLs
export function getMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${SERVER_URL}${path}`;
  }
  return `${SERVER_URL}/${path}`;
}
