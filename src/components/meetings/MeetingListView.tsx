import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
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
import { format } from 'date-fns';
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
import { SortableHeader, useTableSort } from '@/components/shared/useTableSort';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { cn } from '@/lib/utils';
import {
  canDeleteMeetingNote,
  isMinutesSendStatusAllowed,
  readLastMinutesSentAt,
} from '@/lib/meetingMinutesShare';

interface MeetingListViewProps {
  onMeetingClick?: (meetingNotesNo: number) => void;
}

const STATUS_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'initial', label: 'Initial' },
  { id: 'release', label: 'Release' },
  { id: 'authorized', label: 'Authorized' },
] as const;

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
  if (!value) return { date: '—', time: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: format(d, 'MMM dd, yyyy'),
    time: format(d, 'h:mm a'),
  };
}

export function MeetingListView({ onMeetingClick }: MeetingListViewProps) {
  const navigate = useNavigate();
  const { company: authCompanies } = useAuthStore();
  const companyNoStr =
    authCompanies?.[0]?.CompanyNo?.toString() ||
    authCompanies?.[0]?.companyNo?.toString() ||
    '1';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [filterTitle, setFilterTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const { isSave, isUpdate, isDelete } = useFormRights(1559);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyNoStr]);

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
          !m.docStatusName?.toLowerCase().includes(filterStatus.toLowerCase())
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

  const getMeetingSortValue = useCallback((row: any, key: string) => {
    switch (key) {
      case 'meetingTitle':
        return row.meetingTitle ?? '';
      case 'meetingTypeName':
        return row.meetingTypeName ?? '';
      case 'meetingCategoryName':
        return row.meetingCategoryName ?? '';
      case 'companyName':
        return row.companyName ?? '';
      case 'meetingStartDateTime': {
        const raw = row.meetingStartDateTime;
        if (!raw) return '';
        const t = new Date(raw).getTime();
        return Number.isNaN(t) ? raw : t;
      }
      case 'meetingEndDateTime': {
        const raw = row.meetingEndDateTime;
        if (!raw) return '';
        const t = new Date(raw).getTime();
        return Number.isNaN(t) ? raw : t;
      }
      case 'docStatusName':
        return row.docStatusName || row.statusName || '';
      default:
        return (row as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const { sortCol, sortDesc, handleSort, sortedRows: sortedMeetings } = useTableSort(
    filteredMeetings,
    getMeetingSortValue,
    { defaultKey: 'meetingStartDateTime', defaultDesc: true }
  );

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
    const status = meeting.docStatusName || meeting.statusName || '';
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
        params: { meetingNotesNo: deleteTargetId },
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
      <Card className="h-full min-h-0 flex flex-col items-center justify-center px-6 bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
        <div className="h-14 w-14 rounded-2xl bg-[var(--tm-tint)] flex items-center justify-center mb-2.5">
          <ClipboardList className="text-[#0EA5E9]" size={26} strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-slate-100 tracking-tight">No meeting notes yet</h3>
        <p className="text-slate-500 text-sm font-medium mt-0.5 max-w-sm text-center">
          Capture discussions, attendees, and minutes in one place — then send MoM when ready.
        </p>
        {isSave && (
          <Button
            onClick={() => navigate('/meetings/new')}
            className="mt-6 h-10 px-5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)]"
          >
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.4} />
            New Meeting Note
          </Button>
        )}
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
            className="shrink-0 h-10 rounded-[12px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)] gap-1.5 px-4"
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
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterStatus(pill.id)}
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
        <Card className="flex-1 min-h-[220px] flex flex-col items-center justify-center px-6 bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-2xl">
          <div className="h-12 w-12 rounded-2xl bg-[var(--tm-tint)] flex items-center justify-center mb-2.5">
            <ClipboardList className="text-[#0EA5E9]" size={22} strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
            No meetings match these filters
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-sm text-center">
            Try another title, status, or date — or clear filters to see everything.
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="mt-4 h-9 px-4 rounded-lg text-xs font-semibold border-[var(--tm-border)] gap-1.5"
              onClick={clearFilters}
            >
              <RotateCcw size={13} />
              Clear filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-1 shrink-0">
            <p className="text-[11px] font-semibold text-slate-500">
              Showing{' '}
              <span className="text-slate-300 tabular-nums">{sortedMeetings.length}</span>
              {hasActiveFilters ? (
                <span className="text-slate-500"> of {meetings.length}</span>
              ) : null}{' '}
              meeting{sortedMeetings.length === 1 ? '' : 's'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMeetingReportToExcel(sortedMeetings, 'MeetingNotes.csv')}
              className="h-8 px-3 text-[11px] font-semibold gap-1.5 rounded-[8px] border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
            >
              <Download size={13} />
              Export CSV
            </Button>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-2">
            {sortedMeetings.map((meeting) => {
              const status = meeting.docStatusName || meeting.statusName || '—';
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
                        Minutes sent {format(new Date(lastSent), 'MMM dd, h:mm a')}
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
                <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 font-semibold text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="w-12 px-3 py-2.5 pl-4">#</th>
                    <th className="w-[24%] px-3 py-2.5 overflow-visible">
                      <SortableHeader
                        label="Title"
                        sortKey="meetingTitle"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[16%] px-3 py-2.5 overflow-visible">
                      <SortableHeader
                        label="Type"
                        sortKey="meetingTypeName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[12%] px-3 py-2.5 overflow-visible">
                      <SortableHeader
                        label="Category"
                        sortKey="meetingCategoryName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[10%] px-3 py-2.5 overflow-visible">
                      <SortableHeader
                        label="Company"
                        sortKey="companyName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[14%] px-3 py-2.5 overflow-visible">
                      <SortableHeader
                        label="Schedule"
                        sortKey="meetingStartDateTime"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[11%] px-3 py-2.5 overflow-visible">
                      <SortableHeader
                        label="Status"
                        sortKey="docStatusName"
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="w-[84px] px-1.5 py-2.5 pr-2.5 text-right sticky right-0 z-40 bg-[var(--tm-elevated)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.12)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tm-border)]/80">
                  {sortedMeetings.map((meeting, index) => {
                    const status = meeting.docStatusName || meeting.statusName || '—';
                    const start = formatScheduleLine(meeting.meetingStartDateTime);
                    const end = formatScheduleLine(meeting.meetingEndDateTime);
                    const canSend = isMinutesSendStatusAllowed(status);
                    const deleteGate = canDeleteMeetingNote(isDelete, status);
                    const id = meeting.meetingNotesNo || meeting.id;
                    const lastSent = id ? readLastMinutesSentAt(Number(id)) : null;

                    return (
                      <tr
                        key={id}
                        onClick={() => openMeeting(meeting)}
                        className="group hover:bg-[var(--tm-muted)]/60 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-3 pl-4 align-middle">
                          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.meetingTitle || '—'}
                            className="text-xs font-semibold text-slate-100"
                          />
                          {lastSent ? (
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              Sent {format(new Date(lastSent), 'MMM dd, h:mm a')}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.meetingTypeName || '—'}
                            className="text-xs font-medium text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.meetingCategoryName || '—'}
                            className="text-xs font-medium text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <TruncatedText
                            text={meeting.companyName || '—'}
                            className="text-xs font-medium text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <div className="text-[11px] leading-snug">
                            <p className="font-semibold text-slate-200">{start.date}</p>
                            <p className="text-slate-500">
                              {start.time}
                              {end.time ? ` – ${end.time}` : ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
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
                          className="px-1.5 py-3 pr-2.5 align-middle text-right sticky right-0 z-10 tm-sticky-cell backdrop-blur-md border-l border-[var(--tm-border)]/70 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-0">
                            {canSend ? (
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
                            ) : null}
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
