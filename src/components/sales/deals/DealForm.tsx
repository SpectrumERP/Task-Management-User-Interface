import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, CheckCircle, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/useAuthStore';
import { DealFormValues, DealRecord } from '@/types/deal';
import { DealOption, fetchDivisionsByCompany, loadDeal, saveDeal } from './dealApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<DealFormValues | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

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
        }
      } catch (error) {
        console.error('Failed to load sales deal:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchDeal();
  }, [defaultCompanyNo, form, id]);

  const submitForm = (values: DealFormValues) => {
    setPendingValues(values);
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    if (!pendingValues) return;
    setIsSaving(true);
    try {
      const response = await saveDeal(pendingValues, existingDeal);
      if (response?.success === false) return;
      setShowConfirm(false);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Failed to save sales deal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <div className="w-full px-2 sm:px-4 py-1 z-20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button
              type="button"
              onClick={() => navigate('/sales/deals')}
              className="text-slate-500 hover:text-[#0EA5E9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] rounded"
            >
              Sales Deals
            </button>
            <ChevronRight size={16} className="text-slate-400" />
            <span className="text-slate-50 font-bold tracking-tight">
              {isEdit ? 'Update' : 'New'}
            </span>
          </div>

          <div className="flex items-center gap-3" data-page-tour="deal-form-actions">
            <PageGuideButton guideKey="deal-form" />
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate('/sales/deals')}
              disabled={isSaving}
              className="rounded-xl h-9 px-3 sm:px-5 font-medium text-slate-300 hover:bg-[var(--tm-muted)] gap-0.5 text-xs"
            >
              <X size={16} />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
            <Button
              type="submit"
              form="sales-deal-form"
              disabled={isSaving || isFetching}
              className="rounded-xl h-9 px-3 sm:px-6 bg-[#0EA5E9] hover:bg-[#0284C7] font-medium shadow-lg shadow-[#0EA5E9]/20 gap-0.5 text-xs text-white"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span className="hidden sm:inline">{isEdit ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-8">
        <div data-page-tour="deal-form-fields" className=" mx-auto bg-[var(--tm-surface)] rounded-[16px] sm:rounded-[24px] p-4 sm:p-8 shadow-xl shadow-black/40/40 border border-[var(--tm-border)]">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="h-10 w-10 text-[#0EA5E9] animate-spin" />
              <p className="text-slate-500 font-medium text-sm normal-case">Loading Sales Deal...</p>
            </div>
          ) : (
            <form id="sales-deal-form" onSubmit={form.handleSubmit(submitForm)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-0">
                  <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Company <span className="text-red-500">*</span></label>
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
                  {form.formState.errors.companyNo && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.companyNo.message}</p>}
                </div>

                <div className="space-y-0">
                  <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Division</label>
                  <Controller
                    name="divisionNo"
                    control={form.control}
                    render={({ field }) => (
                      <Combobox options={divisionOptions} value={field.value} onChange={field.onChange} disabled={!watchedCompanyNo || isLoadingDivisions} placeholder={!watchedCompanyNo ? "Select company first" : isLoadingDivisions ? "Loading divisions..." : "Select division"} searchPlaceholder="Search division..." className="h-11 rounded-[8px] border-[var(--tm-border)] hover:border-[#0EA5E9]/35 bg-[var(--tm-surface)] text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9] focus-visible:ring-offset-0 focus:outline-none" />
                    )}
                  />
                </div>

                <div className="space-y-0">
                  <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Document No Yearly <span className="text-red-500">*</span></label>
                  <Input {...form.register('documentNoYearly')} maxLength={30} className="h-11 rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm" placeholder="Enter document no" />
                  {form.formState.errors.documentNoYearly && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.documentNoYearly.message}</p>}
                </div>

                <div className="space-y-0">
                  <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Document Date <span className="text-red-500">*</span></label>
                  <Controller
                    name="documentDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePicker date={field.value} onChange={field.onChange} placeholder="Select document date" />
                    )}
                  />
                  {form.formState.errors.documentDate && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.documentDate.message}</p>}
                </div>
              </div>

              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Description <span className="text-red-500">*</span></label>
                <Textarea {...form.register('description')} maxLength={1000} className="min-h-[140px] rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm resize-none" placeholder="Enter description" />
                {form.formState.errors.description && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.description.message}</p>}
              </div>
            </form>
          )}
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl bg-[var(--tm-surface)]/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-100 tracking-tight">
              Confirm {isEdit ? 'Update' : 'Save'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to {isEdit ? 'update' : 'save'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-[var(--tm-muted)]/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setShowConfirm(false)} className="h-10 px-4 rounded-xl text-xs font-medium">
              No
            </Button>
            <Button type="button" disabled={isSaving} onClick={confirmSave} className="h-10 px-5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-medium text-xs normal-case gap-0.5">
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
        <DialogContent className="rounded-3xl max-w-xs p-0 border-none shadow-2xl bg-[var(--tm-surface)]/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-500/15 rounded-full border border-emerald-500/30 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-100 tracking-tight mb-1">Success</h3>
            <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">Data save sucessfully.</p>
          </div>
          <div className="p-4 bg-[var(--tm-muted)]/80 border-t border-[var(--tm-border)]/50 flex justify-center">
            <Button type="button" onClick={() => navigate('/sales/deals')} className="w-full h-10 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-medium text-xs normal-case">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
