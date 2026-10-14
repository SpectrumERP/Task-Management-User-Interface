import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserInitials } from '@/lib/userProfile';
import { useEmployeePhoto } from '@/hooks/useEmployeePhoto';
import type { Employee } from '@/types/employee';

export const EMPTY_VALUE = '—';

/** Photo when the API sends one, else the app's initials avatar (CRM gradient, as in the sidebar footer). */
export function EmployeeAvatar({
  employee,
  className,
}: {
  employee: Pick<Employee, 'empName' | 'photoUrl'>;
  className?: string;
}) {
  const src = useEmployeePhoto(employee.photoUrl);
  // Remember which src failed, so a new photo for the same avatar gets its own chance.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && src !== brokenSrc;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#1E56A0,#C41E1E)] font-bold text-white select-none',
        className
      )}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setBrokenSrc(src)}
        />
      ) : (
        getUserInitials(employee.empName || '?')
      )}
    </span>
  );
}

/** Status pill — same outline pill as the Tasks List status column. */
export function EmployeeStatusPill({ status, className }: { status: string; className?: string }) {
  if (!status) return null;
  const key = status.trim().toLowerCase();
  const tone =
    key === 'active' || key === 'working' || key === 'confirmed'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : key === 'inactive' || key === 'resigned' || key === 'terminated' || key === 'left'
        ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
        : 'border-[var(--tm-border)] bg-[var(--tm-muted)] text-slate-300';

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-[0.02em]',
        tone,
        className
      )}
    >
      {status}
    </span>
  );
}

/** Icon · label · value row used by the details drawer and the full profile page. */
export function EmployeeFieldRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
}) {
  const hasValue = Boolean(value?.trim());
  return (
    <div className="grid grid-cols-[1.75rem_8.5rem_minmax(0,1fr)] items-center gap-x-2.5 py-2.5 border-b border-[var(--tm-border)]/70 last:border-b-0">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--tm-tint)] text-[#1E56A0] dark:text-[#4f86d1]">
        <Icon size={13} strokeWidth={1.75} />
      </span>
      <span className="truncate text-[12px] font-medium text-slate-400">{label}</span>
      <div className="min-w-0">
        {!hasValue ? (
          <span className="text-[13px] text-slate-500">{EMPTY_VALUE}</span>
        ) : href ? (
          <a
            href={href}
            className="block truncate text-[13px] font-medium text-[#1E56A0] dark:text-[#4f86d1] hover:underline underline-offset-2"
            title={value}
          >
            {value}
          </a>
        ) : (
          <span className="block break-words text-[13px] font-medium text-slate-100">{value}</span>
        )}
      </div>
    </div>
  );
}

/** Bordered white card with a muted title strip — the app's FilterPanel / DetailGroup chrome. */
export function EmployeeSection({
  title,
  icon: Icon,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Overrides the body padding (e.g. 'p-0' for an edge-to-edge field grid). */
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'min-w-0 overflow-hidden rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] px-4 py-2.5">
        {Icon ? (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-[#1E56A0] ring-1 ring-[#1E56A0]/12">
            <Icon size={12} strokeWidth={1.75} />
          </span>
        ) : null}
        <h2 className="text-[12px] font-semibold text-slate-100">{title}</h2>
      </div>
      <div className={cn('px-4 py-1', bodyClassName)}>{children}</div>
    </section>
  );
}
