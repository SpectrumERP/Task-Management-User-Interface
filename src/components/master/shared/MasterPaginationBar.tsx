import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pageSizesForTotal } from '@/lib/pageSizes';
import { BrandLoader } from '@/components/ui/BrandLoader';

/** How long the page-change loader covers the list (same as the Spectrum CRM). */
const PAGE_LOADER_MS = 380;

interface MasterPaginationBarProps {
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  onItemsPerPageChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Defaults to 10 / 25 / 50 / 100 (task list style). */
  pageSizeOptions?: number[];
  /** Pager buttons only above this many records (CRM: 10). The "Showing …" count always shows. */
  hideBelow?: number;
  /** Show the Per Page picker. Off gives the CRM pager: count left, « ‹ pages › » right. */
  showPageSize?: boolean;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function MasterPaginationBar({
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  totalPages,
  onPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  hideBelow = 10,
  showPageSize = false,
}: MasterPaginationBarProps) {
  const allSizes = pageSizeOptions.length > 0 ? pageSizeOptions : DEFAULT_PAGE_SIZE_OPTIONS;
  // Only sizes useful for this total (e.g. 20 records → 10, 25 — not 50/100)
  const sizes = useMemo(
    () => pageSizesForTotal(allSizes, totalItems),
    // allSizes identity: join is enough for stable compare of option lists
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalItems, allSizes.join(',')]
  );

  useEffect(() => {
    if (totalItems === 0 || totalItems <= hideBelow) return;
    if (sizes.length === 0) return;
    if (!sizes.includes(itemsPerPage)) {
      onItemsPerPageChange(sizes[0]!);
    }
  }, [totalItems, hideBelow, sizes, itemsPerPage, onItemsPerPageChange]);

  // CRM-style page-change loader: brief branded overlay on the list while the rows swap.
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setBusy(false), PAGE_LOADER_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  const goToPage = (page: number) => {
    if (busy || page === currentPage) return;
    setBusy(true);
    onPageChange(page);
  };

  const changePageSize = (size: number) => {
    if (busy || size === itemsPerPage) return;
    setBusy(true);
    onItemsPerPageChange(size);
  };

  if (totalItems === 0) return null;
  // CRM: the count on the left always; « ‹ pages › » only when there is more than one screenful.
  const showPager = totalItems > hideBelow;

  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  return (
    <div
      className={cn(
        'w-full min-w-0 shrink-0 select-none',
        'bg-[var(--tm-surface)] border-t border-[var(--tm-border)]',
        // Desktop: fixed bar height, matching the sidebar's profile footer.
        'lg:h-[var(--crm-footer-h)] lg:py-0',
        'px-3 sm:px-5 py-3',
        // Mobile: vertical stack (count → pages → per page)
        'flex flex-col items-center gap-2.5',
        // Tablet: controlled wrap, no horizontal overflow
        'sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2',
        // Desktop: preserve original 3-column horizontal layout
        'lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-3'
      )}
      data-page-tour="master-pagination"
    >
      {busy ? (
        <div
          className="absolute inset-0 z-[60] grid place-items-center bg-[var(--tm-page)]/40 backdrop-blur-[1px]"
          role="status"
          aria-busy="true"
        >
          <BrandLoader size="sm" message="Loading" />
        </div>
      ) : null}
      {/* Record count — left on desktop */}
      <div
        className={cn(
          'text-[13px] text-slate-500 tabular-nums leading-snug',
          'min-w-0 max-w-full w-full sm:w-auto',
          'text-center sm:text-left',
          'break-words lg:truncate',
          'lg:justify-self-start'
        )}
      >
        Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems}
      </div>

      {/* Per page — center on desktop; row 3 on mobile */}
      {showPageSize && sizes.length > 0 && (
      <div
        className={cn(
          'flex items-center justify-center gap-2 shrink-0',
          'order-3 w-full sm:w-auto',
          'sm:order-2 lg:order-none lg:justify-self-center'
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
          Per Page:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-0.5 bg-[var(--tm-surface)] p-0.5 rounded-lg border border-[var(--tm-border)]">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => changePageSize(size)}
              className={cn(
                // Desktop/tablet: original h-6 w-9; mobile: slightly larger tap target
                'h-7 w-10 sm:h-6 sm:w-9 rounded-md text-[10px] font-semibold tabular-nums tracking-wide transition-all',
                itemsPerPage === size
                  ? 'bg-[#1E56A0] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#1E56A0] hover:bg-[var(--tm-muted)]'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Page controls — right on desktop; row 2 on mobile */}
      {showPager ? (
      <div
        className={cn(
          'flex flex-wrap items-center justify-center gap-1 min-w-0 max-w-full',
          'order-2 w-full sm:w-auto',
          'sm:order-3 sm:ml-auto sm:justify-end',
          'lg:order-none lg:ml-0 lg:justify-self-end',
          !showPageSize && 'lg:col-start-3'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy || safeCurrentPage === 1}
          onClick={() => goToPage(1)}
          aria-label="First page"
          className="h-9 w-9 shrink-0 rounded-[7px] text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--tm-border)] bg-[var(--tm-surface)]"
        >
          <ChevronsLeft size={15} strokeWidth={2} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy || safeCurrentPage === 1}
          onClick={() => goToPage(Math.max(1, safeCurrentPage - 1))}
          aria-label="Previous page"
          className="h-9 w-9 shrink-0 rounded-[7px] text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--tm-border)] bg-[var(--tm-surface)]"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </Button>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1 max-w-full">
          {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1)
            .filter((page) => {
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - safeCurrentPage) <= 1
              );
            })
            .map((page, idx, arr) => {
              const isPageActive = safeCurrentPage === page;
              const hasGap = idx > 0 && page - arr[idx - 1]! > 1;

              return (
                <React.Fragment key={page}>
                  {hasGap ? (
                    <span className="text-[10px] font-medium text-slate-400 w-4 text-center select-none shrink-0">
                      ...
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => goToPage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={isPageActive ? 'page' : undefined}
                    className={cn(
                      'h-9 w-9 shrink-0 rounded-[7px] text-[13px] font-semibold tabular-nums transition-colors flex items-center justify-center border',
                      isPageActive
                        ? 'bg-[#1E56A0] border-[#1E56A0] text-white shadow-sm'
                        : 'bg-[var(--tm-surface)] border-[var(--tm-border)] text-slate-300 hover:bg-[var(--tm-muted)]'
                    )}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy || safeCurrentPage >= totalPages}
          onClick={() => goToPage(Math.min(totalPages, safeCurrentPage + 1))}
          aria-label="Next page"
          className="h-9 w-9 shrink-0 rounded-[7px] text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--tm-border)] bg-[var(--tm-surface)]"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy || safeCurrentPage >= totalPages}
          onClick={() => goToPage(totalPages)}
          aria-label="Last page"
          className="h-9 w-9 shrink-0 rounded-[7px] text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--tm-border)] bg-[var(--tm-surface)]"
        >
          <ChevronsRight size={15} strokeWidth={2} />
        </Button>
      </div>
      ) : null}
    </div>
  );
}
