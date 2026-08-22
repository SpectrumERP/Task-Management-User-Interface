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
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-50/70 border-t border-slate-100 gap-4 select-none mt-auto shrink-0">
      {/* Left Side: Range Info */}
      <div className="text-[11px] text-slate-500 font-medium">
        Showing <span className="text-slate-800 font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
        <span className="text-slate-800 font-medium">{endIndex}</span> of{" "}
        <span className="text-slate-800 font-medium">{totalItems}</span> records
      </div>

      {/* Center: Items Per Page Selector */}
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-medium text-slate-400  ">Per Page:</span>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onItemsPerPageChange(size)}
              className={cn(
                "h-6 px-2.5 rounded-md text-[10px] font-medium tracking-wide uppercase transition-all",
                itemsPerPage === size
                  ? "bg-[#006699] text-white shadow-sm font-medium"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Right Side: Page Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
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
                  {hasGap && (
                    <span className="text-[10px] font-medium text-slate-400 px-1 select-none">
                      ...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={cn(
                      "h-7 w-7 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center border shadow-sm",
                      isPageActive
                        ? "bg-[#006699] border-[#006699] text-white font-medium shadow-md shadow-[#006699]/10"
                        : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          className="h-7 w-7 rounded-lg text-slate-505 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
