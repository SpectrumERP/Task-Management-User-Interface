import { useEffect, useState, type ReactNode } from 'react';
import { Flag } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1543;
const TITLE = 'Priority Master';

const fieldClass = FIELD_CONTROL_CLASS;

function FieldErrorTip({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
    >
      {message}
    </span>
  );
}

function FieldControl({
  children,
  error,
  className,
}: {
  children: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {children}
      <FieldErrorTip message={error} />
    </div>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-300"
    >
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

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
      newErrors.name = 'Priority Name is required';
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

  const frequencyOptions = (fillValues?.frequency || []).map((f: any) => ({
    label: f.FrequencyName || f.Frequency || f.name || '',
    value: (f.FrequencyNo || f.id || '').toString(),
  }));

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
      <section className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <Flag size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Priority Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Set priority name, estimation defaults, and display sequence
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
              <FieldLabel htmlFor="priorityName" required>
                Priority Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="priorityName"
                  placeholder="Enter priority name"
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

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="priorityDuration">Default Estimation Duration</FieldLabel>
              <FieldControl error={errors.priorityDuration}>
                <Input
                  id="priorityDuration"
                  type="number"
                  min={1}
                  placeholder="e.g. 2"
                  value={priorityDuration ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setPriorityDuration(val);
                    if (errors.priorityDuration) setErrors((prev) => ({ ...prev, priorityDuration: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.priorityDuration &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Default Estimation Unit</FieldLabel>
              <FieldControl error={errors.priorityFrequencyNo}>
                <Combobox
                  options={frequencyOptions}
                  value={priorityFrequencyNo}
                  onChange={(val) => {
                    setPriorityFrequencyNo(val);
                    if (errors.priorityFrequencyNo) {
                      setErrors((prev) => ({ ...prev, priorityFrequencyNo: '' }));
                    }
                  }}
                  placeholder="Select default estimation unit"
                  className={cn(
                    fieldClass,
                    errors.priorityFrequencyNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="prioritySequence">Sequence Number</FieldLabel>
              <FieldControl error={errors.sequence}>
                <Input
                  id="prioritySequence"
                  type="number"
                  min={1}
                  placeholder="Enter sequence number"
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
