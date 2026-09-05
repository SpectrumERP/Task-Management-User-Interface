import { useEffect, useState, type ReactNode } from 'react';
import { Building2 } from 'lucide-react';
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
import { fetchStatesByCountry } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 12;
const TITLE = 'City Master';
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

interface CityFormProps {
  id?: string;
}

export function CityForm({ id }: CityFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('city', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues } = useTaskStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cityCityCountryNo, setCityCityCountryNo] = useState('');
  const [cityCityStateNo, setCityCityStateNo] = useState('');
  const [availableCityStates, setAvailableCityStates] = useState<any[]>([]);
  const [locationFillValues, setLocationFillValues] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [activeMasterType, setActiveMasterType] = useState<'country' | 'state'>('country');

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
      .get<any>(`/api/master/cities/load-data/${editingId}?companyNo=${companyNo}`)
      .then((response) => {
        if (!response) return;
        const body = response.data || response;
        const dl = body.data || body;
        if (!dl) return;

        setName(dl.cityName || dl.name || '');
        setCityCityCountryNo((dl.countryNo || dl.CountryNo || '').toString());
        setCityCityStateNo((dl.stateNo || dl.StateNo || '').toString());
        setCode(dl.code || '');

        if (dl.countryNo || dl.CountryNo) {
          fetchStatesByCountry(dl.countryNo || dl.CountryNo).then(setAvailableCityStates);
        }
      })
      .catch((err) => console.error('Failed to load city details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'City Name is required';
    }
    if (!cityCityCountryNo || cityCityCountryNo === 'none') {
      newErrors.cityCityCountryNo = 'Country is required';
    }
    if (!cityCityStateNo || cityCityStateNo === 'none') {
      newErrors.cityCityStateNo = 'State is required';
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
        cityNo: editingId ? parseInt(editingId) : null,
        cityName: name,
        stateNo: parseInt(cityCityStateNo) || null,
        companyNo: authCompanies?.find((itm) => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo,
      };
      await apiService.post('/api/master/cities/save', payload);
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
      type="city"
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
            <Building2 size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">City Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Name, country, and state for this city
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
              <FieldLabel htmlFor="cityName" required>
                City Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="cityName"
                  placeholder="Enter city name"
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
              <FieldControl error={errors.cityCityCountryNo}>
                <Combobox
                  options={countryOptions}
                  value={cityCityCountryNo}
                  onChange={(val) => {
                    setCityCityCountryNo(val);
                    setCityCityStateNo('');
                    setAvailableCityStates([]);
                    if (errors.cityCityCountryNo) {
                      setErrors((prev) => ({ ...prev, cityCityCountryNo: '' }));
                    }
                    if (val) {
                      fetchStatesByCountry(val).then(setAvailableCityStates);
                    }
                  }}
                  placeholder="Select Country"
                  searchPlaceholder="Search country..."
                  className={cn(
                    fieldClass,
                    errors.cityCityCountryNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                  onAddNew={() => {
                    setActiveMasterType('country');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel required>State</FieldLabel>
              <FieldControl error={errors.cityCityStateNo}>
                <Combobox
                  options={availableCityStates.map((s: any) => ({
                    label: s.stateName || s.name || '',
                    value: (s.stateNo || s.id || '').toString(),
                  }))}
                  value={cityCityStateNo}
                  onChange={(val) => {
                    setCityCityStateNo(val);
                    if (errors.cityCityStateNo) {
                      setErrors((prev) => ({ ...prev, cityCityStateNo: '' }));
                    }
                  }}
                  disabled={!cityCityCountryNo}
                  placeholder={cityCityCountryNo ? 'Select State...' : 'Select country first'}
                  searchPlaceholder="Search state..."
                  className={cn(
                    fieldClass,
                    errors.cityCityStateNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                  onAddNew={() => {
                    setActiveMasterType('state');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </FieldControl>
            </div>
          </div>
        </div>
      </section>

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={setIsMasterCreateOpen}
        type={activeMasterType}
        companyNo={companyNo}
        fillValues={fillValues}
        onSuccess={(newId) => {
          if (activeMasterType === 'country') {
            setCityCityCountryNo(newId);
            setCityCityStateNo('');
            fetchStatesByCountry(newId).then(setAvailableCityStates);
          } else if (activeMasterType === 'state') {
            setCityCityStateNo(newId);
          }
          refreshCountries();
        }}
      />
    </MasterFormShell>
  );
}
