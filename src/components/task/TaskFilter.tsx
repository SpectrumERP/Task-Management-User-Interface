import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Search, RotateCcw, SlidersHorizontal, Layers, Tag, MapPin, Calendar as CalendarIcon, Clipboard, Folder, ArrowUpDown, ChevronDown, Plus, LayoutGrid, List as ListIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_TEXT_STYLE } from '@/lib/fieldStyles';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { Combobox } from '@/components/ui/Combobox';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

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
  onFilter: (filters: any) => void;
  className?: string;
  viewMode?: 'list' | 'board' | 'calendar';
  onViewModeChange?: (mode: 'list' | 'board' | 'calendar') => void;
  onCreateTask?: () => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export function TaskFilter({
  onFilter,
  className,
  viewMode,
  onViewModeChange,
  onCreateTask,
  showFilters,
  onToggleFilters
}: TaskFilterProps) {
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1).toString();

  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const { fetchFillValues, setSearchKeyword } = useTaskStore();
  const selectedFolder = useTaskStore((state) => state.selectedFolder);

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
      loginNo: '',
      fromCreatedDate: undefined,
      toCreatedDate: undefined,
    }
  });


  // State to track the actually applied filters (only updated on Submit/Reset/Badge Clear)
  const [appliedFilters, setAppliedFilters] = useState<FilterFormValues>({
    companyNo,
    filterType: 'All',
  });

  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);

  const isFiltersOpen = showFilters !== undefined ? showFilters : showFiltersOnMobile;
  const toggleFilters = onToggleFilters || (() => setShowFiltersOnMobile(!showFiltersOnMobile));

  // Dynamic count of active applied filters (ignoring default companyNo and filterType: 'All')
  const activeCount = Object.entries(appliedFilters || {}).filter(([key, val]) => {
    if (key === 'companyNo') return false;
    if (key === 'filterType' && val === 'All') return false;
    return val !== undefined && val !== '' && val !== null;
  }).length;

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
    const cleanFilters: any = {};
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

    const cleanFilters: any = { companyNo, filterType: 'All' };
    if (selectedFolder) {
      cleanFilters.folderNo = selectedFolder.TaskFolderNo.toString();
    }
    onFilter(cleanFilters);
    if (isFiltersOpen) {
      toggleFilters();
    }
  };



  if (viewMode === 'calendar') {
    return (
      <div className="relative w-full z-50">
        <div className={cn(
          "absolute left-0 right-0 top-0 transition-all duration-300 ease-out origin-top z-[100] transform scale-100 opacity-100 translate-y-0",
          !isFiltersOpen && "scale-95 opacity-0 pointer-events-none -translate-y-2 hidden"
        )}>
          <Card className="border border-slate-100/80 shadow-2xl bg-white/95 backdrop-blur-md rounded-[24px] p-6 w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 mb-4">
              <span className="text-xs font-medium text-slate-800 normal-case flex items-center gap-0.5">
                <SlidersHorizontal size={14} className="text-[#006699]" />
                Filters & Sorting
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={toggleFilters}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex flex-col flex-1 min-h-0">
              {/* Scrollable Fields Wrapper */}
              <div className="overflow-y-auto pr-1.5 scrollbar-thin flex-1 max-h-[50vh] space-y-4 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Status */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <Clipboard size={12} className="text-slate-400" />
                      Status
                    </label>
                    <Controller
                      name="operTaskStatusNo"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {fillValues?.status.map(s => (
                              <SelectItem key={s.StatusNo} value={s.StatusNo.toString()} className="">{s.Status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Priority */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <Tag size={12} className="text-slate-400" />
                      Priority
                    </label>
                    <Controller
                      name="operTaskPriorityNo"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                            <SelectValue placeholder="All Priority" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {fillValues?.priority.map(p => (
                              <SelectItem key={p.OperTaskPriorityNo} value={p.OperTaskPriorityNo.toString()} className="">{p.Priority}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Task ID / Code */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <Clipboard size={12} className="text-slate-400" />
                      Task ID / Code
                    </label>
                    <Controller
                      name="taskCode"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} type="text" placeholder="Enter Task ID / Code" className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#006699]/15 focus-visible:ring-offset-0", FIELD_TEXT_STYLE)} />
                      )}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <Layers size={12} className="text-slate-400" />
                      Category
                    </label>
                    <Controller
                      name="operTaskCategoryNo"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {fillValues?.category.map(c => (
                              <SelectItem key={c.OperTaskCategoryNo} value={c.OperTaskCategoryNo.toString()} className="">{c.Category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Task Type */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <Tag size={12} className="text-slate-400" />
                      Task Type
                    </label>
                    <Controller
                      name="operTaskTypeNo"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {fillValues?.type.map(t => (
                              <SelectItem key={t.OperTaskTypeNo} value={t.OperTaskTypeNo.toString()} className="">{t["Task Type"]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <MapPin size={12} className="text-slate-400" />
                      Location
                    </label>
                    <Controller
                      name="operTaskLocationNo"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                            <SelectValue placeholder="All Locations" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {fillValues?.location.map(l => (
                              <SelectItem key={l.OperLocationNo} value={l.OperLocationNo.toString()} className="">{l.Location}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* User */}
                  <div className="space-y-0.5" id="dialog-form-group-loginNo">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <SlidersHorizontal size={12} className="text-slate-400" />
                      User {watch('filterType') && watch('filterType') !== 'All' && <span className="text-red-500 font-medium">*</span>}
                    </label>
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
                          trigger('filterType');
                        }}
                          placeholder="Search user..."
                          className={cn("border-slate-200 bg-white shadow-sm h-11 rounded-2xl w-full", FIELD_TEXT_STYLE, errors.loginNo && "border-red-500")}
                        />
                      )}
                    />
                    {errors.loginNo && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.loginNo.message}</p>}
                  </div>

                  {/* Filter Type */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <SlidersHorizontal size={12} className="text-slate-400" />
                      Filter Type {watch('loginNo') && watch('loginNo') !== '' && <span className="text-red-500 font-medium">*</span>}
                    </label>
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
                          className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE, errors.filterType && "border-red-500")}
                        />
                      )}
                    />
                    {errors.filterType && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.filterType.message}</p>}
                  </div>

                  {/* Owner */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <SlidersHorizontal size={12} className="text-slate-400" />
                      Owner
                    </label>
                    <Controller
                      name="ownerLoginNo"
                      control={control}
                      render={({ field }) => (
                        <UserCombobox value={field.value} onChange={(user) => field.onChange(user.loginNo.toString())}
                          placeholder="Search owner..."
                          className={cn("border-slate-200 bg-white shadow-sm h-11 rounded-2xl w-full", FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  {/* Workspace Folder */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between ml-1 mb-1">
                      <label className="text-[11px] font-medium text-slate-700 normal-case flex items-center gap-0.5">
                        <Folder size={12} className="text-slate-400" />
                        Workspace Folder
                      </label>
                      <Controller
                        name="isAllFolder"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-1.5 cursor-pointer mr-1">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-3.5 w-3.5 rounded-[4px]" />
                            <span className="text-[10px] text-slate-500 font-medium">Search All Folders</span>
                          </label>
                        )}
                      />
                    </div>
                    <Controller
                      name="folderNo"
                      control={control}
                      render={({ field }) => (
                        <div className={cn("transition-opacity", watch('isAllFolder') && "opacity-50 pointer-events-none")}>
                          <Combobox value={field.value || (selectedFolder ? selectedFolder.TaskFolderNo.toString() : '')} onChange={field.onChange} options={(fillValues?.folder || []).map(f => ({ value: f.TaskFolderNo.toString(), label: f["Folder Name"] }))}
                            placeholder="All Folders"
                            className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                          />
                        </div>
                      )}
                    />
                  </div>

                  {/* Sort Column */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <ArrowUpDown size={12} className="text-slate-400" />
                      Sort By Column
                    </label>
                    <Controller
                      name="sortingColumnName"
                      control={control}
                      render={({ field }) => (
                        <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.sortingColumns || []).map(sc => ({ value: sc.SortingColumnName, label: sc.DisplayName }))}
                          placeholder="Select Sort Column"
                          className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                        />
                      )}
                    />
                  </div>

                  {/* Sort Direction */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <ArrowUpDown size={12} className="text-slate-400" />
                      Sort Direction
                    </label>
                    <Controller
                      name="sortingType"
                      control={control}
                      render={({ field }) => (
                        <Combobox value={field.value} onChange={field.onChange} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} placeholder="Select Direction" className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)} />
                      )}
                    />
                  </div>

                  {/* Due Date Range */}
                  <div className="space-y-0.5 sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <CalendarIcon size={12} className="text-slate-400" />
                      Due Date Range
                    </label>
                    <DateRangePicker
                      value={{ from: watch('fromDueDate'), to: watch('toDueDate') }}
                      onChange={(range) => {
                        setValue('fromDueDate', range?.from || undefined);
                        setValue('toDueDate', range?.to || undefined);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Created Date Range */}
                  <div className="space-y-0.5 sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                      <CalendarIcon size={12} className="text-slate-400" />
                      Created Date Range
                    </label>
                    <DateRangePicker
                      value={{ from: watch('fromCreatedDate'), to: watch('toCreatedDate') }}
                      onChange={(range) => {
                        setValue('fromCreatedDate', range?.from || undefined);
                        setValue('toCreatedDate', range?.to || undefined);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Row at the bottom */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 bg-white shrink-0 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-10 px-5 rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-[#006699] hover:bg-[#005580] text-xs font-medium text-white shadow-md shadow-[#006699]/15"
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
    <div className={cn("relative w-full z-40 mb-2", className)}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Dynamic unified top search & trigger row inside a beautiful Card */}
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-md rounded-[24px] transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input 
                    {...field} 
                    placeholder="Search task" 
                    className="pl-10 h-10 sm:h-11 rounded-xl sm:rounded-2xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/15 bg-white shadow-sm text-slate-700 w-full" 
                    onChange={(e) => {
                      field.onChange(e);
                      setSearchKeyword(e.target.value);
                    }}
                  />
                )}
              />
            </div>

            {/* Action buttons toolbar: distributed evenly on mobile, aligned on desktop */}
            <div className="flex items-center justify-between sm:justify-start gap-0.5 w-full sm:w-auto shrink-0">
              <Button
                type="button"
                onClick={() => toggleFilters()}
                className={cn(
                  "h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[10px] sm:text-xs normal-case transition-all duration-200 gap-0.5 sm:gap-0.5 shadow-sm shrink-0 flex-1 sm:flex-initial justify-center",
                  isFiltersOpen && "border-[#006699] text-[#006699] bg-[#e1ecf7]/50"
                )}
              >
                <SlidersHorizontal size={14} className={cn("transition-transform duration-300", isFiltersOpen && "rotate-180")} />
                <span className="hidden sm:inline">Filters & Sorting</span>
                {activeCount > 0 && (
                  <span className="bg-[#006699] text-white text-[9px] h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center font-medium">
                    {activeCount}
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="h-10 sm:h-11 w-10 sm:w-11 p-0 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-655 bg-white hover:bg-slate-50 shadow-sm transition-transform active:rotate-180 duration-500 shrink-0 flex items-center justify-center"
              >
                <RotateCcw size={15} />
              </Button>

              <Button
                type="submit"
                className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] font-medium text-[10px] sm:text-xs normal-case text-white shadow-md shadow-[#006699]/15 transition-all hover:scale-[1.02] active:scale-95 gap-0.5 sm:gap-0.5 shrink-0 flex-1 sm:flex-initial justify-center"
              >
                <Search size={14} strokeWidth={3.5} />
                <span className="hidden sm:inline">Search</span>
              </Button>

              {/* Merged View Toggle Dropdown from Dashboard */}
              {viewMode && onViewModeChange && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 shadow-sm gap-0.5 sm:gap-0.5.5 transition-all flex items-center justify-between text-[10px] sm:text-xs shrink-0 flex-1 sm:flex-initial"
                    >
                      <span className="flex items-center gap-0.5 sm:gap-0.5">
                        {currentViewMode === 'list' ? (
                          <ListIcon size={14} className="text-[#006699]" />
                        ) : currentViewMode === 'board' ? (
                          <LayoutGrid size={14} className="text-[#006699]" />
                        ) : (
                          <CalendarIcon size={14} className="text-[#006699]" />
                        )}
                        <span className="hidden sm:inline">
                          {currentViewMode === 'list' ? 'List' : currentViewMode === 'board' ? 'Board' : 'Calendar'}
                        </span>
                      </span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border border-slate-100 p-1 min-w-[140px] shadow-xl bg-white">
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('list')}
                      className={cn(
                        "rounded-lg text-xs font-medium px-3 py-2 cursor-pointer flex items-center gap-0.5 transition-colors",
                        currentViewMode === 'list' ? "bg-slate-100 text-[#006699]" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <ListIcon size={14} />
                      List View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('board')}
                      className={cn(
                        "rounded-lg text-xs font-medium px-3 py-2 cursor-pointer flex items-center gap-0.5 transition-colors",
                        currentViewMode === 'board' ? "bg-slate-100 text-[#006699]" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <LayoutGrid size={14} />
                      Board View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('calendar')}
                      className={cn(
                        "rounded-lg text-xs font-medium px-3 py-2 cursor-pointer flex items-center gap-0.5 transition-colors",
                        currentViewMode === 'calendar' ? "bg-slate-100 text-[#006699]" : "text-slate-600 hover:bg-slate-50"
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
                  className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] font-medium text-[10px] sm:text-xs normal-case text-white shadow-md shadow-[#006699]/15 transition-all hover:scale-[1.02] active:scale-95 gap-0.5 sm:gap-0.5 shrink-0 flex-1 sm:flex-initial justify-center"
                >
                  <Plus size={14} strokeWidth={3.5} />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Collapsible Unified Filters Grid (Floating Popup Card Overlay) */}
        <div className={cn(
          "absolute left-0 right-0 top-full mt-2 transition-all duration-300 ease-out origin-top z-[100] transform scale-100 opacity-100 translate-y-0",
          !isFiltersOpen && "scale-95 opacity-0 pointer-events-none -translate-y-2 hidden"
        )}>
          <Card className="border border-slate-200/80 shadow-2xl bg-white/95 backdrop-blur-md rounded-[24px] p-6 w-full max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header of the popup filter */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 mb-4">
              <span className="text-xs font-medium text-slate-800 normal-case flex items-center gap-0.5">
                <SlidersHorizontal size={14} className="text-[#006699]" />
                Filters & Sorting
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={toggleFilters}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Scrollable Fields Wrapper */}
            <div className="overflow-y-auto pr-1.5 scrollbar-thin flex-1 max-h-[50vh] space-y-4 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                {/* Status */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <Clipboard size={12} className="text-slate-400" />
                    Status
                  </label>
                  <Controller
                    name="operTaskStatusNo"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.status || []).map(s => ({ value: s.StatusNo.toString(), label: s.Status }))}
                        placeholder="All Status"
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <Tag size={12} className="text-slate-400" />
                    Priority
                  </label>
                  <Controller
                    name="operTaskPriorityNo"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.priority || []).map(p => ({ value: p.OperTaskPriorityNo.toString(), label: p.Priority }))}
                        placeholder="All Priority"
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* Task ID / Code */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <Clipboard size={12} className="text-slate-400" />
                    Task ID / Code
                  </label>
                  <Controller
                    name="taskCode"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} type="text" placeholder="Enter Task ID / Code" className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#006699]/15 focus-visible:ring-offset-0", FIELD_TEXT_STYLE)} />
                    )}
                  />
                </div>

                {/* Category */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <Layers size={12} className="text-slate-400" />
                    Category
                  </label>
                  <Controller
                    name="operTaskCategoryNo"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.category || []).map(c => ({ value: c.OperTaskCategoryNo.toString(), label: c.Category }))}
                        placeholder="All Categories"
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* Task Type */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <Tag size={12} className="text-slate-400" />
                    Task Type
                  </label>
                  <Controller
                    name="operTaskTypeNo"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.type || []).map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] }))}
                        placeholder="All Types"
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* Location */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <MapPin size={12} className="text-slate-400" />
                    Location
                  </label>
                  <Controller
                    name="operTaskLocationNo"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.location || []).map(l => ({ value: l.OperLocationNo.toString(), label: l.Location }))}
                        placeholder="All Locations"
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* User */}
                <div className="space-y-0.5" id="form-group-loginNo">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <SlidersHorizontal size={12} className="text-slate-400" />
                    User {watch('filterType') && watch('filterType') !== 'All' && <span className="text-red-500 font-medium">*</span>}
                  </label>
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
                        trigger('filterType');
                      }}
                        placeholder="Search user..."
                        className={cn("border-slate-200 bg-white shadow-sm h-11 rounded-2xl w-full", FIELD_TEXT_STYLE, errors.loginNo && "border-red-500")}
                      />
                    )}
                  />
                  {errors.loginNo && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.loginNo.message}</p>}
                </div>

                {/* Filter Type */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <SlidersHorizontal size={12} className="text-slate-400" />
                    Filter Type {watch('loginNo') && watch('loginNo') !== '' && <span className="text-red-500 font-medium">*</span>}
                  </label>
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
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE, errors.filterType && "border-red-500")}
                      />
                    )}
                  />
                  {errors.filterType && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.filterType.message}</p>}
                </div>

                {/* Owner */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <SlidersHorizontal size={12} className="text-slate-400" />
                    Owner
                  </label>
                  <Controller
                    name="ownerLoginNo"
                    control={control}
                    render={({ field }) => (
                      <UserCombobox value={field.value} onChange={(user) => field.onChange(user.loginNo.toString())}
                        placeholder="Search owner..."
                        className={cn("border-slate-200 bg-white shadow-sm h-11 rounded-2xl w-full", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* Workspace Folder */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="text-[11px] font-medium text-slate-700 normal-case flex items-center gap-0.5">
                      <Folder size={12} className="text-slate-400" />
                      Workspace Folder
                    </label>
                    <Controller
                      name="isAllFolder"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-1.5 cursor-pointer mr-1">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-3.5 w-3.5 rounded-[4px]" />
                          <span className="text-[10px] text-slate-500 font-medium">Search All Folders</span>
                        </label>
                      )}
                    />
                  </div>
                  <Controller
                    name="folderNo"
                    control={control}
                    render={({ field }) => (
                      <div className={cn("transition-opacity", watch('isAllFolder') && "opacity-50 pointer-events-none")}>
                        <Combobox value={field.value || (selectedFolder ? selectedFolder.TaskFolderNo.toString() : '')} onChange={field.onChange} options={(fillValues?.folder || []).map(f => ({ value: f.TaskFolderNo.toString(), label: f["Folder Name"] }))}
                          placeholder="All Folders"
                          className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                        />
                      </div>
                    )}
                  />
                </div>

                {/* Sort Column */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <ArrowUpDown size={12} className="text-slate-400" />
                    Sort By Column
                  </label>
                  <Controller
                    name="sortingColumnName"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={(fillValues?.sortingColumns || []).map(sc => ({ value: sc.SortingColumnName, label: sc.DisplayName }))}
                        placeholder="Select Sort Column"
                        className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)}
                      />
                    )}
                  />
                </div>

                {/* Sort Direction */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <ArrowUpDown size={12} className="text-slate-400" />
                    Sort Direction
                  </label>
                  <Controller
                    name="sortingType"
                    control={control}
                    render={({ field }) => (
                      <Combobox value={field.value} onChange={field.onChange} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} placeholder="Select Direction" className={cn("h-11 rounded-2xl border-slate-200 bg-white shadow-sm", FIELD_TEXT_STYLE)} />
                    )}
                  />
                </div>

                {/* Due Date Range */}
                <div className="space-y-0.5 sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <CalendarIcon size={12} className="text-slate-400" />
                    Due Date Range
                  </label>
                  <DateRangePicker
                    value={{ from: watch('fromDueDate'), to: watch('toDueDate') }}
                    onChange={(range) => {
                      setValue('fromDueDate', range?.from || undefined);
                      setValue('toDueDate', range?.to || undefined);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Created Date Range */}
                <div className="space-y-0.5 sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center gap-0.5">
                    <CalendarIcon size={12} className="text-slate-400" />
                    Created Date Range
                  </label>
                  <DateRangePicker
                    value={{ from: watch('fromCreatedDate'), to: watch('toCreatedDate') }}
                    onChange={(range) => {
                      setValue('fromCreatedDate', range?.from || undefined);
                      setValue('toCreatedDate', range?.to || undefined);
                    }}
                    className="w-full"
                  />
                </div>

              </div>
            </div>

            {/* Premium sticky actions footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 bg-white shrink-0 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="h-10 px-5 rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="h-10 px-6 rounded-xl bg-[#006699] hover:bg-[#005580] text-xs font-medium text-white shadow-md shadow-[#006699]/15"
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
