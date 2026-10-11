import { create } from 'zustand';
import { authService } from '@/services/authService';
import { apiService } from '@/services/apiService';
import {
  CRM_SSO_ENABLED,
  clearCrmRedirectMark,
  endCrmSession,
  onCrmSessionEnd,
  readCrmSession,
  redirectToCrmLogin,
} from '@/lib/crmSso';

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
  /** Inside the CRM this also signs out of the CRM and opens its login (`returnTo`: come back here after). */
  logout: (options?: { returnTo?: string }) => Promise<void>;
  checkAuth: () => Promise<void>;
  accessibleForms: number[] | null;
  formRights: Record<number, FormRight> | null;
  fetchAccessibleForms: () => Promise<void>;
}

/** Dedupe concurrent menu fetches (StrictMode / MainLayout + Sidebar). */
let activeMenuPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isSessionTimeoutOpen: false,
  accessibleForms: null,
  formRights: null,

  fetchAccessibleForms: async () => {
    if (get().accessibleForms !== null) return;
    if (activeMenuPromise) return activeMenuPromise;

    activeMenuPromise = (async () => {
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
      } finally {
        activeMenuPromise = null;
      }
    })();

    return activeMenuPromise;
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

  logout: async (options) => {
    await authService.clearSession();
    set({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      accessibleForms: null,
      formRights: null,
    });
    if (CRM_SSO_ENABLED) {
      endCrmSession();
      redirectToCrmLogin(options?.returnTo);
    }
  },

  checkAuth: async () => {
    // Signed in already (a remount, e.g. reopening the app inside Spectrum ERP): re-check silently,
    // keeping the workspace on screen instead of swapping it for the "Verifying session" loader.
    if (!get().isAuthenticated) set({ isLoading: true });
    try {
      if (CRM_SSO_ENABLED) {
        await adoptCrmSession(set, get);
        return;
      }
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

type SetState = (partial: Partial<AuthState>) => void;

/** Single sign-on: the CRM's session is the only source; this app's stored copy just follows it. */
async function adoptCrmSession(set: SetState, get: () => AuthState) {
  const crm = await readCrmSession();
  if (!crm) {
    if (get().token || (await authService.getSession())) await authService.clearSession();
    set({ user: null, company: null, token: null, isAuthenticated: false, accessibleForms: null, formRights: null });
    return;
  }
  clearCrmRedirectMark();
  const stored = await authService.getSession();
  if (stored?.token !== crm.token) await authService.setSession(crm);
  // A different sign-in (another user / company) has different menu rights.
  const switched = get().token !== null && get().token !== crm.token;
  set({
    user: crm.user as unknown as User,
    company: crm.company,
    token: crm.token,
    isAuthenticated: true,
    ...(switched ? { accessibleForms: null, formRights: null } : {}),
  });
}

// Signed out (or expired) in a CRM tab: this app's session ended with it.
if (CRM_SSO_ENABLED) {
  onCrmSessionEnd(() => {
    // Show the existing timeout prompt for sign-outs from CRM or another tab.
    // The prompt's OK action clears Task's local session and redirects to CRM login.
    if (useAuthStore.getState().isAuthenticated) useAuthStore.setState({ isSessionTimeoutOpen: true });
  });
}
