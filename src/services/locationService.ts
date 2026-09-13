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

/** Closed-field label: Location · City, State (Country optional). */
export function formatLocationDisplayLabel(
  loc: Partial<LocationResponse> | null | undefined,
  opts?: { includeCountry?: boolean }
): string {
  if (!loc) return '';
  const name = String(loc.operLocationName || '').trim();
  const city = String(loc.cityName || '').trim();
  const state = String(loc.stateName || '').trim();
  const country = String(loc.countryName || '').trim();

  const cityState = [city, state].filter(Boolean).join(', ');
  const parts: string[] = [];
  if (name) parts.push(name);
  if (cityState && cityState.toLowerCase() !== name.toLowerCase()) {
    parts.push(cityState);
  } else if (!name && cityState) {
    parts.push(cityState);
  }
  if (opts?.includeCountry && country) {
    const already = parts.join(' ').toLowerCase();
    if (!already.includes(country.toLowerCase())) parts.push(country);
  }
  return parts.join(' · ');
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
