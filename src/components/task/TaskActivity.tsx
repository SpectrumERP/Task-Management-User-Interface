import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiService } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import {
  MessageSquare,
  Clock,
  Send,
  Plus,
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface TaskActivityProps {
  taskNo: number;
  comments: {
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }[];
  efforts: {
    date: string;
    hours: number;
    description: string;
  }[];
  onRefresh: () => void;
  readOnly?: boolean;
}

export function TaskActivity({ taskNo, comments = [], efforts = [], onRefresh, readOnly = false }: TaskActivityProps) {
  const { user: authUser } = useAuthStore();
  const loginNo = authUser?.loginNo || authUser?.LoginNo || 1;

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Effort log state
  const [showEffortForm, setShowEffortForm] = useState(false);
  const [effortHours, setEffortHours] = useState('');
  const [effortDesc, setEffortDesc] = useState('');
  const [effortDate, setEffortDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmittingEffort, setIsSubmittingEffort] = useState(false);

  const handlePostComment = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      const payload = {
        operTaskNo: taskNo,
        description: commentText.trim(),
        loginNo: loginNo,
        commentDetailNo: null
      };

      const response = await apiService.post<{ success: boolean; message: string }>('/api/crm/tasks/comment-detail', payload);
      if (response.success) {
        setCommentText('');
        toast.success('Comment posted successfully');
        onRefresh();
      } else {
        toast.error(response.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Comment post error:', error);
      toast.error('An error occurred while posting comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLogEffort = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    const hours = parseFloat(effortHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Please enter a valid amount of hours');
      return;
    }
    if (!effortDesc.trim()) {
      toast.error('Please provide a description of the effort');
      return;
    }

    try {
      setIsSubmittingEffort(true);
      const payload = {
        operTaskNo: taskNo,
        effortDate: new Date(effortDate).toISOString(),
        effortHours: hours,
        effortDescription: effortDesc.trim(),
        loginNo: loginNo,
        effortLogDetailNo: null
      };

      const response = await apiService.post<{ success: boolean; message: string }>('/api/crm/tasks/effort-log-detail', payload);
      if (response.success) {
        setEffortHours('');
        setEffortDesc('');
        setShowEffortForm(false);
        toast.success('Effort logged successfully');
        onRefresh();
      } else {
        toast.error(response.message || 'Failed to log effort');
      }
    } catch (error) {
      console.error('Effort log error:', error);
      toast.error('An error occurred while logging effort');
    } finally {
      setIsSubmittingEffort(false);
    }
  };

  const totalLoggedHours = efforts.reduce((sum, e) => sum + (e.hours || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* 1. Time / Effort Tracking Section */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-0.5.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-900  ">Actual Effort Logs</h4>
                <p className="text-[10px] font-medium text-slate-600">Total logged: <span className="text-blue-600 font-medium">{totalLoggedHours}h</span></p>
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                onClick={() => setShowEffortForm(!showEffortForm)}
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-medium normal-case rounded-xl px-3 border-slate-300 text-slate-800 flex items-center gap-0.5 hover:bg-slate-100 shadow-sm active:scale-95 transition-all"
              >
                <Plus size={12} strokeWidth={2.5} />
                Add
              </Button>
            )}
          </div>

          {/* Inline Effort Form */}
          {showEffortForm && !readOnly && (
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 mb-4 animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
              <div className="grid grid-cols-2 gap-0.5.5">
                <div>
                  <label className="text-[9px] font-medium text-slate-700 normal-case block mb-1">Date</label>
                  <div className="relative">
                    <Input type="date" value={effortDate} onChange={(e) => setEffortDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLogEffort();
                        }
                      }}
                      className="h-8 text-[11px] font-medium rounded-lg border-slate-300 pr-2 pl-7 py-1 text-slate-900 focus-visible:ring-blue-500"
                      required
                    />
                    <CalendarIcon className="absolute left-2.5 top-2.5 text-slate-600" size={12} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-medium text-slate-700 normal-case block mb-1">Hours Spent</label>
                  <Input type="number" step="0.1" min="0.1" placeholder="e.g. 2" value={effortHours} onChange={(e) => setEffortHours(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLogEffort();
                      }
                    }}
                    maxLength={3}
                    className="h-8 text-[11px] font-medium rounded-lg border-slate-300 text-slate-900 focus-visible:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-medium text-slate-700 normal-case block mb-1">Activity Details</label>
                <Textarea placeholder="What did you work on?" value={effortDesc} onChange={(e) => setEffortDesc(e.target.value)}
                  className="min-h-[60px] max-h-[120px] text-[11px] font-medium rounded-lg border-slate-300 text-slate-900 focus-visible:ring-blue-500 py-1.5 scrollbar-hide"
                  required
                  maxLength={1000}
                />
              </div>
              <div className="flex justify-end gap-0.5 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEffortForm(false)}
                  className="h-7 text-[10px] font-medium rounded-lg px-3 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleLogEffort}
                  disabled={isSubmittingEffort}
                  className="h-7 text-[10px] font-medium rounded-lg px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {isSubmittingEffort ? 'Logging...' : 'Save Log'}
                </Button>
              </div>
            </div>
          )}

          {/* Effort Logs List */}
          {efforts.length === 0 ? null : (
            <div className="space-y-0 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
              {efforts.map((e, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 hover:border-slate-300 transition-colors shadow-sm">
                  <div className="h-6 w-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-medium shrink-0">
                    {e.hours}h
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">{e.description}</p>
                    <span className="text-[8px] font-medium text-slate-500   block mt-1">
                      {e.date ? format(new Date(e.date), 'MMM dd, yyyy') : 'Recent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Comments Section */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-0.5.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <MessageSquare size={18} />
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-900  ">Comments</h4>
              <p className="text-[10px] font-medium text-slate-600">{comments.length} comments</p>
            </div>
          </div>

          {/* Comment input textarea */}
          {!readOnly && (
            <div className="mb-4 relative">
              <Textarea placeholder="Post a comment or update..." value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
                className="min-h-[75px] text-xs font-semibold rounded-[8px] border-[#a8afb7] bg-white shadow-sm focus-visible:ring-[#006699] pr-10 resize-none pb-2 pt-2.5 text-slate-900"
              />
              <Button
                type="button"
                onClick={() => handlePostComment()}
                disabled={isSubmittingComment || !commentText.trim()}
                className="absolute right-2.5 bottom-2.5 h-7 w-7 rounded-lg bg-[#006699] hover:bg-[#005580] text-white shadow-sm flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Send size={12} />
              </Button>
            </div>
          )}

          {/* Comments list */}
          {comments.length === 0 ? null : (
            <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
              {comments.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition-colors flex items-start gap-3">
                  <UserAvatar
                    loginNo={(c as any).loginNo}
                    displayName={c.author}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-800 truncate leading-none">{c.author}</span>
                      <span className="text-[8px] font-medium text-slate-500   leading-none">
                        {c.timestamp ? format(new Date(c.timestamp), 'MMM dd · h:mm a') : 'Now'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-line">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
