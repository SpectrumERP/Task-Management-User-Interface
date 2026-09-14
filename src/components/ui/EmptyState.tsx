import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared empty composition for lists/tables.
 * Matches existing MasterEntityTable empty chrome — do not redesign.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  compact,
}: {
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10 min-h-[160px]' : 'p-10 min-h-[200px]',
        className
      )}
    >
      {Icon ? (
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--tm-tint)] text-brand/70">
          <Icon size={22} strokeWidth={1.75} />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-[11px] font-medium text-slate-400 leading-relaxed">{description}</p>
      ) : null}
      {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
