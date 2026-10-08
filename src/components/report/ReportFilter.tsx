import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { MultiUserCombobox } from '@/components/ui/MultiUserCombobox';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, RotateCcw, FileBarChart2, ChevronDown, ChevronUp, PencilLine } from 'lucide-react';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { useTaskStore, TaskFillValues } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettings } from '@/hooks/useSettings';
import { filterSelectableStatuses } from '@/lib/taskStatusGroups';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

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

function buildAppliedSummary(data: ReportFilterValues | null): string {
  if (!data) return 'No filters generated yet';
  const parts: string[] = [];
  if (data.dateRange?.from || data.dateRange?.to) parts.push('Date range');
  if (data.operTaskStatusNo) parts.push('Status');
  if (data.operTaskPriorityNo) parts.push('Priority');
  if (data.companyNo) parts.push('Company');
  if (data.operTaskCategoryNo) parts.push('Category');
  if (data.operTaskLocationNo) parts.push('Location');
  if (data.originatorNo) parts.push('Originator');
  if (data.userIds?.length && !data.userIds.includes('All')) parts.push('Users');
  if (data.showSubTasks) parts.push('Sub-tasks');
  if (!parts.length) return 'All default filters';
  if (parts.length <= 3) return parts.join(' · ');
  return `${parts.slice(0, 3).join(' · ')} +${parts.length - 3} more`;
}

export function ReportFilter({ onApply }: ReportFilterProps) {
  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [lastApplied, setLastApplied] = useState<ReportFilterValues | null>(null);
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

  const appliedSummary = useMemo(() => buildAppliedSummary(lastApplied), [lastApplied]);

  const onSubmit = (data: ReportFilterValues) => {
    setLastApplied(data);
    onApply(data);
    // Free vertical space so Report Results is visible without scrolling
    setFiltersCollapsed(true);
  };

  return (
    <section data-page-tour="report-filters" className="crm-form-section rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--tm-elevated)] border-[var(--tm-border)]',
          filtersCollapsed ? 'rounded-[8px] border-0' : 'border-b rounded-t-[8px]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="crm-form-section-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <SlidersHorizontal size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Report Filters</h2>
            {filtersCollapsed ? (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{appliedSummary}</p>
            ) : (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                Refine criteria and generate the task overview
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ActionTip
            label={
              filtersCollapsed
                ? 'Expand filters to change criteria'
                : 'Collapse filters to focus on results'
            }
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFiltersCollapsed((v) => !v)}
              className="h-8 gap-1.5 rounded-[8px] text-xs font-medium border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-none"
              aria-expanded={!filtersCollapsed}
            >
              {filtersCollapsed ? (
                <>
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit filters
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </>
              ) : (
                <>
                  Collapse
                  <ChevronUp className="h-3.5 w-3.5 opacity-70" />
                </>
              )}
            </Button>
          </ActionTip>
        </div>
      </div>

      {!filtersCollapsed && (
      <form onSubmit={handleSubmit(onSubmit)} className="p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-3">
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

          <div className="space-y-1.5 min-w-0">
            <FieldLabel required>Date Range</FieldLabel>
            <FieldControl
              error={errors.dateRange?.message as string | undefined}
              tipClassName="top-[22px]"
            >
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
            </FieldControl>
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
                  options={filterSelectableStatuses(fillValues?.status || []).map((s) => ({
                    value: s.StatusNo.toString(),
                    label: s.Status,
                  }))}
                  placeholder="Select Status"
                  sortAlphabetically={false}
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
                  sortAlphabetically={false}
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[var(--tm-border)]">
          <Controller
            name="showSubTasks"
            control={control}
            render={({ field }) => (
              <label
                htmlFor="showSubTasks"
                className="inline-flex items-center gap-2.5 rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)] px-3 py-2 cursor-pointer hover:border-[#0EA5E9]/30 transition-colors"
              >
                <Checkbox
                  id="showSubTasks"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-[#0EA5E9] data-[state=checked]:border-[#0EA5E9]"
                />
                <span className="text-[12px] font-medium text-slate-200">Show Sub-tasks</span>
              </label>
            )}
          />

          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              data-page-tour="report-reset"
              onClick={() => reset()}
              className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
            <Button
              type="submit"
              data-page-tour="report-apply"
              className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20"
            >
              <FileBarChart2 className="h-3.5 w-3.5 mr-1.5" />
              Generate Report
            </Button>
          </div>
        </div>
      </form>
      )}
    </section>
  );
}
