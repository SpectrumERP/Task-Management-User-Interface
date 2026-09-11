import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { ClipboardList, Edit2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';

interface MeetingListViewProps {
  onMeetingClick?: (meetingNotesNo: number) => void;
}

export function MeetingListView({ onMeetingClick }: MeetingListViewProps) {
  const navigate = useNavigate();
  const { company: authCompanies } = useAuthStore();
  const companyNoStr = authCompanies?.[0]?.CompanyNo?.toString() || authCompanies?.[0]?.companyNo?.toString() || '1';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const { isSave, isUpdate } = useFormRights(1559);

  // Filter states
  const [filterTitle, setFilterTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date } | undefined>();

  const fetchMeetings = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/crm/meeting-notes/search-data?CompanyNo=${companyNoStr}`);
      if (response && response.data) {
        setMeetings(response.data);
      } else if (Array.isArray(response)) {
        setMeetings(response);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
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

  const filteredMeetings = meetings.filter(m => {
    let match = true;
    if (filterTitle && !m.meetingTitle?.toLowerCase().includes(filterTitle.toLowerCase())) match = false;
    if (filterStatus && filterStatus !== 'all' && !m.docStatusName?.toLowerCase().includes(filterStatus.toLowerCase())) match = false;
    if (dateRange?.from) {
      if (!m.meetingStartDateTime || new Date(m.meetingStartDateTime) < dateRange.from) match = false;
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      if (!m.meetingEndDateTime || new Date(m.meetingEndDateTime) > toDate) match = false;
    }
    return match;
  });

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
        <h3 className="text-base font-semibold text-slate-100 tracking-tight">No meeting notes found</h3>
        <p className="text-slate-500 text-sm font-medium mt-0.5 max-w-sm text-center">
          Create a new meeting note to get started.
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

  const hasActiveFilters = Boolean(filterTitle || filterStatus !== 'all' || dateRange);

  const openMeeting = (meeting: any) => {
    const id = meeting.meetingNotesNo || meeting.id;
    if (onMeetingClick) onMeetingClick(id);
    else navigate(`/meetings/${id}`);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl font-bold text-slate-100 truncate">Meeting Notes</h1>
          <PageGuideButton guideKey="meetings" />
        </div>
        {isSave && (
          <Button
            data-page-tour="meeting-create"
            onClick={() => navigate('/meetings/new')}
            className="shrink-0 bg-[#0EA5E9] hover:bg-[#0284C7] shadow-md shadow-[#0EA5E9]/20"
          >
            <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">New Meeting</span><span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Input
          data-page-tour="meeting-title-filter"
          placeholder="Filter by Title..."
          value={filterTitle}
          onChange={(e) => setFilterTitle(e.target.value)}
          className="bg-[var(--tm-surface)] rounded-lg"
        />
        <div data-page-tour="meeting-status-filter">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-[var(--tm-surface)] rounded-lg">
              <SelectValue placeholder="Filter by Status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="initial">Initial</SelectItem>
              <SelectItem value="release">Release</SelectItem>
              <SelectItem value="authorized">Authorized</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div data-page-tour="meeting-date-filter" className="sm:col-span-2 md:col-span-1">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="-mt-2"
          />
        </div>
        <div className="flex items-center" data-page-tour="meeting-clear-filters">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              className="text-slate-500 hover:text-slate-200 hover:bg-[var(--tm-muted)] rounded-lg h-9"
              onClick={() => {
                setFilterTitle('');
                setFilterStatus('all');
                setDateRange(undefined);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <Card className="flex-1 min-h-[220px] flex flex-col items-center justify-center px-6 bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-2xl">
          <div className="h-12 w-12 rounded-2xl bg-[var(--tm-tint)] flex items-center justify-center mb-2.5">
            <ClipboardList className="text-[#0EA5E9]" size={22} strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">No meetings match these filters</h3>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-sm text-center">
            Try adjusting title, status, or date range — or clear filters to see all notes.
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="mt-4 h-9 px-4 rounded-lg text-xs font-semibold border-[var(--tm-border)]"
              onClick={() => {
                setFilterTitle('');
                setFilterStatus('all');
                setDateRange(undefined);
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-2">
            {filteredMeetings.map((meeting) => (
              <button
                key={meeting.meetingNotesNo || meeting.id}
                type="button"
                onClick={() => openMeeting(meeting)}
                className="w-full text-left rounded-xl border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] p-3.5 shadow-sm hover:bg-[var(--tm-muted)]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100 truncate">{meeting.meetingTitle || 'Untitled meeting'}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                      {[meeting.meetingTypeName, meeting.meetingCategoryName].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${meeting.docStatusNo === 30 || meeting.docStatusName === 'Authorized' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--tm-muted)] text-slate-300'}`}>
                    {meeting.docStatusName || meeting.statusName || '—'}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-slate-500 truncate">
                    {meeting.meetingStartDateTime
                      ? format(new Date(meeting.meetingStartDateTime), 'MMM dd, yyyy h:mm a')
                      : 'No start time'}
                  </p>
                  {isUpdate ? (
                    <span
                      role="button"
                      tabIndex={0}
                      title="Edit"
                      aria-label="Edit meeting"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meetings/${meeting.meetingNotesNo || meeting.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/meetings/${meeting.meetingNotesNo || meeting.id}`);
                        }
                      }}
                    >
                      <Edit2 size={14} strokeWidth={2.5} />
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <Card data-page-tour="meeting-table" className="hidden md:block flex-1 overflow-auto border-[var(--tm-border)]/60 rounded-xl bg-[var(--tm-surface)]/80 backdrop-blur-sm shadow-sm">
            <table className="tm-data-table w-full text-sm text-left">
              <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-200 font-semibold text-xs tracking-wider shadow-[0_1px_0_rgba(14,165,233,0.08)]">
                <tr>
                  <th className="px-3 py-2">SrNo.</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Meeting Type</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Start Date & Time</th>
                  <th className="px-3 py-2">End Date & Time</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right sticky right-0 z-40 bg-[var(--tm-muted)]/90 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tm-border)]">
                {filteredMeetings.map((meeting, index) => (
                  <tr
                    key={meeting.meetingNotesNo || meeting.id}
                    onClick={() => openMeeting(meeting)}
                    className="group hover:bg-[var(--tm-muted)]/80 transition-colors cursor-pointer"
                  >
                    <td title={(index + 1).toString()} className="px-3 py-2 align-middle">
                      <span className="text-[11px] font-medium text-[#0EA5E9] whitespace-nowrap">
                        {index + 1 || '-'}
                      </span>
                    </td>
                    <td title={meeting.meetingTitle} className="px-3 py-2 align-middle">
                      <span className="text-xs font-semibold text-slate-100 truncate block max-w-[220px]">
                        {meeting.meetingTitle || '-'}
                      </span>
                    </td>
                    <td title={meeting.meetingTypeName} className="px-3 py-2 align-middle">
                      <span className="text-xs font-medium text-slate-200 truncate block max-w-[160px]">
                        {meeting.meetingTypeName || '-'}
                      </span>
                    </td>
                    <td title={meeting.meetingCategoryName} className="px-3 py-2 align-middle">
                      <span className="text-xs font-medium text-slate-200 truncate block max-w-[140px]">
                        {meeting.meetingCategoryName || '-'}
                      </span>
                    </td>
                    <td title={meeting.companyName} className="px-3 py-2 align-middle">
                      <span className="text-xs font-medium text-slate-200 truncate block max-w-[140px]">
                        {meeting.companyName || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-200">
                        {meeting.meetingStartDateTime ? format(new Date(meeting.meetingStartDateTime), 'MMM dd, yyyy h:mm a') : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-200">
                        {meeting.meetingEndDateTime ? format(new Date(meeting.meetingEndDateTime), 'MMM dd, yyyy h:mm a') : '-'}
                      </span>
                    </td>
                    <td title={meeting.docStatusName} className="px-3 py-2 align-middle whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meeting.docStatusNo === 30 || meeting.docStatusName === 'Authorized' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--tm-muted)] text-slate-200'}`}>
                        {meeting.docStatusName || meeting.statusName || '-'}
                      </span>
                    </td>
                    <td title={meeting.meetingTitle} className="px-3 py-2 align-middle text-right sticky right-0 z-10 tm-sticky-cell backdrop-blur-md border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                      {isUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          aria-label="Edit meeting"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/meetings/${meeting.meetingNotesNo || meeting.id}`);
                          }}
                          className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)] flex items-center justify-center transition-all duration-200"
                        >
                          <Edit2 size={14} strokeWidth={2.5} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
