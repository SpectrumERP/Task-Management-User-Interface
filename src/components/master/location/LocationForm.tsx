import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

const FORM_NO = 1541;
const TITLE = 'Task Locations Master';

const fieldClass = FIELD_CONTROL_CLASS;


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
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [countryNo, setCountryNo] = useState('');
  const [stateNo, setStateNo] = useState('');
  const [cityNo, setCityNo] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [activeMasterType] = useState<'country' | 'state' | 'city'>('country');

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
          setPinCode(addr.pinCode || addr.pincode || '');
          const regionVal = addr.region?.regionNo || addr.regionNo || '';
          setLocationRegion(regionVal.toString());
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load location details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Location Name is required';
    }
    // if (!inchargeNo || inchargeNo === 'none' || inchargeNo === '') {
    //   newErrors.inchargeNo = 'Incharge Lead is required';
    // }
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
      <section className="crm-form-section rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="crm-form-section-head flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="crm-form-section-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <MapPin size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Location Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Name, hierarchy, incharge, and region
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3 w-full">
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
              <FieldLabel htmlFor="locationName" required>
                Location Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="locationName"
                  placeholder="Enter location name"
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

            {/* <div className="space-y-1.5 min-w-0">
              <FieldLabel>Parent Location</FieldLabel>
              <Combobox
                options={parentOptions}
                value={parentLocationNo}
                onChange={setParentLocationNo}
                placeholder="Select Parent Location"
                searchPlaceholder="Search parent..."
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel required>Incharge Lead</FieldLabel>
              <FieldControl error={errors.inchargeNo}>
                <UserCombobox
                  value={inchargeNo}
                  onChange={(user) => {
                    setInchargeNo(user.loginNo.toString());
                    setInchargeLabel(user.printingName);
                    if (errors.inchargeNo) setErrors((prev) => ({ ...prev, inchargeNo: '' }));
                  }}
                  initialLabel={inchargeLabel}
                  placeholder="Search Incharge Lead..."
                  className={cn(
                    fieldClass,
                    errors.inchargeNo &&
                    'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel>Location Region</FieldLabel>
              <Combobox
                options={regionOptions}
                value={locationRegion}
                onChange={setLocationRegion}
                placeholder="Select Location Region"
                searchPlaceholder="Search region..."
                className={fieldClass}
              />
            </div> */}
          </div>
        </div>
      </section>

      {/* <section className="crm-form-section rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="crm-form-section-head flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="crm-form-section-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3 w-full">
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="address1">
                Address
              </FieldLabel>
              <FieldControl error={errors.address1}>
                <Input
                  id="address1"
                  placeholder="Enter Address"
                  value={address1}
                  maxLength={150}
                  onChange={(e) => {
                    setAddress1(e.target.value);
                    if (errors.address1) setErrors((prev) => ({ ...prev, address1: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.address1 &&
                    'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Input
                placeholder="Address Line 2 (Optional)"
                value={address2}
                maxLength={150}
                onChange={(e) => setAddress2(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Input
                placeholder="Address Line 3 (Optional)"
                value={address3}
                maxLength={150}
                onChange={(e) => setAddress3(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Country</FieldLabel>
              <FieldControl error={errors.countryNo}>
                <Combobox
                  options={countryOptions}
                  value={countryNo}
                  onChange={handleLocationCountryChange}
                  placeholder="Select Country"
                  searchPlaceholder="Search country..."
                  className={cn(
                    fieldClass,
                    errors.countryNo &&
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
              <FieldLabel>State / Province</FieldLabel>
              <FieldControl error={errors.stateNo}>
                <Combobox
                  options={locStatesList.map((s: any) => ({
                    label: s.stateName || '',
                    value: (s.stateNo || '').toString(),
                  }))}
                  value={stateNo}
                  onChange={handleLocationStateChange}
                  disabled={!countryNo}
                  placeholder={countryNo ? 'Select State' : 'Select country first'}
                  searchPlaceholder="Search state..."
                  className={cn(
                    fieldClass,
                    errors.stateNo &&
                    'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                  onAddNew={() => {
                    setActiveMasterType('state');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>City</FieldLabel>
              <FieldControl error={errors.cityNo}>
                <Combobox
                  options={locCitiesList.map((c: any) => ({
                    label: c.cityName || '',
                    value: (c.cityNo || '').toString(),
                    description: [c.stateName, c.countryName].filter(Boolean).join(', ')
                  }))}
                  value={cityNo}
                  onChange={(val) => {
                    setCityNo(val);
                    if (errors.cityNo) setErrors((prev) => ({ ...prev, cityNo: '' }));
                    if (val) {
                      const selectedCity = locCitiesList.find(c => (c.cityNo || '').toString() === val);
                      if (selectedCity) {
                        if (selectedCity.countryNo && selectedCity.countryNo.toString() !== countryNo) {
                          setCountryNo(selectedCity.countryNo.toString());
                          fetchStatesByCountry(selectedCity.countryNo).then(states => {
                            setLocStatesList(states);
                            if (selectedCity.stateNo) {
                              setStateNo(selectedCity.stateNo.toString());
                            }
                          });
                        } else if (selectedCity.stateNo && selectedCity.stateNo.toString() !== stateNo) {
                          setStateNo(selectedCity.stateNo.toString());
                        }
                      }
                    }
                  }}
                  onSearchChange={setCitySearch}
                  shouldFilter={false}
                  placeholder="Select City"
                  searchPlaceholder="Search city..."
                  className={cn(
                    fieldClass,
                    errors.cityNo &&
                    'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                  onAddNew={() => {
                    setActiveMasterType('city');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="pinCode">
                PIN / ZIP Code
              </FieldLabel>
              <FieldControl error={errors.pinCode}>
                <Input
                  id="pinCode"
                  placeholder="Enter PIN / ZIP Code"
                  value={pinCode}
                  maxLength={10}
                  onChange={(e) => {
                    setPinCode(e.target.value);
                    if (errors.pinCode) setErrors((prev) => ({ ...prev, pinCode: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.pinCode &&
                    'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>
          </div>
        </div>
      </section> */}

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={setIsMasterCreateOpen}
        type={activeMasterType}
        companyNo={companyNo}
        fillValues={fillValues}
        onSuccess={(createdId) => {
          if (activeMasterType === 'country') {
            setCountryNo(createdId);
          } else if (activeMasterType === 'state') {
            setStateNo(createdId);
          } else if (activeMasterType === 'city') {
            setCityNo(createdId);
          }
        }}
      />
    </MasterFormShell>
  );
}
