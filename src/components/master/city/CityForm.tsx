import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { fetchStatesByCountry } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 12;
const TITLE = 'City Master';

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

  useEffect(() => {
    apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setLocationFillValues(response);
    }).catch(err => console.error('Failed to fetch location fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/cities/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.cityName || dl.name || '');
          setCityCityCountryNo((dl.countryNo || dl.CountryNo || '').toString());
          setCityCityStateNo((dl.stateNo || dl.StateNo || '').toString());
          setCode(dl.code || '');

          if (dl.countryNo || dl.CountryNo) {
            fetchStatesByCountry(dl.countryNo || dl.CountryNo).then((states) => {
              setAvailableCityStates(states);
            });
          }
        }
      }
    }).catch(err => console.error('Failed to load city details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'city Name is required';
    }
    if (!cityCityCountryNo || cityCityCountryNo === 'none' || cityCityCountryNo === '') {
      newErrors.cityCityCountryNo = 'Country is required';
    }
    if (!cityCityStateNo || cityCityStateNo === 'none' || cityCityStateNo === '') {
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
        companyNo: authCompanies?.find(itm => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo,
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
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter city name" value={name} maxLength={50} onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
        }}
          className={cn(
            "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-10 rounded-[8px] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
            errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
          )}
        />
        {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
      </div>

      {/* CITY MASTER FIELDS */}
      <div className="space-y-4">
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country <span className="text-red-500 font-medium">*</span></label>
          <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
            label: c.countryName || '',
            value: (c.countryNo || '').toString()
          }))}
            value={cityCityCountryNo}
            onChange={(val) => {
              setCityCityCountryNo(val);
              setCityCityStateNo('');
              setAvailableCityStates([]);
              if (errors.cityCityCountryNo) setErrors(prev => ({ ...prev, cityCityCountryNo: '' }));
              if (val) {
                fetchStatesByCountry(val).then((states) => {
                  setAvailableCityStates(states);
                });
              }
            }}
            placeholder="Select Country"
            searchPlaceholder="Search country..."
            className={cn(
              "h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.cityCityCountryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
            onAddNew={() => {
              setActiveMasterType('country');
              setIsMasterCreateOpen(true);
            }}
          />
          {errors.cityCityCountryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityCityCountryNo}</p>}
        </div>
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State <span className="text-red-500 font-medium">*</span></label>
          <Combobox options={availableCityStates.map((s: any) => ({
            label: s.stateName || s.name || '',
            value: (s.stateNo || s.id || '').toString()
          }))}
            value={cityCityStateNo}
            onChange={(val) => {
              setCityCityStateNo(val);
              if (errors.cityCityStateNo) setErrors(prev => ({ ...prev, cityCityStateNo: '' }));
            }}
            disabled={!cityCityCountryNo}
            placeholder={cityCityCountryNo ? "Select State..." : "Select country first"}
            searchPlaceholder="Search state..."
            className={cn(
              "h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.cityCityStateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
            onAddNew={() => {
              setActiveMasterType('state');
              setIsMasterCreateOpen(true);
            }}
          />
          {errors.cityCityStateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityCityStateNo}</p>}
        </div>
      </div>

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={setIsMasterCreateOpen}
        type={activeMasterType}
        companyNo={companyNo}
        fillValues={fillValues}
        onSuccess={(id) => {
          if (activeMasterType === 'country') {
            setCityCityCountryNo(id);
          } else if (activeMasterType === 'state') {
            setCityCityStateNo(id);
          }
          // Refresh fill values to show new items
          apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`).then((response) => {
            if (response) setLocationFillValues(response);
          }).catch(err => console.error('Failed to fetch location fill-values:', err));
        }}
      />
    </MasterFormShell>
  );
}
