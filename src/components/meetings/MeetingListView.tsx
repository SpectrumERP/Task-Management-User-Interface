import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight, Edit2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
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
          <div key={i} className="h-16 w-full bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 bg-white/50 border-dashed border-2 border-slate-200 rounded-[32px]">
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <ArrowRight className="text-slate-300" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-800">No meeting notes found</h3>
        <p className="text-slate-500 text-sm font-medium mb-6">Create a new meeting note to get started.</p>
        <Button onClick={() => navigate('/meetings/new')} className="bg-[#006699] hover:bg-[#005580]">
          <Plus className="w-4 h-4 mr-2" /> New Meeting Note
        </Button>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-800">Meeting Notes</h1>
        <Button onClick={() => navigate('/meetings/new')} className="bg-[#006699] hover:bg-[#005580] shadow-md shadow-[#006699]/20">
          <Plus className="w-4 h-4 mr-2" /> New Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Input
          placeholder="Filter by Title..."
          value={filterTitle}
          onChange={(e) => setFilterTitle(e.target.value)}
          className="bg-white rounded-lg"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white rounded-lg">
            <SelectValue placeholder="Filter by Status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="initial">Initial</SelectItem>
            <SelectItem value="release">Release</SelectItem>
            <SelectItem value="authorized">Authorized</SelectItem>
          </SelectContent>
        </Select>
        <div className="">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-full bg-white rounded-2xl border"
          />
        </div>
        <div className="flex items-center">
          {(filterTitle || filterStatus !== 'all' || dateRange) && (
            <Button 
              variant="ghost" 
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg h-9"
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

      <Card className="flex-1 overflow-auto border-slate-200/60 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider">
            <tr>
              <th className="px-3 py-2">SrNo.</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Meeting Type</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Start Date & Time</th>
              <th className="px-3 py-2">End Date & Time</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right sticky right-0 z-40 bg-slate-50/90 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <td title={(index + 1).toString()} className="px-3 py-2 align-middle">
                  <span className="text-[11px] font-medium text-[#006699] whitespace-nowrap">
                    {index + 1 || '-'}
                  </span>
                </td>
                <td title={meeting.meetingTitle} className="px-3 py-2 align-middle">
                  <span className="text-xs font-semibold text-slate-800 truncate block w-[150px] truncate">
                    {meeting.meetingTitle || '-'}
                  </span>
                </td>
                <td title={meeting.meetingTypeName} className="px-3 py-2 align-middle">
                  <span className="text-xs font-medium text-slate-700 truncate block w-[150px]">
                    {meeting.meetingTypeName || '-'}
                  </span>
                </td>
                <td title={meeting.meetingCategoryName} className="px-3 py-2 align-middle">
                  <span className="text-xs font-medium text-slate-700 truncate block w-[120px]">
                    {meeting.meetingCategoryName || '-'}
                  </span>
                </td>
                <td title={meeting.companyName} className="px-3 py-2 align-middle">
                  <span className="text-xs font-medium text-slate-700 truncate block w-[120px]">
                    {meeting.companyName || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-700">
                    {meeting.meetingStartDateTime ? format(new Date(meeting.meetingStartDateTime), 'MMM dd, yyyy h:mm a') : '-'}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-700">
                    {meeting.meetingEndDateTime ? format(new Date(meeting.meetingEndDateTime), 'MMM dd, yyyy h:mm a') : '-'}
                  </span>
                </td>
                <td title={meeting.docStatusName} className="px-3 py-2 align-middle whitespace-nowrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meeting.docStatusNo === 30 || meeting.docStatusName === 'Authorized' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {meeting.docStatusName || meeting.statusName || '-'}
                  </span>
                </td>
                <td title={meeting.meetingTitle} className="px-3 py-2 align-middle text-right sticky right-0 z-10 bg-white/90 backdrop-blur-md border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-slate-50/90">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/meetings/${meeting.meetingNotesNo || meeting.id}`);
                    }}
                    className="h-6 w-6 rounded-md text-slate-400 hover:text-[#006699] hover:bg-slate-100 flex items-center justify-center transition-all duration-200"
                  >
                    <Edit2 size={14} strokeWidth={2.5} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
