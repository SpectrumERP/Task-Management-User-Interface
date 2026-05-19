import { create } from 'zustand';
import { authService } from '@/services/authService';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  company: any[] | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionTimeoutOpen: boolean;
  login: (loginId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isSessionTimeoutOpen: false,

  login: async (loginId, password) => {
    try {
      const response = await authService.login(loginId, password);
      set({
        user: response.user,
        company: response.company,
        token: response.token,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: async () => {
    await authService.clearSession();
    set({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const session = await authService.getSession();
      if (session) {
        if (authService.isTokenExpired(session.token)) {
          await authService.clearSession();
          set({ user: null, company: null, token: null, isAuthenticated: false });
        } else {
          set({
            user: session.user,
            company: session.company,
            token: session.token,
            isAuthenticated: true,
          });
        }
      } else {
        set({ user: null, company: null, token: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
