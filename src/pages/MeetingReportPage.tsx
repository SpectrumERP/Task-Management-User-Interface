import { useState } from 'react';
import { MeetingReportFilter } from '@/components/report/MeetingReportFilter';
import { MeetingReportTable } from '@/components/report/MeetingReportTable';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function MeetingReportPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const handleApplyFilters = async (filters: any) => {
    setIsLoading(true);
    try {
      const searchParamsPascal: any = {};

      searchParamsPascal.CompanyNo = filters.company ? Number(filters.company) : companyNo;

      if (filters.category) searchParamsPascal.MeetingCategory = Number(filters.category);
      if (filters.type) searchParamsPascal.MeetingType = Number(filters.type);
      if (filters.title) searchParamsPascal.Title = filters.title;
      if (filters.location) searchParamsPascal.Location = Number(filters.location);
      if (filters.mode) searchParamsPascal.MeetingModelNo = filters.mode;

      if (filters.internalUser) searchParamsPascal.UserNo = filters.internalUser;
      if (filters.internalEmployee) searchParamsPascal.EmpNo = filters.internalEmployee;
      if (filters.businessEntity)
        searchParamsPascal.BusinessEntityNo = Number(filters.businessEntity);
      if (filters.externalUser) searchParamsPascal.ParticipantsName = filters.externalUser;
      if (filters.isActionTaken !== false)
        searchParamsPascal.IsActionTaken = filters.isActionTaken;
      if (filters.isAttachedDocument !== false)
        searchParamsPascal.IsAttachedDocument = filters.isAttachedDocument;
      if (filters.createdBy) searchParamsPascal.CreatedByNo = filters.createdBy;
      if (filters.status) searchParamsPascal.Status = filters.status;

      if (filters.meetingDateRange?.from) {
        searchParamsPascal.MeetingStartDate = format(
          filters.meetingDateRange.from,
          'yyyy-MM-dd'
        );
      }
      if (filters.meetingDateRange?.to) {
        searchParamsPascal.MeetingEndDate = format(filters.meetingDateRange.to, 'yyyy-MM-dd');
      }

      if (filters.createdDateRange?.from) {
        searchParamsPascal.FromCreatedDate = format(
          filters.createdDateRange.from,
          'yyyy-MM-dd'
        );
      }
      if (filters.createdDateRange?.to) {
        searchParamsPascal.ToCreatedDate = format(filters.createdDateRange.to, 'yyyy-MM-dd');
      }

      const response = await apiService.get<any>('/api/crm/meeting-notes/report', {
        params: searchParamsPascal,
      });

      if (response && response.data) {
        setReportData(response.data);
      } else if (Array.isArray(response)) {
        setReportData(response);
      } else {
        setReportData([]);
      }
    } catch (error) {
      console.error('Failed to fetch meeting report data:', error);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell-scroll bg-[var(--tm-page)]">
      <div className="shrink-0">
        <MeetingReportFilter onApply={handleApplyFilters} />
      </div>
      <div className="relative flex min-h-[280px] flex-1 basis-0 flex-col overflow-hidden">
        <MeetingReportTable data={reportData} />
        {isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-[8px] bg-[var(--tm-surface)]/75 backdrop-blur-[1px] text-slate-500 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-[#0EA5E9]" />
            Loading report...
          </div>
        ) : null}
      </div>
    </div>
  );
}
