import React, { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pageSizesForTotal } from '@/lib/pageSizes';

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
  /** Hide bar when totalItems is at or below this (masters). Use 0 to always show. */
  hideBelow?: number;
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

  if (totalItems === 0 || totalItems <= hideBelow) return null;
  if (sizes.length === 0) return null;

  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-[var(--tm-elevated)] border-t border-[var(--tm-border)] select-none shrink-0"
      data-page-tour="master-pagination"
    >
      <div className="text-[11px] text-slate-500 font-medium justify-self-center sm:justify-self-start min-w-0 truncate order-1 sm:order-none tabular-nums">
        Showing{' '}
        <span className="text-slate-100 font-semibold">
          {totalItems === 0 ? 0 : startIndex + 1}
        </span>{' '}
        to <span className="text-slate-100 font-semibold">{endIndex}</span> of{' '}
        <span className="text-slate-100 font-semibold">{totalItems}</span> records
      </div>

      <div className="flex items-center gap-2 justify-self-center order-3 sm:order-none w-full sm:w-auto justify-center">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
          Per Page:
        </span>
        <div className="flex items-center gap-0.5 bg-[var(--tm-surface)] p-0.5 rounded-lg border border-[var(--tm-border)]">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onItemsPerPageChange(size)}
              className={cn(
                'h-6 w-9 rounded-md text-[10px] font-semibold tabular-nums tracking-wide transition-all',
                itemsPerPage === size
                  ? 'bg-[#0EA5E9] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 justify-self-center sm:justify-self-end order-2 sm:order-none">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          className="h-7 w-7 shrink-0 rounded-lg text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </Button>

        <div className="flex items-center justify-end gap-1">
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
                    onClick={() => onPageChange(page)}
                    className={cn(
                      'h-7 w-7 shrink-0 rounded-lg text-[10px] font-semibold tabular-nums transition-colors flex items-center justify-center border',
                      isPageActive
                        ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white shadow-sm'
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
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          className="h-7 w-7 shrink-0 rounded-lg text-slate-500 hover:bg-[var(--tm-muted)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
