import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1543;
const TITLE = 'Priority Master';

interface PriorityFormProps {
  id?: string;
}

export function PriorityForm({ id }: PriorityFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('priority', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues, fetchFillValues } = useTaskStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [priorityDuration, setPriorityDuration] = useState<number | null>(null);
  const [priorityFrequencyNo, setPriorityFrequencyNo] = useState('');
  const [sequence, setSequence] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    fetchFillValues(companyNo);
  }, [companyNo, fetchFillValues]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/task-priorities/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.taskPriorityName || dl.name || '');
          setPriorityDuration(dl.priorityDuration !== undefined && dl.priorityDuration !== null ? dl.priorityDuration : null);
          setPriorityFrequencyNo(dl.priorityDurationFrequencyNo ? dl.priorityDurationFrequencyNo.toString() : '');
          setSequence(dl.sequenceNo !== undefined && dl.sequenceNo !== null ? dl.sequenceNo : null);
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load priority details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'priority Name is required';
    }
    if (priorityDuration !== null && priorityDuration <= 0) {
      newErrors.priorityDuration = 'Duration must be a positive number';
    }
    if (sequence !== null && sequence <= 0) {
      newErrors.sequence = 'Sequence must be a positive number';
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
        operTaskPriorityNo: editingId ? parseInt(editingId) : null,
        taskPriorityName: name,
        priorityDuration: Number(priorityDuration) || null,
        priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || null,
        sequenceNo: Number(sequence) || null,
      };
      await apiService.post('/api/master/task-priorities/save', payload);
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
      type="priority"
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
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Priority Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter priority name" value={name} maxLength={50} onChange={(e) => {
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Default Estimation Duration</label>
          <Input type="number" min={1} maxLength={3} value={priorityDuration ?? ''} onChange={(e) => {
            const val = e.target.value === '' ? null : Number(e.target.value);
            setPriorityDuration(val);
            if (errors.priorityDuration) setErrors(prev => ({ ...prev, priorityDuration: '' }));
          }}
            className={cn(
              "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
              errors.priorityDuration && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.priorityDuration && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityDuration}</p>}
        </div>
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Default Estimation Unit</label>
          <Combobox options={(fillValues?.frequency || []).map((f: any) => ({
            label: f.FrequencyName || f.Frequency || f.name || '',
            value: (f.FrequencyNo || f.id || '').toString()
          }))}
            value={priorityFrequencyNo}
            onChange={(val) => {
              setPriorityFrequencyNo(val);
              if (errors.priorityFrequencyNo) setErrors(prev => ({ ...prev, priorityFrequencyNo: '' }));
            }}
            placeholder="Select default estimation unit"
            className={cn(
              "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
              errors.priorityFrequencyNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.priorityFrequencyNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityFrequencyNo}</p>}
        </div>
        <div className="space-y-0 col-span-2">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Sequence Number</label>
          <Input type="number" min={1} maxLength={5} value={sequence ?? ''} onChange={(e) => {
            const val = e.target.value === '' ? null : Number(e.target.value);
            setSequence(val);
            if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
          }}
            className={cn(
              "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
              errors.sequence && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
        </div>
      </div>
    </MasterFormShell>
  );
}
