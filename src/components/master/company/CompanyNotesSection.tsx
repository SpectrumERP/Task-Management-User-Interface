import { useState } from 'react';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { DatePicker } from '../../ui/DatePicker';
import { StickyNote, Plus, Trash2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTROL_BORDER, CONTROL_RADIUS } from '@/lib/fieldStyles';
import { CompanyFormSection } from './CompanyFormSection';

export interface FollowUpNote {
  date: string;
  note: string;
}

interface CompanyNotesSectionProps {
  notes: FollowUpNote[];
  onChange: (value: FollowUpNote[]) => void;
}

const toIso = (d: Date) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export function CompanyNotesSection({ notes, onChange }: CompanyNotesSectionProps) {
  const [draftDate, setDraftDate] = useState<Date | undefined>(undefined);
  const [draftNote, setDraftNote] = useState('');

  const addNote = () => {
    if (!draftNote.trim()) return;
    onChange([{ date: draftDate ? toIso(draftDate) : '', note: draftNote.trim() }, ...notes]);
    setDraftNote('');
    setDraftDate(undefined);
  };

  const removeNote = (index: number) => {
    onChange(notes.filter((_, i) => i !== index));
  };

  return (
    <CompanyFormSection
      icon={StickyNote}
      title="Follow-up Notes"
      description="Add dated remarks for this business entity"
    >
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-start rounded-[8px] border border-slate-200/70 bg-[#f8fbfd] p-3">
          <div className="w-full md:w-40 space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600">Date</label>
            <DatePicker
              date={draftDate}
              onChange={setDraftDate}
              placeholder="Select date"
              className="h-10"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600">Note</label>
            <Textarea
              placeholder="Enter follow-up note..."
              maxLength={1000}
              className={cn(
                'bg-white border w-full resize-y min-h-[42px] text-xs font-medium text-slate-700 shadow-none focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699]',
                CONTROL_BORDER,
                CONTROL_RADIUS
              )}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={addNote}
            disabled={!draftNote.trim()}
            className="h-10 rounded-[8px] px-3 bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs gap-1 flex items-center shadow-none shrink-0 md:mt-[22px]"
          >
            <Plus size={14} />
            Add Note
          </Button>
        </div>

        {notes.length > 0 && (
          <div className="space-y-2">
            {notes.map((n, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/70 rounded-[8px] p-3 relative group hover:border-[#006699]/35 transition-colors flex items-start gap-3"
              >
                <div className="flex items-center gap-1 shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-[6px] px-2 py-1">
                  <CalendarDays size={12} />
                  {n.date ? formatDate(n.date) : 'No date'}
                </div>
                <p className="text-xs text-slate-700 leading-snug flex-1 whitespace-pre-wrap pr-6">{n.note}</p>
                <button
                  type="button"
                  onClick={() => removeNote(idx)}
                  className="absolute top-2 right-2 p-1 rounded-[6px] text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove Note"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CompanyFormSection>
  );
}
