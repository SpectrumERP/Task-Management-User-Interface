import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiService } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PersonName } from '@/components/ui/PersonHoverCard';
import { userRef } from '@/lib/personDetails';
import { Textarea } from '@/components/ui/textarea';
import { formatUtcDateTime } from '@/lib/dateTime';
import {
  MessageSquare,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface TaskActivityProps {
  taskNo: number;
  comments: {
    id: string;
    author: string;
    text: string;
    timestamp: string;
    /** Author's login no (avatar + profile card). */
    loginNo?: number | null;
  }[];
  efforts: {
    date: string;
    hours: number;
    description: string;
  }[];
  onRefresh: () => void;
  readOnly?: boolean;
}

export function TaskActivity({ taskNo, comments = [], onRefresh, readOnly = false }: TaskActivityProps) {
  const { user: authUser } = useAuthStore();
  const loginNo = authUser?.loginNo || authUser?.LoginNo || 1;

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

  return (
    <div className="grid grid-cols-1 gap-4">
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
                  loginNo={c.loginNo}
                  displayName={c.author}
                  size="md"
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <PersonName
                      person={userRef(c.loginNo)}
                      name={c.author || ''}
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
