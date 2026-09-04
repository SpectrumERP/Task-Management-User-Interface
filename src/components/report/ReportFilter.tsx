import { useEffect, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { MultiUserCombobox } from '@/components/ui/MultiUserCombobox';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, RotateCcw, FileBarChart2 } from 'lucide-react';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';

interface ReportFilterValues {
  DateOnFilter?: string;
  dateRange?: { from: Date | undefined; to: Date | undefined };
  operTaskStatusNo?: string;
  operTaskPriorityNo?: string;
  companyNo?: string;
  operTaskTypeNo?: string;
  operTaskCategoryNo?: string;
  operTaskLocationNo?: string;
  originatorNo?: string;
  userIds?: any;
  showSubTasks?: boolean;
}

interface ReportFilterProps {
  onApply: (filters: ReportFilterValues) => void;
}

const fieldClass = FIELD_CONTROL_CLASS;

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-600">
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function ReportFilter({ onApply }: ReportFilterProps) {
  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const { fetchFillValues } = useTaskStore();
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1).toString();

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

  const { control, handleSubmit, reset, formState } = useForm<ReportFilterValues>({
    defaultValues: {
      DateOnFilter: '1',
      dateRange: { from: undefined, to: undefined },
      operTaskStatusNo: undefined,
      operTaskPriorityNo: undefined,
      companyNo: undefined,
      operTaskTypeNo: undefined,
      operTaskCategoryNo: undefined,
      operTaskLocationNo: undefined,
      originatorNo: undefined,
      userIds: [],
      showSubTasks: false,
    },
  });
  const { isHideType } = useSettings();
  const { errors } = formState;

  const onSubmit = (data: ReportFilterValues) => {
    onApply(data);
  };

  return (
    <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <SlidersHorizontal size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Report Filters</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Refine criteria and generate the task overview
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-3.5">
          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Date Filter On</FieldLabel>
            <Controller
              name="DateOnFilter"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Select date type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Due Date</SelectItem>
                    <SelectItem value="2">Created Date</SelectItem>
                    <SelectItem value="3">Log Date</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0 relative">
            <FieldLabel required>Date Range</FieldLabel>
            <Controller
              name="dateRange"
              control={control}
              rules={{
                validate: (val) => {
                  if (!val || !val.from || !val.to) return 'Date Range is required';
                  return true;
                },
              }}
              render={({ field }) => (
                <DateRangePicker
                  value={{ from: field.value?.from, to: field.value?.to }}
                  onChange={(val) => field.onChange({ from: val?.from, to: val?.to })}
                  className={cn(errors.dateRange && '[&_button]:border-red-400')}
                />
              )}
            />
            {errors.dateRange ? (
              <span
                role="alert"
                className="pointer-events-none absolute right-1.5 top-[22px] z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)]"
              >
                {errors.dateRange.message as string}
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Status</FieldLabel>
            <Controller
              name="operTaskStatusNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.status || [])
                    .filter((s) => s.Status !== '[All]' && s.Status !== 'All')
                    .map((s) => ({ value: s.StatusNo.toString(), label: s.Status }))}
                  placeholder="Select Status"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Priority</FieldLabel>
            <Controller
              name="operTaskPriorityNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.priority || [])
                    .filter((p) => p.Priority !== '[All]' && p.Priority !== 'All')
                    .map((p) => ({
                      value: p.OperTaskPriorityNo.toString(),
                      label: p.Priority,
                    }))}
                  placeholder="Select Priority"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Company</FieldLabel>
            <Controller
              name="companyNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.taskCompany || []).map((c) => ({
                    value: c.OperTaskCompanyNo.toString(),
                    label: c.AliasName || c.CompanyName || '',
                  }))}
                  placeholder="Select Company"
                  className={fieldClass}
                />
              )}
            />
          </div>

          {!isHideType && (
            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Type</FieldLabel>
              <Controller
                name="operTaskTypeNo"
                control={control}
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={(fillValues?.type || [])
                      .filter((t) => t['Task Type'] !== '[All]' && t['Task Type'] !== 'All')
                      .map((t) => ({
                        value: t.OperTaskTypeNo.toString(),
                        label: t['Task Type'],
                      }))}
                    placeholder="Select Type"
                    className={fieldClass}
                  />
                )}
              />
            </div>
          )}

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Category</FieldLabel>
            <Controller
              name="operTaskCategoryNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.category || [])
                    .filter((c) => c.Category !== '[All]' && c.Category !== 'All')
                    .map((c) => ({
                      value: c.OperTaskCategoryNo.toString(),
                      label: c.Category,
                    }))}
                  placeholder="Select Category"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Location</FieldLabel>
            <Controller
              name="operTaskLocationNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.location || [])
                    .filter((l) => l.Location !== '[All]' && l.Location !== 'All')
                    .map((l) => ({
                      value: l.OperLocationNo.toString(),
                      label: l.Location,
                    }))}
                  placeholder="Select Location"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Originator</FieldLabel>
            <Controller
              name="originatorNo"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value}
                  onChange={(user) => field.onChange(user.loginNo.toString())}
                  placeholder="Select Originator"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0 sm:col-span-2 xl:col-span-2">
            <FieldLabel>Users (Multi-select)</FieldLabel>
            <Controller
              name="userIds"
              control={control}
              render={({ field }) => (
                <MultiUserCombobox
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="All Users"
                  className={cn(fieldClass, 'min-h-10')}
                />
              )}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <Controller
            name="showSubTasks"
            control={control}
            render={({ field }) => (
              <label
                htmlFor="showSubTasks"
                className="inline-flex items-center gap-2.5 rounded-[8px] border border-slate-200/80 bg-[#f8fbfd] px-3 py-2 cursor-pointer hover:border-[#006699]/30 transition-colors"
              >
                <Checkbox
                  id="showSubTasks"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-[#006699] data-[state=checked]:border-[#006699]"
                />
                <span className="text-[12px] font-medium text-slate-700">Show Sub-tasks</span>
              </label>
            )}
          />

          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-none"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
            <Button
              type="submit"
              className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#006699] hover:bg-[#005580] text-white shadow-sm shadow-[#006699]/20"
            >
              <FileBarChart2 className="h-3.5 w-3.5 mr-1.5" />
              Generate Report
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
