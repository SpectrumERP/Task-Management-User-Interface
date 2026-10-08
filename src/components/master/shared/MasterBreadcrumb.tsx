import React, { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface MasterBreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  /** Optional chip/badge rendered immediately after this crumb label */
  endAdornment?: ReactNode;
}

interface MasterBreadcrumbProps {
  items: MasterBreadcrumbItem[];
  className?: string;
}

/** CRM chevron separator (10px, faint). */
function CrumbSep() {
  return (
    <svg className="mx-0.5 shrink-0 text-[#94a3b8]" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Same look as the Spectrum CRM breadcrumb: Tasks List > Create Task */
export function MasterBreadcrumb({ items, className }: MasterBreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#7a8494]', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCurrent = item.current ?? isLast;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <CrumbSep />
            ) : null}

            <span className="inline-flex min-w-0 items-center gap-1.5">
              {item.href && !isCurrent ? (
                <button
                  type="button"
                  onClick={() => navigate(item.href!)}
                  className="shrink-0 whitespace-nowrap rounded-sm font-semibold text-[#1E56A0] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0] dark:text-[#7AA7E6] dark:focus-visible:outline-[#7AA7E6]"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={cn(
                    'min-w-0 truncate font-semibold leading-snug',
                    isCurrent
                      ? 'text-[#0c1a3a] dark:text-[#E2E8F0]'
                      : 'text-[#7a8494]'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {item.endAdornment ? (
                <span className="shrink-0">{item.endAdornment}</span>
              ) : null}
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
