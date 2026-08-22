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

const FORM_NO = 1542;
const TITLE = 'Folder Master';

interface FolderFormProps {
  id?: string;
}

export function FolderForm({ id }: FolderFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('folder', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentFolderNo, setParentFolderNo] = useState('');
  const [sequence, setSequence] = useState<number | null>(null);
  const [folderFillValues, setFolderFillValues] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    apiService.get<any>(`/api/master/task-folders/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setFolderFillValues(response.data || response);
    }).catch(err => console.error('Failed to fetch folder fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/task-folders/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.taskFolderName || dl.name || '');
          setDescription(dl.description || '');
          setParentFolderNo((dl.parentFolderNo || '').toString());
          setSequence(dl.sequenceNo !== undefined && dl.sequenceNo !== null ? dl.sequenceNo : null);
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load folder details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'folder Name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Folder Description is required';
    }
    if (sequence !== null && sequence < 0) {
      newErrors.sequence = 'Sequence order must be 0 or greater';
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
        taskFolderNo: editingId ? parseInt(editingId) : null,
        taskFolderName: name,
        description: description || null,
        parentFolderNo: parentFolderNo === 'none' || !parentFolderNo ? 0 : parseInt(parentFolderNo) || null,
        sequenceNo: sequence !== null ? Number(sequence) : null,
      };
      await apiService.post('/api/master/task-folders/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  const parentFolderOptions = [
    { label: 'No Parent (Root)', value: 'none' },
    ...(Array.isArray(folderFillValues?.folders) ? folderFillValues.folders
      : Array.isArray(folderFillValues?.parentFolder) ? folderFillValues.parentFolder
      : Array.isArray(folderFillValues?.data) ? folderFillValues.data
      : Array.isArray(folderFillValues) ? folderFillValues : []
    ).map((f: any) => ({
      label: f.folderName || f.taskFolderName || f.FolderName || f.name || '',
      value: (f.taskFolderNo || f.TaskFolderNo || f.id || '').toString()
    }))
  ];

  return (
    <MasterFormShell
      type="folder"
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
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Folder Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter folder name" value={name} maxLength={50} onChange={(e) => {
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

      <div className="space-y-3">
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Folder Description <span className="text-red-500 font-medium">*</span></label>
          <Input placeholder="Enter Folder Description" value={description} onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
          }}
            className={cn(
              "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
              errors.description && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.description && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Parent Folder</label>
            <Combobox options={parentFolderOptions}
              value={parentFolderNo}
              onChange={setParentFolderNo}
              placeholder="Select Parent Folder"
              className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
            />
          </div>

          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Sequence Order</label>
            <Input type="number" min={1} value={sequence ?? ''} onChange={(e) => {
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
      </div>
    </MasterFormShell>
  );
}
