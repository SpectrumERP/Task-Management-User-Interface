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
  const safeCurrentPage = currentPage;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-[#f8fbfd] border-t border-slate-100 gap-3 select-none shrink-0">
      <div className="text-[11px] text-slate-500 font-medium">
        Showing{' '}
        <span className="text-slate-800 font-semibold tabular-nums">
          {totalItems === 0 ? 0 : startIndex + 1}
        </span>{' '}
        to <span className="text-slate-800 font-semibold tabular-nums">{endIndex}</span> of{' '}
        <span className="text-slate-800 font-semibold tabular-nums">{totalItems}</span> records
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-slate-400">Per page</span>
        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-[8px] border border-slate-200/80">
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onItemsPerPageChange(size)}
              className={cn(
                'h-6 px-2.5 rounded-[6px] text-[10px] font-semibold tabular-nums transition-colors',
                itemsPerPage === size
                  ? 'bg-[#006699] text-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          className="h-7 w-7 rounded-[6px] text-slate-500 hover:bg-white disabled:opacity-40 border border-slate-200/80 bg-white shadow-none"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </Button>

        <div className="flex items-center gap-1">
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
                    <span className="text-[10px] font-medium text-slate-400 px-1 select-none">
                      ...
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={cn(
                      'h-7 w-7 rounded-[6px] text-[10px] font-semibold tabular-nums transition-colors flex items-center justify-center border',
                      isPageActive
                        ? 'bg-[#006699] border-[#006699] text-white'
                        : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
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
          className="h-7 w-7 rounded-[6px] text-slate-500 hover:bg-white disabled:opacity-40 border border-slate-200/80 bg-white shadow-none"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
