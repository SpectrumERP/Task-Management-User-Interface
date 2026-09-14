import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUtcDateTime, toUtcMs } from '@/lib/dateTime';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionTip, TruncatedText, nodeToPlainText } from './TruncatedCellTip';
import { SortableHeader, sortHeaderCellProps, useTableSort } from '@/components/shared/useTableSort';

/** Sticky column policy (wide desktop tables): Code left, Actions right. */

export interface MasterColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Row field / key used for column sorting. Defaults to header slug if omitted. */
  sortKey?: string;
  getSortValue?: (row: T) => unknown;
  /**
   * When false, render the cell node as-is (chips/badges).
   * Default true flattens via TruncatedText (legacy master behavior).
   */
  plainText?: boolean;
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
  /** Initial sort column (default: name). */
  defaultSortKey?: string | null;
  /**
   * When true, render getName() as React (color chips / badges).
   * Sort/export still use plain text via getName or row.name.
   */
  nameAsRich?: boolean;
}

function columnSortKey<T>(col: MasterColumn<T>, index: number): string {
  if (col.sortKey) return col.sortKey;
  return `col:${index}:${col.header}`;
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
  defaultSortKey = 'code',
  nameAsRich = false,
}: MasterEntityTableProps<T>) {
  const shellClass = embedded
    ? 'flex flex-col min-h-0 max-h-full overflow-hidden'
    : 'flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden';

  const getSortValue = useCallback((row: T, key: string) => {
    if (key === 'code') return row.code || `SYS-${row.id}`;
    if (key === 'name') return (row as { name?: string }).name || nodeToPlainText(getName(row)) || '';
    if (key === 'createdBy') return row.createdBy || '';
    if (key === 'createdDate') {
      const raw = row.createdDate;
      const t = toUtcMs(raw);
      return t ?? raw ?? '';
    }

    const colIdx = columns.findIndex((c, i) => columnSortKey(c, i) === key);
    if (colIdx >= 0) {
      const col = columns[colIdx];
      if (col.getSortValue) return col.getSortValue(row);
      if (col.sortKey && col.sortKey in (row as object)) return (row as Record<string, unknown>)[col.sortKey];
      return nodeToPlainText(col.render(row));
    }
    return (row as Record<string, unknown>)[key] ?? '';
  }, [columns, getName]);

  const { sortCol, sortDesc, handleSort, sortedRows } = useTableSort(rows, getSortValue, {
    defaultKey: defaultSortKey,
    defaultDesc: false,
  });

  const handleExport = () => {
    if (!sortedRows || sortedRows.length === 0) return;
    
    // Generic shallow flattening
    // Exclude 'id' and grab all primitive fields
    const keys = Object.keys(sortedRows[0]).filter(k => k !== 'id');
    const separator = ',';
    
    const csvContent = [
      keys.join(separator),
      ...sortedRows.map(row => 
        keys.map(k => {
          let cell = (row as any)[k];
          if (cell === null || cell === undefined) cell = '';
          else if (cell instanceof Date) cell = formatUtcDateTime(cell);
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
        <EmptyState icon={EmptyIcon} title={emptyTitle} description={emptyDescription} />
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
                  <TruncatedText text={String(nodeToPlainText(getCode(item)) || '')} className="text-[10px] font-semibold text-[#0EA5E9] tabular-nums" />
                  <div className="mt-0.5 min-w-0">
                    {nameAsRich ? (
                      <div className="flex items-center gap-1.5 min-w-0 text-sm font-semibold text-slate-100">{getName(item)}</div>
                    ) : (
                      <TruncatedText text={nodeToPlainText(getName(item))} className="text-sm font-semibold text-slate-100" />
                    )}
                  </div>
                  {columns.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {columns.slice(0, 3).map((col, idx) => {
                        if (col.plainText === false) {
                          return (
                            <div key={idx} className="min-w-0 max-w-full text-[10px] text-slate-400">
                              <span className="font-medium text-slate-500">{col.header}: </span>
                              <div className="mt-0.5">{col.render(item)}</div>
                            </div>
                          );
                        }
                        const cell = nodeToPlainText(col.render(item));
                        return (
                          <div key={idx} className="min-w-0 max-w-full text-[10px] text-slate-400">
                            <span className="font-medium text-slate-500">{col.header}: </span>
                            <div className="inline-block min-w-0 max-w-[10rem] align-bottom">
                              <TruncatedText text={cell || '-'} className="text-slate-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="mt-1 min-w-0">
                    <TruncatedText
                      text={`${item.createdBy || 'System'}${item.createdDate ? ` · ${formatUtcDateTime(item.createdDate)}` : ''}`}
                      className="text-[10px] text-slate-500"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-center gap-0.5">
                  {canUpdate ? (
                    <ActionTip label="Edit">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                      >
                        <Edit size={14} />
                      </Button>
                    </ActionTip>
                  ) : null}
                  {canDelete ? (
                    <ActionTip label="Delete">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => {
                          const fallback = (item as { name?: string }).name || item.code || item.id;
                          onDelete(item.id, getDeleteLabel?.(item) || String(fallback));
                        }}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </ActionTip>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <table className="tm-data-table hidden md:table w-full min-w-[1100px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="tm-col-id-col" style={{ width: 'var(--tm-col-id-width)' }} />
            <col />
            {columns.map((_, idx) => (
              <col
                key={idx}
                style={{
                  width: /description/i.test(columns[idx].header) || columns[idx].sortKey === 'description'
                    ? '22%'
                    : '12%',
                }}
              />
            ))}
            <col style={{ width: '9.5rem' }} />
            <col style={{ width: '10.5rem' }} />
            <col style={{ width: '4.5rem' }} />
          </colgroup>
          <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
            <tr>
              <th
                className="tm-col-id tm-col-sticky-code sticky left-0 z-[45] px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.28)] cursor-pointer"
                {...sortHeaderCellProps('code', handleSort)}
              >
                <SortableHeader label="Code" sortKey="code" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} className="pr-1" />
              </th>
              <th className="min-w-[140px] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('name', handleSort)}>
                <SortableHeader label={nameHeader} sortKey="name" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              {columns.map((col, idx) => {
                const key = columnSortKey(col, idx);
                const isDescription = /description/i.test(col.header) || col.sortKey === 'description';
                return (
                  <th
                    key={idx}
                    className={cn(
                      'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer',
                      isDescription ? 'min-w-[160px]' : 'min-w-[110px]',
                      col.headerClassName || col.className
                    )}
                    {...sortHeaderCellProps(key, handleSort)}
                  >
                    <SortableHeader
                      label={col.header}
                      sortKey={key}
                      sortCol={sortCol}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                  </th>
                );
              })}
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('createdBy', handleSort)}>
                <SortableHeader label="Created By" sortKey="createdBy" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('createdDate', handleSort)}>
                <SortableHeader label="Created Date" sortKey="createdDate" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
              </th>
              <th className="tm-col-actions sticky right-0 z-40 px-1 py-2.5 pr-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.35)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((item) => {
              const codeText = nodeToPlainText(getCode(item)) || String(item.code || `SYS-${item.id}`);
              const nameText = nodeToPlainText(getName(item)) || String((item as { name?: string }).name || '');
              const createdByText = item.createdBy || 'System';
              const createdDateText = item.createdDate
                ? formatUtcDateTime(item.createdDate)
                : 'N/A';
              return (
              <tr
                key={item.id}
                className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors group"
              >
                <td className="tm-col-id tm-col-sticky-code sticky left-0 z-20 px-2 py-2.5 align-middle min-w-0 overflow-hidden border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]">
                  <TruncatedText
                    text={codeText}
                    className="text-[11px] font-medium text-[#0EA5E9] tabular-nums"
                  />
                </td>
                <td className="tm-col-primary px-3 py-2.5 border-r border-[var(--tm-border)] align-middle min-w-0 overflow-hidden">
                  {nameAsRich ? (
                    <div className="flex items-center gap-1.5 min-w-0 font-medium text-slate-50">{getName(item)}</div>
                  ) : (
                    <TruncatedText text={nameText} className="font-medium text-slate-50" />
                  )}
                </td>
                {columns.map((col, idx) => {
                  const cellNode = col.render(item);
                  const asPlain = col.plainText !== false;
                  if (!asPlain) {
                    return (
                      <td
                        key={idx}
                        className={cn('px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0', col.className)}
                      >
                        {cellNode}
                      </td>
                    );
                  }
                  const cellText = nodeToPlainText(cellNode);
                  return (
                    <td
                      key={idx}
                      className={cn('px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0 overflow-hidden', col.className)}
                    >
                      <TruncatedText text={cellText || '-'} className="text-slate-300" />
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 border-r border-[var(--tm-border)] align-middle min-w-0 overflow-hidden">
                  <TruncatedText text={createdByText} className="text-slate-300" />
                </td>
                <td className="px-3 py-2.5 border-r border-[var(--tm-border)] align-middle min-w-0 overflow-hidden">
                  <TruncatedText text={createdDateText} className="text-slate-300 tabular-nums" />
                </td>
                <td className="tm-col-actions sticky right-0 z-10 px-1 py-2.5 pr-2 text-center align-middle whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                  <div className="inline-flex items-center justify-center gap-0">
                    {canUpdate ? (
                      <ActionTip label="Edit">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => onEdit(item)}
                          className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                        >
                          <Edit size={13} />
                        </Button>
                      </ActionTip>
                    ) : null}
                    {canDelete ? (
                      <ActionTip label="Delete">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => {
                            const fallback = (item as { name?: string }).name || item.code || item.id;
                            onDelete(item.id, getDeleteLabel?.(item) || String(fallback));
                          }}
                          className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </ActionTip>
                    ) : null}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
