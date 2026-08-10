import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { BusinessEntityCombobox } from '@/components/meetings/BusinessEntityCombobox';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiService } from '@/services/apiService';
import { useTaskStore } from '@/store/useTaskStore';

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

export function MeetingReportFilter({ onApply }: MeetingReportFilterProps) {
  const [fillValues, setFillValues] = useState<any>(null);
  const authCompanies = useAuthStore((state) => state.company);
  const companyNo = (authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1).toString();
  const { fillValues: taskFillValues } = useTaskStore();
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await apiService.get<any>(`/api/crm/meeting-notes/fill-values?companyNo=${companyNo}`);
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
    }
  });

  const onSubmit = (data: MeetingReportFilterValues) => {
    onApply(data);
  };

  return (
    <Card className="p-4 shadow-sm border-slate-200">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Meeting Notes Report Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600">Meeting Date Range</label>
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Meeting Category</label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.data?.meetingCategories || fillValues?.meetingCategories || []).map((c: any) => ({ value: c.id?.toString(), label: c.name }))}
                  placeholder="Select Category"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Meeting Type</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={(fillValues?.data?.meetingTypes || fillValues?.meetingTypes || []).map((t: any) => ({ value: t.id?.toString(), label: t.name }))}
                  placeholder="Select Type"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Meeting Title</label>
            <Input
              {...register('title')}
              placeholder="Enter Title"
              className="h-9 rounded-2xl border-slate-200 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Company</label>
            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={taskFillValues?.taskCompany?.map(c => ({ value: c.CompanyNo?.toString() || c.companyNo?.toString() || c.OperTaskCompanyNo?.toString() || '', label: c.AliasName || c.companyName || c.name || c.AliasName || c.Code || 'Unknown Company' })) || []}
                  placeholder="Select Company"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Location</label>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={taskFillValues?.location?.filter(l => l.Location.toLowerCase() !== 'all' && l.Location.toLowerCase() !== '[all]').map(l => ({ value: l.OperLocationNo.toString(), label: l.Location })) || []}
                  placeholder="Select Location"
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Meeting Mode</label>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 rounded-2xl border-slate-200 bg-white">
                    <SelectValue placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {(fillValues?.data?.meetingModes || fillValues?.meetingModes || []).map((m: any) => (
                      <SelectItem key={m.meetingModeNo} value={m.meetingModeNo.toString()}>
                        {m.meetingModeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Internal User</label>
            <Controller
              name="internalUser"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value || ''}
                  onChange={(user: any) => field.onChange(user?.loginNo?.toString() || '')}
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Internal Employee</label>
            <Controller
              name="internalEmployee"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value || ''}
                  onChange={(user: any) => field.onChange(user?.loginNo?.toString() || '')}
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Business Entity</label>
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
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">External User</label>
            <Input
              {...register('externalUser')}
              placeholder="Enter External User"
              className="h-9 rounded-2xl border-slate-200 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Created By</label>
            <Controller
              name="createdBy"
              control={control}
              render={({ field }) => (
                <UserCombobox
                  value={field.value || ''}
                  onChange={(user: any) => field.onChange(user?.loginNo?.toString() || '')}
                  className="h-9 rounded-2xl border-slate-200 bg-white"
                />
              )}
            />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600">Created Date Range</label>
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 rounded-2xl border-slate-200 bg-white">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(fillValues?.data?.documentStatuses || fillValues?.documentStatuses || []).map((s: any) => (
                      <SelectItem key={s.documentStatusNo} value={s.documentStatusNo.toString()}>
                        {s.documentStatusName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Controller
                name="isActionTaken"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isActionTaken"
                  />
                )}
              />
              <label htmlFor="isActionTaken" className="text-xs font-medium text-slate-600 cursor-pointer">
                Is Action Taken
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="isAttachedDocument"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isAttachedDocument"
                  />
                )}
              />
              <label htmlFor="isAttachedDocument" className="text-xs font-medium text-slate-600 cursor-pointer">
                Is Attached Document
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 h-9 text-slate-600"
              onClick={() => reset()}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="submit" className="gap-2 h-9 bg-[#006699] hover:bg-[#005580]">
              Apply Filters
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
