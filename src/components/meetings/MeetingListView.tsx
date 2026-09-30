import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ClipboardList,
  Edit2,
  Plus,
  Download,
  Search,
  RotateCcw,
  Send,
  Calendar as CalendarIcon,
  Building2,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';
import { exportMeetingReportToExcel } from '@/utils/exportToExcel';
import { ActionTip, TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { SortableHeader, sortHeaderCellProps, usePagedTableSort } from '@/components/shared/useTableSort';
import { formatUtcScheduleLine, formatUtcDateTime, toUtcMs } from '@/lib/dateTime';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { cn } from '@/lib/utils';
import {
  canDeleteMeetingNote,
  isMinutesSendStatusAllowed,
  readLastMinutesSentAt,
} from '@/lib/meetingMinutesShare';

interface MeetingListViewProps {
  onMeetingClick?: (meetingNotesNo: number) => void;
}

// Dynamic pills are constructed from API data.
// We preserve this type for reference, but it will be dynamic.
type StatusPill = { id: string; label: string };

function meetingStatusBadgeClass(statusName?: string | null) {
  const n = String(statusName || '').toLowerCase();
  if (n.includes('authori') || n.includes('final') || n.includes('sent')) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
  if (n.includes('release')) {
    return 'bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30';
  }
  if (n.includes('initial') || n.includes('draft')) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
  return 'bg-[var(--tm-muted)] text-slate-400 border-[var(--tm-border)]';
}

function formatScheduleLine(value?: string | null) {
  return formatUtcScheduleLine(value);
}

export function MeetingListView({ onMeetingClick }: MeetingListViewProps) {
  const navigate = useNavigate();
  const { company: authCompanies } = useAuthStore();
  const companyNoStr =
    authCompanies?.[0]?.CompanyNo?.toString() ||
    authCompanies?.[0]?.companyNo?.toString() ||
    '1';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingStatuses, setMeetingStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [filterTitle, setFilterTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { isSave, isUpdate, isDelete } = useFormRights(1559);

  const fetchMeetingFills = async () => {
    try {
      const fillRes = await apiService.get<any>(
        `/api/crm/meeting-notes/fill-values?companyNo=${companyNoStr}`
      );
      if (fillRes?.data?.statuses) {
        setMeetingStatuses(fillRes.data.statuses);
      } else if (fillRes?.statuses) {
        setMeetingStatuses(fillRes.statuses);
      }
    } catch (error) {
      console.error('Failed to fetch meeting fills:', error);
    }
  };

  const fetchMeetings = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(
        `/api/crm/meeting-notes/search-data?CompanyNo=${companyNoStr}`
      );
      if (response && response.data) {
        setMeetings(response.data);
      } else if (Array.isArray(response)) {
        setMeetings(response);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setLoadError(true);
      setMeetings([]);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to load meetings.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchMeetingFills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyNoStr]);

  const dynamicStatusPills = useMemo(() => {
    const defaultPills: StatusPill[] = [{ id: 'all', label: 'All' }];
    const apiPills: StatusPill[] = meetingStatuses.map((s) => ({
      id: s.statusName,
      label: s.statusName,
    }));
    return [...defaultPills, ...apiPills];
  }, [meetingStatuses]);

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((m) => {
        let match = true;
        if (filterTitle && !m.meetingTitle?.toLowerCase().includes(filterTitle.toLowerCase())) {
          match = false;
        }
        if (
          filterStatus &&
          filterStatus !== 'all' &&
          !m.statusName?.toLowerCase().includes(filterStatus.toLowerCase())
        ) {
          match = false;
        }
        if (dateRange?.from) {
          if (!m.meetingStartDateTime || new Date(m.meetingStartDateTime) < dateRange.from) {
            match = false;
          }
        }
        if (dateRange?.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (!m.meetingEndDateTime || new Date(m.meetingEndDateTime) > toDate) {
            match = false;
          }
        }
        return match;
      }),
    [meetings, filterTitle, filterStatus, dateRange]
  );

  const numberedMeetings = useMemo(
    () => filteredMeetings.map((m, index) => ({ ...m, _sr: index + 1 })),
    [filteredMeetings]
  );

  const getMeetingSortValue = useCallback((row: any, key: string) => {
    switch (key) {
      case 'srNo': {
        const n = Number(row._sr ?? NaN);
        return Number.isFinite(n) ? n : 0;
      }
      case 'meetingTitle':
        return row.meetingTitle ?? '';
      case 'meetingTypeName':
        return row.meetingTypeName ?? '';
      case 'meetingCategoryName':
        return row.meetingCategoryName ?? '';
      case 'companyName':
        return row.companyName ?? '';
      case 'meetingStartDateTime': {
        const t = toUtcMs(row.meetingStartDateTime);
        return t ?? row.meetingStartDateTime ?? '';
      }
      case 'meetingEndDateTime': {
        const t = toUtcMs(row.meetingEndDateTime);
        return t ?? row.meetingEndDateTime ?? '';
      }
      case 'statusName':
        return row.statusName || '';
      case 'createdBy':
        return row.createdBy?.printingName || row.createdBy?.displayName || row.createdByName || '';
      case 'createdDate': {
        const t = toUtcMs(row.createdDate || row.createdOn);
        return t ?? row.createdDate ?? row.createdOn ?? '';
      }
      default:
        return (row as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const {
    sortCol,
    sortDesc,
    handleSort,
    pageRows: sortedMeetings,
    totalItems,
    totalPages,
    safePage,
    startIndex,
    endIndex,
  } = usePagedTableSort(numberedMeetings, getMeetingSortValue, {
    defaultKey: 'srNo',
    defaultDesc: false,
    page: currentPage,
    pageSize: itemsPerPage,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredMeetings]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(filterTitle || filterStatus !== 'all' || dateRange);

  const clearFilters = () => {
    setFilterTitle('');
    setFilterStatus('all');
    setDateRange(undefined);
  };

  const openMeeting = (meeting: any, opts?: { sendMinutes?: boolean }) => {
    const id = meeting.meetingNotesNo || meeting.id;
    if (onMeetingClick && !opts?.sendMinutes) {
      onMeetingClick(id);
      return;
    }
    navigate(`/meetings/${id}`, {
      state: opts?.sendMinutes ? { openSendMinutes: true } : undefined,
    });
  };

  const requestDelete = (meeting: any) => {
    const status = meeting.statusName || '';
    const gate = canDeleteMeetingNote(isDelete, status);
    if (!gate.allowed) {
      toast.error(gate.reason || 'You cannot delete this meeting note.');
      return;
    }
    const id = Number(meeting.meetingNotesNo || meeting.id);
    if (!id) return;
    setDeleteTargetId(id);
    setDeleteTargetLabel(meeting.meetingTitle || null);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await apiService.delete('/api/crm/meeting-notes/delete', {
        params: { meetingNotesNo: String(deleteTargetId) },
      });
      toast.success('Meeting note deleted');
      setMeetings((prev) =>
        prev.filter((m) => Number(m.meetingNotesNo || m.id) !== deleteTargetId)
      );
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to delete meeting note.'));
      }
    } finally {
      setDeleteOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetLabel(null);
    }
  };

  if (isLoading && meetings.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-10">
        <BrandLoader size="sm" message="Loading meetings" />
      </div>
    );
  }

  if (loadError) {
    return (
      <LoadErrorState
        title="Failed to load meetings"
        description="Could not load meeting notes. Retry uses the same company filter."
        onRetry={fetchMeetings}
      />
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="h-full min-h-0 flex flex-col bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <EmptyState
          className="flex-1"
          icon={ClipboardList}
          title="No meeting notes yet"
          description="Capture discussions, attendees, and minutes in one place — then send MoM when ready."
          actions={
            isSave ? (
              <Button
                onClick={() => navigate('/meetings/new')}
                className="h-10 px-5 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold shadow-sm shadow-brand/20"
              >
                <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.4} />
                New Meeting Note
              </Button>
            ) : null
          }
        />
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight truncate">Meeting Notes</h1>
            <PageGuideButton guideKey="meetings" />
          </div>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">
            Review meetings, update status, and send minutes to attendees.
          </p>
        </div>
        {isSave && (
          <Button
            data-page-tour="meeting-create"
            onClick={() => navigate('/meetings/new')}
            className="shrink-0 h-10 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold shadow-sm shadow-brand/20 gap-1.5 px-4"
          >
            <Plus size={15} strokeWidth={2.4} />
            <span className="hidden sm:inline">New Meeting</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="shrink-0 rounded-[14px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] p-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-0" data-page-tour="meeting-title-filter">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <Input
              placeholder="Search by title…"
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              className="h-10 pl-9 rounded-[10px] bg-[var(--tm-elevated)]/50 border-[var(--tm-border)] text-xs"
            />
          </div>

          <div
            data-page-tour="meeting-status-filter"
            className="flex items-center gap-1 p-1 rounded-[10px] border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)]/40 overflow-x-auto"
          >
            {dynamicStatusPills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setFilterStatus(pill.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  'h-8 px-3 rounded-[8px] text-[11px] font-semibold whitespace-nowrap transition-colors',
                  filterStatus === pill.id
                    ? 'bg-[#0EA5E9] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)]'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div data-page-tour="meeting-date-filter" className="w-full lg:w-[240px] shrink-0">
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0" data-page-tour="meeting-clear-filters">
            {hasActiveFilters ? (
              <ActionTip label="Clear filters">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="h-10 rounded-[10px] px-3 text-xs font-semibold border-[var(--tm-border)] text-slate-300 gap-1.5"
                >
                  <RotateCcw size={13} />
                  Clear
                </Button>
              </ActionTip>
            ) : null}
          </div>
        </div>
      </Card>

      {filteredMeetings.length === 0 ? (
        <Card className="flex-1 min-h-[220px] bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-2xl overflow-hidden">
          <EmptyState
            icon={ClipboardList}
            title="No meetings match these filters"
            description="Try another title, status, or date — or clear filters to see everything."
            compact
            actions={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  className="h-9 px-4 rounded-lg text-xs font-semibold border-[var(--tm-border)] gap-1.5"
                  onClick={clearFilters}
                >
                  <RotateCcw size={13} />
                  Clear filters
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-1 shrink-0">
            <p className="text-[11px] font-semibold text-slate-500">
              Showing{' '}
              <span className="text-slate-300 tabular-nums">{totalItems}</span>
              {hasActiveFilters ? (
                <span className="text-slate-500"> of {meetings.length}</span>
              ) : null}{' '}
              meeting{totalItems === 1 ? '' : 's'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMeetingReportToExcel(numberedMeetings, 'MeetingNotes.csv')}
              className="h-8 px-3 text-[11px] font-semibold gap-1.5 rounded-[8px] border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
            >
              <Download size={13} />
              Export CSV
            </Button>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-2">
            {sortedMeetings.map((meeting) => {
              const status = meeting.statusName || '—';
              const start = formatScheduleLine(meeting.meetingStartDateTime);
              const canSend = isMinutesSendStatusAllowed(status);
              const deleteGate = canDeleteMeetingNote(isDelete, status);
              const id = meeting.meetingNotesNo || meeting.id;
              const lastSent = id ? readLastMinutesSentAt(Number(id)) : null;

              return (
                <div
                  key={id}
                  className="rounded-[14px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] p-3.5 shadow-sm"
                >
                  <button type="button" onClick={() => openMeeting(meeting)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <TruncatedText
                          text={meeting.meetingTitle || 'Untitled meeting'}
                          className="text-sm font-semibold text-slate-100"
                        />
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {[meeting.meetingTypeName, meeting.meetingCategoryName]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold',
                          meetingStatusBadgeClass(status)
                        )}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <CalendarIcon size={11} className="shrink-0 text-[#0EA5E9]" />
                        <span className="truncate">
                          {start.date} {start.time}
                        </span>
                      </span>
                      {meeting.companyName ? (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <Building2 size={11} className="shrink-0" />
                          <span className="truncate">{meeting.companyName}</span>
                        </span>
                      ) : null}
                    </div>
                    {lastSent ? (
                      <p className="mt-1.5 text-[10px] text-slate-500">
                        Minutes sent {formatUtcDateTime(lastSent)}
                      </p>
                    ) : null}
                  </button>
                  <div className="mt-3 pt-2.5 border-t border-[var(--tm-border)]/60 flex items-center justify-end gap-0.5">
                    {canSend ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-[8px] text-[11px] font-semibold text-[#0EA5E9] hover:!bg-transparent gap-1"
                        onClick={() => openMeeting(meeting, { sendMinutes: true })}
                      >
                        <Send size={13} />
                        Send
                      </Button>
                    ) : null}
                    {isUpdate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-[8px] text-[11px] font-semibold text-slate-300 hover:text-[#0EA5E9] hover:!bg-transparent gap-1"
                        onClick={() => openMeeting(meeting)}
                      >
                        <Edit2 size={13} />
                        Edit
                      </Button>
                    ) : null}
                    {isDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!deleteGate.allowed}
                        title={deleteGate.allowed ? 'Delete meeting note' : deleteGate.reason}
                        className="h-8 rounded-[8px] text-[11px] font-semibold text-slate-400 hover:text-red-400 hover:!bg-transparent gap-1 disabled:opacity-40 disabled:pointer-events-auto"
                        onClick={() => requestDelete(meeting)}
                      >
                        <Trash2 size={13} />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card
            data-page-tour="meeting-table"
            className="hidden md:flex flex-1 min-h-0 flex-col overflow-hidden border-[var(--tm-border)]/70 rounded-[14px] bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)]"
          >
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="tm-data-table w-full text-sm text-left table-fixed">
                <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                  <tr>
                    <th
                      className="tm-col-sr tm-col-id px-2 py-2.5 border-r border-[var(--tm-border)] cursor-pointer"
                      {...sortHeaderCellProps('srNo', handleSort)}
                    >
                      <SortableHeader
                        label="Sr. No."
                        sortKey="srNo"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        className="pr-1"
                      />
                    </th>
                    <th className="w-[20%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('meetingTitle', handleSort)}>
                      <SortableHeader
                        label="Title"
                        sortKey="meetingTitle"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[12%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('meetingTypeName', handleSort)}>
                      <SortableHeader
                        label="Type"
                        sortKey="meetingTypeName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[12%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('meetingCategoryName', handleSort)}>
                      <SortableHeader
                        label="Category"
                        sortKey="meetingCategoryName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[10%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('companyName', handleSort)}>
                      <SortableHeader
                        label="Company"
                        sortKey="companyName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[12%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('meetingStartDateTime', handleSort)}>
                      <SortableHeader
                        label="Schedule"
                        sortKey="meetingStartDateTime"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[12%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('createdBy', handleSort)}>
                      <SortableHeader
                        label="Created By"
                        sortKey="createdBy"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[11%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('createdDate', handleSort)}>
                      <SortableHeader
                        label="Created Date"
                        sortKey="createdDate"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[9%] px-3 py-2.5 border-r border-[var(--tm-border)] overflow-visible cursor-pointer" {...sortHeaderCellProps('statusName', handleSort)}>
                      <SortableHeader
                        label="Status"
                        sortKey="statusName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="tm-col-actions w-[84px] px-1.5 py-2.5 pr-2.5 text-right sticky right-0 z-40 bg-[var(--tm-elevated)] border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.12)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMeetings.map((meeting) => {
                    const status = meeting.statusName || '—';
                    const start = formatScheduleLine(meeting.meetingStartDateTime);
                    const end = formatScheduleLine(meeting.meetingEndDateTime);
                    const deleteGate = canDeleteMeetingNote(isDelete, status);
                    const id = meeting.meetingNotesNo || meeting.id;
                    const lastSent = id ? readLastMinutesSentAt(Number(id)) : null;

                    return (
                      <tr
                        key={id}
                        onClick={() => openMeeting(meeting)}
                        className="border-b border-[var(--tm-border)] group hover:bg-[var(--tm-muted)]/60 transition-colors cursor-pointer"
                      >
                        <td className="tm-col-sr tm-col-id px-2 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle">
                          <span className="tabular-nums">
                            {meeting._sr}
                          </span>
                        </td>
                        <td className="tm-col-primary px-3 py-2.5 border-r border-[var(--tm-border)] align-middle min-w-0">
                          <TruncatedText
                            text={meeting.meetingTitle || '—'}
                            className="font-medium text-slate-50"
                          />
                          {lastSent ? (
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Sent {formatUtcDateTime(lastSent)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.meetingTypeName || '—'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.meetingCategoryName || '—'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.companyName || '—'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                          <div className="text-[11px] leading-snug">
                            <p className="font-medium text-slate-50">{start.date}</p>
                            <p className="text-slate-500">
                              {start.time}
                              {end.time ? ` – ${end.time}` : ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.createdBy?.printingName || meeting.createdBy?.displayName || meeting.createdByName || '—'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.createdDate || meeting.createdOn ? formatUtcDateTime(meeting.createdDate || meeting.createdOn) : '—'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle">
                          <span
                            className={cn(
                              'inline-flex max-w-full items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold truncate',
                              meetingStatusBadgeClass(status)
                            )}
                            title={status}
                          >
                            {status}
                          </span>
                        </td>
                        <td
                          className="px-1.5 py-2.5 pr-2.5 align-middle text-right sticky right-0 z-10 tm-col-actions tm-sticky-cell backdrop-blur-md border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-0">
                            {/* Not Needed as of now */}
                            {/* {canSend ? (
                              <ActionTip label="Send minutes">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Send minutes"
                                  onClick={() => openMeeting(meeting, { sendMinutes: true })}
                                  className="h-7 w-7 rounded-[6px] text-[#0EA5E9] hover:!bg-transparent"
                                >
                                  <Send size={13} strokeWidth={2.25} />
                                </Button>
                              </ActionTip>
                            ) : null} */}
                            {isUpdate ? (
                              <ActionTip label="Edit">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Edit meeting"
                                  onClick={() => openMeeting(meeting)}
                                  className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:!bg-transparent"
                                >
                                  <Edit2 size={13} strokeWidth={2.5} />
                                </Button>
                              </ActionTip>
                            ) : null}
                            {isDelete ? (
                              <ActionTip
                                label={deleteGate.allowed ? 'Delete' : deleteGate.reason || 'Cannot delete'}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete meeting"
                                  disabled={!deleteGate.allowed}
                                  onClick={() => requestDelete(meeting)}
                                  className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:!bg-transparent disabled:opacity-40"
                                >
                                  <Trash2 size={13} strokeWidth={2.25} />
                                </Button>
                              </ActionTip>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {totalItems > 0 && (
            <MasterPaginationBar
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      <MasterDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteTargetId(null);
            setDeleteTargetLabel(null);
          }
        }}
        onConfirm={() => void confirmDelete()}
        recordName={deleteTargetLabel}
        entityLabel="meeting note"
      />
    </div>
  );
}
