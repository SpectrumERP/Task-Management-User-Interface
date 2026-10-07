import { apiService } from './apiService';

export interface LocationResponse {
  operLocationNo: number;
  code: string;
  operLocationName: string;
  address: string;
  countryNo: number;
  countryName: string;
  stateNo: number;
  stateName: string;
  cityNo: number;
  cityName: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Display label for a task location — the location master only manages the name. */
export function formatLocationDisplayLabel(loc: Partial<LocationResponse> | null | undefined): string {
  return String(loc?.operLocationName || '').trim();
}

export const locationService = {
  searchLocations: async (keyword: string): Promise<LocationResponse[]> => {
    try {
      const response = await apiService.get<ApiResponse<LocationResponse[]>>('/api/master/task-locations/fill-location-combo', {
        params: { KeywordSearch: keyword }
      });

      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }
};
