import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Search, RotateCcw, SlidersHorizontal, Layers, Tag, MapPin, Calendar as CalendarIcon, Clipboard, Folder, ArrowUpDown, ChevronDown, Plus, LayoutGrid, List as ListIcon, X, User, CircleHelp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_TEXT_STYLE } from '@/lib/fieldStyles';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { Combobox } from '@/components/ui/Combobox';
import { MultiSelect } from '@/components/ui/MultiSelect';
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
}

export function TaskFilter({
  onFilter,
  className,
  viewMode,
  onViewModeChange,
  onCreateTask,
  showFilters,
  onToggleFilters,
  hideCategoryFilter = false
}: TaskFilterProps) {
  const authCompanies = useAuthStore((state) => state.company);
  const authUser = useAuthStore((state) => state.user);
  const allTasks = useTaskStore(state => state.allTasks);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (allTasks) {
      allTasks.forEach(task => {
        if (task.status) {
          counts[task.status] = (counts[task.status] || 0) + 1;
        }
      });
    }
    return counts;
  }, [allTasks]);
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

  const { control, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm<FilterFormValues>({
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
  const watchedStatus = watch('operTaskStatusNo');
  const watchedAllFolder = watch('isAllFolder');

  const activeFilterChips = useMemo(() => {
    type Chip = { id: string; label: string };
    const chips: Chip[] = [];

    const resolveStatusLabel = (raw: string) => {
      if (raw === 'PendingGroup') return 'Pending';
      const match = fillValues?.status?.find((s) => String(s.StatusNo) === raw);
      return match?.Status || raw;
    };

    const titleVal = (watchedTitle || '').trim();
    if (titleVal) {
      chips.push({ id: 'title', label: `Search: ${titleVal}` });
    }

    const statusStr = String(watchedStatus || appliedFilters.operTaskStatusNo || '');
    if (statusStr) {
      statusStr.split(',').filter(Boolean).forEach((statusNo) => {
        chips.push({
          id: `status:${statusNo}`,
          label: `Status: ${resolveStatusLabel(statusNo)}`,
        });
      });
    }

    if (watchedAllFolder) {
      chips.push({ id: 'all-folders', label: 'All folders' });
    }

    const applied = appliedFilters;

    if (applied.taskCode) {
      chips.push({ id: 'taskCode', label: `Code: ${applied.taskCode}` });
    }

    if (applied.operTaskCategoryNo && !hideCategoryFilter) {
      const cat = fillValues?.category?.find(
        (c) => String(c.OperTaskCategoryNo) === String(applied.operTaskCategoryNo)
      );
      chips.push({
        id: 'category',
        label: `Category: ${cat?.Category || applied.operTaskCategoryNo}`,
      });
    }

    if (applied.operTaskPriorityNo) {
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
        ? new Date(applied.fromDueDate).toLocaleDateString()
        : '…';
      const to = applied.toDueDate
        ? new Date(applied.toDueDate).toLocaleDateString()
        : '…';
      chips.push({ id: 'due-range', label: `Due: ${from} – ${to}` });
    }

    if (applied.fromCreatedDate || applied.toCreatedDate) {
      const from = applied.fromCreatedDate
        ? new Date(applied.fromCreatedDate).toLocaleDateString()
        : '…';
      const to = applied.toCreatedDate
        ? new Date(applied.toCreatedDate).toLocaleDateString()
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
    watchedTitle,
    watchedStatus,
    watchedAllFolder,
    fillValues,
    hideCategoryFilter,
    isHideType,
    isGeneralUser,
    personLabels,
    sortingColumnOptions,
  ]);

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

  const onSubmit = (data: FilterFormValues) => {
    setAppliedFilters(data); // Commit selected values to applied state!
    const cleanFilters: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'folderNo' && data.isAllFolder) return;

      if (value !== undefined && value !== '' && value !== null) {
        if (value instanceof Date) {
          cleanFilters[key] = value.toISOString();
        } else {
          cleanFilters[key] = value;
        }
      }
    });
    onFilter(cleanFilters);
    if (isFiltersOpen) {
      toggleFilters();
    }
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
    onFilter(cleanFilters);
    if (isFiltersOpen) {
      toggleFilters();
    }
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



  if (viewMode === 'calendar') {
    return (
      <div className="relative w-full z-50">
        <div className={cn(
          "absolute left-0 right-0 top-0 transition-all duration-300 ease-out origin-top z-[100] transform scale-100 opacity-100 translate-y-0",
          !isFiltersOpen && "scale-95 opacity-0 pointer-events-none -translate-y-2 hidden"
        )}>
          <Card className="border border-[var(--tm-border)]/80 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.2)] bg-[var(--tm-surface)] rounded-[12px] p-0 w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex items-center justify-between shrink-0">
              <span className="text-[13px] font-semibold text-slate-100 normal-case flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                  <SlidersHorizontal size={14} strokeWidth={1.75} />
                </span>
                Filters & Sorting
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

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto px-4 py-3 scrollbar-sleek flex-1 max-h-[50vh] space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
                  <FilterPanel title="Task filters" icon={Layers} cols={2} className="lg:col-span-3">
                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={Clipboard}>Status</FilterFieldLabel>
                      <Controller
                        name="operTaskStatusNo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={filterControlClass}>
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[8px] border-[var(--tm-border)]/80">
                              {fillValues?.status.map(s => (
                                <SelectItem key={s.StatusNo} value={s.StatusNo.toString()}>{s.Status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={Tag}>Priority</FilterFieldLabel>
                      <Controller
                        name="operTaskPriorityNo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={filterControlClass}>
                              <SelectValue placeholder="All Priority" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[8px] border-[var(--tm-border)]/80">
                              {fillValues?.priority.map(p => (
                                <SelectItem key={p.OperTaskPriorityNo} value={p.OperTaskPriorityNo.toString()}>{p.Priority}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={Clipboard}>Task ID / Code</FilterFieldLabel>
                      <Controller
                        name="taskCode"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} type="text" placeholder="Enter Task ID / Code" className={cn(filterControlClass, "focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/15 focus-visible:ring-offset-0", FIELD_TEXT_STYLE)} />
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className={filterControlClass}>
                                <SelectValue placeholder="All Categories" />
                              </SelectTrigger>
                              <SelectContent className="rounded-[8px] border-[var(--tm-border)]/80">
                                {fillValues?.category.map(c => (
                                  <SelectItem key={c.OperTaskCategoryNo} value={c.OperTaskCategoryNo.toString()}>{c.Category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}

                    {!isHideType && (
                      <div className="space-y-1 min-w-0">
                        <FilterFieldLabel icon={Tag}>Task Type</FilterFieldLabel>
                        <Controller
                          name="operTaskTypeNo"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className={filterControlClass}>
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent className="rounded-[8px] border-[var(--tm-border)]/80">
                                {fillValues?.type.map(t => (
                                  <SelectItem key={t.OperTaskTypeNo} value={t.OperTaskTypeNo.toString()}>{t["Task Type"]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={MapPin}>Location</FilterFieldLabel>
                      <Controller
                        name="operTaskLocationNo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={filterControlClass}>
                              <SelectValue placeholder="All Locations" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[8px] border-[var(--tm-border)]/80">
                              {fillValues?.location.map(l => (
                                <SelectItem key={l.OperLocationNo} value={l.OperLocationNo.toString()}>{l.Location}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {!isHideFolder && (
                      <div className="space-y-1 min-w-0">
                        <FilterFieldLabel icon={Folder}>Workspace Folder</FilterFieldLabel>
                        <Controller
                          name="folderNo"
                          control={control}
                          render={({ field }) => (
                            <div className={cn("transition-opacity", watch('isAllFolder') && "opacity-50 pointer-events-none")}>
                              <Combobox value={field.value || (selectedFolder ? selectedFolder.TaskFolderNo.toString() : '')} onChange={field.onChange} options={(fillValues?.folder || []).map(f => ({ value: f.TaskFolderNo.toString(), label: f["Folder Name"] }))}
                                placeholder="All Folders"
                                className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                              />
                            </div>
                          )}
                        />
                      </div>
                    )}
                  </FilterPanel>

                  <FilterPanel title="People" icon={User} cols={1} className="lg:col-span-2">
                    {!isGeneralUser && (
                      <>
                        <div className="space-y-1 min-w-0" id="dialog-form-group-loginNo">
                          <FilterFieldLabel icon={User} required={!!(watch('filterType') && watch('filterType') !== 'All')}>User</FilterFieldLabel>
                          <Controller
                            name="loginNo"
                            control={control}
                            rules={{
                              validate: (val) => {
                                const filterType = watch('filterType');
                                if (filterType && filterType !== 'All' && (!val || val === '')) {
                                  return 'User is required when filter type is selected';
                                }
                                return true;
                              }
                            }}
                            render={({ field }) => (
                              <UserCombobox value={field.value} onChange={(user) => {
                                field.onChange(user.loginNo.toString());
                                setPersonLabels((prev) => ({
                                  ...prev,
                                  [String(user.loginNo)]: user.printingName || user.loginId || String(user.loginNo),
                                }));
                                trigger('filterType');
                              }}
                                placeholder="Search user..."
                                className={cn(filterControlClass, "w-full", FIELD_TEXT_STYLE, errors.loginNo && "border-red-400")}
                              />
                            )}
                          />
                          {errors.loginNo && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.loginNo.message}</p>}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <FilterFieldLabel icon={SlidersHorizontal} required={!!(watch('loginNo') && watch('loginNo') !== '')}>Filter Type</FilterFieldLabel>
                          <Controller
                            name="filterType"
                            control={control}
                            rules={{
                              validate: (val) => {
                                const userVal = watch('loginNo');
                                if (userVal && userVal !== '' && (!val || val === 'All')) {
                                  return 'Filter Type is required when User is selected';
                                }
                                return true;
                              }
                            }}
                            render={({ field }) => (
                              <Combobox value={field.value} onChange={(val) => {
                                field.onChange(val);
                                trigger('loginNo');
                              }}
                                options={(fillValues?.filterType || []).map(ft => ({ value: ft.FilterTypeName, label: ft.FilterTypeName }))}
                                placeholder="Select Filter Type"
                                className={cn(filterControlClass, FIELD_TEXT_STYLE, errors.filterType && "border-red-400")}
                              />
                            )}
                          />
                          {errors.filterType && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.filterType.message}</p>}
                        </div>
                      </>
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
                          }}
                            placeholder="Search assign to..."
                            className={cn(filterControlClass, "w-full", FIELD_TEXT_STYLE)}
                          />
                        )}
                      />
                    </div>
                  </FilterPanel>
                </div>

                <FilterPanel title="Sorting & dates" icon={ArrowUpDown} cols={2}>
                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={ArrowUpDown}>Sort By Column</FilterFieldLabel>
                    <Controller
                      name="sortingColumnName"
                      control={control}
                      render={({ field }) => (
                        <Combobox value={field.value} onChange={field.onChange} options={sortingColumnOptions}
                          placeholder="Select Sort Column"
                          className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={ArrowUpDown}>Sort Direction</FilterFieldLabel>
                    <Controller
                      name="sortingType"
                      control={control}
                      render={({ field }) => (
                        <Combobox value={field.value} onChange={field.onChange} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} placeholder="Select Direction" className={cn(filterControlClass, FIELD_TEXT_STYLE)} />
                      )}
                    />
                  </div>

                  <div className="space-y-1 min-w-0 sm:col-span-2">
                    <FilterFieldLabel icon={CalendarIcon}>Due Date Range</FilterFieldLabel>
                    <DateRangePicker
                      value={{ from: watch('fromDueDate'), to: watch('toDueDate') }}
                      onChange={(range) => {
                        setValue('fromDueDate', range?.from || undefined);
                        setValue('toDueDate', range?.to || undefined);
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 sm:col-span-2">
                    <FilterFieldLabel icon={CalendarIcon}>Created Date Range</FilterFieldLabel>
                    <DateRangePicker
                      value={{ from: watch('fromCreatedDate'), to: watch('toCreatedDate') }}
                      onChange={(range) => {
                        setValue('fromCreatedDate', range?.from || undefined);
                        setValue('toCreatedDate', range?.to || undefined);
                      }}
                      className="w-full"
                    />
                  </div>
                </FilterPanel>
              </div>

              <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-9 px-4 rounded-[8px] border-[var(--tm-border)] text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-[var(--tm-surface)] transition-colors"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="h-9 px-5 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-xs font-semibold text-white shadow-sm transition-colors"
                >
                  Apply Filters
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if ((viewMode as string) === 'calendar' && !isFiltersOpen) {
    return null;
  }

  // Use a local string variable to avoid TS narrowing from the early-return above
  const currentViewMode: string = viewMode ?? '';

  return (
    <div className={cn("relative w-full z-40", className)}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Dynamic unified top search & trigger row inside a beautiful Card */}
        <Card className="theme-filter-bar border border-[var(--tm-border)]/70 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] bg-[var(--tm-surface)] rounded-[16px] p-3 mb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0" data-page-tour="task-search">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400/90 pointer-events-none" size={15} strokeWidth={1.75} />
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Search task"
                    className="pl-10 h-11 rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-200 placeholder:text-slate-400 w-full shadow-none hover:border-[#3D4F66]/80 focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/12 focus-visible:border-[#0EA5E9]/35 transition-all duration-200"
                    onChange={(e) => {
                      field.onChange(e);
                      setSearchKeyword(e.target.value);
                    }}
                  />
                )}
              />
            </div>

            {/* Action buttons toolbar: distributed evenly on mobile, aligned on desktop */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              {!isHideFolder && (
                <Controller
                  name="isAllFolder"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-1.5 cursor-pointer px-2.5 h-11 rounded-[14px] hover:bg-[var(--tm-elevated)] border border-transparent hover:border-[var(--tm-border)]/70 transition-colors shrink-0">
                      <Checkbox checked={field.value} onCheckedChange={(val) => {
                        field.onChange(val);
                        setTimeout(() => handleSubmit(onSubmit)(), 0);
                      }} className="h-4 w-4 rounded-[4px] data-[state=checked]:bg-[#0EA5E9] data-[state=checked]:border-[#0EA5E9]" />
                      <span className="text-[11px] sm:text-xs text-slate-300 font-medium whitespace-nowrap">Search all folders</span>
                    </label>
                  )}
                />
              )}

              <div
                className="flex items-center gap-1.5 rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)]/80 p-1 shrink-0 flex-1 sm:flex-initial"
                data-page-tour="task-filters"
              >
                <Button
                  type="button"
                  onClick={() => toggleFilters()}
                  className={cn(
                    "h-9 px-3 rounded-xl border-0 bg-transparent text-slate-300 font-medium text-xs normal-case transition-all duration-200 gap-1.5 shadow-none shrink-0 flex-1 sm:flex-initial justify-center hover:bg-[var(--tm-surface)] hover:text-slate-100 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
                    isFiltersOpen && "bg-[var(--tm-surface)] text-[#0EA5E9] shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-[#0EA5E9]/15 hover:bg-[var(--tm-surface)] hover:text-[#0EA5E9]"
                  )}
                >
                  <SlidersHorizontal size={14} strokeWidth={1.75} className={cn("transition-transform duration-300", isFiltersOpen && "rotate-180")} />
                  <span className="hidden sm:inline">Filters & Sorting</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  title="Reset filters"
                  className="h-9 w-9 p-0 rounded-xl border-0 text-slate-400 hover:text-slate-200 bg-transparent hover:bg-[var(--tm-surface)] hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)] shadow-none transition-all active:rotate-180 duration-500 shrink-0 flex items-center justify-center"
                >
                  <RotateCcw size={14} strokeWidth={1.75} />
                </Button>

                <Button
                  type="submit"
                  variant="ghost"
                  className="h-9 px-3 rounded-xl border-0 bg-[var(--tm-surface)] text-[#0EA5E9] font-semibold text-xs normal-case shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-[#0EA5E9]/12 hover:bg-[var(--tm-tint)] hover:ring-[#0EA5E9]/20 transition-all duration-200 gap-1.5 shrink-0 flex-1 sm:flex-initial justify-center"
                >
                  <Search size={14} strokeWidth={2.1} />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </div>

              {/* Merged View Toggle Dropdown from Dashboard */}
              {viewMode && onViewModeChange && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      data-page-tour="task-view-mode"
                      className="h-11 px-3 rounded-[14px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] hover:bg-[var(--tm-elevated)] hover:border-[#3D4F66]/80 font-medium text-slate-300 shadow-none gap-1.5 transition-all duration-200 flex items-center justify-between text-xs shrink-0 flex-1 sm:flex-initial"
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
                <Button
                  type="button"
                  onClick={onCreateTask}
                  data-page-tour="task-create"
                  className="h-11 px-4 sm:px-5 rounded-[14px] bg-[#0EA5E9] hover:bg-[#0284C7] font-semibold text-xs normal-case text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)] hover:shadow-[0_10px_24px_-6px_rgba(14,165,233,0.5)] transition-all duration-200 gap-1.5 shrink-0 flex-1 sm:flex-initial justify-center"
                >
                  <Plus size={15} strokeWidth={2.4} />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => forceStartPageGuide('tasks')}
                title="Tasks Guide — is page ka walkthrough"
                aria-label="Start Tasks Guide"
                className="h-11 w-11 p-0 rounded-[14px] border border-[#0EA5E9]/35 bg-[#0EA5E9]/10 text-[#0EA5E9] hover:bg-[#0EA5E9]/20 shadow-none shrink-0"
              >
                <CircleHelp size={16} />
              </Button>
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

        {/* Status Filter Buttons */}
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 mt-4 mb-2 px-0.5 overflow-x-auto scrollbar-thin pb-1" data-page-tour="task-status-pills">
          {['Pending', 'Assigned', 'In-Progress', 'Hold', 'Completed', 'Close'].map(statusName => {
            const s = fillValues?.status?.find(st =>
              st.Status === statusName ||
              st.Status.toLowerCase() === statusName.toLowerCase() ||
              (statusName === 'In-Progress' && st.Status === 'In-Progess') ||
              (statusName === 'In-Progress' && st.Status === 'In Progress')
            );

            const count = (() => {
              if (statusName === 'Pending') {
                const pendingStatuses = ['Assigned', 'Open', 'Draft', 'In-Progress', 'Reopen', 'In Progress', 'In-Progess'];
                return Object.keys(statusCounts).reduce((sum, key) => {
                  if (pendingStatuses.includes(key)) return sum + statusCounts[key];
                  return sum;
                }, 0);
              }
              return statusCounts[s ? s.Status : statusName] || statusCounts[statusName] || 0;
            })();

            const statusNoStr = statusName === 'Pending' ? 'PendingGroup' : (s ? s.StatusNo.toString() : statusName);
            const currentStatusStr = String(watch('operTaskStatusNo') || '');
            const activeStatuses = currentStatusStr ? currentStatusStr.split(',') : [];
            const isActive = activeStatuses.includes(statusNoStr);
            const anyActive = activeStatuses.length > 0;

            // If a status is selected, ONLY show the active ones
            if (anyActive && !isActive) return null;

            const baseClass = "theme-status-pill rounded-full h-7 px-3 text-[11px] font-semibold transition-all duration-200 border bg-[var(--tm-surface)] hover:shadow-md";
            const colorClass =
              statusName === 'Completed' || statusName === 'Complete' || statusName === 'Close'
                ? isActive
                  ? "border-green-500 bg-green-500 text-white shadow-[0_4px_12px_-4px_rgba(34,197,94,0.45)]"
                  : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                : statusName === 'In-Progress' || statusName === 'In-Review'
                  ? isActive
                    ? "border-blue-500 bg-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.45)]"
                    : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  : statusName === 'Pending' || statusName === 'Open' || statusName === 'Draft' || statusName === 'Reopen' || statusName === 'Hold'
                    ? isActive
                      ? "border-[#F59E0B] bg-[#F59E0B] text-[#0B1220] shadow-[0_4px_12px_-4px_rgba(245,158,11,0.45)]"
                      : "border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10"
                    : isActive
                      ? "border-[#0EA5E9] bg-[var(--tm-tint)] text-[#0EA5E9]"
                      : "border-[var(--tm-border)]/80 text-slate-300 hover:bg-[var(--tm-muted)]";

            return (
              <Button
                key={statusName}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  let newActive = [...activeStatuses];
                  if (isActive) {
                    newActive = newActive.filter(x => x !== statusNoStr);
                  } else {
                    newActive = [statusNoStr]; // Buttons are quick-select, so they replace if not active
                  }
                  setValue('operTaskStatusNo', newActive.join(','));
                  handleSubmit(onSubmit)();
                }}
                className={cn(baseClass, colorClass)}
              >
                {statusName} <span className="ml-1.5 opacity-70 text-[10px]">({count})</span>
                {isActive && <X size={12} className="ml-1 -mr-1 opacity-80 shrink-0" />}
              </Button>
            );
          })}
        </div>

        {/* Collapsible Unified Filters Grid (Floating Popup Card Overlay) */}
        <div className={cn(
          "absolute left-0 right-0 top-full mt-2 transition-all duration-300 ease-out origin-top z-[100] transform scale-100 opacity-100 translate-y-0",
          !isFiltersOpen && "scale-95 opacity-0 pointer-events-none -translate-y-2 hidden"
        )}>
          <Card className="border border-[var(--tm-border)]/80 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.2)] bg-[var(--tm-surface)] rounded-[12px] p-0 w-full max-h-[calc(100vh-220px)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex items-center justify-between shrink-0">
              <span className="text-[13px] font-semibold text-slate-100 normal-case flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                  <SlidersHorizontal size={14} strokeWidth={1.75} />
                </span>
                Filters & Sorting
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
                <FilterPanel title="Task filters" icon={Layers} cols={2} className="lg:col-span-3">
                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={Clipboard}>Status</FilterFieldLabel>
                    <Controller
                      name="operTaskStatusNo"
                      control={control}
                      render={({ field }) => (
                        <MultiSelect
                          value={field.value ? field.value.split(',') : []}
                          onChange={(vals) => {
                            field.onChange(vals.length > 0 ? vals.join(',') : '');
                          }}
                          options={(fillValues?.status || []).map(s => ({ value: s.StatusNo.toString(), label: s.Status }))}
                          placeholder="All Status"
                          className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={Tag}>Priority</FilterFieldLabel>
                    <Controller
                      name="operTaskPriorityNo"
                      control={control}
                      render={({ field }) => (
                        <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.priority || []).map(p => ({ value: p.OperTaskPriorityNo.toString(), label: p.Priority }))}
                          placeholder="All Priority"
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
                        <Input {...field} type="text" placeholder="Enter Task ID / Code" className={cn(filterControlClass, "focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/15 focus-visible:ring-offset-0", FIELD_TEXT_STYLE)} />
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
                          <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.category || []).map(c => ({ value: c.OperTaskCategoryNo.toString(), label: c.Category }))}
                            placeholder="All Categories"
                            className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                          />
                        )}
                      />
                    </div>
                  )}

                  {!isHideType && (
                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={Tag}>Task Type</FilterFieldLabel>
                      <Controller
                        name="operTaskTypeNo"
                        control={control}
                        render={({ field }) => (
                          <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.type || []).map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] }))}
                            placeholder="All Types"
                            className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <FilterFieldLabel icon={MapPin}>Location</FilterFieldLabel>
                    <Controller
                      name="operTaskLocationNo"
                      control={control}
                      render={({ field }) => (
                        <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.location || []).filter(l => l.Location.toLowerCase() !== 'all' && l.Location.toLowerCase() !== '[all]').map(l => ({ value: l.OperLocationNo.toString(), label: l.Location }))}
                          placeholder="All Locations"
                          className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  {!isHideFolder && (
                    <div className="space-y-1 min-w-0">
                      <FilterFieldLabel icon={Folder}>Workspace Folder</FilterFieldLabel>
                      <Controller
                        name="folderNo"
                        control={control}
                        render={({ field }) => (
                          <div className={cn("transition-opacity", watch('isAllFolder') && "opacity-50 pointer-events-none")}>
                            <Combobox value={field.value || (selectedFolder ? selectedFolder.TaskFolderNo.toString() : '')} onChange={field.onChange} options={(fillValues?.folder || []).map(f => ({ value: f.TaskFolderNo.toString(), label: f["Folder Name"] }))}
                              placeholder="All Folders"
                              className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                            />
                          </div>
                        )}
                      />
                    </div>
                  )}
                </FilterPanel>

                <FilterPanel title="People" icon={User} cols={1} className="lg:col-span-2">
                  {!isGeneralUser && (
                    <>
                      <div className="space-y-1 min-w-0" id="form-group-loginNo">
                        <FilterFieldLabel icon={User} required={!!(watch('filterType') && watch('filterType') !== 'All')}>User</FilterFieldLabel>
                        <Controller
                          name="loginNo"
                          control={control}
                          rules={{
                            validate: (val) => {
                              const filterType = watch('filterType');
                              if (filterType && filterType !== 'All' && (!val || val === '')) {
                                return 'User is required when filter type is selected';
                              }
                              return true;
                            }
                          }}
                          render={({ field }) => (
                            <UserCombobox value={field.value} onChange={(user) => {
                              field.onChange(user.loginNo.toString());
                              setPersonLabels((prev) => ({
                                ...prev,
                                [String(user.loginNo)]: user.printingName || user.loginId || String(user.loginNo),
                              }));
                              trigger('filterType');
                            }}
                              placeholder="Search user..."
                              className={cn(filterControlClass, "w-full", FIELD_TEXT_STYLE, errors.loginNo && "border-red-400")}
                            />
                          )}
                        />
                        {errors.loginNo && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.loginNo.message}</p>}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <FilterFieldLabel icon={SlidersHorizontal} required={!!(watch('loginNo') && watch('loginNo') !== '')}>Filter Type</FilterFieldLabel>
                        <Controller
                          name="filterType"
                          control={control}
                          rules={{
                            validate: (val) => {
                              const userVal = watch('loginNo');
                              if (userVal && userVal !== '' && (!val || val === 'All')) {
                                return 'Filter Type is required when User is selected';
                              }
                              return true;
                            }
                          }}
                          render={({ field }) => (
                            <Combobox value={field.value} onChange={(val) => {
                              field.onChange(val);
                              trigger('loginNo');
                            }}
                              options={(fillValues?.filterType || []).map(ft => ({ value: ft.FilterTypeName, label: ft.FilterTypeName }))}
                              placeholder="Select Filter Type"
                              className={cn(filterControlClass, FIELD_TEXT_STYLE, errors.filterType && "border-red-400")}
                            />
                          )}
                        />
                        {errors.filterType && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.filterType.message}</p>}
                      </div>
                    </>
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
                        }}
                          placeholder="Search assign to..."
                          className={cn(filterControlClass, "w-full", FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>
                </FilterPanel>
              </div>

              <FilterPanel title="Sorting & dates" icon={ArrowUpDown} cols={2}>
                <div className="space-y-1 min-w-0">
                  <FilterFieldLabel icon={ArrowUpDown}>Sort By Column</FilterFieldLabel>
                  <Controller
                    name="sortingColumnName"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={sortingColumnOptions}
                        placeholder="Select Sort Column"
                        className={cn(filterControlClass, FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <FilterFieldLabel icon={ArrowUpDown}>Sort Direction</FilterFieldLabel>
                  <Controller
                    name="sortingType"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} placeholder="Select Direction" className={cn(filterControlClass, FIELD_TEXT_STYLE)} />
                    )}
                  />
                </div>

                <div className="space-y-1 min-w-0 sm:col-span-2">
                  <FilterFieldLabel icon={CalendarIcon}>Due Date Range</FilterFieldLabel>
                  <DateRangePicker
                    value={{ from: watch('fromDueDate'), to: watch('toDueDate') }}
                    onChange={(range) => {
                      setValue('fromDueDate', range?.from || undefined);
                      setValue('toDueDate', range?.to || undefined);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1 min-w-0 sm:col-span-2">
                  <FilterFieldLabel icon={CalendarIcon}>Created Date Range</FilterFieldLabel>
                  <DateRangePicker
                    value={{ from: watch('fromCreatedDate'), to: watch('toCreatedDate') }}
                    onChange={(range) => {
                      setValue('fromCreatedDate', range?.from || undefined);
                      setValue('toCreatedDate', range?.to || undefined);
                    }}
                    className="w-full"
                  />
                </div>
              </FilterPanel>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-9 px-4 rounded-[8px] border-[var(--tm-border)] text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-[var(--tm-surface)] transition-colors"
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="h-9 px-5 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-xs font-semibold text-white shadow-sm transition-colors"
              >
                Apply Filters
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
