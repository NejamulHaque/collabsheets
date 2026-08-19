import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config';

// ⚠️ Must match your backend port (5000 or 5001)
const API = axios.create({ baseURL: API_URL });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useAuthStore = create((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  },

  register: async (username, email, password) => {
    set({ loading: true });
    try {
      const { data } = await API.post('/auth/register', { username, email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.response?.data?.error || 'Registration failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null });
  },

  hydrate: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await API.get('/auth/me');
      set({ user: data });
    } catch {
      localStorage.removeItem('token');
      set({ user: null });
    }
  },
}));

export { API };