import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { MultiUserCombobox } from '@/components/ui/MultiUserCombobox';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettings } from '@/hooks/useSettings';

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
    }
  });
  const { isHideType } = useSettings();

  const { errors } = formState;

  const onSubmit = (data: ReportFilterValues) => {
    onApply(data);
  };

  return (
    <Card className="p-4 shadow-sm border-slate-200">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Report Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Date Filter On</label>
            <Controller
              name="DateOnFilter"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9">
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

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              Date Range <span className="text-red-500">*</span>
            </label>
            <Controller
              name="dateRange"
              control={control}
              rules={{
                validate: (val) => {
                  if (!val || !val.from || !val.to) return 'Date Range is required';
                  return true;
                }
              }}
              render={({ field }) => (
                <DateRangePicker
                  value={{ from: field.value?.from, to: field.value?.to }}
                  onChange={(val) => field.onChange({ from: val?.from, to: val?.to })}
                />
              )}
            />
            {errors.dateRange && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.dateRange.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <Controller
              name="operTaskStatusNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.status || [])
                    .filter(s => s.Status !== '[All]' && s.Status !== 'All')
                    .map(s => ({ value: s.StatusNo.toString(), label: s.Status }))}
                  placeholder="Select Status"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Priority</label>
            <Controller
              name="operTaskPriorityNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.priority || [])
                    .filter(p => p.Priority !== '[All]' && p.Priority !== 'All')
                    .map(p => ({ value: p.OperTaskPriorityNo.toString(), label: p.Priority }))}
                  placeholder="Select Priority"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Company</label>
            <Controller
              name="companyNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.taskCompany || []).map(c => ({ value: c.OperTaskCompanyNo.toString(), label: c.AliasName || c.CompanyName || '' }))}
                  placeholder="Select Company"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>
          {
            !isHideType && 
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Type</label>
              <Controller
                name="operTaskTypeNo"
                control={control}
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={(fillValues?.type || [])
                      .filter(t => t["Task Type"] !== '[All]' && t["Task Type"] !== 'All')
                      .map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] }))}
                    placeholder="Select Type"
                    className="h-9 rounded-2xl border-slate-200 bg-white"
                  />
                )}
              />
            </div>
          }

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Category</label>
            <Controller
              name="operTaskCategoryNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.category || [])
                    .filter(c => c.Category !== '[All]' && c.Category !== 'All')
                    .map(c => ({ value: c.OperTaskCategoryNo.toString(), label: c.Category }))}
                  placeholder="Select Category"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Location</label>
            <Controller
              name="operTaskLocationNo"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.location || [])
                    .filter(l => l.Location !== '[All]' && l.Location !== 'All')
                    .map(l => ({ value: l.OperLocationNo.toString(), label: l.Location }))}
                  placeholder="Select Location"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Originator</label>
            <Controller
              name="originatorNo"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value}
                  onChange={(user) => field.onChange(user.loginNo.toString())}
                  placeholder="Select Originator"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600">Users (Multi-select)</label>
            <Controller
              name="userIds"
              control={control}
              render={({ field }) => (
                <MultiUserCombobox
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select Users..."
                  className="rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Controller
            name="showSubTasks"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox id="showSubTasks" checked={field.value} onCheckedChange={field.onChange} />
                <label htmlFor="showSubTasks" className="text-sm text-slate-700 cursor-pointer">
                  Show Sub-tasks
                </label>
              </div>
            )}
          />

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => reset()}
              className="text-slate-600"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Generate Report
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
