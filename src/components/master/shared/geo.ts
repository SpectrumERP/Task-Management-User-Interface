import { apiService } from '@/services/apiService';

export const fetchStatesByCountry = async (countryNo: number | string) => {
  if (!countryNo) return [];
  try {
    const response = await apiService.get<any>(`/api/master/states/by-country/${countryNo}`);
    if (response) {
      return response.data || response || [];
    }
  } catch (error) {
    console.error(`Failed to fetch states for countryNo ${countryNo}:`, error);
  }
  return [];
};

export const fetchCitiesByState = async (stateNo: number | string) => {
  if (!stateNo) return [];
  try {
    const response = await apiService.get<any>(`/api/master/cities/by-state/${stateNo}`);
    if (response) {
      return response.data || response || [];
    }
  } catch (error) {
    console.error(`Failed to fetch cities for stateNo ${stateNo}:`, error);
  }
  return [];
};

/** Row returned by `/api/master/cities/fill-city-combo` */
export type CityComboRow = {
  cityNo?: string | number;
  cityName?: string;
  stateNo?: string | number;
  stateName?: string;
  countryNo?: string | number;
  countryName?: string;
};

/** Keyword city search across all states, optionally narrowed to one state. */
export const fetchCityCombo = async (
  keyword?: string,
  stateNo?: string | number | null
): Promise<CityComboRow[]> => {
  try {
    const response = await apiService.get<{ success: boolean; data: CityComboRow[] }>('/api/master/cities/fill-city-combo', {
      params: {
        ...(keyword ? { KeywordSearch: keyword } : {}),
        ...(stateNo ? { StateNo: String(stateNo) } : {}),
      },
    });
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to fetch cities:', error);
  }
  return [];
};
