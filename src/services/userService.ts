import { apiService } from './apiService';
import { asUserDetails, mapUserProfile } from '@/lib/userProfile';

export interface UserResponse {
  loginNo: number;
  loginId: string;
  printingName: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** One user's name + email by loginNo (cached per session; failures are not cached). */
const userBriefCache = new Map<number, Promise<{ name: string; email: string } | null>>();

export const userService = {
  getUserBrief: (loginNo: number): Promise<{ name: string; email: string } | null> => {
    const cached = userBriefCache.get(loginNo);
    if (cached) return cached;
    const promise = apiService
      .get<ApiResponse<unknown>>(`/api/security/users/load-data/${loginNo}`, { silent: true })
      .then((response) => {
        if (!response?.success) return null;
        const profile = mapUserProfile(asUserDetails(response.data));
        return { name: profile.name, email: profile.email };
      })
      .catch(() => {
        userBriefCache.delete(loginNo);
        return null;
      });
    userBriefCache.set(loginNo, promise);
    return promise;
  },

  searchUsers: async (keyword: string, _loginNo?: number): Promise<UserResponse[]> => {
    try {
      const response = await apiService.get<ApiResponse<UserResponse[]>>('/api/security/users', {
        params: {
          keywordSearch: keyword || 'a',
        }
      });

      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },
  getGroupMembers: async (userGroupNo: number): Promise<UserResponse[]> => {
    try {
      const response = await apiService.get<ApiResponse<UserResponse[]>>('/api/security/user-groups/users', {
        params: { userGroupNo: userGroupNo.toString() }
      });

      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching group members:', error);
      return [];
    }
  }
};
