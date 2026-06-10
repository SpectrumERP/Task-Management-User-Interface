import { useState, useCallback } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { MasterConfig } from './types';
import { toast } from 'sonner';

export function useMasterLogic(config: MasterConfig) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const authCompanies = useAuthStore((state: any) => state.company);
  const companyNoVal = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<any>(config.endpoints.search, {
        params: {
          companyNo: String(companyNoVal),
          pageNo: "1",
          pageSize: "1000"
        }
      });
      if (response && response.data) {
        let items = response.data;
        if (config.transformAfterLoad) {
          items = items.map(config.transformAfterLoad);
        }
        setData(items);
      }
    } catch (error) {
      console.error(`Failed to fetch ${config.title}`, error);
      toast.error(`Failed to fetch ${config.title}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, companyNoVal]);

  const fetchSingle = useCallback(async (id: string | number) => {
    try {
      const response = await apiService.get<any>(`${config.endpoints.load}/${id}?companyNo=${companyNoVal}`);
      if (response && response.data) {
        let item = Array.isArray(response.data) ? response.data[0] : response.data;
        if (config.transformAfterLoad && item) {
          item = config.transformAfterLoad(item);
        }
        return item;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load ${config.title}`, error);
      toast.error(`Failed to load ${config.title}`);
      throw error;
    }
  }, [config, companyNoVal]);

  const saveData = useCallback(async (payload: any) => {
    try {
      const finalPayload = config.transformBeforeSave ? config.transformBeforeSave(payload) : payload;
      
      const response = await apiService.post(`${config.endpoints.save}?companyNo=${companyNoVal}`, finalPayload);
      toast.success(`${config.title} saved successfully`);
      return response;
    } catch (error) {
      console.error(`Failed to save ${config.title}`, error);
      toast.error(`Failed to save ${config.title}`);
      throw error;
    }
  }, [config, companyNoVal]);

  const deleteData = useCallback(async (id: string | number) => {
    try {
      await apiService.delete(`${config.endpoints.delete}?companyNo=${companyNoVal}`, {
        params: { [config.idField]: String(id) } // Cast to string to fix TS error
      });
      toast.success(`${config.title} deleted successfully`);
      fetchData();
    } catch (error) {
      console.error(`Failed to delete ${config.title}`, error);
      toast.error(`Failed to delete ${config.title}`);
      throw error;
    }
  }, [config, companyNoVal, fetchData]);

  return {
    data,
    isLoading,
    fetchData,
    fetchSingle,
    saveData,
    deleteData
  };
}
