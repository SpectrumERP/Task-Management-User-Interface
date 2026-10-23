import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Settings2, Users } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ActionTip, TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { SortableHeader, sortHeaderCellProps } from '@/components/shared/useTableSort';
import { DataTableScroll } from '@/components/shared/DataTableScroll';
import { RowEditIcon, RowViewIcon } from '@/components/shared/RowIcons';
import type { Employee } from '@/types/employee';
import { EmployeeAvatar, EmployeeStatusPill } from './employeeShared';
import { PersonHoverCard, PersonName } from '@/components/ui/PersonHoverCard';
import { employeeRef } from '@/lib/personDetails';

export type EmployeeColumnKey =
  | 'profile'
  | 'empCode'
  | 'empName'
  | 'department'
  | 'companyName'
  | 'workLocation'
  | 'email'
  | 'phone'
  | 'jobDescription'
  | 'extension'
  | 'actions';

interface ColumnDef {
  key: EmployeeColumnKey;
  label: string;
  defaultVisible: boolean;
  width: string;
  sortable: boolean;
}

/* Order and names as agreed for the directory. Widths fit each full header label + sort mark (no "…"). */
const COLUMNS: ColumnDef[] = [
  { key: 'profile', label: 'Profile Photo', defaultVisible: true, width: '7.5rem', sortable: false },
  { key: 'empName', label: 'Employee Name', defaultVisible: true, width: '11rem', sortable: true },
  { key: 'empCode', label: 'Employee ID', defaultVisible: true, width: '8.75rem', sortable: true },
  { key: 'department', label: 'Department', defaultVisible: true, width: '9rem', sortable: true },
  { key: 'jobDescription', label: 'Job Description', defaultVisible: true, width: '16rem', sortable: true },
  { key: 'companyName', label: 'Company Name', defaultVisible: true, width: '9.75rem', sortable: true },
  { key: 'workLocation', label: 'Work Location', defaultVisible: true, width: '9.75rem', sortable: true },
  { key: 'email', label: 'Email', defaultVisible: true, width: '14rem', sortable: true },
  { key: 'phone', label: 'Phone No.', defaultVisible: true, width: '8.5rem', sortable: true },
  { key: 'extension', label: 'Extension Number', defaultVisible: true, width: '11rem', sortable: true },
  { key: 'actions', label: 'Actions', defaultVisible: true, width: '', sortable: false },
];

/** Pinned on horizontal scroll (must be the leading columns). Employee ID scrolls with the rest. */
const STICKY_LEFT_KEYS: EmployeeColumnKey[] = ['profile', 'empName'];

/** Same fixed Actions width as the Tasks List (label + column toggle + View/Edit). */
const ACTIONS_COL_PX = 118;
const COLUMNS_STORAGE_KEY = 'employeeDirectoryColumns.v2';
const ALWAYS_VISIBLE: EmployeeColumnKey[] = ['empName', 'actions'];

const cellOverflowClass = 'px-3 py-1.5 border-r border-[var(--tm-border)] text-slate-300 align-middle overflow-hidden max-w-0';

function remToPx(value: string): number {
  return value.endsWith('rem') ? (parseFloat(value) || 0) * 16 : parseFloat(value) || 120;
}

function readVisibleColumns(): Set<EmployeeColumnKey> {
  let cols = new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
  try {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (saved) cols = new Set(JSON.parse(saved) as EmployeeColumnKey[]);
  } catch {
    /* storage blocked or bad JSON — defaults */
  }
  ALWAYS_VISIBLE.forEach((k) => cols.add(k));
  return cols;
}

interface EmployeeListViewProps {
  employees: Employee[];
  isLoading?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
  selectedEmpNo?: number | null;
  onView: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onClearFilters?: () => void;
  sortCol: string | null;
  sortDesc: boolean;
  onSort: (key: string) => void;
}

export function EmployeeListView({
  employees,
  isLoading,
  loadError,
  onRetryLoad,
  selectedEmpNo,
  onView,
  onEdit,
  onClearFilters,
  sortCol,
  sortDesc,
  onSort,
}: EmployeeListViewProps) {
  const [visibleColumns, setVisibleColumns] = useState<Set<EmployeeColumnKey>>(readVisibleColumns);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingColumns, setPendingColumns] = useState<Set<EmployeeColumnKey>>(visibleColumns);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch {
      /* storage blocked — in-memory only */
    }
  }, [visibleColumns]);

  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      setPendingColumns(new Set(visibleColumns));
      setColumnSearchQuery('');
    }
    setDropdownOpen(open);
  };

  const visibleCols = useMemo(() => COLUMNS.filter((c) => visibleColumns.has(c.key)), [visibleColumns]);

  const tableMinWidthPx = useMemo(
    () =>
      Math.max(
        visibleCols.reduce((sum, c) => sum + (c.key === 'actions' ? ACTIONS_COL_PX : remToPx(c.width)), 0),
        640
      ),
    [visibleCols]
  );

  const colWidthStyle = useCallback((col: ColumnDef) => {
    const w = col.key === 'actions' ? ACTIONS_COL_PX : col.width;
    return { width: w, minWidth: w, maxWidth: w };
  }, []);

  /** Left offset of each pinned column = widths of the pinned columns before it. */
  const stickyLeft = useMemo(() => {
    const offsets: Partial<Record<EmployeeColumnKey, string>> = {};
    let left: string[] = [];
    for (const col of visibleCols) {
      if (!STICKY_LEFT_KEYS.includes(col.key)) continue;
      offsets[col.key] = left.length ? `calc(${left.join(' + ')})` : '0px';
      left = [...left, col.width];
    }
    return offsets;
  }, [visibleCols]);

  const cellStyle = (col: ColumnDef) => {
    const left = stickyLeft[col.key];
    return left ? { ...colWidthStyle(col), left } : colWidthStyle(col);
  };

  /** Right-most visible pinned column — it alone carries the edge shadow while scrolled. */
  const lastStickyKey = useMemo(
    () => [...visibleCols].reverse().find((c) => STICKY_LEFT_KEYS.includes(c.key))?.key,
    [visibleCols]
  );

  /** Pinned cells keep the zebra / hover background so scrolled content never shows through. */
  const stickyClass = (key: EmployeeColumnKey, header: boolean) =>
    !STICKY_LEFT_KEYS.includes(key)
      ? undefined
      : cn(
          'tm-sticky-cell',
          'sticky',
          header ? 'z-[45] bg-[var(--tm-elevated)]' : 'z-20',
          key === lastStickyKey && 'tm-sticky-edge'
        );

  if (isLoading && employees.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center">
        <BrandLoader size="sm" message="Loading employees" />
      </div>
    );
  }

  if (loadError && employees.length === 0) {
    return (
      <LoadErrorState
        title="Failed to load employees"
        description="Could not load the employee directory. Retry uses the same filters — nothing else changes."
        onRetry={onRetryLoad}
        className="h-full"
      />
    );
  }

  if (employees.length === 0) {
    return (
      <EmptyState
        className="h-full"
        icon={Users}
        title="No employees found"
        description={onClearFilters ? 'Try a different search or clear the filters.' : 'No employees are available yet.'}
        actions={
          onClearFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClearFilters}
              className="h-9 px-4 rounded-lg border-[var(--tm-border)] text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-[var(--tm-muted)] gap-1.5"
            >
              Clear filters
            </Button>
          ) : null
        }
      />
    );
  }

  const renderCell = (employee: Employee, key: EmployeeColumnKey) => {
    switch (key) {
      case 'profile':
        return (
          <div className="flex w-full justify-center">
            <PersonHoverCard person={employeeRef(employee.empNo)} name={employee.empName}>
              <EmployeeAvatar employee={employee} className="h-8 w-8 text-[11px]" />
            </PersonHoverCard>
          </div>
        );
      case 'empCode':
        return <TruncatedText text={employee.empCode} className="text-left text-[#0EA5E9]" />;
      case 'empName':
        return (
          <PersonName
            person={employeeRef(employee.empNo)}
            name={employee.empName}
            className="block tm-text-semibold text-slate-50 group-hover:text-[#1E56A0] transition-colors"
          />
        );
      case 'email':
        return employee.email ? (
          <a
            href={`mailto:${employee.email}`}
            onClick={(e) => e.stopPropagation()}
            className="block min-w-0 text-[#0EA5E9] hover:underline underline-offset-2"
          >
            <TruncatedText text={employee.email} />
          </a>
        ) : null;
      default:
        return (
          <TruncatedText
            text={String((employee as unknown as Record<string, unknown>)[key] ?? '')}
            className="text-slate-200"
          />
        );
    }
  };

  const tableColgroup = (
    <colgroup>
      {visibleCols.map((col) => (
        <col key={col.key} style={colWidthStyle(col)} />
      ))}
    </colgroup>
  );

  const renderActions = (employee: Employee) => (
    <div className="flex h-7 w-full items-center justify-center gap-0.5">
      <ActionTip label="View">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`View ${employee.empName}`}
          onClick={(e) => {
            e.stopPropagation();
            onView(employee);
          }}
          className="h-7 w-7 shrink-0 rounded-md p-0 text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
        >
          <RowViewIcon />
        </Button>
      </ActionTip>
      {onEdit ? (
        <ActionTip label="Edit">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${employee.empName}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(employee);
            }}
            className="h-7 w-7 shrink-0 rounded-md p-0 text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
          >
            <RowEditIcon />
          </Button>
        </ActionTip>
      ) : null}
    </div>
  );

  return (
    <DataTableScroll
      className="h-full"
      minWidth={tableMinWidthPx}
      mobile={
        <div className="flex flex-col gap-2 p-2 sm:p-3">
          {employees.map((employee) => (
            <div
              key={employee.empNo}
              role="button"
              tabIndex={0}
              onClick={() => onView(employee)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onView(employee);
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left shadow-sm transition-colors cursor-pointer active:bg-[var(--tm-muted)]',
                selectedEmpNo === employee.empNo
                  ? 'border-[#1E56A0]/40 bg-[var(--tm-row-hover)]'
                  : 'border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/60'
              )}
            >
              <EmployeeAvatar employee={employee} className="h-10 w-10 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[12px] text-[#0EA5E9] tabular-nums">{employee.empCode}</span>
                  <EmployeeStatusPill status={employee.status} className="text-[9px]" />
                </div>
                <PersonName
                  person={employeeRef(employee.empNo)}
                  name={employee.empName}
                  className="block text-sm font-semibold text-slate-100 leading-snug"
                />
                <TruncatedText
                  text={[employee.department, employee.workLocation].filter(Boolean).join(' · ')}
                  className="text-[11px] text-slate-400"
                />
              </div>
            </div>
          ))}
        </div>
      }
      header={
        <table className="tm-data-table table-fixed text-left w-full">
          {tableColgroup}
          <thead className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 tracking-wide">
            <tr>
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-1.5 border-r border-[var(--tm-border)] last:border-r-0 relative text-left whitespace-nowrap overflow-hidden',
                    col.key === 'actions' &&
                      'tm-col-actions px-1.5 !text-center sticky right-0 z-40 bg-[var(--tm-elevated)] border-l border-[var(--tm-border)]',
                    stickyClass(col.key, true)
                  )}
                  style={cellStyle(col)}
                  {...(col.sortable ? sortHeaderCellProps(col.key, onSort) : {})}
                >
                  {col.key === 'actions' ? (
                    <div className="flex items-center justify-center gap-0.5 w-full min-w-0">
                      <span className="whitespace-nowrap">Actions</span>
                      <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
                        <ActionTip label="Toggle columns">
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Toggle columns"
                              className="h-6 w-6 shrink-0 px-0 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[var(--tm-muted)]"
                            >
                              <Settings2 size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                        </ActionTip>
                        <DropdownMenuContent
                          align="end"
                          className={cn(
                            'w-56 p-0 overflow-hidden flex flex-col',
                            'max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))]',
                            'rounded-xl border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-lg'
                          )}
                          onInteractOutside={() => setDropdownOpen(false)}
                        >
                          <div className="shrink-0 px-3 pt-2.5 pb-2 space-y-2 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]">
                            <DropdownMenuLabel className="p-0 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                              Toggle Columns
                            </DropdownMenuLabel>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                              <Input
                                placeholder="Search columns..."
                                value={columnSearchQuery}
                                onChange={(e) => setColumnSearchQuery(e.target.value)}
                                className="h-8 w-full pl-8 text-xs bg-[var(--tm-surface)] border-[var(--tm-border)]"
                              />
                            </div>
                          </div>
                          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                            {COLUMNS.filter((c) =>
                              c.label.toLowerCase().includes(columnSearchQuery.toLowerCase())
                            ).map((c) => (
                              <DropdownMenuCheckboxItem
                                key={c.key}
                                checked={pendingColumns.has(c.key)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() =>
                                  setPendingColumns((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(c.key)) next.delete(c.key);
                                    else next.add(c.key);
                                    return next;
                                  })
                                }
                                disabled={ALWAYS_VISIBLE.includes(c.key)}
                                className="text-xs"
                              >
                                {c.label}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </div>
                          <div className="shrink-0 flex justify-end gap-2 px-2.5 py-2 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)]">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDropdownOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                              onClick={() => {
                                const next = new Set(pendingColumns);
                                ALWAYS_VISIBLE.forEach((k) => next.add(k));
                                setVisibleColumns(next);
                                setDropdownOpen(false);
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : col.sortable ? (
                    <div className="flex items-center justify-start w-full min-w-0 h-full pr-2 text-left">
                      <SortableHeader
                        label={col.label}
                        sortKey={col.key}
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={onSort}
                        className="min-w-0 w-full justify-start"
                      />
                    </div>
                  ) : (
                    <span
                      className={cn(
                        'inline-flex min-h-[1.75rem] items-center',
                        col.key === 'profile' && 'w-full justify-center'
                      )}
                    >
                      {col.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      }
      body={
        <table className="tm-data-table table-fixed text-left w-full">
          {tableColgroup}
          <tbody className="divide-y divide-[var(--tm-border)]">
            {employees.map((employee) => (
              <tr
                key={employee.empNo}
                data-selected={selectedEmpNo === employee.empNo ? 'true' : undefined}
                aria-selected={selectedEmpNo === employee.empNo}
                onClick={() => onView(employee)}
                className="group transition-colors cursor-pointer"
              >
                {visibleCols.map((col) =>
                  col.key === 'actions' ? (
                    <td
                      key={col.key}
                      className="px-1.5 py-1.5 align-middle text-center sticky right-0 z-[35] tm-col-actions tm-sticky-cell border-l border-[var(--tm-border)] bg-[var(--tm-surface)]"
                      style={colWidthStyle(col)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderActions(employee)}
                    </td>
                  ) : (
                    <td
                      key={col.key}
                      className={cn(
                        cellOverflowClass,
                        col.key === 'empName' && 'tm-col-primary',
                        stickyClass(col.key, false)
                      )}
                      style={stickyLeft[col.key] ? cellStyle(col) : undefined}
                    >
                      {renderCell(employee, col.key)}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}
