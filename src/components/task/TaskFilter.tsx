import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Search, RotateCcw, SlidersHorizontal, Layers, Tag, MapPin, Calendar, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';

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
}

interface TaskFilterProps {
  onFilter: (filters: any) => void;
  className?: string;
}

export function TaskFilter({ onFilter, className }: TaskFilterProps) {
  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { fetchFillValues } = useTaskStore();
  
  const { control, handleSubmit, reset, watch, setValue } = useForm<FilterFormValues>({
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
      companyNo: '2',
      filterType: 'All',
    }
  });

  const formValues = watch();

  // Dynamic count of active filters (ignoring default companyNo and filterType: 'All')
  const activeCount = Object.entries(formValues || {}).filter(([key, val]) => {
    if (key === 'companyNo') return false;
    if (key === 'filterType' && val === 'All') return false;
    return val !== undefined && val !== '' && val !== null;
  }).length;

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetchFillValues('2');
        if (response) {
          setFillValues(response);
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };
    fetchOptions();
  }, [fetchFillValues]);

  const onSubmit = (data: FilterFormValues) => {
    const cleanFilters: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        if (value instanceof Date) {
          cleanFilters[key] = value.toISOString();
        } else {
          cleanFilters[key] = value;
        }
      }
    });
    onFilter(cleanFilters);
    setIsOpen(false); // Close popover when applying
  };

  const handleReset = () => {
    reset(); // Triggers full reset to all defaultValues defined above
    onFilter({ companyNo: '2', filterType: 'All' });
    setIsOpen(false); // Close popover on reset
  };

  return (
    <Card className={cn("p-4 border-none shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-md rounded-[24px] transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50", className)}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Main Search Row */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Search size={12} className="text-slate-400" />
              Search Title
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Search tasks by title..."
                    className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/15 focus-visible:ring-offset-0 bg-white shadow-sm font-bold text-xs"
                  />
                )}
              />
            </div>
          </div>

          <div className="w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Clipboard size={12} className="text-slate-400" />
              Status
            </label>
            <Controller
              name="operTaskStatusNo"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {fillValues?.status.map(s => (
                      <SelectItem key={s.StatusNo} value={s.StatusNo.toString()} className="text-xs font-medium">{s.Status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Tag size={12} className="text-slate-400" />
              Priority
            </label>
            <Controller
              name="operTaskPriorityNo"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {fillValues?.priority.map(p => (
                      <SelectItem key={p.OperTaskPriorityNo} value={p.OperTaskPriorityNo.toString()} className="text-xs font-medium">{p.Priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Action Controls */}
          <div className="flex gap-2.5">
            <Button 
              type="submit" 
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#006699] to-[#00b4d8] hover:from-[#005580] hover:to-[#0096c7] font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-[#006699]/15 transition-all hover:scale-[1.02] active:scale-95 gap-2"
            >
              <Search size={14} strokeWidth={3} />
              Search
            </Button>

            {/* Advanced Filters Popover Trigger */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-11 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-wider transition-all duration-200 gap-2 shadow-sm",
                    isOpen && "border-[#006699] text-[#006699] bg-[#e1ecf7]/50"
                  )}
                >
                  <SlidersHorizontal size={14} className={cn("transition-transform duration-300", isOpen && "rotate-180")} />
                  Filters
                  {activeCount > 0 && (
                    <span className="bg-[#006699] text-white text-[9px] h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center font-black animate-pulse">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                align="end" 
                className="w-[320px] sm:w-[500px] md:w-[600px] p-6 rounded-[24px] border border-slate-100 bg-white shadow-2xl z-[100] outline-none"
                onInteractOutside={(event) => {
                  // Prevent closing parent popover when clicking inside calendar popups
                  const target = event.target as HTMLElement;
                  if (
                    target.closest('[data-radix-popper-content-wrapper]') || 
                    target.closest('.rdp') || 
                    target.closest('[role="dialog"]')
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <div className="space-y-5">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-[#006699]" />
                      Advanced Filters
                    </h3>
                    {activeCount > 0 && (
                      <span className="text-[10px] font-black text-[#006699] bg-[#e1ecf7] px-2 py-0.5 rounded-full">
                        {activeCount} active
                      </span>
                    )}
                  </div>

                  {/* Advanced Filters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <Clipboard size={12} className="text-slate-400" />
                        Task ID / Code
                      </label>
                      <Controller
                        name="taskCode"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} type="text" placeholder="Enter Task ID / Code" className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus-visible:ring-2 focus-visible:ring-[#006699]/15 focus-visible:ring-offset-0" />
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <Layers size={12} className="text-slate-400" />
                        Category
                      </label>
                      <Controller
                        name="operTaskCategoryNo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {fillValues?.category.map(c => (
                                <SelectItem key={c.OperTaskCategoryNo} value={c.OperTaskCategoryNo.toString()} className="text-xs font-medium">{c.Category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <Tag size={12} className="text-slate-400" />
                        Task Type
                      </label>
                      <Controller
                        name="operTaskTypeNo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {fillValues?.type.map(t => (
                                <SelectItem key={t.OperTaskTypeNo} value={t.OperTaskTypeNo.toString()} className="text-xs font-medium">{t["Task Type"]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <SlidersHorizontal size={12} className="text-slate-400" />
                        Filter Type
                      </label>
                      <Controller
                        name="filterType"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                              <SelectValue placeholder="Select Filter Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {fillValues?.filterType?.map(ft => (
                                <SelectItem key={ft.FilterTypeNo} value={ft.FilterTypeName} className="text-xs font-medium">{ft.FilterTypeName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        Location
                      </label>
                      <Controller
                        name="operTaskLocationNo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006699]/15">
                              <SelectValue placeholder="All Locations" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {fillValues?.location.map(l => (
                                <SelectItem key={l.OperLocationNo} value={l.OperLocationNo.toString()} className="text-xs font-medium">{l.Location}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
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
                  </div>

                  {/* Popover Actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleReset}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      className="h-10 px-5 rounded-xl bg-[#006699] hover:bg-[#005580] text-xs font-bold text-white shadow-md shadow-[#006699]/15"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleReset} 
              className="h-11 w-11 p-0 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-transform active:rotate-180 duration-500"
            >
              <RotateCcw size={15} />
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
