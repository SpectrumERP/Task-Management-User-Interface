import { useState } from 'react';
import { ReportFilter } from '@/components/report/ReportFilter';
import { ReportTable } from '@/components/report/ReportTable';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';

export default function ReportPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1);
  const { isHideType } = useSettings();
  const handleApplyFilters = async (filters: any) => {
    setIsLoading(true);
    try {
      let searchParamsPascal: any = {};
      console.log("show Sub-tasks", filters)
      if (filters.companyNo) {
        searchParamsPascal = {
          Company: filters.companyNo ? Number(filters.companyNo) : companyNo,
        };
      }


      if (filters.operTaskStatusNo) searchParamsPascal.Status = Number(filters.operTaskStatusNo);
      if (filters.operTaskPriorityNo) searchParamsPascal.Priority = Number(filters.operTaskPriorityNo);
      if (!isHideType && filters.operTaskTypeNo) searchParamsPascal.Type = Number(filters.operTaskTypeNo);
      if (filters.operTaskCategoryNo) searchParamsPascal.Category = Number(filters.operTaskCategoryNo);
      if (filters.operTaskLocationNo) searchParamsPascal.Location = Number(filters.operTaskLocationNo);
      if (filters.originatorNo) searchParamsPascal.Originator = Number(filters.originatorNo);

      if (filters.userIds && filters.userIds.length > 0 && !filters.userIds.includes('All')) {
        searchParamsPascal.User = filters.userIds.join(',');
      }

      if (filters.dateRange?.from) {
        searchParamsPascal.StartDate = format(filters.dateRange.from, 'yyyy-MM-dd');
      }
      if (filters.dateRange?.to) {
        searchParamsPascal.EndDate = format(filters.dateRange.to, 'yyyy-MM-dd');
      }
      if (filters.DateOnFilter) {
        searchParamsPascal.DateOnFilter = Number(filters.DateOnFilter);
      }

      if (filters.showSubtasks) {
        searchParamsPascal.ShowSubTask = filters.showSubtasks;
      }

      const response = await apiService.get<any>('/api/crm/tasks/progress-flow-report', {
        params: searchParamsPascal
      });

      if (response && response.data) {
        setReportData(response.data);
      } else if (Array.isArray(response)) {
        setReportData(response);
      } else {
        setReportData([]);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <ReportFilter onApply={handleApplyFilters} />
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-slate-500 font-medium">Loading report...</div>
      ) : (
        <ReportTable data={reportData} />
      )}
    </div>
  );
}
