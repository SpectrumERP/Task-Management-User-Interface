import { useEffect, useState } from 'react';
import { Folder } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

const FORM_NO = 1542;
const TITLE = 'Folder Master';

const fieldClass = FIELD_CONTROL_CLASS;


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
      newErrors.name = 'Folder Name is required';
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
      value: (f.taskFolderNo || f.TaskFolderNo || f.id || '').toString(),
    })),
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
      <section className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <Folder size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Folder Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Define folder name, parent hierarchy, and sequence order
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
              <FieldLabel htmlFor="folderName" required>
                Folder Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="folderName"
                  placeholder="Enter folder name"
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

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="folderDescription" required>
                Folder Description
              </FieldLabel>
              <FieldControl error={errors.description}>
                <Input
                  id="folderDescription"
                  placeholder="Enter Folder Description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.description &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Parent Folder</FieldLabel>
              <Combobox
                options={parentFolderOptions}
                value={parentFolderNo}
                onChange={setParentFolderNo}
                placeholder="Select Parent Folder"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="folderSequence">Sequence Order</FieldLabel>
              <FieldControl error={errors.sequence}>
                <Input
                  id="folderSequence"
                  type="number"
                  min={0}
                  placeholder="Enter sequence order"
                  value={sequence ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setSequence(val);
                    if (errors.sequence) setErrors((prev) => ({ ...prev, sequence: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.sequence &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>
          </div>
        </div>
      </section>
    </MasterFormShell>
  );
}
