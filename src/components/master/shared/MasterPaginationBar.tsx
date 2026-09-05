import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasterPaginationBarProps {
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  onItemsPerPageChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Hide pagination when there are 9 or fewer records. */
export const PAGINATION_VISIBLE_AFTER = 9;

export function MasterPaginationBar({
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  totalPages,
  onPageChange,
}: MasterPaginationBarProps) {
  if (totalItems <= PAGINATION_VISIBLE_AFTER) {
    return null;
  }

  const safeCurrentPage = currentPage;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 bg-[var(--tm-elevated)] border-t border-[var(--tm-border)] select-none shrink-0"
      data-page-tour="master-pagination"
    >
      {/* Left — fixed column, won't move when right side changes */}
      <div className="text-[11px] text-slate-500 font-medium justify-self-start min-w-0 truncate">
        Showing{' '}
        <span className="text-slate-100 font-semibold tabular-nums">
          {totalItems === 0 ? 0 : startIndex + 1}
        </span>{' '}
        to <span className="text-slate-100 font-semibold tabular-nums">{endIndex}</span> of{' '}
        <span className="text-slate-100 font-semibold tabular-nums">{totalItems}</span> records
      </div>

      {/* Center — stays centered in middle track */}
      <div className="flex items-center gap-2 justify-self-center">
        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">Per page</span>
        <div className="flex items-center gap-0.5 bg-[var(--tm-surface)] p-0.5 rounded-[8px] border border-[var(--tm-border)]/80">
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onItemsPerPageChange(size)}
              className={cn(
                'h-6 w-8 rounded-[6px] text-[10px] font-semibold tabular-nums transition-colors',
                itemsPerPage === size
                  ? 'bg-[#0EA5E9] text-white'
                  : 'text-slate-500 hover:text-slate-100 hover:bg-[var(--tm-muted)]'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Right — pinned to end of third column */}
      <div className="flex items-center gap-1 justify-self-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          className="h-7 w-7 shrink-0 rounded-[6px] text-slate-500 hover:bg-[var(--tm-surface)] disabled:opacity-40 border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] shadow-none"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </Button>

        <div className="flex items-center justify-end gap-1 min-w-[7.5rem]">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - safeCurrentPage) <= 1
              );
            })
            .map((page, idx, arr) => {
              const isPageActive = safeCurrentPage === page;
              const hasGap = idx > 0 && page - arr[idx - 1] > 1;

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
                      'h-7 w-7 shrink-0 rounded-[6px] text-[10px] font-semibold tabular-nums transition-colors flex items-center justify-center border',
                      isPageActive
                        ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                        : 'bg-[var(--tm-surface)] border-[var(--tm-border)]/80 text-slate-300 hover:bg-[var(--tm-muted)]'
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
          disabled={safeCurrentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          className="h-7 w-7 shrink-0 rounded-[6px] text-slate-500 hover:bg-[var(--tm-surface)] disabled:opacity-40 border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] shadow-none"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
