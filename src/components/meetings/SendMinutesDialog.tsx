import { useMemo, useState } from 'react';
import { Bell, Mail, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';
import {
  formatMinutesEmailBody,
  formatMinutesEmailSubject,
  sendMinutesOfMeeting,
  type MinutesRecipient,
} from '@/lib/meetingMinutesShare';
import { InlineLoader } from '@/components/ui/BrandLoader';
import { PersonName } from '@/components/ui/PersonHoverCard';
import { employeeRef, userRef } from '@/lib/personDetails';

type SendMinutesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingNotesNo: number;
  companyNo: number;
  meetingTitle?: string;
  startDateTime?: string | null;
  endDateTime?: string | null;
  statusName?: string | null;
  statusAllowed: boolean;
  recipients: MinutesRecipient[];
  onSent?: () => void;
};

export function SendMinutesDialog({
  open,
  onOpenChange,
  meetingNotesNo,
  companyNo,
  meetingTitle,
  startDateTime,
  endDateTime,
  statusName,
  statusAllowed,
  recipients,
  onSent,
}: SendMinutesDialogProps) {
  const [note, setNote] = useState('');
  const [includeMissingSkipped, setIncludeMissingSkipped] = useState(true);
  const [sending, setSending] = useState(false);

  const withEmail = useMemo(() => recipients.filter((r) => r.hasEmail), [recipients]);
  const missingEmail = useMemo(() => recipients.filter((r) => !r.hasEmail), [recipients]);

  const handleSend = async () => {
    if (!statusAllowed) {
      toast.message('Status required', {
        description: 'Set document status to Release or Authorized before sending.',
      });
      return;
    }
    if (!withEmail.length) {
      toast.message('No emails', {
        description: 'Add participants with email addresses first.',
      });
      return;
    }

    setSending(true);
    try {
      const subject = formatMinutesEmailSubject(meetingTitle, startDateTime);
      const body = formatMinutesEmailBody({
        meetingTitle,
        startDateTime,
        endDateTime,
        statusName,
        recipients: withEmail,
        note,
      });

      const result = await sendMinutesOfMeeting({
        subject,
        body,
        payload: {
          meetingNotesNo,
          companyNo,
          recipientEmails: withEmail.map((r) => r.email),
          recipients: withEmail.map((r) => ({
            name: r.name,
            email: r.email,
            participantType: r.typeLabel,
          })),
          message: note.trim() || undefined,
          includeAttachments: true,
        },
      });

      if (result.mode === 'api') {
        toast.success(`Minutes sent to ${withEmail.length} attendee${withEmail.length === 1 ? '' : 's'}`);
      }
      onSent?.();
      onOpenChange(false);
      setNote('');
    } catch (err) {
      console.error(err);
      if (shouldToastCaughtError(err)) {
        toast.error(getUserErrorMessage(err, 'Failed to send minutes. Please try again.'));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[var(--tm-border)]/70 bg-[var(--tm-elevated)]">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-bold text-slate-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
              <Send size={15} strokeWidth={1.75} />
            </span>
            Send Minutes of Meeting
          </DialogTitle>
          <DialogDescription className="text-[12px] text-slate-400 pt-1">
            Email MoM to meeting attendees (participants with an email address).
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3 max-h-[min(60vh,420px)] overflow-y-auto">
          <div className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)]/50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-100 truncate">{meetingTitle || 'Untitled meeting'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Status: {statusName || '—'}
              {statusAllowed ? (
                <span className="text-emerald-400"> · Ready to send</span>
              ) : (
                <span className="text-amber-400"> · Set to Release / Authorized</span>
              )}
            </p>
          </div>

          {!statusAllowed ? (
            <div className="flex items-start gap-2 rounded-[8px] border border-amber-500/25 bg-amber-500/10 px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] text-amber-200/90 leading-snug">
                Sending is enabled when document status is <strong>Release</strong> or{' '}
                <strong>Authorized</strong> so drafts are not emailed by mistake.
              </p>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail size={12} className="text-[#0EA5E9]" />
                Recipients ({withEmail.length})
              </p>
              {missingEmail.length > 0 ? (
                <span className="text-[10px] font-medium text-slate-500">
                  {missingEmail.length} missing email (skipped)
                </span>
              ) : null}
            </div>

            {withEmail.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3 text-center border border-dashed border-[var(--tm-border)] rounded-[8px]">
                No attendees with email yet. Add participants first.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {withEmail.map((r) => (
                  <li
                    key={r.key}
                    className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--tm-border)]/60 bg-[var(--tm-surface)] px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-100 truncate">
                        <PersonName person={userRef(r.userNo) ?? employeeRef(r.empNo)} name={r.name} />
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{r.email}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      {r.typeLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {missingEmail.length > 0 && includeMissingSkipped ? (
              <div className="mt-2 rounded-[8px] border border-[var(--tm-border)]/50 bg-[var(--tm-muted)]/30 px-2.5 py-2">
                <p className="text-[10px] font-semibold text-slate-400 mb-1">Skipped (no email)</p>
                <ul className="space-y-0.5">
                  {missingEmail.map((r) => (
                    <li key={r.key} className="text-[10px] text-slate-500 truncate">
                      <PersonName
                        person={userRef(r.userNo) ?? employeeRef(r.empNo)}
                        name={r.name}
                        wrapperClassName="align-bottom"
                      />{' '}
                      · {r.typeLabel}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {missingEmail.length > 0 ? (
              <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={includeMissingSkipped}
                  onCheckedChange={(v) => setIncludeMissingSkipped(Boolean(v))}
                />
                <span className="text-[10px] text-slate-400">Show skipped attendees</span>
              </label>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-300">Optional note</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a short message for attendees…"
              className="min-h-[72px] rounded-[8px] text-xs resize-none"
              maxLength={500}
            />
          </div>

          <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
            <Bell size={11} className="mt-0.5 shrink-0 text-[#0EA5E9]" />
            When the send API is live, mail goes from the server. Until then, your email app opens with BCC.
          </p>
        </div>

        <DialogFooter className="px-5 py-3.5 border-t border-[var(--tm-border)]/70 bg-[var(--tm-elevated)] flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-[8px] text-xs"
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !statusAllowed || withEmail.length === 0}
            className={cn(
              'h-9 rounded-[8px] text-xs font-semibold gap-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white',
              (!statusAllowed || withEmail.length === 0) && 'opacity-60'
            )}
          >
            {sending ? <InlineLoader size={14} /> : <Send size={14} />}
            Send to {withEmail.length || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
