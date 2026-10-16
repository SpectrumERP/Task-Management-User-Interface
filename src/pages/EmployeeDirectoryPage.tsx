import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { compareSortValues, useTableSort } from '@/components/shared/useTableSort';
import { EmployeeListView } from '@/components/employee/EmployeeListView';
import { EmployeeDetailsDrawer } from '@/components/employee/EmployeeDetailsDrawer';
import { EmployeeFilterDrawer } from '@/components/employee/EmployeeFilterDrawer';
import { employeeService } from '@/services/employeeService';
import { exportEmployeesCsv } from '@/utils/exportEmployeesCsv';
import { useFormRights } from '@/hooks/useFormRights';
import { useAuthStore } from '@/store/useAuthStore';
import {
  EMPLOYEE_DIRECTORY_FORM_NO,
  EMPTY_EMPLOYEE_FILTERS,
  countActiveEmployeeFilters,
  toCompanyOptions,
  type EmployeeFilterOptions,
  type EmployeeFilters,
} from '@/lib/employeeDirectory';
import { cn } from '@/lib/utils';
import type { Employee, EmployeePage } from '@/types/employee';

/** Wait this long after the last keystroke before searching on the server. */
const SEARCH_DEBOUNCE_MS = 350;

function getEmployeeSortValue(employee: Employee, key: string): unknown {
  return (employee as unknown as Record<string, unknown>)[key] ?? '';
}

type Panel = 'none' | 'filters' | 'details';

/**
 * The open employee. Stepping past the first / last row of a page loads the neighbouring page and then
 * selects its last / first row ('edge'); until that page arrives the previous employee stays shown.
 */
type Selection = { employee: Employee } | { edge: 'first' | 'last'; previous: Employee };

export default function EmployeeDirectoryPage() {
  const { isSave, isUpdate } = useFormRights(EMPLOYEE_DIRECTORY_FORM_NO);
  const authCompanies = useAuthStore((state) => state.company);

  const [searchInput, setSearchInput] = useState('');
  /** Debounced search text actually sent to the API (KeywordSearch). */
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<EmployeeFilters>(EMPTY_EMPLOYEE_FILTERS);
  const [panel, setPanel] = useState<Panel>('none');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  /** The details drawer opens from the search box's right edge (desktop). */
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [pageSize, setPageSize] = useState(10);
  const [pageNo, setPageNo] = useState(1);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === keyword) return;
    const timer = window.setTimeout(() => {
      setKeyword(next);
      setPageNo(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, keyword]);

  // Paging, keyword and company are applied by GET /api/payroll/employees/search-data.
  // One result per request + Retry nonce; loading is "no result for the current request yet".
  const companyNo = Number(filters.companyNo) || undefined;
  const [reloadNonce, setReloadNonce] = useState(0);
  const requestKey = JSON.stringify([pageNo, pageSize, keyword, companyNo ?? null, reloadNonce]);
  const [result, setResult] = useState<{ key: string; page: EmployeePage | null } | null>(null);
  /** Unfiltered directory size, for the summary card (taken from a load with no search / filter). */

  useEffect(() => {
    let cancelled = false;
    employeeService
      .searchEmployees({ pageNo, pageSize, keyword, companyNo })
      .then((page) => {
        if (cancelled) return;
        setResult({ key: requestKey, page });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load employees:', err);
        setResult({ key: requestKey, page: null });
      });
    return () => {
      cancelled = true;
    };
  }, [pageNo, pageSize, keyword, companyNo, requestKey]);

  const isLoading = result?.key !== requestKey;
  // While the next page loads, the current rows stay on screen.
  const page = result?.page ?? null;
  const loadError = !isLoading && result != null && page == null;
  const employees = useMemo(() => page?.employees ?? [], [page]);
  const totalItems = page?.totalRecords ?? 0;
  const totalPages = Math.max(1, page?.totalPages ?? 1);
  const shownPageNo = page?.pageNo ?? pageNo;
  const shownPageSize = page?.pageSize ?? pageSize;
  const startIndex = totalItems === 0 ? 0 : (shownPageNo - 1) * shownPageSize;
  const endIndex = startIndex + employees.length;

  const reload = () => setReloadNonce((n) => n + 1);

  const filterOptions = useMemo<EmployeeFilterOptions>(
    () => ({ companyNo: toCompanyOptions(authCompanies) }),
    [authCompanies]
  );

  // The API has no sort parameter, so column sorting orders the rows of the loaded page.
  // Default: the API's own order (no column sorted).
  const { sortCol, sortDesc, handleSort, sortedRows } = useTableSort(employees, getEmployeeSortValue, {
    defaultKey: null,
  });

  const selectedEmployee: Employee | null = !selection
    ? null
    : 'employee' in selection
      ? selection.employee
      : isLoading
        ? selection.previous
        : (selection.edge === 'first' ? sortedRows[0] : sortedRows[sortedRows.length - 1]) ?? selection.previous;

  // Drawer stepper (‹ › / ↑ ↓): moves through the sorted page, then on to the neighbouring page.
  const selectedIndex = selectedEmployee ? sortedRows.findIndex((e) => e.empNo === selectedEmployee.empNo) : -1;
  const goPrev = useMemo(() => {
    if (isLoading || selectedIndex < 0 || !selectedEmployee) return undefined;
    if (selectedIndex > 0) return () => setSelection({ employee: sortedRows[selectedIndex - 1] });
    if (shownPageNo > 1) {
      return () => {
        setSelection({ edge: 'last', previous: selectedEmployee });
        setPageNo(shownPageNo - 1);
      };
    }
    return undefined;
  }, [isLoading, selectedIndex, selectedEmployee, sortedRows, shownPageNo]);
  const goNext = useMemo(() => {
    if (isLoading || selectedIndex < 0 || !selectedEmployee) return undefined;
    if (selectedIndex < sortedRows.length - 1) return () => setSelection({ employee: sortedRows[selectedIndex + 1] });
    if (shownPageNo < totalPages) {
      return () => {
        setSelection({ edge: 'first', previous: selectedEmployee });
        setPageNo(shownPageNo + 1);
      };
    }
    return undefined;
  }, [isLoading, selectedIndex, selectedEmployee, sortedRows, shownPageNo, totalPages]);

  const drawerFilterCount = countActiveEmployeeFilters(filters);
  const hasAnyFilter = Boolean(searchInput.trim()) || drawerFilterCount > 0;

  const clearAll = () => {
    setSearchInput('');
    setKeyword('');
    setFilters(EMPTY_EMPLOYEE_FILTERS);
    setPageNo(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setKeyword('');
    setPageNo(1);
  };

  const closePanel = useCallback(() => setPanel('none'), []);

  const openDetails = (employee: Employee) => {
    setSelection({ employee });
    setPanel('details');
  };

  /** Exports every employee matching the current search / filters (not just this page), in the current sort. */
  const handleExport = async () => {
    if (isExporting || totalItems === 0) return;
    setIsExporting(true);
    try {
      const all = await employeeService.searchEmployees({ pageNo: 1, pageSize: totalItems, keyword, companyNo });
      const rows = sortCol
        ? [...all.employees].sort((a, b) =>
            compareSortValues(getEmployeeSortValue(a, sortCol), getEmployeeSortValue(b, sortCol), sortDesc)
          )
        : all.employees;
      exportEmployeesCsv(rows);
    } catch (err) {
      console.error('Failed to export employees:', err);
      toast.error('Could not export employees. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
            {totalItems > 0 && (
              <Button
                variant="outline"
                onClick={() => void handleExport()}
                disabled={isExporting}
                className="h-9 px-3.5 text-[13px] font-semibold gap-1.5 rounded-[7px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:bg-[var(--tm-muted)]"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
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

        {/* <div className="mb-3">
          <EmployeeSummaryCards total={directoryTotal ?? totalItems} />
        </div> */}

        <div className="crm-toolbar">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <div ref={searchBoxRef} className="relative w-full sm:w-[22rem] sm:flex-none min-w-0">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none z-[1]"
                size={13}
                strokeWidth={2}
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, employee ID, email…"
                aria-label="Search employees"
                className={cn(
                  'crm-search-input pl-8 h-8 rounded-lg border-[var(--tm-border)] bg-[#F1F5F9] dark:bg-[var(--tm-surface)] text-slate-200 placeholder:text-slate-400 !text-xs w-full shadow-none focus-visible:ring-[3px] focus-visible:ring-[rgba(41,85,163,0.22)] focus-visible:ring-offset-0 focus-visible:border-[#1E56A0] focus-visible:bg-[var(--tm-surface)] transition-colors',
                  searchInput.trim() && 'pr-9'
                )}
              />
              {searchInput.trim() ? (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-[1]">
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearSearch}
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
              .map(([key, value]) => {
                const label = filterOptions[key].find((o) => o.value === value)?.label ?? value;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, [key]: '' }));
                      setPageNo(1);
                    }}
                    title={`Remove ${label}`}
                    className="inline-flex items-center gap-1 max-w-[240px] h-7 px-2.5 rounded-full border border-[#1E56A0]/25 bg-[var(--tm-tint)]/50 text-[#1E56A0] text-[11px] font-semibold hover:bg-[#1E56A0]/15 transition-colors"
                  >
                    <span className="truncate">{label}</span>
                    <X size={12} className="shrink-0 opacity-80" />
                  </button>
                );
              })}
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
            employees={sortedRows}
            isLoading={isLoading}
            loadError={loadError}
            onRetryLoad={reload}
            selectedEmpNo={panel === 'details' ? selectedEmployee?.empNo ?? null : null}
            onView={openDetails}
            onEdit={isUpdate ? handleEdit : undefined}
            onClearFilters={hasAnyFilter ? clearAll : undefined}
            sortCol={sortCol}
            sortDesc={sortDesc}
            onSort={handleSort}
          />
        </div>

        {totalItems > 0 && !loadError ? (
          <div className="mt-3">
            <MasterPaginationBar
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsPerPage={shownPageSize}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setPageNo(1);
              }}
              currentPage={shownPageNo}
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
        position={selectedIndex >= 0 ? { index: startIndex + selectedIndex, total: totalItems } : null}
        onPrev={goPrev}
        onNext={goNext}
      />
    </main>
  );
}
