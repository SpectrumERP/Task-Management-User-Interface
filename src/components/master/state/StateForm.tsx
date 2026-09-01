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
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 13;
const TITLE = 'State Master';

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

  useEffect(() => {
    apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setLocationFillValues(response);
    }).catch(err => console.error('Failed to fetch location fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/states/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.stateName || dl.name || '');
          setGstStateCode(dl.gstStateCode || dl.gstCode || '');
          setIsUnionTerritory(dl.isUnionTerritory || false);
          setStateCountryNo((dl.countryNo || dl.CountryNo || '').toString());
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load state details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'state Name is required';
    }
    if (!stateCountryNo || stateCountryNo === 'none' || stateCountryNo === '') {
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
        companyNo: authCompanies?.find(itm => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo,
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
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter state name" value={name} maxLength={50} onChange={(e) => {
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

      {/* STATE MASTER FIELDS */}
      <div className="space-y-4">
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country <span className="text-red-500 font-medium">*</span></label>
          <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
            label: c.countryName || '',
            value: (c.countryNo || '').toString()
          }))}
            value={stateCountryNo}
            onChange={(val) => {
              setStateCountryNo(val);
              if (errors.stateCountryNo) setErrors(prev => ({ ...prev, stateCountryNo: '' }));
            }}
            placeholder="Select Country"
            searchPlaceholder="Search country..."
            className={cn(
              "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.stateCountryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
            onAddNew={() => setIsMasterCreateOpen(true)}
          />
          {errors.stateCountryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateCountryNo}</p>}
        </div>
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">GST State Code</label>
          <Input placeholder="Enter GST State Code" value={gstStateCode} maxLength={2} onChange={(e) => {
            setGstStateCode(e.target.value);
            if (errors.gstStateCode) setErrors(prev => ({ ...prev, gstStateCode: '' }));
          }}
            className={cn(
              "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
              errors.gstStateCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.gstStateCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.gstStateCode}</p>}
        </div>
      </div>

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={setIsMasterCreateOpen}
        type="country"
        companyNo={companyNo}
        fillValues={fillValues}
        onSuccess={(id) => {
          setStateCountryNo(id);
          // Refresh fill values to show new items
          apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`).then((response) => {
            if (response) setLocationFillValues(response);
          }).catch(err => console.error('Failed to fetch location fill-values:', err));
        }}
      />
    </MasterFormShell>
  );
}
