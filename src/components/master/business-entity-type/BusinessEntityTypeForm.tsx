import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { pickDescription } from '@/lib/pickDescription';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

const FORM_NO = 1564;
const TITLE = 'Business Entity Type';

const fieldClass = FIELD_CONTROL_CLASS;

const textareaClass =
  'min-h-[88px] w-full rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] text-xs font-medium text-slate-200 shadow-none resize-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9]';


interface BusinessEntityTypeFormProps {
  id?: string;
}

export function BusinessEntityTypeForm({ id }: BusinessEntityTypeFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('business-entity-type', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/business-entity-types/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.operCRMBusinessEntityTypeName || dl.OperCRMBusinessEntityTypeName || dl.name || '');
          setDescription(pickDescription(dl));
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load business entity type details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Business Entity Type Name is required';
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
        operCRMBusinessEntityTypeNo: editingId ? parseInt(editingId) : null,
        operCRMBusinessEntityTypeName: name,
        description: description || null,
      };
      await apiService.post('/api/master/business-entity-types/save', payload);
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
      type="business-entity-type"
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
            <Building2 size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Entity Type Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Define the business entity type name and description
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
              <FieldLabel htmlFor="entityTypeName" required>
                Business Entity Type Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="entityTypeName"
                  placeholder="Enter business entity type name"
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
              <FieldLabel htmlFor="entityTypeDescription">Description</FieldLabel>
              <Textarea
                id="entityTypeDescription"
                placeholder="Enter Description"
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                className={textareaClass}
              />
            </div>
          </div>
        </div>
      </section>
    </MasterFormShell>
  );
}
