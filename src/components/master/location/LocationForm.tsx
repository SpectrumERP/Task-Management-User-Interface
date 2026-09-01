import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { fetchStatesByCountry, fetchCitiesByState } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1541;
const TITLE = 'Location Master';

interface LocationFormProps {
  id?: string;
}

export function LocationForm({ id }: LocationFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('location', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues } = useTaskStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentLocationNo, setParentLocationNo] = useState('');
  const [inchargeNo, setInchargeNo] = useState('');
  const [inchargeLabel, setInchargeLabel] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [countryNo, setCountryNo] = useState('');
  const [stateNo, setStateNo] = useState('');
  const [cityNo, setCityNo] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locStatesList, setLocStatesList] = useState<any[]>([]);
  const [locCitiesList, setLocCitiesList] = useState<any[]>([]);
  const [locationFillValues, setLocationFillValues] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [activeMasterType, setActiveMasterType] = useState<'country' | 'state' | 'city'>('country');

  useEffect(() => {
    apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setLocationFillValues(response);
    }).catch(err => console.error('Failed to fetch location fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/task-locations/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          const parentVal = dl.parentLocationNo || dl.parentLocation || 'none';
          setName(dl.operLocationName || '');
          setParentLocationNo(parentVal.toString());
          const inchargeVal = dl.operLocationIncharge?.loginNo || dl.locationIncharge || dl.inchargeNo || 'none';
          setInchargeNo(inchargeVal.toString());
          const inchargeName = dl.operLocationIncharge?.printingName || dl.operLocationIncharge?.loginId || dl.locationIncharge || '';
          setInchargeLabel(inchargeName.toString());
          const addr = dl.address || dl;
          setAddress1(addr.address1 || '');
          setAddress2(addr.address2 || '');
          setAddress3(addr.address3 || '');
          const countryVal = addr.country?.countryNo || addr.countryNo || '';
          setCountryNo(countryVal.toString());
          const stateVal = addr.state?.stateNo || addr.stateNo || '';
          setStateNo(stateVal.toString());
          const cityVal = addr.city?.cityNo || addr.cityNo || '';
          setCityNo(cityVal.toString());
          if (countryVal) {
            fetchStatesByCountry(countryVal).then((states) => setLocStatesList(states));
          }
          if (stateVal) {
            fetchCitiesByState(stateVal).then((cities) => setLocCitiesList(cities));
          }
          setPinCode(addr.pinCode || addr.pincode || '');
          const regionVal = addr.region?.regionNo || addr.regionNo || '';
          setLocationRegion(regionVal.toString());
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load location details:', err));
  }, [editingId, companyNo]);

  const handleLocationCountryChange = async (val: string) => {
    setCountryNo(val);
    setStateNo('');
    setCityNo('');
    setLocStatesList([]);
    setLocCitiesList([]);
    if (errors.countryNo || errors.stateNo || errors.cityNo) {
      setErrors(prev => ({ ...prev, countryNo: '', stateNo: '', cityNo: '' }));
    }
    if (val) {
      const states = await fetchStatesByCountry(val);
      setLocStatesList(states);
    }
  };

  const handleLocationStateChange = async (val: string) => {
    setStateNo(val);
    setCityNo('');
    setLocCitiesList([]);
    if (errors.stateNo || errors.cityNo) {
      setErrors(prev => ({ ...prev, stateNo: '', cityNo: '' }));
    }
    if (val) {
      const cities = await fetchCitiesByState(val);
      setLocCitiesList(cities);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'location Name is required';
    }
    if (!address1.trim()) {
      newErrors.address1 = 'Address Line 1 is required';
    }
    if (!pinCode.trim()) {
      newErrors.pinCode = 'PIN / ZIP Code is required';
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
    if (!inchargeNo || inchargeNo === 'none' || inchargeNo === '') {
      newErrors.inchargeNo = 'Incharge Lead is required';
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
      const cleanParent = parentLocationNo === 'none' ? '' : parentLocationNo;
      const cleanIncharge = inchargeNo === 'none' ? '' : inchargeNo;
      const payload = {
        operLocationNo: editingId ? parseInt(editingId) : null,
        operLocationName: name,
        operLocationInchargeNo: cleanIncharge ? parseInt(cleanIncharge) || null : null,
        operLocationParentNo: cleanParent ? parseInt(cleanParent) || null : null,
        address1,
        address2,
        address3,
        cityNo: parseInt(cityNo) || null,
        pinCode,
        stateNo: parseInt(stateNo) || null,
        countryNo: parseInt(countryNo) || null,
        regionNo: parseInt(locationRegion) || null,
      };
      await apiService.post('/api/master/task-locations/save', payload);
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
      type="location"
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
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Location Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter location name" value={name} maxLength={50} onChange={(e) => {
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

      {/* LOCATION EXTRA FIELDS */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Parent Location</label>
            <Combobox options={[{ label: "No Parent (Root)", value: "none" }, ...(locationFillValues?.data?.locations || locationFillValues?.locations || []).filter((l: any) => (l.operLocationNo || l.id || '').toString() !== editingId).map((l: any) => ({
              label: l.operLocationName || l.locationName || l.name || '',
              value: (l.operLocationNo || l.id || '').toString()
            }))
            ]}
              value={parentLocationNo}
              onChange={setParentLocationNo}
              placeholder="Select Parent Location"
              searchPlaceholder="Search parent..."
              className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
            />
          </div>

          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Incharge Lead <span className="text-red-500 font-medium">*</span></label>
            <UserCombobox value={inchargeNo} onChange={(user) => {
              setInchargeNo(user.loginNo.toString());
              setInchargeLabel(user.printingName);
              if (errors.inchargeNo) setErrors(prev => ({ ...prev, inchargeNo: '' }));
            }}
              initialLabel={inchargeLabel}
              placeholder="Search Incharge Lead..."
              className={cn(
                "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                errors.inchargeNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500 focus-visible:ring-red-500/10 focus-visible:border-red-500"
              )}
            />
            {errors.inchargeNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.inchargeNo}</p>}
          </div>
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Location Region</label>
          <Combobox options={(locationFillValues?.data?.regions || locationFillValues?.regions || []).map((r: any) => ({
            label: r.regionName || '',
            value: (r.regionNo || '').toString()
          }))}
            value={locationRegion}
            onChange={setLocationRegion}
            placeholder="Select Location Region"
            searchPlaceholder="Search region..."
            className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
          />
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address <span className="text-red-500 font-medium">*</span></label>
          <div className="space-y-0">
            <Input placeholder="Enter Address" value={address1} maxLength={150} onChange={(e) => {
              setAddress1(e.target.value);
              if (errors.address1) setErrors(prev => ({ ...prev, address1: '' }));
            }}
              className={cn(
                "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                errors.address1 && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
            />
            {errors.address1 && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.address1}</p>}
            <Input placeholder="Address Line 2 (Optional)" value={address2} maxLength={150} onChange={(e) => setAddress2(e.target.value)}
              className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
            />
            <Input placeholder="Address Line 3 (Optional)" value={address3} maxLength={150} onChange={(e) => setAddress3(e.target.value)}
              className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country <span className="text-red-500 font-medium">*</span></label>
            <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
              label: c.countryName || '',
              value: (c.countryNo || '').toString()
            }))}
              value={countryNo}
              onChange={handleLocationCountryChange}
              placeholder="Select Country"
              searchPlaceholder="Search country..."
              className={cn(
                "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                errors.countryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
              onAddNew={() => {
                setActiveMasterType('country');
                setIsMasterCreateOpen(true);
              }}
            />
            {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
          </div>
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State / Province <span className="text-red-500 font-medium">*</span></label>
            <Combobox options={locStatesList.map((s: any) => ({
              label: s.stateName || '',
              value: (s.stateNo || '').toString()
            }))}
              value={stateNo}
              onChange={handleLocationStateChange}
              disabled={!countryNo}
              placeholder={countryNo ? "Select State" : "Select country first"}
              searchPlaceholder="Search state..."
              className={cn(
                "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                errors.stateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
              onAddNew={() => {
                setActiveMasterType('state');
                setIsMasterCreateOpen(true);
              }}
            />
            {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0.5.5">
          <div className="space-y-0 col-span-2">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City <span className="text-red-500 font-medium">*</span></label>
            <Combobox options={locCitiesList.map((c: any) => ({
              label: c.cityName || '',
              value: (c.cityNo || '').toString()
            }))}
              value={cityNo}
              onChange={(val) => {
                setCityNo(val);
                if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
              }}
              disabled={!stateNo}
              placeholder={stateNo ? "Select City" : "Select state first"}
              searchPlaceholder="Search city..."
              className={cn(
                "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                errors.cityNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
              onAddNew={() => {
                setActiveMasterType('city');
                setIsMasterCreateOpen(true);
              }}
            />
            {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
          </div>
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">PIN / ZIP Code <span className="text-red-500 font-medium">*</span></label>
            <Input placeholder="Enter PIN / ZIP Code" value={pinCode} maxLength={10} onChange={(e) => {
              setPinCode(e.target.value);
              if (errors.pinCode) setErrors(prev => ({ ...prev, pinCode: '' }));
            }}
              className={cn(
                "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                errors.pinCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
            />
            {errors.pinCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.pinCode}</p>}
          </div>
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
            setCountryNo(id);
          } else if (activeMasterType === 'state') {
            setStateNo(id);
          } else if (activeMasterType === 'city') {
            setCityNo(id);
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
