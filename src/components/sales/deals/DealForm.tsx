import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { BrandLoader, InlineLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Button } from '@/components/ui/button';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { Textarea } from '@/components/ui/textarea';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { useAuthStore } from '@/store/useAuthStore';
import { DealFormValues, DealRecord } from '@/types/deal';
import { DealOption, fetchDivisionsByCompany, loadDeal, saveDeal } from './dealApi';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';

const dealSchema = z.object({
  companyNo: z.string().min(1, 'Company is required'),
  divisionNo: z.string(),
  documentNoYearly: z.string().min(1, 'Document No Yearly is required'),
  documentDate: z.date().optional().refine(Boolean, 'Document Date is required'),
  description: z.string().min(1, 'Description is required'),
});

export function DealForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const authCompanies = useAuthStore((state) => state.company) || [];
  const defaultCompanyNo = (authCompanies[0]?.CompanyNo || authCompanies[0]?.companyNo || '').toString();
  const companyOptions = useMemo(() => authCompanies.map((company: any) => ({
    value: (company.CompanyNo || company.companyNo || '').toString(),
    label: company.companyName || company.CompanyName || company.name || company.alias || `Company ${company.companyNo || company.CompanyNo}`,
  })).filter((company: any) => company.value), [authCompanies]);

  const [existingDeal, setExistingDeal] = useState<DealRecord | null>(null);
  const [divisionOptions, setDivisionOptions] = useState<DealOption[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [loadError, setLoadError] = useState(false);
  const [loadRetryKey, setLoadRetryKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      companyNo: defaultCompanyNo,
      divisionNo: '',
      documentNoYearly: '',
      documentDate: undefined,
      description: '',
    },
  });

  useEffect(() => {
    if (!isEdit && defaultCompanyNo) {
      form.setValue('companyNo', defaultCompanyNo);
    }
  }, [defaultCompanyNo, form, isEdit]);

  const watchedCompanyNo = form.watch('companyNo');

  useEffect(() => {
    const loadDivisions = async () => {
      if (!watchedCompanyNo) {
        setDivisionOptions([]);
        return;
      }

      setIsLoadingDivisions(true);
      try {
        const divisions = await fetchDivisionsByCompany(watchedCompanyNo);
        const nextOptions = existingDeal?.divisionNo && !divisions.some((option) => option.value === existingDeal.divisionNo)
          ? [...divisions, { value: existingDeal.divisionNo, label: existingDeal.divisionName || existingDeal.divisionNo }]
          : divisions;
        setDivisionOptions(nextOptions);
      } catch (error) {
        console.error('Failed to load divisions:', error);
        setDivisionOptions([]);
        if (shouldToastCaughtError(error)) {
          toast.error(getUserErrorMessage(error, 'Failed to load divisions'));
        }
      } finally {
        setIsLoadingDivisions(false);
      }
    };

    loadDivisions();
  }, [existingDeal, watchedCompanyNo]);

  useEffect(() => {
    const fetchDeal = async () => {
      if (!id) return;
      setIsFetching(true);
      setLoadError(false);
      try {
        const deal = await loadDeal(id);
        if (deal) {
          setExistingDeal(deal);
          form.reset({
            companyNo: deal.companyNo || defaultCompanyNo,
            divisionNo: deal.divisionNo,
            documentNoYearly: deal.documentNoYearly,
            documentDate: deal.documentDate ? new Date(deal.documentDate) : undefined,
            description: deal.description,
          });
        } else {
          setExistingDeal(null);
          setLoadError(true);
          toast.error('Sales deal not found');
        }
      } catch (error) {
        console.error('Failed to load sales deal:', error);
        setExistingDeal(null);
        setLoadError(true);
        if (shouldToastCaughtError(error)) {
          toast.error(getUserErrorMessage(error, 'Failed to load sales deal'));
        }
      } finally {
        setIsFetching(false);
      }
    };

    fetchDeal();
  }, [defaultCompanyNo, form, id, loadRetryKey]);

  const submitForm = async (values: DealFormValues) => {
    setIsSaving(true);
    try {
      const response = await saveDeal(values, existingDeal);
      if (response?.success === false) {
        // apiService already toasted the server message when present
        return;
      }
      toast.success('Data saved successfully.');
      navigate('/sales/deals');
    } catch (error) {
      console.error('Failed to save sales deal:', error);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to save sales deal'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <AppBreadcrumbBar
        items={[
          { label: 'Sales Deals', href: '/sales/deals' },
          { label: isEdit ? 'Update' : 'New', current: true },
        ]}
        guideKey="deal-form"
        actions={
          <div className="flex items-center gap-2" data-page-tour="deal-form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sales/deals')}
              disabled={isSaving}
              className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none gap-1.5 disabled:opacity-40"
            >
              <X size={14} />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
            <Button
              type="submit"
              form="sales-deal-form"
              disabled={isSaving || isFetching || loadError}
              className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20 gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <InlineLoader size={14} />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span className="hidden sm:inline">{isEdit ? 'Update' : 'Save'}</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-3 sm:px-8">
        <div data-page-tour="deal-form-fields" className=" mx-auto bg-[var(--tm-surface)] rounded-[16px] sm:rounded-[24px] p-4 sm:p-8 shadow-xl shadow-black/40/40 border border-[var(--tm-border)]">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <BrandLoader size="sm" message="Loading sales deal" />
            </div>
          ) : loadError ? (
            <LoadErrorState
              title="Failed to load sales deal"
              description="Could not load this deal for editing. Retry uses the same request. Cancel returns to the list."
              onRetry={() => setLoadRetryKey((k) => k + 1)}
            />
          ) : (
            <form id="sales-deal-form" onSubmit={form.handleSubmit(submitForm)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-0">
                  <FieldLabel required className="text-slate-200 normal-case ml-1">Company</FieldLabel>
                  <FieldControl error={form.formState.errors.companyNo?.message}>
                    <Controller
                      name="companyNo"
                      control={form.control}
                      render={({ field }) => (
                        <Combobox options={companyOptions} value={field.value} onChange={(value) => {
                          field.onChange(value);
                          form.setValue('divisionNo', '', { shouldDirty: true, shouldValidate: true });
                        }}
                          placeholder="Select company"
                          searchPlaceholder="Search company..."
                          className="h-11 rounded-[8px] border-[var(--tm-border)] hover:border-[#0EA5E9]/35 bg-[var(--tm-surface)] text-xs font-medium text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9] focus-visible:ring-offset-0 focus:outline-none"
                        />
                      )}
                    />
                  </FieldControl>
                </div>

                <div className="space-y-0">
                  <FieldLabel className="text-slate-200 normal-case ml-1">Division</FieldLabel>
                  <Controller
                    name="divisionNo"
                    control={form.control}
                    render={({ field }) => (
                      <Combobox options={divisionOptions} value={field.value} onChange={field.onChange} disabled={!watchedCompanyNo || isLoadingDivisions} placeholder={!watchedCompanyNo ? "Select company first" : isLoadingDivisions ? "Loading divisions..." : "Select division"} searchPlaceholder="Search division..." className="h-11 rounded-[8px] border-[var(--tm-border)] hover:border-[#0EA5E9]/35 bg-[var(--tm-surface)] text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9] focus-visible:ring-offset-0 focus:outline-none" />
                    )}
                  />
                </div>

                <div className="space-y-0">
                  <FieldLabel required className="text-slate-200 normal-case ml-1">Document No Yearly</FieldLabel>
                  <FieldControl error={form.formState.errors.documentNoYearly?.message}>
                    <Input {...form.register('documentNoYearly')} maxLength={30} className="h-11 rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm" placeholder="Enter document no" />
                  </FieldControl>
                </div>

                <div className="space-y-0">
                  <FieldLabel required className="text-slate-200 normal-case ml-1">Document Date</FieldLabel>
                  <FieldControl error={form.formState.errors.documentDate?.message}>
                    <Controller
                      name="documentDate"
                      control={form.control}
                      render={({ field }) => (
                        <DatePicker date={field.value} onChange={field.onChange} placeholder="Select document date" />
                      )}
                    />
                  </FieldControl>
                </div>
              </div>

              <div className="space-y-0">
                <FieldLabel required className="text-slate-200 normal-case ml-1">Description</FieldLabel>
                <FieldControl error={form.formState.errors.description?.message}>
                  <Textarea {...form.register('description')} maxLength={1000} className="min-h-[140px] rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm resize-none" placeholder="Enter description" />
                </FieldControl>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
