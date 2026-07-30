import { create } from 'zustand';
import { authService } from '@/services/authService';
import { apiService } from '@/services/apiService';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface FormRight {
  formNo: number;
  formName: string;
  formCode: string;
  formCaption: string;
  isDelete: boolean;
  isOpen: boolean;
  isReport: boolean;
  isSave: boolean;
  isUpdate: boolean;
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
  accessibleForms: number[] | null;
  formRights: Record<number, FormRight> | null;
  fetchAccessibleForms: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isSessionTimeoutOpen: false,
  accessibleForms: null,
  formRights: null,

  fetchAccessibleForms: async () => {
    try {
      const res = await apiService.get<{ success: boolean; data: FormRight[] }>('/api/globaldata/forms/task-management-menu');
      if (res?.success && Array.isArray(res.data)) {
        const rightsRecord: Record<number, FormRight> = {};
        const accessibleList: number[] = [];
        
        res.data.forEach(item => {
          rightsRecord[item.formNo] = item;
          if (item.isOpen || item.isReport) {
            accessibleList.push(item.formNo);
          }
        });
        
        set({ 
          accessibleForms: accessibleList,
          formRights: rightsRecord
        });
      } else {
        set({ accessibleForms: [], formRights: {} });
      }
    } catch (error) {
      console.error("Failed to fetch menu access data", error);
      set({ accessibleForms: [], formRights: {} });
    }
  },

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
          set({ user: null, company: null, token: null, isAuthenticated: false, accessibleForms: null });
        } else {
          set({
            user: session.user,
            company: session.company,
            token: session.token,
            isAuthenticated: true,
          });
        }
      } else {
        set({ user: null, company: null, token: null, isAuthenticated: false, accessibleForms: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
