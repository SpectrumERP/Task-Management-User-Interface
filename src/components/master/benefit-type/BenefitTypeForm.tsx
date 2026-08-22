import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1545;
const TITLE = 'Business Benefit Type Master';

interface BenefitTypeFormProps {
  id?: string;
}

export function BenefitTypeForm({ id }: BenefitTypeFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('benefit-type', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [valuationtypeNo, setValuationtypeNo] = useState('1');
  const [benefitFillValues, setBenefitFillValues] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    apiService.get<any>(`/api/master/business-benefit-types/fill-values?companyNo=${companyNo}`).then((res) => {
      if (res) setBenefitFillValues(res.data || res);
    }).catch(err => console.error('Failed to load benefit fill values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/business-benefit-types/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.businessBenefitTypeName || dl.name || '');
          setValuationtypeNo(dl.valuationType ? (dl.valuationType.valuationTypeNo ?? dl.valuationType ?? '').toString() : '');
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load benefit type details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'benefit-type Name is required';
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
        businessBenefitTypeNo: editingId ? (parseInt(editingId) || '') : null,
        businessBenefitTypeName: name,
        valuationType: parseInt(valuationtypeNo) || (editingId ? 1 : null),
      };
      await apiService.post('/api/master/business-benefit-types/save', payload);
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
      type="benefit-type"
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
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Business Benefit Type Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter business benefit type name" value={name} maxLength={50} onChange={(e) => {
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

      {/* Valuation Type */}
      <div className="space-y-0">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Valuation Scale / Type</label>
        <Combobox options={(benefitFillValues?.valuationTypes || []).map((v: any) => ({
          label: v.valuationTypeName || v.name || '',
          value: (v.valuationTypeNo || v.id || '').toString()
        }))}
          value={valuationtypeNo}
          onChange={setValuationtypeNo}
          placeholder="Select Valuation Scale / Type"
          className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
        />
      </div>
    </MasterFormShell>
  );
}
