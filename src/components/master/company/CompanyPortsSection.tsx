import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { Globe, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { CompanyFormSection } from './CompanyFormSection';

interface CompanyPortsSectionProps {
  ports: any[];
  portsList: string[];
  selectedPortName: string;
  onSelectedPortNameChange: (val: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function CompanyPortsSection({
  ports,
  portsList,
  selectedPortName,
  onSelectedPortNameChange,
  onAdd,
  onRemove,
}: CompanyPortsSectionProps) {
  return (
    <CompanyFormSection
      icon={Globe}
      title="Preferred Ports"
      description="Assign ports commonly used with this entity"
    >
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
          className="h-10 px-4 rounded-[8px] bg-[#006699] hover:bg-[#005580] text-white font-semibold text-xs shrink-0 shadow-sm shadow-[#006699]/20 disabled:opacity-50"
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
              className="bg-[#e8f3f8] border border-[#006699]/15 text-[#006699] text-xs font-semibold rounded-[6px] px-2.5 py-1 flex items-center gap-1.5"
            >
              <span>{port.portName}</span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="p-0.5 rounded-[4px] hover:bg-white/80 text-[#006699]/70 hover:text-[#006699] transition-colors"
                title="Unassign Port"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </CompanyFormSection>
  );
}
