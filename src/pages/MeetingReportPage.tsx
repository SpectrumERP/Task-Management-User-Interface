import { useState } from 'react';
import { MeetingReportFilter } from '@/components/report/MeetingReportFilter';
import { MeetingReportTable } from '@/components/report/MeetingReportTable';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';

export default function MeetingReportPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1);

  const handleApplyFilters = async (filters: any) => {
    setIsLoading(true);
    try {
      let searchParamsPascal: any = {};

      searchParamsPascal.CompanyNo = filters.company ? Number(filters.company) : companyNo;

      if (filters.category) searchParamsPascal.MeetingCategory = Number(filters.category);
      if (filters.type) searchParamsPascal.MeetingType = Number(filters.type);
      if (filters.title) searchParamsPascal.Title = filters.title;
      if (filters.location) searchParamsPascal.Location = Number(filters.location);
      if (filters.mode) searchParamsPascal.MeetingModelNo = filters.mode;

      if (filters.internalUser) searchParamsPascal.UserNo = filters.internalUser;
      if (filters.internalEmployee) searchParamsPascal.EmpNo = filters.internalEmployee;
      if (filters.businessEntity) searchParamsPascal.BusinessEntityNo = Number(filters.businessEntity);
      if (filters.externalUser) searchParamsPascal.ParticipantsName = filters.externalUser;
      if (filters.isActionTaken !== false) searchParamsPascal.IsActionTaken = filters.isActionTaken;
      if (filters.isAttachedDocument !== false) searchParamsPascal.IsAttachedDocument = filters.isAttachedDocument;
      if (filters.createdBy) searchParamsPascal.CreatedByNo = filters.createdBy;
      if (filters.status) searchParamsPascal.Status = filters.status;

      if (filters.meetingDateRange?.from) {
        searchParamsPascal.MeetingStartDate = format(filters.meetingDateRange.from, 'yyyy-MM-dd');
      }
      if (filters.meetingDateRange?.to) {
        searchParamsPascal.MeetingEndDate = format(filters.meetingDateRange.to, 'yyyy-MM-dd');
      }

      if (filters.createdDateRange?.from) {
        searchParamsPascal.FromCreatedDate = format(filters.createdDateRange.from, 'yyyy-MM-dd');
      }
      if (filters.createdDateRange?.to) {
        searchParamsPascal.ToCreatedDate = format(filters.createdDateRange.to, 'yyyy-MM-dd');
      }

      const response = await apiService.get<any>('/api/crm/meeting-notes/report', {
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
      console.error('Failed to fetch meeting report data:', error);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <MeetingReportFilter onApply={handleApplyFilters} />
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-slate-500 font-medium">Loading report...</div>
      ) : (
        <MeetingReportTable data={reportData} />
      )}
    </div>
  );
}
