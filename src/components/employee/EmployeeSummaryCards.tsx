import { MapPin, Network, Users, type LucideIcon } from 'lucide-react';

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#1E56A0] ring-1 ring-[#1E56A0]/12 dark:text-[#4f86d1]">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-slate-400">{label}</p>
        <p className="text-[20px] font-bold leading-tight tabular-nums text-slate-50">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

export function EmployeeSummaryCards({
  total,
  departments,
  locations,
}: {
  total: number;
  departments: number;
  locations: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SummaryCard icon={Users} label="Total Employees" value={total} />
      <SummaryCard icon={Network} label="Departments" value={departments} />
      <SummaryCard icon={MapPin} label="Locations" value={locations} />
    </div>
  );
}
