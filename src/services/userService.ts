import { apiService } from './apiService';

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

export const userService = {
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
