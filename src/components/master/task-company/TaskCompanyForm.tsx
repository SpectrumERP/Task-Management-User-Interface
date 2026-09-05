import { useEffect, useState, type ReactNode } from 'react';
import { Building2, Home } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { DatePicker } from '@/components/ui/DatePicker';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { fetchStatesByCountry, fetchCitiesByState } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1565;
const TITLE = 'Task Company Master';
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

interface TaskCompanyFormProps {
  id?: string;
}

export function TaskCompanyForm({ id }: TaskCompanyFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('task-company', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues } = useTaskStore();

  const [code, setCode] = useState('');
  const [tcCompanyName, setTcCompanyName] = useState('');
  const [tcAliasName, setTcAliasName] = useState('');
  const [tcLocationName, setTcLocationName] = useState('');
  const [tcAddress1, setTcAddress1] = useState('');
  const [tcAddress2, setTcAddress2] = useState('');
  const [tcAddress3, setTcAddress3] = useState('');
  const [tcPinCode, setTcPinCode] = useState('');
  const [tcIncorporationDate, setTcIncorporationDate] = useState<Date | undefined>(undefined);
  const [tcCountryNo, setTcCountryNo] = useState('');
  const [tcStateNo, setTcStateNo] = useState('');
  const [tcCityNo, setTcCityNo] = useState('');
  const [taskCompanyCountries, setTaskCompanyCountries] = useState<any[]>([]);
  const [taskCompanyStates, setTaskCompanyStates] = useState<any[]>([]);
  const [taskCompanyCities, setTaskCompanyCities] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [activeMasterType, setActiveMasterType] = useState<'country' | 'state' | 'city'>('country');

  const refreshCountries = () => {
    apiService
      .get<any>(`/api/crm/task-companies/fill-values`)
      .then((response) => {
        if (response?.data?.countries) {
          setTaskCompanyCountries(response.data.countries);
        } else if (response?.countries) {
          setTaskCompanyCountries(response.countries);
        }
      })
      .catch((err) => console.error('Failed to fetch task company countries:', err));
  };

  useEffect(() => {
    refreshCountries();
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService
      .get<any>(`/api/crm/task-companies/load-data/${editingId}?companyNo=${companyNo}`)
      .then((response) => {
        if (!response) return;
        const dl = response.data || response;
        if (!dl) return;

        setTcCompanyName(dl.companyName || '');
        setTcAliasName(dl.aliasName || '');
        setTcLocationName(dl.locationName || '');
        setTcAddress1(dl.address1 || '');
        setTcAddress2(dl.address2 || '');
        setTcAddress3(dl.address3 || '');
        setTcPinCode(dl.pinCode || '');
        setTcIncorporationDate(dl.incorporationDate ? new Date(dl.incorporationDate) : undefined);
        setCode(dl.code || '');

        const countryVal = dl.country?.id ?? dl.countryNo ?? '';
        const stateVal = dl.state?.id ?? dl.stateNo ?? '';
        const cityVal = dl.city?.id ?? dl.cityNo ?? '';

        setTcCountryNo(countryVal.toString());
        setTcStateNo(stateVal.toString());
        setTcCityNo(cityVal.toString());

        if (countryVal) {
          fetchStatesByCountry(countryVal.toString()).then(setTaskCompanyStates);
        }
        if (stateVal) {
          fetchCitiesByState(stateVal.toString()).then(setTaskCompanyCities);
        }
      })
      .catch((err) => console.error('Failed to load task company details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!tcCompanyName.trim()) {
      newErrors.tcCompanyName = 'Company Name is required';
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
        operTaskCompanyNo: editingId ? parseInt(editingId) : null,
        companyName: tcCompanyName,
        aliasName: tcAliasName,
        locationName: tcLocationName,
        address1: tcAddress1,
        address2: tcAddress2,
        address3: tcAddress3,
        cityNo: parseInt(tcCityNo) || null,
        stateNo: parseInt(tcStateNo) || null,
        countryNo: parseInt(tcCountryNo) || null,
        pinCode: tcPinCode,
        incorporationDate: tcIncorporationDate ? tcIncorporationDate.toISOString() : null,
      };
      await apiService.post('/api/crm/task-companies/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MasterFormShell
      type="task-company"
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
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Company Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Code, company name, alias, and location label
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5">
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

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="tcCompanyName" required>
                Company Name
              </FieldLabel>
              <FieldControl error={errors.tcCompanyName}>
                <Input
                  id="tcCompanyName"
                  value={tcCompanyName}
                  maxLength={100}
                  placeholder="Enter Company Name"
                  onChange={(e) => {
                    setTcCompanyName(e.target.value);
                    if (errors.tcCompanyName) setErrors((prev) => ({ ...prev, tcCompanyName: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.tcCompanyName &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="tcAliasName">Alias</FieldLabel>
              <Input
                id="tcAliasName"
                value={tcAliasName}
                maxLength={15}
                placeholder="Enter Alias"
                onChange={(e) => setTcAliasName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-2">
              <FieldLabel htmlFor="tcLocationName">Location Name</FieldLabel>
              <Input
                id="tcLocationName"
                value={tcLocationName}
                maxLength={50}
                placeholder="Enter Location Name"
                onChange={(e) => setTcLocationName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-2">
              <FieldLabel>Date of Incorporation</FieldLabel>
              <DatePicker
                date={tcIncorporationDate}
                onChange={setTcIncorporationDate}
                placeholder="Select date of incorporation"
                className={cn(fieldClass, 'h-10 w-full')}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <Home size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Address</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Street address, country, state, city, and PIN
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="tcAddress1">Address 1</FieldLabel>
              <Input
                id="tcAddress1"
                value={tcAddress1}
                maxLength={50}
                placeholder="Enter Address 1"
                onChange={(e) => setTcAddress1(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="tcAddress2">Address 2</FieldLabel>
              <Input
                id="tcAddress2"
                value={tcAddress2}
                maxLength={50}
                placeholder="Enter Address 2"
                onChange={(e) => setTcAddress2(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="tcAddress3">Address 3</FieldLabel>
              <Input
                id="tcAddress3"
                value={tcAddress3}
                maxLength={50}
                placeholder="Enter Address 3"
                onChange={(e) => setTcAddress3(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Country</FieldLabel>
              <Combobox
                options={taskCompanyCountries.map((c: any) => ({
                  label: c.countryName || '',
                  value: (c.countryNo || '').toString(),
                }))}
                value={tcCountryNo}
                onChange={(val) => {
                  setTcCountryNo(val);
                  setTcStateNo('');
                  setTcCityNo('');
                  if (val) {
                    fetchStatesByCountry(val).then(setTaskCompanyStates);
                  } else {
                    setTaskCompanyStates([]);
                    setTaskCompanyCities([]);
                  }
                }}
                placeholder="Select Country"
                searchPlaceholder="Search country..."
                className={fieldClass}
                onAddNew={() => {
                  setActiveMasterType('country');
                  setIsMasterCreateOpen(true);
                }}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>State</FieldLabel>
              <Combobox
                options={taskCompanyStates.map((s: any) => ({
                  label: s.stateName || s.name || '',
                  value: (s.stateNo || s.id || '').toString(),
                }))}
                value={tcStateNo}
                onChange={(val) => {
                  setTcStateNo(val);
                  setTcCityNo('');
                  if (val) {
                    fetchCitiesByState(val).then(setTaskCompanyCities);
                  } else {
                    setTaskCompanyCities([]);
                  }
                }}
                disabled={!tcCountryNo}
                placeholder={tcCountryNo ? 'Select State...' : 'Select country first'}
                searchPlaceholder="Search state..."
                className={fieldClass}
                onAddNew={() => {
                  setActiveMasterType('state');
                  setIsMasterCreateOpen(true);
                }}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>City</FieldLabel>
              <Combobox
                options={taskCompanyCities.map((c: any) => ({
                  label: c.cityName || c.name || '',
                  value: (c.cityNo || c.id || '').toString(),
                }))}
                value={tcCityNo}
                onChange={(val) => setTcCityNo(val)}
                disabled={!tcStateNo}
                placeholder={tcStateNo ? 'Select City...' : 'Select state first'}
                searchPlaceholder="Search city..."
                className={fieldClass}
                onAddNew={() => {
                  setActiveMasterType('city');
                  setIsMasterCreateOpen(true);
                }}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="tcPinCode">Pin Code</FieldLabel>
              <Input
                id="tcPinCode"
                value={tcPinCode}
                maxLength={6}
                placeholder="Enter Pin Code"
                onChange={(e) => setTcPinCode(e.target.value)}
                className={fieldClass}
              />
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
            setTcCountryNo(newId);
          } else if (activeMasterType === 'state') {
            setTcStateNo(newId);
          } else if (activeMasterType === 'city') {
            setTcCityNo(newId);
          }
          refreshCountries();
        }}
      />
    </MasterFormShell>
  );
}
