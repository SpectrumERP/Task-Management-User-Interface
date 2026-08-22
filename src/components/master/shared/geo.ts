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
