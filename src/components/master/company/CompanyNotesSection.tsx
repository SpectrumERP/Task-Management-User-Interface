import { Textarea } from '../../ui/textarea';
import { FileText } from 'lucide-react';

interface CompanyNotesSectionProps {
  notes: string;
  onChange: (value: string) => void;
}

export function CompanyNotesSection({ notes, onChange }: CompanyNotesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
        <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-800 tracking-tight">Notes</h3>
        </div>
      </div>
      <div className="space-y-0">
        <Textarea
          placeholder="Enter notes..."
          maxLength={1000}
          className="bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-xl px-3 w-full resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
          value={notes}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="text-right text-[10px] text-slate-400 mt-1 font-medium">
          {notes.length}/1000
        </div>
      </div>
    </div>
  );
}
