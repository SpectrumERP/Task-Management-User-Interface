import { Button } from '@/components/ui/button';
import { MapPin, Building, Plus, Edit, Trash2, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { CompanyFormSection } from './CompanyFormSection';

interface CompanyLocationsSectionProps {
  locations: any[];
  getLocationTypeName: (no: string | number) => string;
  getTimeZoneLabel: (timeZoneNo: string, fallbackName?: string) => string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onScanNewCard?: () => void;
  error?: string;
}

export function CompanyLocationsSection({
  locations,
  getLocationTypeName,
  getTimeZoneLabel,
  onAdd,
  onEdit,
  onRemove,
  error,
}: CompanyLocationsSectionProps) {
  return (
    <CompanyFormSection
      icon={MapPin}
      title="Locations"
      description="Other offices, sites or warehouses"
      collapsible
      count={locations.length}
      autoOpen={locations.length > 0 || !!error}
      action={
        <Button
          type="button"
          onClick={onAdd}
          className="h-8 rounded-[8px] px-3 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-xs gap-1.5 shadow-sm shadow-[#0EA5E9]/20"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Location
        </Button>
      }
      bodyClassName={locations.length === 0 && !error ? 'py-3' : undefined}
    >
      {error ? (
        <p className="text-[10px] text-red-500 font-medium mb-3">{error}</p>
      ) : null}

      {locations.length === 0 ? (
        <p className="text-[11px] text-slate-400 font-medium text-center py-2">
          No locations added yet. Click Add Location to create one.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
          {locations.map((loc, idx) => (
            <div
              key={idx}
              className="bg-[var(--tm-elevated)] border border-[var(--tm-border)]/70 rounded-[8px] p-3.5 relative group hover:border-[#0EA5E9]/35 transition-colors"
            >
              <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <ActionTip label="Edit Location">
                  <button
                    type="button"
                    onClick={() => onEdit(idx)}
                    aria-label="Edit Location"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] transition-colors"
                  >
                    <Edit size={13} />
                  </button>
                </ActionTip>
                <ActionTip label="Remove Location">
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    aria-label="Remove Location"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </ActionTip>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-[var(--tm-surface)] border border-[var(--tm-border)]/80 rounded-[8px] text-[#0EA5E9] shrink-0">
                  <Building size={15} strokeWidth={1.75} />
                </div>
                <div className="space-y-1 pr-12 min-w-0">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-[6px] text-[9px] font-semibold border',
                      getLocationTypeName(loc.type) === 'Office'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : getLocationTypeName(loc.type) === 'Warehouse'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    )}
                  >
                    {getLocationTypeName(loc.type)}
                  </span>
                  <p className="text-xs font-semibold text-slate-100 leading-snug">{loc.address}</p>
                  <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-1">
                    <span>{loc.city}</span>
                    <span className="text-slate-300">•</span>
                    <span>{loc.state}</span>
                    <span className="text-slate-300">•</span>
                    <span>{loc.country}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-400">{loc.pinCode || loc.pin}</span>
                  </div>
                  {loc.timeZoneNo ? (
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 min-w-0">
                      <Clock size={10} className="shrink-0" />
                      <span className="truncate">{getTimeZoneLabel(loc.timeZoneNo, loc.timeZoneName)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CompanyFormSection>
  );
}
