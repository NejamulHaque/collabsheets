import { create } from 'zustand';
import { API } from './authStore';

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem('cs-theme') || 'dark',
  setTheme: (t) => {
    localStorage.setItem('cs-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
    API.patch('/users/me', { theme: t }).catch(() => {});
  },
  init: (userTheme) => {
    const t = userTheme || localStorage.getItem('cs-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },
}));