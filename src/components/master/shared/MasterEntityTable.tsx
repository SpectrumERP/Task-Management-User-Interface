import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';

function SortableHeader({ label, sortKey, sortCol, sortDesc, onSort }: { label: string, sortKey: string, sortCol: string | null, sortDesc: boolean, onSort: (k: string) => void }) {
  const isActive = sortCol === sortKey;
  return (
    <div 
      className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-200 transition-colors group/header"
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <span className="flex flex-col opacity-30 group-hover/header:opacity-100 transition-opacity">
         <ChevronUp size={10} className={cn("-mb-1", isActive && !sortDesc && "text-[#0EA5E9] opacity-100")} />
         <ChevronDown size={10} className={cn(isActive && sortDesc && "text-[#0EA5E9] opacity-100")} />
      </span>
    </div>
  );
}

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
  onDelete: (id: string, label?: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  isLoading?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
  emptyIcon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Optional label shown in delete confirm (UX only). */
  getDeleteLabel?: (row: T) => string;
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
  loadError,
  onRetryLoad,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No Records Found',
  emptyDescription = 'No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.',
  getDeleteLabel,
  embedded = false,
  footer,
}: MasterEntityTableProps<T>) {
  const shellClass = embedded
    ? 'flex flex-col min-h-0 max-h-full overflow-hidden'
    : 'flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden';

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      if (sortDesc) {
        setSortCol(null);
        setSortDesc(false);
      } else {
        setSortDesc(true);
      }
    } else {
      setSortCol(colKey);
      setSortDesc(false);
    }
  };

  const getSortValue = (row: any, key: string) => {
    if (key === 'code') return row.code || `SYS-${row.id}`;
    if (key === 'name') return row.name || row.title || row.description || '';
    return row[key] || '';
  };

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      let valA = getSortValue(a, sortCol);
      let valB = getSortValue(b, sortCol);
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [rows, sortCol, sortDesc]);

  const handleExport = () => {
    if (!rows || rows.length === 0) return;
    
    // Generic shallow flattening
    // Exclude 'id' and grab all primitive fields
    const keys = Object.keys(rows[0]).filter(k => k !== 'id');
    const separator = ',';
    
    const csvContent = [
      keys.join(separator),
      ...rows.map(row => 
        keys.map(k => {
          let cell = (row as any)[k];
          if (cell === null || cell === undefined) cell = '';
          else if (cell instanceof Date) cell = cell.toLocaleString();
          else if (typeof cell === 'object') cell = JSON.stringify(cell);
          else cell = String(cell);
          
          cell = cell.replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator)
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${nameHeader.replace(/\s+/g, '_').toLowerCase()}_export.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Loader only when there is nothing to show yet (first load / empty refetch).
  if (isLoading && rows.length === 0) {
    return (
      <div className={cn(shellClass, !embedded && 'bg-[var(--tm-surface)]')}>
        <div className="flex items-center justify-center p-10 min-h-[200px]">
          <BrandLoader size="sm" message="Loading records" />
        </div>
      </div>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className={cn(shellClass, !embedded && 'bg-[var(--tm-surface)]')}>
        <LoadErrorState
          title="Failed to load records"
          description="Could not load this master list. Retry runs the same search again."
          onRetry={onRetryLoad}
        />
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]/50 shrink-0">
        <span className="text-[11px] font-semibold text-slate-400">Total {rows.length} Records</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExport}
          className="h-7 px-3 text-[10px] font-semibold gap-1.5 rounded-[6px] border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 shadow-sm"
        >
          <Download size={12} />
          Export CSV
        </Button>
      </div>
      <div className="overflow-auto min-h-0 max-h-[calc(100dvh-13.5rem)]">
        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-2 p-2">
          {sortedRows.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/50 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-[#0EA5E9] tabular-nums">{getCode(item)}</p>
                  <div className="mt-0.5 text-sm font-semibold text-slate-100 line-clamp-2">{getName(item)}</div>
                  {columns.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {columns.slice(0, 3).map((col, idx) => (
                        <div key={idx} className="min-w-0 text-[10px] text-slate-400">
                          <span className="font-medium text-slate-500">{col.header}: </span>
                          <span className="text-slate-300">{col.render(item)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-1 text-[10px] text-slate-500 truncate">
                    {item.createdBy || 'System'}
                    {item.createdDate
                      ? ` · ${format(new Date(item.createdDate), 'MMM dd, yyyy')}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canUpdate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      aria-label="Edit"
                      onClick={() => onEdit(item)}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                    >
                      <Edit size={14} />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => {
                        const fallback = (item as { name?: string }).name || item.code || item.id;
                        onDelete(item.id, getDeleteLabel?.(item) || String(fallback));
                      }}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <table className="tm-data-table hidden md:table w-full border-collapse text-left min-w-[720px]">
          <thead className="sticky top-0 z-10 bg-[var(--tm-elevated)] backdrop-blur-sm border-b border-[var(--tm-border)]">
            <tr>
              <th className="px-3 py-2 pl-4 text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[110px]">
                <SortableHeader label="Code" sortKey="code" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 min-w-[140px]">
                <SortableHeader label={nameHeader} sortKey="name" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap',
                    col.headerClassName || col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 min-w-[100px]">
                <SortableHeader label="Created By" sortKey="createdBy" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[160px]">
                <SortableHeader label="Created Date" sortKey="createdDate" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              <th className="px-3 py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-300 w-[88px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((item) => (
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
                        title="Edit"
                        aria-label="Edit"
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
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => {
                          const fallback = (item as { name?: string }).name || item.code || item.id;
                          onDelete(item.id, getDeleteLabel?.(item) || String(fallback));
                        }}
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
