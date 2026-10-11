import { apiService } from './apiService';
import { dbService } from './dbService';
import Cookies from 'js-cookie';

export interface LoginResponse {
  token: string;
  company: any[];
  user: any;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const COMPANY_KEY = 'auth_company';

export const authService = {
  async login(loginId: string, password: string): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/api/Auth/login', {
      loginId,
      password,
    });

    if (response.token) {
      await this.setSession(response);
    }

    return response;
  },

  async setSession(data: LoginResponse) {
    // Store token in cookies for session handling (non-encrypted cookie for browser middleware if needed)
    Cookies.set(TOKEN_KEY, data.token, { expires: 1 });
    
    // Store encrypted data in IndexedDB
    await dbService.setItem(TOKEN_KEY, data.token);
    await dbService.setItem(USER_KEY, data.user);
    await dbService.setItem(COMPANY_KEY, data.company);
  },

  async clearSession() {
    Cookies.remove(TOKEN_KEY);
    await dbService.clear();
  },

  async getSession() {
    const token = await dbService.getItem<string>(TOKEN_KEY);
    const user = await dbService.getItem<any>(USER_KEY);
    const company = await dbService.getItem<any[]>(COMPANY_KEY);

    if (token && user) {
      return {
        token,
        user,
        company: company || [],
      };
    }
    return null;
  },

  getTokenExpiry(token: string): number | null {
    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) return null;
      const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalized)) as { exp?: number };
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  },

  isTokenExpired(token: string): boolean {
    const expiresAt = this.getTokenExpiry(token);
    return expiresAt === null || expiresAt <= Date.now();
  }
};
