import { useEffect } from 'react';
import { Briefcase, Building2, CircleDot, Layers, MapPin, Network, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { FilterFieldLabel, FilterPanel, filterControlClass } from '@/components/task/TaskFilter';
import { FIELD_TEXT_STYLE } from '@/lib/fieldStyles';
import { cn } from '@/lib/utils';
import {
  EMPTY_EMPLOYEE_FILTERS,
  countActiveEmployeeFilters,
  type EmployeeFilterOptions,
  type EmployeeFilters,
} from '@/lib/employeeDirectory';

const FIELDS: { key: keyof EmployeeFilters; label: string; icon: typeof Layers; placeholder: string }[] = [
  { key: 'department', label: 'Department', icon: Network, placeholder: 'All departments' },
  { key: 'designation', label: 'Designation', icon: Briefcase, placeholder: 'All designations' },
  { key: 'companyName', label: 'Company Name', icon: Building2, placeholder: 'All companies' },
  { key: 'workLocation', label: 'Work Location', icon: MapPin, placeholder: 'All locations' },
  { key: 'status', label: 'Status', icon: CircleDot, placeholder: 'All statuses' },
];

interface EmployeeFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: EmployeeFilters;
  options: EmployeeFilterOptions;
  onChange: (filters: EmployeeFilters) => void;
}

/** Right slide-over, same chrome and behaviour as the Tasks List Filters drawer (desktop pushes the page). */
export function EmployeeFilterDrawer({ open, onClose, filters, options, onChange }: EmployeeFilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const hasChanges = countActiveEmployeeFilters(filters) > 0;
  // Only fields the API actually fills are worth offering.
  const fields = FIELDS.filter((f) => options[f.key].length > 0);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close filters"
          className="fixed inset-0 top-[calc(3.5rem+1px)] z-[115] bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <div
        className={cn(
          'fixed top-[calc(3.5rem+1px)] right-0 bottom-0 z-[120] w-[min(100vw,18rem)] transition-transform duration-300 ease-out will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        )}
        aria-hidden={!open}
      >
        <Card className="h-full rounded-none border-0 border-l border-[var(--tm-border)] shadow-none bg-[var(--tm-surface)] p-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex items-center justify-between shrink-0">
            <span className="text-[13px] font-semibold text-slate-100 normal-case flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#1E56A0] ring-1 ring-[#1E56A0]/12">
                <SlidersHorizontal size={14} strokeWidth={1.75} />
              </span>
              Filters
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              aria-label="Close filters"
              className="h-8 w-8 p-0 rounded-[8px] hover:bg-[var(--tm-muted)] text-slate-400 hover:text-slate-300 transition-colors"
            >
              <X size={15} strokeWidth={1.75} />
            </Button>
          </div>

          <div className="overflow-y-auto px-4 py-3 scrollbar-sleek flex-1 space-y-3">
            <FilterPanel title="Employee filters" icon={Layers} cols={1}>
              {fields.length === 0 ? (
                <p className="text-[11px] text-slate-400">No filterable fields are available for these employees.</p>
              ) : (
                fields.map((field) => (
                  <div key={field.key} className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={field.icon}>{field.label}</FilterFieldLabel>
                    <Combobox
                      value={filters[field.key]}
                      onChange={(val) => onChange({ ...filters, [field.key]: val })}
                      options={options[field.key].map((v) => ({ value: v, label: v }))}
                      placeholder={field.placeholder}
                      className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                    />
                  </div>
                ))
              )}
            </FilterPanel>
          </div>

          {hasChanges && (
            <div className="flex justify-end px-4 py-3 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange(EMPTY_EMPLOYEE_FILTERS)}
                className="h-9 px-4 rounded-[8px] gap-1.5 border-[#1E56A0]/35 bg-[var(--tm-surface)] text-[#1E56A0] hover:bg-[#1E56A0]/10 hover:border-[#1E56A0]/50 text-xs font-semibold shadow-none transition-colors"
              >
                <RotateCcw size={13} strokeWidth={2} />
                Reset
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
