import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiService } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { formatDateOnly, formatUtcDateTime, toDateOnlyLocal, toUtcIso, toUtcIsoOrEmpty } from '@/lib/dateTime';
import {
  MessageSquare,
  Clock,
  Send,
  Plus
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
  const [effortDate, setEffortDate] = useState(toDateOnlyLocal(new Date()) || '');
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
        effortDate: toUtcIso(effortDate),
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
    <div className="grid grid-cols-1 gap-4">
      {/* Effort Tracking */}
      {/* <div className="rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_55%,var(--tm-surface))] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 border border-blue-500/30 shrink-0">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-slate-100">Actual Effort Logs</h4>
              <p className="text-[10px] font-medium text-slate-400">
                Total logged:{' '}
                <span className="text-[#0EA5E9] font-semibold">{totalLoggedHours}h</span>
              </p>
            </div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              onClick={() => setShowEffortForm(!showEffortForm)}
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-semibold rounded-lg px-3 border-[var(--tm-border)] text-slate-200 gap-1 hover:bg-[var(--tm-surface)]"
            >
              <Plus size={12} strokeWidth={2.5} />
              Add
            </Button>
          )}
        </div>

        {showEffortForm && !readOnly && (
          <div className="bg-[var(--tm-surface)] border border-[var(--tm-border)] rounded-xl p-3.5 space-y-3 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                  Date
                </label>
                <div className="relative">
                  <DateTimePicker
                    date={effortDate ? new Date(effortDate) : undefined}
                    onChange={(date) => setEffortDate(toUtcIsoOrEmpty(date))}
                    hideTime={true}
                    className="h-8 text-[11px] font-medium rounded-lg border-[var(--tm-border)] text-slate-50 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                  Hours Spent
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 2"
                  value={effortHours}
                  onChange={(e) => setEffortHours(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLogEffort();
                    }
                  }}
                  maxLength={3}
                  className="h-8 text-[11px] font-medium rounded-lg border-[var(--tm-border)] text-slate-50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                Activity Details
              </label>
              <Textarea
                placeholder="What did you work on?"
                value={effortDesc}
                onChange={(e) => setEffortDesc(e.target.value)}
                className="min-h-[60px] max-h-[120px] text-[11px] font-medium rounded-lg border-[var(--tm-border)] text-slate-50 py-1.5"
                required
                maxLength={1000}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEffortForm(false)}
                className="h-7 text-[10px] font-semibold rounded-lg px-3 text-slate-300 hover:bg-[var(--tm-muted)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleLogEffort}
                disabled={isSubmittingEffort}
                className="h-7 text-[10px] font-semibold rounded-lg px-3 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                {isSubmittingEffort ? 'Logging...' : 'Save Log'}
              </Button>
            </div>
          </div>
        )}

        {efforts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--tm-border)] bg-[var(--tm-surface)]/60 px-3 py-5 text-center">
            <p className="text-[11px] font-medium text-slate-400">No effort logged yet</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Use Add to record time spent on this task.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
            {efforts.map((e, idx) => (
              <div
                key={idx}
                className="bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-xl p-3 flex items-start gap-3"
              >
                <div className="h-7 w-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] font-semibold shrink-0">
                  {e.hours}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-100 line-clamp-2 leading-snug">
                    {e.description}
                  </p>
                  <span className="text-[9px] font-medium text-slate-500 block mt-1">
                    {e.date ? formatDateOnly(e.date) : 'Recent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div> */}

      {/* Comments */}
      <div className="rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_55%,var(--tm-surface))] p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100">Management Comments</h4>
            <p className="text-[10px] font-medium text-slate-400">
              {comments.length} comment{comments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="mb-3 relative">
            <Textarea
              placeholder="Post a comment or update..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
              className="min-h-[72px] text-xs font-medium rounded-xl border-[var(--tm-border)] bg-[var(--tm-surface)] focus-visible:ring-[#0EA5E9] pr-10 resize-none text-slate-50"
            />
            <Button
              type="button"
              onClick={() => handlePostComment()}
              disabled={isSubmittingComment || !commentText.trim()}
              className="absolute right-2.5 bottom-2.5 h-7 w-7 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white flex items-center justify-center disabled:opacity-50"
            >
              <Send size={12} />
            </Button>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--tm-border)] bg-[var(--tm-surface)]/60 px-3 py-5 text-center">
            <p className="text-[11px] font-medium text-slate-400">No comments yet</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Start the conversation with an update.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
            {comments.map((c) => (
              <div
                key={c.id}
                className="bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-xl p-3 flex items-start gap-3"
              >
                <UserAvatar
                  loginNo={(c as any).loginNo}
                  displayName={c.author}
                  size="md"
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <TruncatedText
                      text={c.author || ''}
                      className="text-[11px] font-semibold text-slate-100"
                    />
                    <span className="text-[9px] font-medium text-slate-500 shrink-0">
                      {c.timestamp ? formatUtcDateTime(c.timestamp) : 'Now'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-line">
                    {c.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
