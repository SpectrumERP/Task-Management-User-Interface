import { useEffect, useState, type ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 13;
const TITLE = 'State Master';
const fieldClass = FIELD_CONTROL_CLASS;

function FieldErrorTip({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
    >
      {message}
    </span>
  );
}

function FieldControl({
  children,
  error,
  className,
}: {
  children: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {children}
      <FieldErrorTip message={error} />
    </div>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-300"
    >
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

interface StateFormProps {
  id?: string;
}

export function StateForm({ id }: StateFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('state', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues } = useTaskStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [gstStateCode, setGstStateCode] = useState('');
  const [isUnionTerritory, setIsUnionTerritory] = useState(false);
  const [stateCountryNo, setStateCountryNo] = useState('');
  const [locationFillValues, setLocationFillValues] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);

  const refreshCountries = () => {
    apiService
      .get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`)
      .then((response) => {
        if (response) setLocationFillValues(response);
      })
      .catch((err) => console.error('Failed to fetch location fill-values:', err));
  };

  useEffect(() => {
    refreshCountries();
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService
      .get<any>(`/api/master/states/load-data/${editingId}?companyNo=${companyNo}`)
      .then((response) => {
        if (!response) return;
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.stateName || dl.name || '');
          setGstStateCode(dl.gstStateCode || dl.gstCode || '');
          setIsUnionTerritory(dl.isUnionTerritory || false);
          setStateCountryNo((dl.countryNo || dl.CountryNo || '').toString());
          setCode(dl.code || '');
        }
      })
      .catch((err) => console.error('Failed to load state details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'State Name is required';
    }
    if (!stateCountryNo || stateCountryNo === 'none') {
      newErrors.stateCountryNo = 'Country is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      const payload = {
        stateNo: editingId ? parseInt(editingId) : null,
        stateName: name,
        gstStateCode: gstStateCode,
        isUnionTerritory: isUnionTerritory,
        countryNo: parseInt(stateCountryNo) || null,
        companyNo: authCompanies?.find((itm) => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo,
      };
      await apiService.post('/api/master/states/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  const countryOptions = (
    locationFillValues?.data?.countries ||
    locationFillValues?.countries ||
    []
  ).map((c: any) => ({
    label: c.countryName || '',
    value: (c.countryNo || '').toString(),
  }));

  return (
    <MasterFormShell
      type="state"
      title={TITLE}
      editingId={editingId}
      isSaving={isSaving}
      serverError={serverError}
      onSubmit={handleSubmit}
      showConfirm={showConfirm}
      onCancelConfirm={() => setShowConfirm(false)}
      onConfirmSave={handleConfirmSave}
      showSuccessAlert={showSuccessAlert}
      onSuccessOk={() => {
        setShowSuccessAlert(false);
        goToList();
      }}
    >
      <section className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <MapPin size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">State Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Name, country, and GST state code
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">
            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Code</FieldLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={editingId ? code || '—' : 'AUTO-GEN-CODE'}
                className={cn(
                  fieldClass,
                  'bg-[var(--tm-elevated)] text-slate-500 cursor-default select-none focus-visible:ring-0 focus-visible:border-[var(--tm-border)]/80'
                )}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="stateName" required>
                State Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="stateName"
                  placeholder="Enter state name"
                  value={name}
                  maxLength={50}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.name &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel required>Country</FieldLabel>
              <FieldControl error={errors.stateCountryNo}>
                <Combobox
                  options={countryOptions}
                  value={stateCountryNo}
                  onChange={(val) => {
                    setStateCountryNo(val);
                    if (errors.stateCountryNo) setErrors((prev) => ({ ...prev, stateCountryNo: '' }));
                  }}
                  placeholder="Select Country"
                  searchPlaceholder="Search country..."
                  className={cn(
                    fieldClass,
                    errors.stateCountryNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                  onAddNew={() => setIsMasterCreateOpen(true)}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="gstStateCode">GST State Code</FieldLabel>
              <FieldControl error={errors.gstStateCode}>
                <Input
                  id="gstStateCode"
                  placeholder="Enter GST State Code"
                  value={gstStateCode}
                  maxLength={2}
                  onChange={(e) => {
                    setGstStateCode(e.target.value);
                    if (errors.gstStateCode) setErrors((prev) => ({ ...prev, gstStateCode: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.gstStateCode &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>
          </div>
        </div>
      </section>

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={setIsMasterCreateOpen}
        type="country"
        companyNo={companyNo}
        fillValues={fillValues}
        onSuccess={(newId) => {
          setStateCountryNo(newId);
          refreshCountries();
        }}
      />
    </MasterFormShell>
  );
}
