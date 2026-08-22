import { useEffect, useState } from 'react';
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
      setErrors(prev => ({ ...prev, countryNo: '', stateNo: '', cityNo: '' }));
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
      setErrors(prev => ({ ...prev, stateNo: '', cityNo: '' }));
    }
    if (val) {
      const cities = await fetchCitiesByState(val);
      setPortCitiesList(cities);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'port Name is required';
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
      {/* Disabled System Code */}
      <div className="flex items-center gap-0.5 px-1 mb-4">
        <label className="text-[11px] font-medium text-slate-700 normal-case">Code:</label>
        <div className="text-xs font-medium text-slate-500 select-none">
          {editingId ? code : 'AUTO-GEN-CODE'}
        </div>
      </div>

      {/* Standard Name Input */}
      <div className="space-y-0">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Port Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter port name" value={name} maxLength={50} onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
        }}
          className={cn(
            "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
            errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
          )}
        />
        {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
      </div>

      {/* PORT EXTRA FIELDS */}
      <div className="space-y-0">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Port Alias <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter Port Alias" value={portAlias} maxLength={10} onChange={(e) => {
          setPortAlias(e.target.value);
          if (errors.portAlias) setErrors(prev => ({ ...prev, portAlias: '' }));
        }}
          className={cn("bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
            errors.portAlias && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500")}
        />
        {errors.portAlias && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.portAlias}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country <span className="text-red-500 font-medium">*</span></label>
          <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
            label: c.countryName || '',
            value: (c.countryNo || '').toString()
          }))}
            value={countryNo}
            onChange={handlePortCountryChange}
            placeholder="Select country"
            searchPlaceholder="Search country"
            className={cn(
              "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.countryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500"
            )}
          />
          {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State / Province <span className="text-red-500 font-medium">*</span></label>
          <Combobox options={portStatesList.map((s: any) => ({
            label: s.stateName || '',
            value: (s.stateNo || '').toString()
          }))}
            value={stateNo}
            onChange={handlePortStateChange}
            disabled={!countryNo}
            placeholder={countryNo ? "Select state" : "Select country first"}
            searchPlaceholder="Search state"
            className={cn(
              "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.stateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500"
            )}
          />
          {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City <span className="text-red-500 font-medium">*</span></label>
          <Combobox options={portCitiesList.map((c: any) => ({
            label: c.cityName || '',
            value: (c.cityNo || '').toString()
          }))}
            value={cityNo}
            onChange={(val) => {
              setCityNo(val);
              if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
            }}
            disabled={!stateNo}
            placeholder={stateNo ? "Select city" : "Select state first"}
            searchPlaceholder="Search city"
            className={cn(
              "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.cityNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500"
            )}
          />
          {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
        </div>
      </div>
    </MasterFormShell>
  );
}
