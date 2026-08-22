import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { Globe, X } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
        <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
          <Globe size={18} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-800 tracking-tight">Preferred Ports</h3>
        </div>
      </div>

      <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex gap-0.5">
          <Combobox
            options={portsList.map((p: string) => ({ label: p, value: p }))}
            value={selectedPortName}
            onChange={onSelectedPortNameChange}
            placeholder="Select Port"
            className="bg-white border border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
          />
          <Button
            type="button"
            onClick={onAdd}
            disabled={!selectedPortName}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs shrink-0 shadow disabled:opacity-50"
          >
            Assign
          </Button>
        </div>

        {ports.length === 0 ? (
          <p className="text-[10px] text-slate-400 font-medium italic text-center py-2">No ports assigned to this company profile.</p>
        ) : (
          <div className="flex flex-wrap gap-0.5">
            {ports.map((port, idx) => (
              <div key={idx} className="bg-white border border-[#006699]/15 text-[#006699] text-xs font-medium rounded-lg px-2.5 py-1 flex items-center gap-0.5 shadow-sm">
                <span>{port.portName}</span>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-0.5 rounded-full hover:bg-[#006699]/10 text-slate-400 hover:text-[#006699] transition-colors"
                  title="Unassign Port"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
