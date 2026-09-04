import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MasterBreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface MasterBreadcrumbProps {
  items: MasterBreadcrumbItem[];
  className?: string;
}

/** Matches TaskDetail breadcrumb: Tasks List > Create Task */
export function MasterBreadcrumb({ items, className }: MasterBreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-sm font-semibold min-w-0', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCurrent = item.current ?? isLast;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight size={14} className="text-slate-400 shrink-0" aria-hidden />
            ) : null}

            {item.href && !isCurrent ? (
              <button
                type="button"
                onClick={() => navigate(item.href!)}
                className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded truncate"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={cn(
                  'truncate',
                  isCurrent
                    ? 'text-slate-900 font-bold tracking-tight'
                    : 'text-slate-500'
                )}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
