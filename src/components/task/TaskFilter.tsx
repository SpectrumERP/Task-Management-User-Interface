import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Search, RotateCcw, SlidersHorizontal, Layers, Tag, Calendar as CalendarIcon, Clipboard, ChevronDown, Plus, LayoutGrid, List as ListIcon, X, User, CircleHelp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_TEXT_STYLE } from '@/lib/fieldStyles';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { Combobox } from '@/components/ui/Combobox';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { useAuthStore } from '@/store/useAuthStore';
import { UserType } from '@/types/enums';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettings } from '@/hooks/useSettings';
import { forceStartPageGuide } from '@/components/layout/InternalPageGuideTour';
import { STATUS_PILL_ORDER, isAllFilterSentinel, sumStatusPillCounts, toStatusPillToken, getStatusPillClass } from '@/lib/taskStatusGroups';
import { formatDateOnly, toUtcIso } from '@/lib/dateTime';

function isAllFillValueId(
  id: string | undefined,
  rows: Array<{ id: number | string; label: string }> | undefined
): boolean {
  if (!id || !rows?.length) return false;
  const row = rows.find((r) => String(r.id) === String(id));
  return row ? isAllFilterSentinel(row.label) : false;
}

const filterControlClass =
  'h-10 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-none text-xs text-slate-200 focus:ring-2 focus:ring-[#0EA5E9]/15';

function FilterFieldLabel({
  icon: Icon,
  children,
  required,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 mb-1">
      {Icon ? (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--tm-tint)] text-[#0EA5E9]">
          <Icon size={11} strokeWidth={1.75} />
        </span>
      ) : null}
      <span>{children}</span>
      {required ? <span className="text-red-500 leading-none text-[12px]">*</span> : null}
    </label>
  );
}

function FilterPanel({
  title,
  icon: Icon,
  children,
  className,
  cols = 2,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3;
}) {
  return (
    <div className={cn('rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-w-0', className)}>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
        {Icon ? (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
            <Icon size={12} strokeWidth={1.75} />
          </span>
        ) : null}
        <p className="text-[12px] font-semibold text-slate-100">{title}</p>
      </div>
      <div
        className={cn(
          'p-3 grid gap-3',
          cols === 1 && 'grid-cols-1',
          cols === 2 && 'grid-cols-1 sm:grid-cols-2',
          cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface FilterFormValues {
  taskCode?: string;
  title?: string;
  operTaskCategoryNo?: string;
  operTaskPriorityNo?: string;
  operTaskStatusNo?: string;
  operTaskLocationNo?: string;
  operTaskTypeNo?: string;
  operTaskCompanyNo?: string;
  ownerLoginNo?: string;
  fromDueDate?: Date;
  toDueDate?: Date;
  companyNo?: string;
  filterType?: string;
  sortingColumnName?: string;
  sortingType?: string;
  folderNo?: string;
  isAllFolder?: boolean;
  loginNo?: string;
  fromCreatedDate?: Date;
  toCreatedDate?: Date;
}

interface TaskFilterProps {
  onFilter: (filters: Record<string, unknown>) => void;
  className?: string;
  viewMode?: 'list' | 'board' | 'calendar';
  onViewModeChange?: (mode: 'list' | 'board' | 'calendar') => void;
  onCreateTask?: () => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  hideCategoryFilter?: boolean;
  /** Bump to force a full filter reset (e.g. empty-state Clear filters). */
  clearNonce?: number;
}

export function TaskFilter({
  onFilter,
  className,
  viewMode,
  onViewModeChange,
  onCreateTask,
  showFilters,
  onToggleFilters,
  hideCategoryFilter = false,
  clearNonce = 0,
}: TaskFilterProps) {
  const authCompanies = useAuthStore((state) => state.company);
  const authUser = useAuthStore((state) => state.user);
  const tasksForStatusCounts = useTaskStore(state => state.tasksForStatusCounts);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasksForStatusCounts.forEach(task => {
      if (task.status) {
        counts[task.status] = (counts[task.status] || 0) + 1;
      }
    });
    return counts;
  }, [tasksForStatusCounts]);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1).toString();
  const isGeneralUser = Number(authUser?.UserType || authUser?.userType) === UserType.General;

  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const [personLabels, setPersonLabels] = useState<Record<string, string>>({});
  const { fetchFillValues, setSearchKeyword } = useTaskStore();
  const selectedFolder = useTaskStore((state) => state.selectedFolder);
  const { isHideType, isHideFolder } = useSettings();

  const sortingColumnOptions = (fillValues?.sortingColumns || [])
    .filter(sc => {
      const name = sc.DisplayName?.toLowerCase() || '';
      if (hideCategoryFilter && name.includes('category')) return false;
      if (isHideType && name.includes('type')) return false;
      if (isHideFolder && name.includes('folder')) return false;
      return true;
    })
    .map(sc => ({ value: sc.SortingColumnName, label: sc.DisplayName }));

  const { control, handleSubmit, reset, watch, setValue, getValues } = useForm<FilterFormValues>({
    defaultValues: {
      taskCode: '',
      title: '',
      operTaskCategoryNo: '',
      operTaskPriorityNo: '',
      operTaskStatusNo: '',
      operTaskLocationNo: '',
      operTaskTypeNo: '',
      ownerLoginNo: '',
      fromDueDate: undefined,
      toDueDate: undefined,
      companyNo,
      filterType: 'All',
      sortingColumnName: '',
      sortingType: '',
      folderNo: selectedFolder?.TaskFolderNo.toString(),
      isAllFolder: false,
      loginNo: isGeneralUser ? (authUser?.loginNo || authUser?.LoginNo || '').toString() : '',
      fromCreatedDate: undefined,
      toCreatedDate: undefined,
    }
  });

  const taskCodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (taskCodeDebounceRef.current) clearTimeout(taskCodeDebounceRef.current);
    };
  }, []);

  // State to track the actually applied filters (only updated on Submit/Reset/Badge Clear)
  const [appliedFilters, setAppliedFilters] = useState<FilterFormValues>({
    companyNo,
    filterType: 'All',
    loginNo: isGeneralUser ? (authUser?.loginNo || authUser?.LoginNo || '').toString() : '',
  });

  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);

  const isFiltersOpen = showFilters !== undefined ? showFilters : showFiltersOnMobile;
  const toggleFilters = onToggleFilters || (() => setShowFiltersOnMobile(!showFiltersOnMobile));

  const watchedTitle = watch('title');
  const watchedAllFolder = watch('isAllFolder');
  const watchedStatus = watch('operTaskStatusNo');
  const watchedDrawerPriority = watch('operTaskPriorityNo');
  const watchedDrawerTaskCode = watch('taskCode');
  const watchedDrawerCategory = watch('operTaskCategoryNo');
  const watchedDrawerOwner = watch('ownerLoginNo');
  const watchedFromDueDate = watch('fromDueDate');
  const watchedToDueDate = watch('toDueDate');

  /** True when any Filters-drawer field (not status pills / search) has a value. */
  const hasDrawerFilterChanges = Boolean(
    String(watchedDrawerPriority || '').trim() ||
    String(watchedDrawerTaskCode || '').trim() ||
    String(watchedDrawerCategory || '').trim() ||
    String(watchedDrawerOwner || '').trim() ||
    watchedFromDueDate ||
    watchedToDueDate
  );

  const activeFilterChips = useMemo(() => {
    type Chip = { id: string; label: string };
    const chips: Chip[] = [];

    // Search does not appear in Active — clear via ✕ inside the search box.

    // Status chips are omitted — selected statuses already show on the status pills below.

    if (watchedAllFolder) {
      chips.push({ id: 'all-folders', label: 'All folders' });
    }

    const applied = appliedFilters;

    if (applied.taskCode) {
      chips.push({ id: 'taskCode', label: `Code: ${applied.taskCode}` });
    }

    const categoryRows = (fillValues?.category || []).map((c) => ({
      id: c.OperTaskCategoryNo,
      label: c.Category,
    }));
    if (
      applied.operTaskCategoryNo &&
      !hideCategoryFilter &&
      !isAllFillValueId(applied.operTaskCategoryNo, categoryRows)
    ) {
      const cat = fillValues?.category?.find(
        (c) => String(c.OperTaskCategoryNo) === String(applied.operTaskCategoryNo)
      );
      chips.push({
        id: 'category',
        label: `Category: ${cat?.Category || applied.operTaskCategoryNo}`,
      });
    }

    const priorityRows = (fillValues?.priority || []).map((p) => ({
      id: p.OperTaskPriorityNo,
      label: p.Priority,
    }));
    if (
      applied.operTaskPriorityNo &&
      !isAllFillValueId(applied.operTaskPriorityNo, priorityRows)
    ) {
      const pri = fillValues?.priority?.find(
        (p) => String(p.OperTaskPriorityNo) === String(applied.operTaskPriorityNo)
      );
      chips.push({
        id: 'priority',
        label: `Priority: ${pri?.Priority || applied.operTaskPriorityNo}`,
      });
    }

    if (applied.operTaskTypeNo && !isHideType) {
      const typ = fillValues?.type?.find(
        (t) => String(t.OperTaskTypeNo) === String(applied.operTaskTypeNo)
      );
      chips.push({
        id: 'type',
        label: `Type: ${(typ as any)?.['Task Type'] || (typ as any)?.Type || applied.operTaskTypeNo}`,
      });
    }

    if (applied.operTaskLocationNo) {
      const loc = fillValues?.location?.find(
        (l) => String(l.OperLocationNo) === String(applied.operTaskLocationNo)
      );
      chips.push({
        id: 'location',
        label: `Location: ${loc?.Location || applied.operTaskLocationNo}`,
      });
    }

    if (applied.operTaskCompanyNo) {
      const tc = fillValues?.taskCompany?.find(
        (c) => String(c.OperTaskCompanyNo) === String(applied.operTaskCompanyNo)
      );
      const tcLabel = tc ? ((tc.TaskCompanyAlias && tc.TaskCompanyName) ? `${tc.TaskCompanyAlias} - ${tc.TaskCompanyName}` : (tc.AliasName && tc.CompanyName ? `${tc.AliasName} - ${tc.CompanyName}` : (tc.AliasName || tc.CompanyName || tc.TaskCompanyAlias || tc.TaskCompanyName || 'Unknown'))) : applied.operTaskCompanyNo;
      chips.push({
        id: 'taskCompany',
        label: `Task Company: ${tcLabel}`,
      });
    }

    if (applied.ownerLoginNo) {
      const name = personLabels[String(applied.ownerLoginNo)];
      chips.push({
        id: 'owner',
        label: `Assign To: ${name || `#${applied.ownerLoginNo}`}`,
      });
    }

    if (applied.loginNo && !isGeneralUser) {
      const name = personLabels[String(applied.loginNo)];
      chips.push({
        id: 'loginNo',
        label: `User: ${name || `#${applied.loginNo}`}`,
      });
    }

    if (applied.filterType && applied.filterType !== 'All') {
      chips.push({ id: 'filterType', label: `Scope: ${applied.filterType}` });
    }

    if (applied.fromDueDate || applied.toDueDate) {
      const from = applied.fromDueDate
        ? formatDateOnly(applied.fromDueDate)
        : '…';
      const to = applied.toDueDate
        ? formatDateOnly(applied.toDueDate)
        : '…';
      chips.push({ id: 'due-range', label: `Due: ${from} – ${to}` });
    }

    if (applied.fromCreatedDate || applied.toCreatedDate) {
      const from = applied.fromCreatedDate
        ? formatDateOnly(applied.fromCreatedDate)
        : '…';
      const to = applied.toCreatedDate
        ? formatDateOnly(applied.toCreatedDate)
        : '…';
      chips.push({ id: 'created-range', label: `Created: ${from} – ${to}` });
    }

    if (applied.sortingColumnName) {
      const col = sortingColumnOptions.find((o) => o.value === applied.sortingColumnName);
      const dir = applied.sortingType === 'DESC' ? '↓' : '↑';
      chips.push({
        id: 'sort',
        label: `Sort: ${col?.label || applied.sortingColumnName} ${dir}`,
      });
    }

    return chips;
  }, [
    appliedFilters,
    watchedAllFolder,
    fillValues,
    hideCategoryFilter,
    isHideType,
    isGeneralUser,
    personLabels,
    sortingColumnOptions,
  ]);

  const hasAnythingToReset = Boolean(
    hasDrawerFilterChanges ||
    String(watchedStatus || '').trim() ||
    (watchedTitle || '').trim() ||
    watchedAllFolder ||
    activeFilterChips.length > 0
  );

  const drawerFilterCount = [
    String(watchedDrawerPriority || '').trim(),
    String(watchedDrawerTaskCode || '').trim(),
    String(watchedDrawerCategory || '').trim(),
    String(watchedDrawerOwner || '').trim(),
    (watchedFromDueDate || watchedToDueDate) ? 'due' : '',
  ].filter(Boolean).length;

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetchFillValues(companyNo);
        if (response) {
          setFillValues(response);
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };
    fetchOptions();
  }, [fetchFillValues, companyNo]);

  // Reactive default folder population from the navbar selection
  useEffect(() => {
    if (selectedFolder) {
      const folderNoStr = selectedFolder.TaskFolderNo.toString();
      setValue('folderNo', folderNoStr);
      setAppliedFilters(prev => ({
        ...prev,
        folderNo: folderNoStr
      }));
    }
  }, [selectedFolder, setValue]);

  const scrollTaskTableToTop = () => {
    // Run after paint so list has updated for the new filter/status.
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-page-tour="task-table"]')
        ?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const emitFilter = (cleanFilters: Record<string, unknown>) => {
    scrollTaskTableToTop();
    onFilter(cleanFilters);
  };

  const stripAllSentinelFilters = (data: FilterFormValues): FilterFormValues => {
    const priorityRows = (fillValues?.priority || []).map((p) => ({
      id: p.OperTaskPriorityNo,
      label: p.Priority,
    }));
    const categoryRows = (fillValues?.category || []).map((c) => ({
      id: c.OperTaskCategoryNo,
      label: c.Category,
    }));
    return {
      ...data,
      operTaskPriorityNo: isAllFillValueId(data.operTaskPriorityNo, priorityRows)
        ? ''
        : data.operTaskPriorityNo,
      operTaskCategoryNo: isAllFillValueId(data.operTaskCategoryNo, categoryRows)
        ? ''
        : data.operTaskCategoryNo,
    };
  };

  // Clear legacy "[All]" sentinel selections once fill-values are loaded.
  useEffect(() => {
    if (!fillValues) return;
    const current = getValues();
    const next = stripAllSentinelFilters(current);
    if (
      next.operTaskPriorityNo !== current.operTaskPriorityNo ||
      next.operTaskCategoryNo !== current.operTaskCategoryNo
    ) {
      if (next.operTaskPriorityNo !== current.operTaskPriorityNo) {
        setValue('operTaskPriorityNo', next.operTaskPriorityNo);
      }
      if (next.operTaskCategoryNo !== current.operTaskCategoryNo) {
        setValue('operTaskCategoryNo', next.operTaskCategoryNo);
      }
      setAppliedFilters((prev) => ({
        ...prev,
        operTaskPriorityNo: next.operTaskPriorityNo,
        operTaskCategoryNo: next.operTaskCategoryNo,
      }));
    }
  }, [fillValues, getValues, setValue]);

  const onSubmit = (data: FilterFormValues) => {
    const normalized = stripAllSentinelFilters(data);
    setAppliedFilters(normalized);
    const cleanFilters: Record<string, unknown> = {};
    Object.entries(normalized).forEach(([key, value]) => {
      if (key === 'folderNo' && normalized.isAllFolder) return;

      if (value !== undefined && value !== '' && value !== null) {
        if (value instanceof Date) {
          cleanFilters[key] = toUtcIso(value);
        } else {
          cleanFilters[key] = value;
        }
      }
    });
    emitFilter(cleanFilters);
    if (isFiltersOpen) {
      toggleFilters();
    }
  };

  /** Apply current form values immediately without closing the drawer. */
  const applyLive = () => {
    window.setTimeout(() => {
      const data = stripAllSentinelFilters(getValues());
      setAppliedFilters(data);
      const cleanFilters: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'folderNo' && data.isAllFolder) return;
        if (value !== undefined && value !== '' && value !== null) {
          if (value instanceof Date) {
            cleanFilters[key] = toUtcIso(value);
          } else {
            cleanFilters[key] = value;
          }
        }
      });
      emitFilter(cleanFilters);
    }, 0);
  };

  const applyTaskCodeLive = (value: string) => {
    setValue('taskCode', value);
    if (taskCodeDebounceRef.current) clearTimeout(taskCodeDebounceRef.current);
    taskCodeDebounceRef.current = setTimeout(() => applyLive(), 400);
  };

  const handleReset = () => {
    setSearchKeyword('');
    reset({
      taskCode: '',
      title: '',
      operTaskCategoryNo: '',
      operTaskPriorityNo: '',
      operTaskStatusNo: '',
      operTaskLocationNo: '',
      operTaskTypeNo: '',
      operTaskCompanyNo: '',
      ownerLoginNo: '',
      fromDueDate: undefined,
      toDueDate: undefined,
      companyNo,
      filterType: 'All',
      sortingColumnName: '',
      sortingType: '',
      folderNo: selectedFolder ? selectedFolder.TaskFolderNo.toString() : '',
      isAllFolder: false,
      loginNo: '',
      fromCreatedDate: undefined,
      toCreatedDate: undefined,
    });
    const resetState = {
      companyNo,
      filterType: 'All',
      folderNo: selectedFolder ? selectedFolder.TaskFolderNo.toString() : ''
    };
    setAppliedFilters(resetState);

    const cleanFilters: Record<string, unknown> = { companyNo, filterType: 'All' };
    if (selectedFolder) {
      cleanFilters.folderNo = selectedFolder.TaskFolderNo.toString();
    }
    emitFilter(cleanFilters);
    if (isFiltersOpen) {
      toggleFilters();
    }
  };

  useEffect(() => {
    if (clearNonce > 0) {
      handleReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only react to clearNonce bumps
  }, [clearNonce]);

  /** Clears only Filters-drawer fields; keeps search, status pills, and folder. */
  const handleResetDrawerFilters = () => {
    setValue('operTaskPriorityNo', '');
    setValue('taskCode', '');
    setValue('operTaskCategoryNo', '');
    setValue('ownerLoginNo', '');
    setValue('fromDueDate', undefined);
    setValue('toDueDate', undefined);
    setAppliedFilters((prev) => ({
      ...prev,
      operTaskPriorityNo: '',
      taskCode: '',
      operTaskCategoryNo: '',
      ownerLoginNo: '',
      fromDueDate: undefined,
      toDueDate: undefined,
    }));
    applyLive();
  };

  const clearFilterChip = (chipId: string) => {
    if (chipId === 'title') {
      setValue('title', '');
      setSearchKeyword('');
      setAppliedFilters((prev) => ({ ...prev, title: '' }));
      return;
    }

    if (chipId.startsWith('status:')) {
      const statusNo = chipId.slice('status:'.length);
      const statusStr = String(watch('operTaskStatusNo') || '');
      const next = statusStr
        .split(',')
        .filter((x) => x && x !== statusNo)
        .join(',');
      setValue('operTaskStatusNo', next);
      setTimeout(() => handleSubmit(onSubmit)(), 0);
      return;
    }

    if (chipId === 'all-folders') {
      setValue('isAllFolder', false);
      setTimeout(() => handleSubmit(onSubmit)(), 0);
      return;
    }

    if (chipId === 'due-range') {
      setValue('fromDueDate', undefined);
      setValue('toDueDate', undefined);
      setTimeout(() => handleSubmit(onSubmit)(), 0);
      return;
    }

    if (chipId === 'created-range') {
      setValue('fromCreatedDate', undefined);
      setValue('toCreatedDate', undefined);
      setTimeout(() => handleSubmit(onSubmit)(), 0);
      return;
    }

    if (chipId === 'sort') {
      setValue('sortingColumnName', '');
      setValue('sortingType', '');
      setTimeout(() => handleSubmit(onSubmit)(), 0);
      return;
    }

    const fieldMap: Record<string, keyof FilterFormValues> = {
      taskCode: 'taskCode',
      category: 'operTaskCategoryNo',
      priority: 'operTaskPriorityNo',
      type: 'operTaskTypeNo',
      location: 'operTaskLocationNo',
      taskCompany: 'operTaskCompanyNo',
      owner: 'ownerLoginNo',
      loginNo: 'loginNo',
      filterType: 'filterType',
    };

    const field = fieldMap[chipId];
    if (field) {
      setValue(field, field === 'filterType' ? 'All' : '');
      setTimeout(() => handleSubmit(onSubmit)(), 0);
    }
  };



  // Use a local string variable to avoid TS narrowing from the early-return above
  const currentViewMode: string = viewMode ?? '';

  return (
    <div className={cn("relative w-full z-40", className)}>
      <form id="task-filter-form" onSubmit={handleSubmit(onSubmit)}>
        {/* Dynamic unified top search & trigger row inside a beautiful Card */}
        <Card className="theme-filter-bar border border-[var(--tm-border)]/70 shadow-[0_6px_20px_-12px_rgba(15,23,42,0.08)] bg-[var(--tm-surface)] rounded-xl px-2.5 py-2 mb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full">
            <div className="relative flex-1 min-w-0" data-page-tour="task-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/90 pointer-events-none z-[1]" size={15} strokeWidth={1.75} />
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Search title, code, person…"
                    className={cn(
                      "pl-9 h-9 rounded-lg border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-200 placeholder:text-slate-400 text-xs w-full shadow-none hover:border-[#3D4F66]/80 focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/12 focus-visible:border-[#0EA5E9]/35 transition-all duration-200",
                      (watchedTitle || '').trim() && "pr-9"
                    )}
                    onChange={(e) => {
                      field.onChange(e);
                      setSearchKeyword(e.target.value);
                      scrollTaskTableToTop();
                    }}
                  />
                )}
              />
              {(watchedTitle || '').trim() && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 z-[1]">
                  <ActionTip label="Clear search">
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setValue('title', '');
                        setSearchKeyword('');
                        setAppliedFilters((prev) => ({ ...prev, title: '' }));
                        scrollTaskTableToTop();
                      }}
                      className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)] transition-colors"
                    >
                      <X size={13} strokeWidth={2.25} />
                    </button>
                  </ActionTip>
                </span>
              )}
            </div>

            {/* Action buttons toolbar: distributed evenly on mobile, aligned on desktop */}
            <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              {!isHideFolder && (
                <Controller
                  name="isAllFolder"
                  control={control}
                  render={({ field }) => (
                    <ActionTip label="Include tasks from every folder, not only the sidebar folder">
                      <label
                        className="flex items-center gap-1.5 cursor-pointer px-2 h-9 rounded-lg hover:bg-[var(--tm-elevated)] border border-transparent hover:border-[var(--tm-border)]/70 transition-colors shrink-0"
                      >
                        <Checkbox checked={field.value} onCheckedChange={(val) => {
                          field.onChange(val);
                          setTimeout(() => handleSubmit(onSubmit)(), 0);
                        }} className="h-3.5 w-3.5 rounded-[4px] data-[state=checked]:bg-[#0EA5E9] data-[state=checked]:border-[#0EA5E9]" />
                        <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap">All folders</span>
                      </label>
                    </ActionTip>
                  )}
                />
              )}

              <div
                className="flex items-center gap-0.5 rounded-lg border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)]/80 p-0.5 shrink-0 flex-1 sm:flex-initial"
              >
                <ActionTip label="Filters">
                  <Button
                    type="button"
                    aria-label="Filters"
                    data-page-tour="task-filters"
                    onClick={() => toggleFilters()}
                    className={cn(
                      "h-8 px-2.5 rounded-md border-0 bg-transparent text-slate-300 font-medium text-[11px] normal-case transition-all duration-200 gap-1.5 shadow-none shrink-0 flex-1 sm:flex-initial justify-center hover:bg-[var(--tm-surface)] hover:text-slate-100 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
                      isFiltersOpen && "bg-[var(--tm-surface)] text-[#0EA5E9] shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-[#0EA5E9]/15 hover:bg-[var(--tm-surface)] hover:text-[#0EA5E9]",
                      drawerFilterCount > 0 && !isFiltersOpen && "text-[#0EA5E9]"
                    )}
                  >
                    <SlidersHorizontal size={14} strokeWidth={1.75} className={cn("transition-colors duration-200", (isFiltersOpen || drawerFilterCount > 0) && "text-[#0EA5E9]")} />
                    <span className="hidden sm:inline">Filters</span>
                    {drawerFilterCount > 0 && (
                      <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#0EA5E9] px-1 text-[9px] font-bold text-white">
                        {drawerFilterCount}
                      </span>
                    )}
                  </Button>
                </ActionTip>

                {hasAnythingToReset && (
                  <ActionTip label="Reset all filters">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Reset all filters"
                      onClick={handleReset}
                      className="h-8 px-2.5 rounded-md border-0 text-slate-400 hover:text-slate-200 bg-transparent hover:bg-[var(--tm-surface)] hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)] shadow-none transition-all gap-1.5 shrink-0 flex items-center justify-center font-medium text-[11px] normal-case"
                    >
                      <RotateCcw size={14} strokeWidth={1.75} />
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                  </ActionTip>
                )}
              </div>

              {/* Merged View Toggle Dropdown from Dashboard */}
              {viewMode && onViewModeChange && (
                <DropdownMenu>
                  <ActionTip label="Change view">
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        data-page-tour="task-view-mode"
                        aria-label="Change view"
                        className="h-9 px-2.5 rounded-lg border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] hover:bg-[var(--tm-elevated)] hover:border-[#3D4F66]/80 font-medium text-slate-300 shadow-none gap-1 transition-all duration-200 flex items-center justify-between text-[11px] shrink-0 flex-1 sm:flex-initial"
                      >
                        <span className="flex items-center gap-1.5">
                          {currentViewMode === 'list' ? (
                            <ListIcon size={14} className="text-[#0EA5E9]" strokeWidth={1.75} />
                          ) : currentViewMode === 'board' ? (
                            <LayoutGrid size={14} className="text-[#0EA5E9]" strokeWidth={1.75} />
                          ) : (
                            <CalendarIcon size={14} className="text-[#0EA5E9]" strokeWidth={1.75} />
                          )}
                          <span className="hidden sm:inline">
                            {currentViewMode === 'list' ? 'List' : currentViewMode === 'board' ? 'Board' : 'Calendar'}
                          </span>
                        </span>
                        <ChevronDown size={13} strokeWidth={1.75} className="text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                  </ActionTip>
                  <DropdownMenuContent align="end" className="rounded-xl border border-[var(--tm-border)]/70 p-1.5 min-w-[156px] shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] bg-[var(--tm-surface)]">
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('list')}
                      className={cn(
                        "rounded-lg text-xs font-medium px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors",
                        currentViewMode === 'list' ? "bg-[var(--tm-tint)] text-[#0EA5E9]" : "text-slate-300 focus:bg-[var(--tm-muted)]"
                      )}
                    >
                      <ListIcon size={14} />
                      List View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('board')}
                      className={cn(
                        "rounded-lg text-xs font-medium px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors",
                        currentViewMode === 'board' ? "bg-[var(--tm-tint)] text-[#0EA5E9]" : "text-slate-300 focus:bg-[var(--tm-muted)]"
                      )}
                    >
                      <LayoutGrid size={14} />
                      Board View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('calendar')}
                      className={cn(
                        "rounded-lg text-xs font-medium px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors",
                        currentViewMode === 'calendar' ? "bg-[var(--tm-tint)] text-[#0EA5E9]" : "text-slate-300 focus:bg-[var(--tm-muted)]"
                      )}
                    >
                      <CalendarIcon size={14} />
                      Calendar View
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Create Task Button from Dashboard */}
              {onCreateTask && (
                <ActionTip label="Create task">
                  <Button
                    type="button"
                    onClick={onCreateTask}
                    data-page-tour="task-create"
                    aria-label="Create task"
                    className="h-9 px-3 sm:px-3.5 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] font-semibold text-[11px] normal-case text-white shadow-[0_6px_16px_-6px_rgba(14,165,233,0.45)] hover:shadow-[0_8px_18px_-6px_rgba(14,165,233,0.5)] transition-all duration-200 gap-1 shrink-0 flex-1 sm:flex-initial justify-center"
                  >
                    <Plus size={15} strokeWidth={2.4} />
                    <span className="hidden sm:inline">Create</span>
                  </Button>
                </ActionTip>
              )}

              <ActionTip label="Page guide">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => forceStartPageGuide('tasks')}
                  aria-label="Start page guide"
                  className="h-9 w-9 p-0 rounded-lg border border-[#0EA5E9]/35 bg-[#0EA5E9]/10 text-[#0EA5E9] hover:bg-[#0EA5E9]/20 shadow-none shrink-0"
                >
                  <CircleHelp size={15} />
                </Button>
              </ActionTip>
            </div>
          </div>
        </Card>

        {activeFilterChips.length > 0 && (
          <div
            className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 mt-2 mb-1 px-0.5 overflow-x-auto pb-0.5"
            data-page-tour="task-filter-chips"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mr-0.5">
              Active
            </span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => clearFilterChip(chip.id)}
                title={`Remove ${chip.label}`}
                className={cn(
                  'inline-flex items-center gap-1 max-w-[240px] h-7 px-2.5 rounded-full',
                  'border border-[#0EA5E9]/25 bg-[var(--tm-tint)]/50 text-[#0EA5E9]',
                  'text-[11px] font-semibold hover:bg-[#0EA5E9]/15 transition-colors'
                )}
              >
                <span className="truncate">{chip.label}</span>
                <X size={12} className="shrink-0 opacity-80" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="h-7 px-2.5 rounded-full text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)] transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Status Filter Buttons — multi-select (OR) */}
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 mt-4 mb-2 px-0.5 overflow-x-auto scrollbar-thin pb-1" data-page-tour="task-status-pills">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mr-0.5 shrink-0">
            Status
          </span>
          {STATUS_PILL_ORDER.map(statusName => {
            const count = sumStatusPillCounts(statusCounts, statusName);

            const statusNoStr = toStatusPillToken(statusName);
            const currentStatusStr = String(watch('operTaskStatusNo') || '');
            const activeStatuses = currentStatusStr
              ? currentStatusStr.split(',').map((s) => s.trim()).filter(Boolean)
              : [];
            const isActive = activeStatuses.includes(statusNoStr);

            const baseClass = "theme-status-pill rounded-full h-7 px-3 text-[11px] font-semibold transition-all duration-200 border bg-[var(--tm-surface)] hover:shadow-md";
            const colorClass = getStatusPillClass(statusName, isActive);

            return (
              <Button
                key={statusName}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={isActive}
                onClick={() => {
                  const next = isActive
                    ? activeStatuses.filter((x) => x !== statusNoStr)
                    : [...activeStatuses, statusNoStr];
                  setValue('operTaskStatusNo', next.join(','));
                  applyLive();
                }}
                className={cn(baseClass, colorClass)}
              >
                {statusName} <span className="ml-1.5 opacity-70 text-[10px]">({count})</span>
                {isActive && <X size={12} className="ml-1 -mr-1 opacity-80 shrink-0" />}
              </Button>
            );
          })}
          {String(watch('operTaskStatusNo') || '').split(',').map((s) => s.trim()).filter(Boolean).length > 0 && (
            <button
              type="button"
              onClick={() => {
                setValue('operTaskStatusNo', '');
                applyLive();
              }}
              className="h-7 px-2.5 rounded-full text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)] transition-colors shrink-0"
            >
              Clear status
            </button>
          )}
        </div>

        {/* Right slide-over drawer — desktop pushes content; <lg overlays only */}
        {isFiltersOpen ? (
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 top-14 z-[115] bg-slate-950/40 lg:hidden"
            onClick={() => toggleFilters()}
          />
        ) : null}
        <div
          className={cn(
            "fixed top-14 right-0 bottom-0 z-[120] w-[min(100vw,18rem)] transition-transform duration-300 ease-out will-change-transform",
            isFiltersOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          )}
          aria-hidden={!isFiltersOpen}
        >
          <Card className="h-full rounded-none border-0 border-l border-[var(--tm-border)] shadow-none bg-[var(--tm-surface)] p-0 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex items-center justify-between shrink-0">
              <span className="text-[13px] font-semibold text-slate-100 normal-case flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                  <SlidersHorizontal size={14} strokeWidth={1.75} />
                </span>
                Filters
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={toggleFilters}
                className="h-8 w-8 p-0 rounded-[8px] hover:bg-[var(--tm-muted)] text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X size={15} strokeWidth={1.75} />
              </Button>
            </div>

            <div className="overflow-y-auto px-4 py-3 scrollbar-sleek flex-1 space-y-3">
              <div className="grid grid-cols-1 gap-3 items-start">
                <FilterPanel title="Task filters" icon={Layers} cols={1}>
                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={Tag}>Priority</FilterFieldLabel>
                    <Controller
                      name="operTaskPriorityNo"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                            applyLive();
                          }}
                          options={(fillValues?.priority || [])
                            .filter((p) => !isAllFilterSentinel(p.Priority))
                            .map((p) => ({ value: p.OperTaskPriorityNo.toString(), label: p.Priority }))}
                          placeholder="All priorities"
                          sortAlphabetically={false}
                          className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={Clipboard}>Task ID / Code</FilterFieldLabel>
                    <Controller
                      name="taskCode"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="Enter Task ID / Code"
                          className={cn(filterControlClass, "focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/15 focus-visible:ring-offset-0", FIELD_TEXT_STYLE)}
                          onChange={(e) => {
                            field.onChange(e);
                            applyTaskCodeLive(e.target.value);
                          }}
                        />
                      )}
                    />
                  </div>

                  {!hideCategoryFilter && (
                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={Layers}>Category</FilterFieldLabel>
                      <Controller
                        name="operTaskCategoryNo"
                        control={control}
                        render={({ field }) => (
                          <Combobox
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              applyLive();
                            }}
                            options={(fillValues?.category || [])
                              .filter((c) => !isAllFilterSentinel(c.Category))
                              .map((c) => ({ value: c.OperTaskCategoryNo.toString(), label: c.Category }))}
                            placeholder="All categories"
                            className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={User}>Assign To</FilterFieldLabel>
                    <Controller
                      name="ownerLoginNo"
                      control={control}
                      render={({ field }) => (
                        <UserCombobox value={field.value} onChange={(user) => {
                          field.onChange(user.loginNo.toString());
                          setPersonLabels((prev) => ({
                            ...prev,
                            [String(user.loginNo)]: user.printingName || user.loginId || String(user.loginNo),
                          }));
                          applyLive();
                        }}
                          placeholder="Search assign to..."
                          className={cn(filterControlClass, "w-full", FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={CalendarIcon}>Due Date Range</FilterFieldLabel>
                    <DateRangePicker
                      value={{ from: watch('fromDueDate'), to: watch('toDueDate') }}
                      onChange={(range) => {
                        setValue('fromDueDate', range?.from || undefined);
                        setValue('toDueDate', range?.to || undefined);
                        applyLive();
                      }}
                      className="w-full"
                    />
                  </div>
                </FilterPanel>
              </div>
            </div>

            {hasDrawerFilterChanges && (
              <div className="flex justify-end px-4 py-3 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetDrawerFilters}
                  className="h-9 px-4 rounded-[8px] gap-1.5 border-[#0EA5E9]/35 bg-[var(--tm-surface)] text-[#0EA5E9] hover:bg-[#0EA5E9]/10 hover:border-[#0EA5E9]/50 hover:text-[#38BDF8] text-xs font-semibold shadow-none transition-colors"
                >
                  <RotateCcw size={13} strokeWidth={2} />
                  Reset
                </Button>
              </div>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
