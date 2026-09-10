import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Plus } from 'lucide-react';
import { MasterBreadcrumb } from './MasterBreadcrumb';
import { PageGuideButton } from '@/components/layout/PageGuideButton';

interface MasterListHeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  canAdd: boolean;
  children?: React.ReactNode;
  searchPlaceholder?: string;
  /** Optional forced guide key (e.g. master-company) */
  guideKey?: string;
}

export function MasterListHeader({
  title,
  searchQuery,
  onSearchChange,
  onAddClick,
  canAdd,
  children,
  searchPlaceholder,
  guideKey,
}: MasterListHeaderProps) {
  return (
    <>
      <div
        className="-mx-[var(--page-pad)] -mt-[var(--page-pad)] shrink-0 z-20 bg-[var(--tm-surface)] border-b border-[var(--tm-border)]/70 px-4 py-2.5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]"
        data-page-tour="master-breadcrumb"
      >
        <div className="flex items-center justify-between gap-2">
          <MasterBreadcrumb
            items={[
              { label: 'Masters' },
              { label: title, current: true },
            ]}
          />
          <PageGuideButton guideKey={guideKey} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        <div
          className="flex-1 flex items-center gap-2.5 h-10 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] px-3 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)]"
          data-page-tour="master-search"
        >
          <Search size={15} className="text-slate-400 shrink-0" strokeWidth={1.75} />
          <Input
            placeholder={searchPlaceholder || `Search ${title.toLowerCase()} records by name, code...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-200 h-full p-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400 flex-1"
          />
          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSearchChange('')}
              className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-slate-300 hover:bg-[var(--tm-muted)] shrink-0"
            >
              <X size={14} />
            </Button>
          ) : null}
        </div>

        {children}

        {canAdd ? (
          <Button
            type="button"
            onClick={onAddClick}
            data-page-tour="master-add"
            className="h-10 px-4 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20 font-semibold text-xs gap-1.5 shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Record
          </Button>
        ) : null}
      </div>
    </>
  );
}
