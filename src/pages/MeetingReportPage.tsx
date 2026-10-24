import { useState } from 'react';
import { MeetingReportFilter } from '@/components/report/MeetingReportFilter';
import { MeetingReportTable } from '@/components/report/MeetingReportTable';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { toDateOnlyLocal } from '@/lib/dateTime';
import { SkeletonTable, SkeletonUpdating } from '@/components/ui/skeleton';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';

export default function MeetingReportPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lastFilters, setLastFilters] = useState<any>(null);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const handleApplyFilters = async (filters: any) => {
    setIsLoading(true);
    setLoadError(false);
    setLastFilters(filters);
    try {
      const searchParamsPascal: any = {};

      searchParamsPascal.CompanyNo = filters.company ? Number(filters.company) : companyNo;

      if (filters.category) searchParamsPascal.MeetingCategory = Number(filters.category);
      if (filters.type) searchParamsPascal.MeetingType = Number(filters.type);
      if (filters.title) searchParamsPascal.Title = filters.title;
      if (filters.location) searchParamsPascal.Location = Number(filters.location);
      if (filters.mode) searchParamsPascal.MeetingModelNo = filters.mode;

      // One participant filter → the matching report parameter.
      const participant = filters.participant;
      if (participant?.kind === 'user') searchParamsPascal.UserNo = participant.value;
      else if (participant?.kind === 'employee') searchParamsPascal.EmpNo = participant.value;
      else if (participant?.kind === 'businessEntity') searchParamsPascal.BusinessEntityNo = Number(participant.value);
      else if (participant?.kind === 'name') searchParamsPascal.ParticipantsName = participant.value;
      if (filters.isActionTaken !== false)
        searchParamsPascal.IsActionTaken = filters.isActionTaken;
      if (filters.isAttachedDocument !== false)
        searchParamsPascal.IsAttachedDocument = filters.isAttachedDocument;
      if (filters.createdBy) searchParamsPascal.CreatedByNo = filters.createdBy;
      if (filters.status) searchParamsPascal.Status = filters.status;

      if (filters.meetingDateRange?.from) {
        searchParamsPascal.MeetingStartDate = toDateOnlyLocal(filters.meetingDateRange.from);
      }
      if (filters.meetingDateRange?.to) {
        searchParamsPascal.MeetingEndDate = toDateOnlyLocal(filters.meetingDateRange.to);
      }

      if (filters.createdDateRange?.from) {
        searchParamsPascal.FromCreatedDate = toDateOnlyLocal(filters.createdDateRange.from);
      }
      if (filters.createdDateRange?.to) {
        searchParamsPascal.ToCreatedDate = toDateOnlyLocal(filters.createdDateRange.to);
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
      setLoadError(true);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to load meeting report'));
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
          { label: 'MIS Meeting Report', current: true },
        ]}
        guideKey="meeting-report"
        bleed
        data-page-tour="meeting-report-breadcrumb"
      />
      {/* CRM page band: title, then the report filters */}
      <div className="crm-band">
        <h1 className="crm-page-title text-slate-50 mb-3">MIS Meeting Report</h1>
        <MeetingReportFilter onApply={handleApplyFilters} />
      </div>
      <div className="crm-bleed-x crm-bleed-b relative flex min-h-0 flex-1 basis-0 flex-col overflow-hidden pt-1">
        {loadError && !isLoading ? (
          <LoadErrorState
            title="Failed to load meeting report"
            onRetry={() => lastFilters && handleApplyFilters(lastFilters)}
            className="flex-1 crm-pad-x"
          />
        ) : (
          <MeetingReportTable data={reportData} />
        )}
        {isLoading && reportData.length === 0 ? (
          <div className="absolute inset-0 z-20 overflow-hidden rounded-[8px] bg-[var(--tm-surface)] crm-pad-x">
            <SkeletonTable rows={12} columns={[14, 22, 12, 12, 12, 12]} label="Loading report" />
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 z-20 flex items-start justify-center rounded-[8px] bg-[var(--tm-surface)]/60 pt-16">
            <SkeletonUpdating label="Loading report" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
