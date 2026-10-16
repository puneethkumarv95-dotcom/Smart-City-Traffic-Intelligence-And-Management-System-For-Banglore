import { create } from 'zustand';
import api from '../services/api';

const getInitialUser = () => {
  try {
    const stored = localStorage.getItem('sctims_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: getInitialUser(),
  accessToken: localStorage.getItem('sctims_access_token') || null,
  refreshToken: localStorage.getItem('sctims_refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('sctims_access_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('sctims_access_token', accessToken);
      localStorage.setItem('sctims_refresh_token', refreshToken);
      localStorage.setItem('sctims_user', JSON.stringify(user));

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to login. Please check credentials.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', formData);
      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('sctims_access_token', accessToken);
      localStorage.setItem('sctims_refresh_token', refreshToken);
      localStorage.setItem('sctims_user', JSON.stringify(user));

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  logout: async () => {
    try {
      const refreshToken = get().refreshToken;
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('sctims_access_token');
      localStorage.removeItem('sctims_refresh_token');
      localStorage.removeItem('sctims_user');
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  fetchCurrentUser: async () => {
    if (!get().accessToken) return;
    try {
      const response = await api.get('/auth/me');
      const user = response.data.data;
      localStorage.setItem('sctims_user', JSON.stringify(user));
      set({ user });
    } catch (err) {
      if (err.response?.status === 401) {
        get().logout();
      }
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch('/auth/profile', profileData);
      const updatedUser = { ...get().user, ...response.data.data };
      localStorage.setItem('sctims_user', JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });
      return { success: true, user: updatedUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  }
}));

