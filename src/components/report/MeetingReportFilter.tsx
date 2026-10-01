import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { BusinessEntityCombobox } from '@/components/meetings/BusinessEntityCombobox';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel } from '@/components/ui/form-field';
import { SlidersHorizontal, RotateCcw, FileBarChart2, ChevronDown, ChevronUp, PencilLine } from 'lucide-react';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { useAuthStore } from '@/store/useAuthStore';
import { apiService } from '@/services/apiService';
import { useTaskStore } from '@/store/useTaskStore';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { sortByLabel } from '@/lib/sortOptions';
import { cn } from '@/lib/utils';

interface MeetingReportFilterValues {
  meetingDateRange?: { from: Date | undefined; to: Date | undefined };
  createdDateRange?: { from: Date | undefined; to: Date | undefined };
  category?: string;
  type?: string;
  title?: string;
  company?: string;
  location?: string;
  mode?: string;
  internalUser?: string;
  internalEmployee?: string;
  businessEntity?: string;
  businessEntityName?: string;
  externalUser?: string;
  isActionTaken?: boolean;
  isAttachedDocument?: boolean;
  createdBy?: string;
  status?: string;
}

interface MeetingReportFilterProps {
  onApply: (filters: MeetingReportFilterValues) => void;
}

const fieldClass = FIELD_CONTROL_CLASS;


function buildMeetingAppliedSummary(data: MeetingReportFilterValues | null): string {
  if (!data) return 'No filters generated yet';
  const parts: string[] = [];
  if (data.meetingDateRange?.from || data.meetingDateRange?.to) parts.push('Meeting date');
  if (data.createdDateRange?.from || data.createdDateRange?.to) parts.push('Created date');
  if (data.category) parts.push('Category');
  if (data.type) parts.push('Type');
  if (data.title) parts.push('Title');
  if (data.company) parts.push('Company');
  if (data.location) parts.push('Location');
  if (data.mode) parts.push('Mode');
  if (data.internalUser) parts.push('Internal user');
  if (data.businessEntity || data.businessEntityName) parts.push('Business entity');
  if (data.status) parts.push('Status');
  if (data.isActionTaken) parts.push('Action taken');
  if (data.isAttachedDocument) parts.push('Attachments');
  if (!parts.length) return 'All default filters';
  if (parts.length <= 3) return parts.join(' · ');
  return `${parts.slice(0, 3).join(' · ')} +${parts.length - 3} more`;
}

export function MeetingReportFilter({ onApply }: MeetingReportFilterProps) {
  const [fillValues, setFillValues] = useState<any>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [lastApplied, setLastApplied] = useState<MeetingReportFilterValues | null>(null);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1).toString();
  const { fillValues: taskFillValues } = useTaskStore();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await apiService.get<any>(
          `/api/crm/meeting-notes/fill-values?companyNo=${companyNo}`
        );
        if (response) {
          setFillValues(response);
        }
      } catch (error) {
        console.error('Failed to fetch meeting fill-values:', error);
      }
    };
    fetchOptions();
  }, [companyNo]);

  const { control, handleSubmit, reset, register, setValue } = useForm<MeetingReportFilterValues>({
    defaultValues: {
      meetingDateRange: { from: undefined, to: undefined },
      createdDateRange: { from: undefined, to: undefined },
      category: undefined,
      type: undefined,
      title: '',
      company: undefined,
      location: undefined,
      mode: undefined,
      internalUser: undefined,
      internalEmployee: undefined,
      businessEntity: undefined,
      businessEntityName: undefined,
      externalUser: '',
      isActionTaken: false,
      isAttachedDocument: false,
      createdBy: undefined,
      status: undefined,
    },
  });

  const appliedSummary = useMemo(() => buildMeetingAppliedSummary(lastApplied), [lastApplied]);

  const onSubmit = (data: MeetingReportFilterValues) => {
    setLastApplied(data);
    onApply(data);
    setFiltersCollapsed(true);
  };

  return (
    <section data-page-tour="mreport-filters" className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--tm-elevated)] border-[var(--tm-border)]',
          filtersCollapsed ? 'rounded-[8px] border-0' : 'border-b rounded-t-[8px]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <SlidersHorizontal size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
              Meeting Notes Report Filters
            </h2>
            {filtersCollapsed ? (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{appliedSummary}</p>
            ) : (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                Refine criteria and generate the meeting notes report
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
            <FieldLabel>Meeting Date Range</FieldLabel>
            <Controller
              name="meetingDateRange"
              control={control}
              render={({ field }) => (
                <DateRangePicker
                  value={{ from: field.value?.from, to: field.value?.to }}
                  onChange={(val) => field.onChange({ from: val?.from, to: val?.to })}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Meeting Category</FieldLabel>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(
                    fillValues?.data?.meetingCategories ||
                    fillValues?.meetingCategories ||
                    []
                  ).map((c: any) => ({ value: c.id?.toString(), label: c.name }))}
                  placeholder="Select Category"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Meeting Type</FieldLabel>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.data?.meetingTypes || fillValues?.meetingTypes || []).map(
                    (t: any) => ({ value: t.id?.toString(), label: t.name })
                  )}
                  placeholder="Select Type"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Meeting Title</FieldLabel>
            <Input
              {...register('title')}
              placeholder="Enter Title"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Company</FieldLabel>
            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={
                    taskFillValues?.taskCompany?.map((c) => ({
                      value:
                        c.CompanyNo?.toString() ||
                        c.companyNo?.toString() ||
                        c.OperTaskCompanyNo?.toString() ||
                        '',
                      label:
                        c.AliasName ||
                        c.companyName ||
                        c.name ||
                        c.AliasName ||
                        c.Code ||
                        'Unknown Company',
                    })) || []
                  }
                  placeholder="Select Company"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Location</FieldLabel>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={
                    taskFillValues?.location
                      ?.filter(
                        (l) =>
                          l.Location.toLowerCase() !== 'all' &&
                          l.Location.toLowerCase() !== '[all]'
                      )
                      .map((l) => ({
                        value: l.OperLocationNo.toString(),
                        label: l.Location,
                      })) || []
                  }
                  placeholder="Select Location"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Meeting Mode</FieldLabel>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortByLabel(
                      fillValues?.data?.meetingModes || fillValues?.meetingModes || [],
                      {
                        getLabel: (m: any) => m.meetingModeName || '',
                        getValue: (m: any) => String(m.meetingModeNo),
                      }
                    ).map((m: any) => (
                        <SelectItem key={m.meetingModeNo} value={m.meetingModeNo.toString()}>
                          {m.meetingModeName}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Internal User</FieldLabel>
            <Controller
              name="internalUser"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value || ''}
                  onChange={(user: any) => field.onChange(user?.loginNo?.toString() || '')}
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Internal Employee</FieldLabel>
            <Controller
              name="internalEmployee"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value || ''}
                  onChange={(user: any) => field.onChange(user?.loginNo?.toString() || '')}
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Business Entity</FieldLabel>
            <Controller
              name="businessEntityName"
              control={control}
              render={({ field }) => (
                <BusinessEntityCombobox
                  value={field.value || ''}
                  onChange={(contact: any) => {
                    field.onChange(contact?.contactPersonName || '');
                    setValue('businessEntity', contact?.businessEntityNo?.toString() || '');
                  }}
                  placeholder="Select Business Entity"
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>External User</FieldLabel>
            <Input
              {...register('externalUser')}
              placeholder="Enter External User"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Created By</FieldLabel>
            <Controller
              name="createdBy"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value || ''}
                  onChange={(user: any) => field.onChange(user?.loginNo?.toString() || '')}
                  className={fieldClass}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Created Date Range</FieldLabel>
            <Controller
              name="createdDateRange"
              control={control}
              render={({ field }) => (
                <DateRangePicker
                  value={{ from: field.value?.from, to: field.value?.to }}
                  onChange={(val) => field.onChange({ from: val?.from, to: val?.to })}
                />
              )}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <FieldLabel>Status</FieldLabel>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      fillValues?.data?.documentStatuses ||
                      fillValues?.documentStatuses ||
                      []
                    ).map((s: any) => (
                      <SelectItem
                        key={s.documentStatusNo}
                        value={s.documentStatusNo.toString()}
                      >
                        {s.documentStatusName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--tm-border)]">
          <div className="flex flex-wrap items-center gap-2">
            <Controller
              name="isActionTaken"
              control={control}
              render={({ field }) => (
                <label
                  htmlFor="isActionTaken"
                  className="inline-flex items-center gap-2.5 rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)] px-3 py-2 cursor-pointer hover:border-[#0EA5E9]/30 transition-colors"
                >
                  <Checkbox
                    id="isActionTaken"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <span className="text-[12px] font-medium text-slate-200">Is Action Taken</span>
                </label>
              )}
            />
            <Controller
              name="isAttachedDocument"
              control={control}
              render={({ field }) => (
                <label
                  htmlFor="isAttachedDocument"
                  className="inline-flex items-center gap-2.5 rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)] px-3 py-2 cursor-pointer hover:border-[#0EA5E9]/30 transition-colors"
                >
                  <Checkbox
                    id="isAttachedDocument"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <span className="text-[12px] font-medium text-slate-200">
                    Is Attached Document
                  </span>
                </label>
              )}
            />
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              data-page-tour="mreport-reset"
              onClick={() => reset()}
              className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
            <Button
              type="submit"
              data-page-tour="mreport-apply"
              className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20"
            >
              <FileBarChart2 className="h-3.5 w-3.5 mr-1.5" />
              Apply Filters
            </Button>
          </div>
        </div>
      </form>
      )}
    </section>
  );
}
