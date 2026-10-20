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
  signup: (username: string, displayName: string, password: string, email?: string) => Promise<boolean>;
  googleLogin: (payload: { email: string; displayName?: string; googleId?: string; avatarUrl?: string; credential?: string }) => Promise<boolean>;
  forgotPassword: (identifier: string) => Promise<{ success: boolean; message: string; resetCode?: string }>;
  resetPassword: (identifier: string, resetCode: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
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

  signup: async (username, displayName, password, email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/signup', { username, displayName, password, email });
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

  googleLogin: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/google', payload);
      const { user, token } = res.data;
      localStorage.setItem('chatsphere_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
      connectSocket(token);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Google login failed.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  forgotPassword: async (identifier: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/forgot-password', { identifier });
      set({ isLoading: false });
      return {
        success: true,
        message: res.data.message,
        resetCode: res.data.resetCode,
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to request password reset.';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  resetPassword: async (identifier: string, resetCode: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/reset-password', { identifier, resetCode, newPassword });
      set({ isLoading: false, error: null });
      return { success: true, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to reset password.';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
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
