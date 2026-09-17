import { useState } from 'react';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { DatePicker } from '../../ui/DatePicker';
import { StickyNote, Plus, Trash2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateOnly, toDateOnlyLocal } from '@/lib/dateTime';
import { CONTROL_BORDER, CONTROL_RADIUS, FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { CompanyFormSection } from './CompanyFormSection';

export interface FollowUpNote {
  date: string;
  note: string;
}

interface CompanyNotesSectionProps {
  notes: FollowUpNote[];
  onChange: (value: FollowUpNote[]) => void;
  /** When provided, trash uses this (e.g. confirm dialog) instead of immediate remove. */
  onRemove?: (index: number) => void;
}

const toIso = (d: Date) => toDateOnlyLocal(d) ?? '';

const formatDate = (iso: string) => formatDateOnly(iso, '');

export function CompanyNotesSection({ notes, onChange, onRemove }: CompanyNotesSectionProps) {
  const [draftDate, setDraftDate] = useState<Date | undefined>(undefined);
  const [draftNote, setDraftNote] = useState('');

  const addNote = () => {
    if (!draftNote.trim()) return;
    onChange([{ date: draftDate ? toIso(draftDate) : '', note: draftNote.trim() }, ...notes]);
    setDraftNote('');
    setDraftDate(undefined);
  };

  const removeNote = (index: number) => {
    if (onRemove) {
      onRemove(index);
      return;
    }
    onChange(notes.filter((_, i) => i !== index));
  };

  return (
    <CompanyFormSection
      icon={StickyNote}
      title="Follow-up Notes"
      description="Add dated remarks for this business entity"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(140px,180px)_minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 items-end">
          <div className="space-y-1.5 min-w-0">
            <label className="inline-flex text-[11px] font-medium text-slate-300">Date</label>
            <DatePicker
              date={draftDate}
              onChange={setDraftDate}
              placeholder="Select date"
              className={cn(FIELD_CONTROL_CLASS, 'h-10 w-full')}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex text-[11px] font-medium text-slate-300">Note</label>
              <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                {draftNote.length}/1000
              </span>
            </div>
            <Textarea
              placeholder="Enter follow-up note..."
              maxLength={1000}
              rows={1}
              className={cn(
                'bg-[var(--tm-surface)] border w-full resize-none h-10 min-h-10 py-2 text-xs font-medium text-slate-200 shadow-none overflow-hidden focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9]',
                CONTROL_BORDER,
                CONTROL_RADIUS
              )}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
          </div>

          <Button
            type="button"
            onClick={addNote}
            disabled={!draftNote.trim()}
            className="h-10 w-full sm:w-auto rounded-[8px] px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-xs gap-1.5 shadow-none shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Note
          </Button>
        </div>

        {notes.length > 0 ? (
          <div className="space-y-2 pt-1 border-t border-[var(--tm-border)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Saved notes ({notes.length})
            </p>
            <ul className="space-y-2">
              {notes.map((n, idx) => (
                <li
                  key={`${n.date}-${idx}`}
                  className="group relative grid grid-cols-1 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center gap-2 sm:gap-3 rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] hover:border-[#0EA5E9]/35 hover:bg-[var(--tm-elevated)] transition-colors"
                >
                  <div className="inline-flex h-7 items-center gap-1.5 rounded-[6px] bg-[var(--tm-tint)] px-2 text-[10px] font-semibold text-[#0EA5E9] tabular-nums">
                    <CalendarDays size={12} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{n.date ? formatDate(n.date) : 'No date'}</span>
                  </div>

                  <p className="text-xs font-medium text-slate-200 leading-snug whitespace-pre-wrap break-words min-w-0">
                    {n.note}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeNote(idx)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 opacity-70 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove Note"
                    aria-label="Remove note"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[11px] font-medium text-slate-400 pt-0.5">
            No follow-up notes yet. Pick a date and add a remark above.
          </p>
        )}
      </div>
    </CompanyFormSection>
  );
}
