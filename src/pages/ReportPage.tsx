import { useState } from 'react';
import { ReportFilter } from '@/components/report/ReportFilter';
import { ReportTable } from '@/components/report/ReportTable';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { toDateOnlyLocal } from '@/lib/dateTime';
import { useSettings } from '@/hooks/useSettings';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';

export default function ReportPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lastFilters, setLastFilters] = useState<any>(null);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1);
  const { isHideType } = useSettings();
  const handleApplyFilters = async (filters: any) => {
    setIsLoading(true);
    setLoadError(false);
    setLastFilters(filters);
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
        searchParamsPascal.StartDate = toDateOnlyLocal(filters.dateRange.from);
      }
      if (filters.dateRange?.to) {
        searchParamsPascal.EndDate = toDateOnlyLocal(filters.dateRange.to);
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
      setLoadError(true);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to load report'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell bg-[var(--tm-page)]">
      <AppBreadcrumbBar
        items={[
          { label: 'Reports' },
          { label: 'MIS Task Report', current: true },
        ]}
        guideKey="task-report"
        bleed
        data-page-tour="task-report-breadcrumb"
      />
      {/* CRM page band: title, then the report filters */}
      <div className="crm-band">
        <h1 className="crm-page-title text-slate-50 mb-3">MIS Task Report</h1>
        <ReportFilter onApply={handleApplyFilters} />
      </div>
      <div className="crm-bleed-x crm-bleed-b relative flex min-h-0 flex-1 basis-0 flex-col overflow-hidden pt-1">
        {loadError && !isLoading ? (
          <LoadErrorState
            title="Failed to load report"
            onRetry={() => lastFilters && handleApplyFilters(lastFilters)}
            className="flex-1 crm-pad-x"
          />
        ) : (
          <ReportTable data={reportData} />
        )}
        {isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[8px] bg-[var(--tm-surface)]/80 backdrop-blur-[1px]">
            <BrandLoader size="sm" message="Loading report" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
