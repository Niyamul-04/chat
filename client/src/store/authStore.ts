import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, displayName: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('chatsphere_token'),
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { username, password });
      const { user, token } = res.data;
      localStorage.setItem('chatsphere_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
      connectSocket(token);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  signup: async (username, displayName, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/signup', { username, displayName, password });
      const { user, token } = res.data;
      localStorage.setItem('chatsphere_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
      connectSocket(token);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.removeItem('chatsphere_token');
      disconnectSocket();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('chatsphere_token');
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
        connectSocket(token || undefined);
        return;
      }
    } catch (e) {
      localStorage.removeItem('chatsphere_token');
      disconnectSocket();
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  updateProfile: async (data) => {
    const res = await api.put('/users/profile', data);
    if (res.data?.user) {
      set({ user: { ...get().user, ...res.data.user } });
    }
  },
}));
