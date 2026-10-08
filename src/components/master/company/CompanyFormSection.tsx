import { useEffect, useId, useState, type ComponentType, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyFormSectionProps {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When false, omit padded body wrapper (header-only / custom body). */
  withBody?: boolean;
  /** Header toggles the body open/closed. */
  collapsible?: boolean;
  /** Initial state when collapsible. */
  defaultOpen?: boolean;
  /** Opens the section whenever this becomes true (has data, has an error). */
  autoOpen?: boolean;
  /** Item count shown next to the title (lists). */
  count?: number;
}

export function CompanyFormSection({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  withBody = true,
  collapsible = false,
  defaultOpen = false,
  autoOpen = false,
  count,
}: CompanyFormSectionProps) {
  const [open, setOpen] = useState(!collapsible || defaultOpen || autoOpen);
  const bodyId = useId();

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const isOpen = !collapsible || open;

  const heading = (
    <>
      <span className="crm-form-section-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-1.5">
          {title}
          {count != null ? (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--tm-tint)] px-1.5 text-[10px] font-semibold tabular-nums text-[#0EA5E9]">
              {count}
            </span>
          ) : null}
        </h2>
        {description ? (
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{description}</p>
        ) : null}
      </div>
    </>
  );

  return (
    <section
      className={cn(
        'rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-3 bg-[var(--tm-elevated)] rounded-t-[8px]',
          isOpen ? 'border-b border-[var(--tm-border)]' : 'rounded-b-[8px]'
        )}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            className="flex flex-1 items-center gap-2.5 min-w-0 text-left rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/30"
          >
            <ChevronDown
              size={15}
              className={cn('shrink-0 text-slate-400 transition-transform duration-200', !isOpen && '-rotate-90')}
            />
            {heading}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">{heading}</div>
        )}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div id={bodyId} hidden={!isOpen}>
        {withBody && children != null ? (
          <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Light divider + label that groups fields inside one section card. */
export function CompanyFormSubheading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 mb-3', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">{children}</span>
      <span className="h-px flex-1 bg-[var(--tm-border)]/70" />
    </div>
  );
}
