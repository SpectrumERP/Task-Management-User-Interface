import { useState } from 'react';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { DatePicker } from '../../ui/DatePicker';
import { FileText, Plus, Trash2, CalendarDays } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
        <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-800 tracking-tight">Follow-up Notes</h3>
        </div>
      </div>

      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-start">
          <div className="w-full md:w-40 space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Date</label>
            <DatePicker
              date={draftDate}
              onChange={setDraftDate}
              placeholder="Select date"
              className="h-10"
            />
          </div>
          <div className="flex-1 space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Note</label>
            <Textarea
              placeholder="Enter follow-up note..."
              maxLength={1000}
              className="bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-xl px-3 w-full resize-y min-h-[42px] focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={addNote}
            disabled={!draftNote.trim()}
            className="h-10 rounded-lg px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs gap-0.5 flex items-center shadow shrink-0 md:mt-[18px]"
          >
            <Plus size={14} />
            Add Note
          </Button>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((n, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/70 rounded-xl p-3 shadow-sm relative group hover:border-[#006699]/40 transition-colors flex items-start gap-3"
            >
              <div className="flex items-center gap-1 shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-md px-2 py-1">
                <CalendarDays size={12} />
                {n.date ? formatDate(n.date) : 'No date'}
              </div>
              <p className="text-xs text-slate-700 leading-snug flex-1 whitespace-pre-wrap pr-6">{n.note}</p>
              <button
                type="button"
                onClick={() => removeNote(idx)}
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove Note"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
