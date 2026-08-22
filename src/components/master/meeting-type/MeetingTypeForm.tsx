import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1560;
const TITLE = 'Meeting Type Master';

interface MeetingTypeFormProps {
  id?: string;
}

export function MeetingTypeForm({ id }: MeetingTypeFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('meeting-type', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [meetingTypeName, setMeetingTypeName] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/meeting-types/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const dl = response.data || response;
        if (dl) {
          setMeetingTypeName(dl.meetingTypeName || '');
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load meeting type details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!meetingTypeName.trim()) {
      newErrors.name = 'Meeting Type Name is required';
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
        meetingTypeNo: editingId ? parseInt(editingId) : null,
        meetingTypeName: meetingTypeName,
        companyNo: companyNo,
      };
      await apiService.post('/api/master/meeting-types/save', payload);
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
      type="meeting-type"
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

      <div className="space-y-0">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Meeting Type Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter Meeting Type Name" value={meetingTypeName} maxLength={100} onChange={(e) => {
          setMeetingTypeName(e.target.value);
          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
        }}
          className={cn(
            "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
            errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500"
          )}
        />
        {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1 mt-1">{errors.name}</p>}
      </div>
    </MasterFormShell>
  );
}
