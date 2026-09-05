import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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

interface MeetingListViewProps {
  onMeetingClick?: (meetingNotesNo: number) => void;
}

export function MeetingListView({ onMeetingClick }: MeetingListViewProps) {
  const navigate = useNavigate();
  const { company: authCompanies } = useAuthStore();
  const companyNoStr = authCompanies?.[0]?.CompanyNo?.toString() || authCompanies?.[0]?.companyNo?.toString() || '1';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isSave, isUpdate } = useFormRights(1559);

  // Filter states
  const [filterTitle, setFilterTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date } | undefined>();

  useEffect(() => {
    const fetchMeetings = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.get<any>(`/api/crm/meeting-notes/search-data?CompanyNo=${companyNoStr}`);
        if (response && response.data) {
          setMeetings(response.data);
        } else if (Array.isArray(response)) {
          setMeetings(response);
        }
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
        toast.error("Failed to load meetings.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeetings();
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 w-full bg-[var(--tm-muted)] animate-pulse rounded-lg border border-[var(--tm-border)]" />
        ))}
      </div>
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

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100">Meeting Notes</h1>
          <PageGuideButton guideKey="meetings" />
        </div>
        {isSave && (
          <Button
            data-page-tour="meeting-create"
            onClick={() => navigate('/meetings/new')}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] shadow-md shadow-[#0EA5E9]/20"
          >
            <Plus className="w-4 h-4 mr-2" /> New Meeting
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
        <div data-page-tour="meeting-date-filter">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="-mt-2"
          />
        </div>
        <div className="flex items-center" data-page-tour="meeting-clear-filters">
          {(filterTitle || filterStatus !== 'all' || dateRange) && (
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

      <Card data-page-tour="meeting-table" className="flex-1 overflow-auto border-[var(--tm-border)]/60 rounded-xl bg-[var(--tm-surface)]/80 backdrop-blur-sm shadow-sm">
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
                onClick={() => {
                  if (onMeetingClick) {
                    onMeetingClick(meeting.meetingNotesNo || meeting.id);
                  } else {
                    navigate(`/meetings/${meeting.meetingNotesNo || meeting.id}`);
                  }
                }}
                className="group hover:bg-[var(--tm-muted)]/80 transition-colors cursor-pointer"
              >
                <td title={(index + 1).toString()} className="px-3 py-2 align-middle">
                  <span className="text-[11px] font-medium text-[#0EA5E9] whitespace-nowrap">
                    {index + 1 || '-'}
                  </span>
                </td>
                <td title={meeting.meetingTitle} className="px-3 py-2 align-middle">
                  <span className="text-xs font-semibold text-slate-100 truncate block w-[150px] truncate">
                    {meeting.meetingTitle || '-'}
                  </span>
                </td>
                <td title={meeting.meetingTypeName} className="px-3 py-2 align-middle">
                  <span className="text-xs font-medium text-slate-200 truncate block w-[150px]">
                    {meeting.meetingTypeName || '-'}
                  </span>
                </td>
                <td title={meeting.meetingCategoryName} className="px-3 py-2 align-middle">
                  <span className="text-xs font-medium text-slate-200 truncate block w-[120px]">
                    {meeting.meetingCategoryName || '-'}
                  </span>
                </td>
                <td title={meeting.companyName} className="px-3 py-2 align-middle">
                  <span className="text-xs font-medium text-slate-200 truncate block w-[120px]">
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meeting.docStatusNo === 30 || meeting.docStatusName === 'Authorized' ? 'bg-green-100 text-green-400' : 'bg-[var(--tm-muted)] text-slate-200'}`}>
                    {meeting.docStatusName || meeting.statusName || '-'}
                  </span>
                </td>
                <td title={meeting.meetingTitle} className="px-3 py-2 align-middle text-right sticky right-0 z-10 tm-sticky-cell backdrop-blur-md border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                  {isUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
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
    </div>
  );
}
