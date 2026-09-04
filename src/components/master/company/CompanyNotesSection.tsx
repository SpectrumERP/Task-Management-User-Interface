import { Textarea } from '../../ui/textarea';
import { StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTROL_BORDER, CONTROL_RADIUS } from '@/lib/fieldStyles';
import { CompanyFormSection } from './CompanyFormSection';

interface CompanyNotesSectionProps {
  notes: string;
  onChange: (value: string) => void;
}

export function CompanyNotesSection({ notes, onChange }: CompanyNotesSectionProps) {
  return (
    <CompanyFormSection
      icon={StickyNote}
      title="Notes"
      description="Optional remarks for this business entity"
    >
      <div className="space-y-1.5">
        <Textarea
          placeholder="Enter notes..."
          maxLength={1000}
          className={cn(
            'bg-white border w-full resize-none min-h-[100px] text-xs font-medium text-slate-700 shadow-none focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699]',
            CONTROL_BORDER,
            CONTROL_RADIUS
          )}
          value={notes}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="text-right text-[10px] text-slate-400 font-medium tabular-nums">
          {notes.length}/1000
        </div>
      </div>
    </CompanyFormSection>
  );
}
