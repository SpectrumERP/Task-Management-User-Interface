import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface MasterColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface MasterEntityTableProps<T extends { id: string; code?: string; createdBy?: string; createdDate?: string }> {
  rows: T[];
  nameHeader: string;
  columns?: MasterColumn<T>[];
  getCode: (row: T) => React.ReactNode;
  getName: (row: T) => React.ReactNode;
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  isLoading?: boolean;
  emptyIcon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  /** When true, skips outer card chrome (use inside a parent section with pagination). */
  embedded?: boolean;
  footer?: React.ReactNode;
}

export function MasterEntityTable<T extends { id: string; code?: string; createdBy?: string; createdDate?: string }>({
  rows,
  nameHeader,
  columns = [],
  getCode,
  getName,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  isLoading,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No Records Found',
  emptyDescription = 'No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.',
  embedded = false,
  footer,
}: MasterEntityTableProps<T>) {
  const shellClass = embedded
    ? 'flex flex-col min-h-0 max-h-full overflow-hidden'
    : 'flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden';

  if (isLoading) {
    return (
      <div className={cn(shellClass, !embedded && 'bg-[var(--tm-surface)]')}>
        <div className="flex items-center justify-center gap-2 p-10 text-sm font-medium text-slate-500 min-h-[200px]">
          <Loader2 className="h-4 w-4 animate-spin text-[#0EA5E9]" />
          Loading records...
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn(shellClass, !embedded && 'bg-[var(--tm-surface)]')}>
        <div className="flex flex-col items-center justify-center p-10 text-center min-h-[200px]">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--tm-tint)] text-[#0EA5E9]/70">
            <EmptyIcon size={22} strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{emptyTitle}</h3>
          <p className="mt-1 max-w-sm text-[11px] font-medium text-slate-400 leading-relaxed">
            {emptyDescription}
          </p>
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className={cn(shellClass, !embedded && 'bg-[var(--tm-surface)]')} data-page-tour="master-table">
      <div className="overflow-auto min-h-0 max-h-[calc(100dvh-13.5rem)]">
        <table className="tm-data-table w-full border-collapse text-left table-fixed">
          <thead className="sticky top-0 z-10 bg-[var(--tm-elevated)] backdrop-blur-sm border-b border-[var(--tm-border)]">
            <tr>
              <th className="px-3 py-2 pl-4 text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[110px]">
                Code
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[18%]">
                {nameHeader}
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500',
                    col.headerClassName || col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[16%]">
                Created By
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[160px]">
                Created Date
              </th>
              <th className="px-3 py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[88px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors group"
              >
                <td className="px-3 py-2 pl-4">
                  <span className="text-[11px] font-medium text-[#0EA5E9] whitespace-nowrap tabular-nums">
                    {getCode(item)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-slate-100 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 truncate">{getName(item)}</div>
                </td>
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    className={cn('px-3 py-2 text-xs font-medium text-slate-300 min-w-0', col.className)}
                  >
                    <div className="min-w-0 truncate">{col.render(item)}</div>
                  </td>
                ))}
                <td className="px-3 py-2 text-xs font-medium text-slate-300 min-w-0 truncate">
                  {item.createdBy || 'System'}
                </td>
                <td className="px-3 py-2 text-xs font-medium text-slate-300 whitespace-nowrap">
                  {item.createdDate
                    ? format(new Date(item.createdDate), 'MMM dd, yyyy h:mm a')
                    : 'N/A'}
                </td>
                <td className="px-3 py-2 pr-4 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {canUpdate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                      >
                        <Edit size={13} />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item.id)}
                        className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
