import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { useTableSort } from '@/components/shared/useTableSort';
import { EmployeeListView } from '@/components/employee/EmployeeListView';
import { EmployeeSummaryCards } from '@/components/employee/EmployeeSummaryCards';
import { EmployeeDetailsDrawer } from '@/components/employee/EmployeeDetailsDrawer';
import { EmployeeFilterDrawer } from '@/components/employee/EmployeeFilterDrawer';
import { employeeService } from '@/services/employeeService';
import { exportEmployeesCsv } from '@/utils/exportEmployeesCsv';
import { useFormRights } from '@/hooks/useFormRights';
import {
  EMPLOYEE_DIRECTORY_FORM_NO,
  EMPTY_EMPLOYEE_FILTERS,
  countActiveEmployeeFilters,
  type EmployeeFilterOptions,
  type EmployeeFilters,
} from '@/lib/employeeDirectory';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types/employee';

const SEARCH_FIELDS: (keyof Employee)[] = [
  'empCode',
  'empName',
  'designation',
  'department',
  'jobDescription',
  'companyName',
  'workLocation',
  'email',
  'phone',
  'extension',
];

function distinctSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

function getEmployeeSortValue(employee: Employee, key: string): unknown {
  return (employee as unknown as Record<string, unknown>)[key] ?? '';
}

type Panel = 'none' | 'filters' | 'details';

export default function EmployeeDirectoryPage() {
  const { isSave, isUpdate } = useFormRights(EMPLOYEE_DIRECTORY_FORM_NO);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<EmployeeFilters>(EMPTY_EMPLOYEE_FILTERS);
  const [panel, setPanel] = useState<Panel>('none');
  const [selectedEmpNo, setSelectedEmpNo] = useState<number | null>(null);

  /** The details drawer opens from the search box's right edge (desktop). */
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [pageSize, setPageSize] = useState(10);
  const [pageNo, setPageNo] = useState(1);

  // Bumping the nonce refetches (Retry); state is only set once the request settles.
  const [reloadNonce, setReloadNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    employeeService
      .getEmployees()
      .then((result) => {
        if (cancelled) return;
        setEmployees(result.employees);
        setLoadError(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load employees:', err);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const reload = () => {
    setIsLoading(true);
    setLoadError(false);
    setReloadNonce((n) => n + 1);
  };

  const filterOptions = useMemo<EmployeeFilterOptions>(
    () => ({
      department: distinctSorted(employees.map((e) => e.department)),
      designation: distinctSorted(employees.map((e) => e.designation)),
      companyName: distinctSorted(employees.map((e) => e.companyName)),
      workLocation: distinctSorted(employees.map((e) => e.workLocation)),
      status: distinctSorted(employees.map((e) => e.status)),
    }),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = (Object.entries(filters) as [keyof EmployeeFilters, string][]).filter(([, v]) => v);
    return employees.filter((e) => {
      if (active.some(([key, value]) => e[key] !== value)) return false;
      if (!q) return true;
      return SEARCH_FIELDS.some((f) => String(e[f] ?? '').toLowerCase().includes(q));
    });
  }, [employees, search, filters]);

  // Sort the whole filtered set (A–Z by name by default), then page it.
  const { sortCol, sortDesc, handleSort, sortedRows } = useTableSort(filteredEmployees, getEmployeeSortValue, {
    defaultKey: 'empName',
    defaultDesc: false,
  });

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePageNo = Math.min(pageNo, totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePageNo - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedEmployees = useMemo(() => sortedRows.slice(startIndex, endIndex), [sortedRows, startIndex, endIndex]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.empNo === selectedEmpNo) ?? null,
    [employees, selectedEmpNo]
  );

  // Drawer stepper (‹ › / ↑ ↓): moves through the filtered, sorted list and keeps the table on the right page.
  const selectedIndex = selectedEmpNo == null ? -1 : sortedRows.findIndex((e) => e.empNo === selectedEmpNo);
  const goToIndex = useCallback(
    (index: number) => {
      const target = sortedRows[index];
      if (!target) return;
      setSelectedEmpNo(target.empNo);
      setPageNo(Math.floor(index / pageSize) + 1);
    },
    [sortedRows, pageSize]
  );
  const goPrev = useMemo(
    () => (selectedIndex > 0 ? () => goToIndex(selectedIndex - 1) : undefined),
    [selectedIndex, goToIndex]
  );
  const goNext = useMemo(
    () => (selectedIndex >= 0 && selectedIndex < sortedRows.length - 1 ? () => goToIndex(selectedIndex + 1) : undefined),
    [selectedIndex, sortedRows.length, goToIndex]
  );

  const drawerFilterCount = countActiveEmployeeFilters(filters);
  const hasAnyFilter = Boolean(search.trim()) || drawerFilterCount > 0;

  const clearAll = () => {
    setSearch('');
    setFilters(EMPTY_EMPLOYEE_FILTERS);
    setPageNo(1);
  };

  const closePanel = useCallback(() => setPanel('none'), []);

  const openDetails = (employee: Employee) => {
    setSelectedEmpNo(employee.empNo);
    setPanel('details');
  };

  // TODO: wire to the payroll employee create / update endpoints once they are available.
  const handleAdd = () => toast.info('Adding employees is not available yet.');
  const handleEdit = (employee: Employee) =>
    toast.info(`Editing ${employee.empName || 'employees'} is not available yet.`);

  return (
    <main
      className={cn(
        'page-shell gap-4',
        // Filters push the page (as on the Tasks List); Employee Details opens over it.
        panel === 'filters' && 'lg:[--tm-filters-drawer-width:min(100vw,18rem)]'
      )}
    >
      <AppBreadcrumbBar
        items={[{ label: 'Masters' }, { label: 'Employee Directory', current: true }]}
        bleed
        className="mb-[var(--page-gap)]"
      />

      {/* Page header + summary + toolbar: the Tasks List white band, edge to edge, line below */}
      <div className="crm-page-band shrink-0 -ml-[var(--page-pad-x)] -mr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))] -mt-[var(--page-pad)] px-[var(--page-pad-x)] pt-4 pb-3 bg-[var(--tm-surface)] border-b border-[var(--tm-border)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-50">Employee Directory</h1>
            <p className="mt-0.5 text-[13px] text-slate-400">Search and manage company employees</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filteredEmployees.length > 0 && (
              <Button
                variant="outline"
                onClick={() => exportEmployeesCsv(sortedRows)}
                className="h-9 px-3.5 text-[13px] font-semibold gap-1.5 rounded-[7px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:bg-[var(--tm-muted)]"
              >
                <Download size={14} />
                Export CSV
              </Button>
            )}
            {isSave && (
              <Button
                type="button"
                onClick={handleAdd}
                className="h-9 px-4 rounded-[7px] bg-[#1E56A0] hover:bg-[#17457F] text-white text-[13px] font-semibold gap-1.5"
              >
                <Plus size={15} strokeWidth={2.4} />
                Add Employee
              </Button>
            )}
          </div>
        </div>

        <div className="mb-3">
          <EmployeeSummaryCards
            total={employees.length}
            departments={filterOptions.department.length}
            locations={filterOptions.workLocation.length}
          />
        </div>

        <div className="crm-toolbar">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <div ref={searchBoxRef} className="relative w-full sm:w-[22rem] sm:flex-none min-w-0">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none z-[1]"
                size={13}
                strokeWidth={2}
              />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageNo(1);
                }}
                placeholder="Search name, employee ID, designation…"
                aria-label="Search employees"
                className={cn(
                  'crm-search-input pl-8 h-8 rounded-lg border-[var(--tm-border)] bg-[#F1F5F9] dark:bg-[var(--tm-surface)] text-slate-200 placeholder:text-slate-400 !text-xs w-full shadow-none focus-visible:ring-[3px] focus-visible:ring-[rgba(41,85,163,0.22)] focus-visible:ring-offset-0 focus-visible:border-[#1E56A0] focus-visible:bg-[var(--tm-surface)] transition-colors',
                  search.trim() && 'pr-9'
                )}
              />
              {search.trim() ? (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-[1]">
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearch('');
                      setPageNo(1);
                    }}
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)] transition-colors"
                  >
                    <X size={13} strokeWidth={2.25} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="flex items-center overflow-hidden rounded-[7px] border border-[var(--tm-border)] bg-[var(--tm-surface)] shrink-0 flex-1 sm:flex-initial">
                <ActionTip label="Filters">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPanel((p) => (p === 'filters' ? 'none' : 'filters'))}
                    className={cn(
                      'h-[30px] px-3 rounded-none border-0 bg-transparent text-slate-300 font-medium text-[11px] normal-case transition-all duration-200 gap-1.5 shadow-none shrink-0 flex-1 sm:flex-initial justify-center hover:bg-[var(--tm-surface)] hover:text-slate-100 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
                      panel === 'filters' &&
                        'bg-[var(--tm-surface)] text-[#1E56A0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-[#1E56A0]/15 hover:bg-[var(--tm-surface)] hover:text-[#1E56A0]',
                      drawerFilterCount > 0 && panel !== 'filters' && 'text-[#1E56A0]'
                    )}
                  >
                    <SlidersHorizontal
                      size={14}
                      strokeWidth={1.75}
                      className={cn((panel === 'filters' || drawerFilterCount > 0) && 'text-[#1E56A0]')}
                    />
                    <span className="hidden sm:inline">Filters</span>
                    {drawerFilterCount > 0 && (
                      <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#1E56A0] px-1 text-[9px] font-bold text-white">
                        {drawerFilterCount}
                      </span>
                    )}
                  </Button>
                </ActionTip>
                {hasAnyFilter ? (
                  <ActionTip label="Reset all filters">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Reset all filters"
                      onClick={clearAll}
                      className="h-[30px] px-3 rounded-none border-0 border-l border-[var(--tm-border)] text-slate-400 hover:text-slate-200 bg-transparent hover:bg-[var(--tm-surface)] hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)] shadow-none transition-all gap-1.5 shrink-0 flex items-center justify-center font-medium text-[11px] normal-case"
                    >
                      <RotateCcw size={14} strokeWidth={1.75} />
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                  </ActionTip>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {drawerFilterCount > 0 && (
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 mt-2 px-0.5 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mr-0.5">Active</span>
            {(Object.entries(filters) as [keyof EmployeeFilters, string][])
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, [key]: '' }));
                    setPageNo(1);
                  }}
                  title={`Remove ${value}`}
                  className="inline-flex items-center gap-1 max-w-[240px] h-7 px-2.5 rounded-full border border-[#1E56A0]/25 bg-[var(--tm-tint)]/50 text-[#1E56A0] text-[11px] font-semibold hover:bg-[#1E56A0]/15 transition-colors"
                >
                  <span className="truncate">{value}</span>
                  <X size={12} className="shrink-0 opacity-80" />
                </button>
              ))}
            <button
              type="button"
              onClick={clearAll}
              className="h-7 px-2.5 rounded-full text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)] transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="crm-list-page flex-1 min-h-0 flex flex-col overflow-hidden pt-3 -mb-[var(--page-pad)] -ml-[var(--page-pad-x)] -mr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))]">
        <div className="flex-1 min-h-0 overflow-hidden pl-[var(--page-pad-x)] pr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))]">
          <EmployeeListView
            employees={pagedEmployees}
            isLoading={isLoading}
            loadError={loadError}
            onRetryLoad={reload}
            selectedEmpNo={panel === 'details' ? selectedEmpNo : null}
            onView={openDetails}
            onEdit={isUpdate ? handleEdit : undefined}
            onClearFilters={hasAnyFilter ? clearAll : undefined}
            sortCol={sortCol}
            sortDesc={sortDesc}
            onSort={handleSort}
          />
        </div>

        {totalItems > 0 ? (
          <div className="mt-3">
            <MasterPaginationBar
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsPerPage={pageSize}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setPageNo(1);
              }}
              currentPage={safePageNo}
              totalPages={totalPages}
              onPageChange={setPageNo}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        ) : null}
      </div>

      <EmployeeFilterDrawer
        open={panel === 'filters'}
        onClose={closePanel}
        filters={filters}
        options={filterOptions}
        onChange={(next) => {
          setFilters(next);
          setPageNo(1);
        }}
      />
      <EmployeeDetailsDrawer
        employee={selectedEmployee}
        open={panel === 'details'}
        onClose={closePanel}
        alignLeftTo={searchBoxRef}
        position={selectedIndex >= 0 ? { index: selectedIndex, total: sortedRows.length } : null}
        onPrev={goPrev}
        onNext={goNext}
      />
    </main>
  );
}
