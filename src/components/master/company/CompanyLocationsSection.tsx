import { Button } from '@/components/ui/button';
import { MapPin, Building, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyLocationsSectionProps {
  locations: any[];
  getLocationTypeName: (no: string | number) => string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  error?: string;
}

export function CompanyLocationsSection({
  locations,
  getLocationTypeName,
  onAdd,
  onEdit,
  onRemove,
  error,
}: CompanyLocationsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-0.5">
          <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-800 tracking-tight">Locations <span className="text-red-500">*</span></h3>
          </div>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          className="h-8 rounded-lg px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs gap-0.5 flex items-center shadow"
        >
          <Plus size={14} />
          Add Location
        </Button>
      </div>

      {error && (
        <p className="text-[10px] text-red-500 font-medium ml-1">{error}</p>
      )}

      {locations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc, idx) => (
            <div key={idx} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative group hover:border-[#006699]/40 transition-colors">
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => onEdit(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-[#006699]/5 transition-colors"
                  title="Edit Location"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove Location"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                  <Building size={16} />
                </div>
                <div className="space-y-0.5 pr-14">
                  <div className="flex items-center gap-0.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-medium  tracking-wide",
                      getLocationTypeName(loc.type) === 'Office' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        getLocationTypeName(loc.type) === 'Warehouse' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    )}>
                      {getLocationTypeName(loc.type)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-snug">{loc.address}</p>
                  <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-0.5">
                    <span>{loc.city}</span>
                    <span>•</span>
                    <span>{loc.state}</span>
                    <span>•</span>
                    <span>{loc.country}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{loc.pinCode || loc.pin}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
