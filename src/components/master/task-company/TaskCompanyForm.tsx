import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { DatePicker } from '@/components/ui/DatePicker';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { fetchStatesByCountry, fetchCitiesByState } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1565;
const TITLE = 'Task Company Master';

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

  useEffect(() => {
    apiService.get<any>(`/api/crm/task-companies/fill-values`).then((response) => {
      if (response && response.data && response.data.countries) {
        setTaskCompanyCountries(response.data.countries);
      } else if (response && response.countries) {
        setTaskCompanyCountries(response.countries);
      }
    }).catch(err => console.error('Failed to fetch task company countries:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/crm/task-companies/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const dl = response.data || response;
        if (dl) {
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
        }
      }
    }).catch(err => console.error('Failed to load task company details:', err));
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
      onSuccessOk={() => { setShowSuccessAlert(false); goToList(); }}
    >
      {/* Disabled System Code */}
      <div className="flex items-center gap-0.5 px-1 mb-4">
        <label className="text-[11px] font-medium text-slate-700 normal-case">Code:</label>
        <div className="text-xs font-medium text-slate-500 select-none">
          {editingId ? code : 'AUTO-GEN-CODE'}
        </div>
      </div>

      {/* TASK COMPANY MASTER FIELDS */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="space-y-0 w-3/4">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Company Name <span className="text-red-500">*</span></label>
            <Input value={tcCompanyName} onChange={(e) => {
              setTcCompanyName(e.target.value);
              if (errors.tcCompanyName) setErrors(prev => ({ ...prev, tcCompanyName: '' }));
            }}
              maxLength={100}
              placeholder="Enter Company Name"
              className={cn(
                "h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full",
                errors.tcCompanyName && "border-red-500 focus:ring-red-500/10"
              )}
            />
            {errors.tcCompanyName && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.tcCompanyName}</p>}
          </div>

          <div className="space-y-0 w-1/4">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Alias</label>
            <Input value={tcAliasName} onChange={(e) => setTcAliasName(e.target.value)}
              maxLength={15}
              placeholder="Enter Alias"
              className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
            />
          </div>
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Location Name</label>
          <Input value={tcLocationName} onChange={(e) => setTcLocationName(e.target.value)}
            maxLength={50}
            placeholder="Enter Location Name"
            className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
          />
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address 1</label>
          <Input value={tcAddress1} onChange={(e) => setTcAddress1(e.target.value)}
            maxLength={50}
            placeholder="Enter Address 1"
            className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
          />
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address 2</label>
          <Input value={tcAddress2} onChange={(e) => setTcAddress2(e.target.value)}
            maxLength={50}
            placeholder="Enter Address 2"
            className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
          />
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address 3</label>
          <Input value={tcAddress3} onChange={(e) => setTcAddress3(e.target.value)}
            maxLength={50}
            placeholder="Enter Address 3"
            className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country</label>
            <Combobox options={taskCompanyCountries.map((c: any) => ({
              label: c.countryName || '',
              value: (c.countryNo || '').toString()
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
                }
              }}
              placeholder="Select Country"
              searchPlaceholder="Search country..."
              className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
              onAddNew={() => {
                setActiveMasterType('country');
                setIsMasterCreateOpen(true);
              }}
            />
          </div>

          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State</label>
            <Combobox options={taskCompanyStates.map((s: any) => ({
              label: s.stateName || s.name || '',
              value: (s.stateNo || s.id || '').toString()
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
              placeholder={tcCountryNo ? "Select State..." : "Select country first"}
              searchPlaceholder="Search state..."
              className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
              onAddNew={() => {
                setActiveMasterType('state');
                setIsMasterCreateOpen(true);
              }}
            />
          </div>

          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City</label>
            <Combobox options={taskCompanyCities.map((c: any) => ({
              label: c.cityName || c.name || '',
              value: (c.cityNo || c.id || '').toString()
            }))}
              value={tcCityNo}
              onChange={(val) => setTcCityNo(val)}
              disabled={!tcStateNo}
              placeholder={tcStateNo ? "Select City..." : "Select state first"}
              searchPlaceholder="Search city..."
              className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
              onAddNew={() => {
                setActiveMasterType('city');
                setIsMasterCreateOpen(true);
              }}
            />
          </div>

          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Pin Code</label>
            <Input value={tcPinCode} onChange={(e) => setTcPinCode(e.target.value)}
              placeholder="Enter Pin Code"
              className="h-10 rounded-[8px] border-[#a8afb7] hover:border-[#006699]/35 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
              maxLength={6}
            />
          </div>

          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Date of Incorporation</label>
            <DatePicker
              date={tcIncorporationDate}
              onChange={setTcIncorporationDate}
              placeholder="Select date of incorporation"
              className="h-10"
            />
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
            setTcCountryNo(id);
          } else if (activeMasterType === 'state') {
            setTcStateNo(id);
          } else if (activeMasterType === 'city') {
            setTcCityNo(id);
          }
          // Refresh fill values to show new items
          apiService.get<any>(`/api/crm/task-companies/fill-values`).then((response) => {
            if (response && response.data && response.data.countries) {
              setTaskCompanyCountries(response.data.countries);
            } else if (response && response.countries) {
              setTaskCompanyCountries(response.countries);
            }
          }).catch(err => console.error('Failed to fetch task company countries:', err));
        }}
      />
    </MasterFormShell>
  );
}
