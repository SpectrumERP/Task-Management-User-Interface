import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { masterNavLabel, masterTypeFromPath } from './masterLabels';

interface MasterListHeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  canAdd: boolean;
  children?: ReactNode;
  searchPlaceholder?: string;
  /** Optional forced guide key (e.g. master-company) */
  guideKey?: string;
  /** Record count shown in the CRM page title ("Category Master - 12"). */
  count?: number;
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
  count,
}: MasterListHeaderProps) {
  const masterType = masterTypeFromPath(useLocation().pathname);
  const crumbLabel = masterType ? masterNavLabel(masterType, title) : title;

  return (
    <>
      <AppBreadcrumbBar
        items={[
          { label: 'Masters' },
          { label: crumbLabel, current: true },
        ]}
        guideKey={guideKey}
        bleed
        className="shrink-0"
        data-page-tour="master-breadcrumb"
      />

      {/* CRM page band: title + primary action, then search / filters toolbar */}
      <div className="crm-band">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="crm-page-title text-slate-50">
            {title}
            {count != null ? ` - ${count}` : ''}
          </h1>
          {canAdd ? (
            <Button
              type="button"
              onClick={onAddClick}
              data-page-tour="master-add"
              className="h-9 px-4 rounded-[7px] bg-[#1E56A0] hover:bg-[#17457F] text-white font-semibold text-[13px] gap-1.5 shrink-0"
            >
              <Plus size={15} strokeWidth={2.4} />
              Add
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="crm-search w-full sm:w-[18rem]" data-page-tour="master-search">
            <Search size={13} className="text-[#94a3b8] shrink-0" strokeWidth={2} />
            <Input
              placeholder={searchPlaceholder || `Search ${title.toLowerCase()} records by name, code...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="!bg-transparent border-none text-[13px] text-slate-200 h-full p-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400 flex-1"
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
        </div>
      </div>
    </>
  );
}
