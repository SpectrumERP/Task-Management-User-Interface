import type { ComponentType, ReactNode } from 'react';
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
}: CompanyFormSectionProps) {
  return (
    <section
      className={cn(
        'rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <Icon size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-1">
              {title}
            </h2>
            {description ? (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {withBody && children != null ? (
        <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
