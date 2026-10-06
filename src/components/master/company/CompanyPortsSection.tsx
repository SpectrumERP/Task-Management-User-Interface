import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { Globe, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { CompanyFormSection } from './CompanyFormSection';

interface CompanyPortsSectionProps {
  ports: any[];
  portsList: string[];
  selectedPortName: string;
  onSelectedPortNameChange: (val: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  standalone?: boolean;
}

export function CompanyPortsSection({
  ports,
  portsList,
  selectedPortName,
  onSelectedPortNameChange,
  onAdd,
  onRemove,
  standalone,
}: CompanyPortsSectionProps) {
  const content = (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Combobox
          options={portsList.map((p: string) => ({ label: p, value: p }))}
          value={selectedPortName}
          onChange={onSelectedPortNameChange}
          placeholder="Select Port"
          className={cn(FIELD_CONTROL_CLASS, 'px-3 flex-1')}
        />
        <Button
          type="button"
          onClick={onAdd}
          disabled={!selectedPortName}
          className="h-10 px-4 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-xs shrink-0 shadow-sm shadow-[#0EA5E9]/20 disabled:opacity-50"
        >
          Assign
        </Button>
      </div>

      {ports.length === 0 ? (
        <p className="text-[11px] text-slate-400 font-medium text-center py-3 mt-1">
          No ports assigned to this company profile.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ports.map((port, idx) => (
            <div
              key={idx}
              className="bg-[var(--tm-tint)] border border-[#0EA5E9]/15 text-[#0EA5E9] text-xs font-semibold rounded-[6px] px-2.5 py-1 flex items-center gap-1.5"
            >
              <span>{port.portName}</span>
              <ActionTip label="Unassign Port">
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  aria-label="Unassign Port"
                  className="p-0.5 rounded-[4px] hover:bg-[var(--tm-surface)]/80 text-[#0EA5E9]/70 hover:text-[#0EA5E9] transition-colors"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </ActionTip>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (standalone) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <CompanyFormSection
      icon={Globe}
      title="Preferred Ports"
      description="Assign ports commonly used with this entity"
    >
      {content}
    </CompanyFormSection>
  );
}
