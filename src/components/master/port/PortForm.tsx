import { useEffect, useState, type ReactNode } from 'react';
import { Anchor } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { fetchStatesByCountry, fetchCitiesByState } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1563;
const TITLE = 'Port Master';

const fieldClass =
  'h-10 w-full rounded-[8px] border-slate-200/80 bg-white text-xs font-medium text-slate-700 shadow-none focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699]';

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
      className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-600"
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

interface PortFormProps {
  id?: string;
}

export function PortForm({ id }: PortFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('port', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [portAlias, setPortAlias] = useState('');
  const [countryNo, setCountryNo] = useState('');
  const [stateNo, setStateNo] = useState('');
  const [cityNo, setCityNo] = useState('');
  const [portStatesList, setPortStatesList] = useState<any[]>([]);
  const [portCitiesList, setPortCitiesList] = useState<any[]>([]);
  const [locationFillValues, setLocationFillValues] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setLocationFillValues(response);
    }).catch(err => console.error('Failed to fetch location fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/ports/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.portName || dl.PortName || dl.name || '');
          const loadedCountry = dl.country?.countryNo ?? dl.countryNo ?? dl.CountryNo ?? '';
          const loadedState = dl.state?.stateNo ?? dl.stateNo ?? dl.StateNo ?? '';
          const loadedCity = dl.city?.cityNo ?? dl.cityNo ?? dl.CityNo ?? '';
          setCountryNo(loadedCountry?.toString?.() ?? '');
          setStateNo(loadedState?.toString?.() ?? '');
          setCityNo(loadedCity?.toString?.() ?? '');
          setPortAlias(dl.portAlias || dl.alias || dl.portAliasName || '');
          setCode(dl.code || '');
          if (loadedCountry) {
            fetchStatesByCountry(loadedCountry).then((states) => setPortStatesList(states));
          }
          if (loadedState) {
            fetchCitiesByState(loadedState).then((cities) => setPortCitiesList(cities));
          }
        }
      }
    }).catch(err => console.error('Failed to load port details:', err));
  }, [editingId, companyNo]);

  const handlePortCountryChange = async (val: string) => {
    setCountryNo(val);
    setStateNo('');
    setCityNo('');
    setPortStatesList([]);
    setPortCitiesList([]);
    if (errors.countryNo || errors.stateNo || errors.cityNo) {
      setErrors((prev) => ({ ...prev, countryNo: '', stateNo: '', cityNo: '' }));
    }
    if (val) {
      const states = await fetchStatesByCountry(val);
      setPortStatesList(states);
    }
  };

  const handlePortStateChange = async (val: string) => {
    setStateNo(val);
    setCityNo('');
    setPortCitiesList([]);
    if (errors.stateNo || errors.cityNo) {
      setErrors((prev) => ({ ...prev, stateNo: '', cityNo: '' }));
    }
    if (val) {
      const cities = await fetchCitiesByState(val);
      setPortCitiesList(cities);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Port Name is required';
    }
    if (!portAlias || portAlias === '') {
      newErrors.portAlias = 'Port Alias is required';
    }
    if (!countryNo || countryNo === 'none' || countryNo === '') {
      newErrors.countryNo = 'Country is required';
    }
    if (!stateNo || stateNo === 'none' || stateNo === '') {
      newErrors.stateNo = 'State is required';
    }
    if (!cityNo || cityNo === 'none' || cityNo === '') {
      newErrors.cityNo = 'City is required';
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
        portNo: editingId ? parseInt(editingId) : null,
        portName: name,
        portAlias: portAlias || null,
        countryNo: parseInt(countryNo) || null,
        stateNo: parseInt(stateNo) || null,
        cityNo: parseInt(cityNo) || null,
      };
      await apiService.post('/api/master/ports/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  const countryOptions = (locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
    label: c.countryName || '',
    value: (c.countryNo || '').toString(),
  }));

  return (
    <MasterFormShell
      type="port"
      title={TITLE}
      editingId={editingId}
      isSaving={isSaving}
      serverError={serverError}
      onSubmit={handleSubmit}
      showConfirm={showConfirm}
      onCancelConfirm={() => setShowConfirm(false)}
      onConfirmSave={handleConfirmSave}
      showSuccessAlert={showSuccessAlert}
      onSuccessOk={() => { setShowSuccessAlert(false); goToList(); }}
    >
      <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <Anchor size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Port Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Name, alias, and geographic location for the port
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3 w-full">
            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Code</FieldLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={editingId ? code || '—' : 'AUTO-GEN-CODE'}
                className={cn(
                  fieldClass,
                  'bg-[#f8fbfd] text-slate-500 cursor-default select-none focus-visible:ring-0 focus-visible:border-slate-200/80'
                )}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="portName" required>
                Port Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="portName"
                  placeholder="Enter port name"
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
              <FieldLabel htmlFor="portAlias" required>
                Port Alias
              </FieldLabel>
              <FieldControl error={errors.portAlias}>
                <Input
                  id="portAlias"
                  placeholder="Enter Port Alias"
                  value={portAlias}
                  maxLength={10}
                  onChange={(e) => {
                    setPortAlias(e.target.value);
                    if (errors.portAlias) setErrors((prev) => ({ ...prev, portAlias: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.portAlias &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel required>Country</FieldLabel>
              <FieldControl error={errors.countryNo}>
                <Combobox
                  options={countryOptions}
                  value={countryNo}
                  onChange={handlePortCountryChange}
                  placeholder="Select country"
                  searchPlaceholder="Search country"
                  className={cn(
                    fieldClass,
                    errors.countryNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel required>State / Province</FieldLabel>
              <FieldControl error={errors.stateNo}>
                <Combobox
                  options={portStatesList.map((s: any) => ({
                    label: s.stateName || '',
                    value: (s.stateNo || '').toString(),
                  }))}
                  value={stateNo}
                  onChange={handlePortStateChange}
                  disabled={!countryNo}
                  placeholder={countryNo ? 'Select state' : 'Select country first'}
                  searchPlaceholder="Search state"
                  className={cn(
                    fieldClass,
                    errors.stateNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel required>City</FieldLabel>
              <FieldControl error={errors.cityNo}>
                <Combobox
                  options={portCitiesList.map((c: any) => ({
                    label: c.cityName || '',
                    value: (c.cityNo || '').toString(),
                  }))}
                  value={cityNo}
                  onChange={(val) => {
                    setCityNo(val);
                    if (errors.cityNo) setErrors((prev) => ({ ...prev, cityNo: '' }));
                  }}
                  disabled={!stateNo}
                  placeholder={stateNo ? 'Select city' : 'Select state first'}
                  searchPlaceholder="Search city"
                  className={cn(
                    fieldClass,
                    errors.cityNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>
          </div>
        </div>
      </section>
    </MasterFormShell>
  );
}
