import { useEffect, useRef, useState } from 'react';
import { Bell, Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';
import { getContrastColor } from '@/lib/colorUtils';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import {
  defaultReminderForPriorityName,
  formatReminderSummary,
  guessDailyFrequencyNo,
  parseReminderFromApi,
  resolveFrequencyLabel,
  toReminderApiPayload,
  type PriorityReminderRule,
} from '@/lib/priorityReminder';

const FORM_NO = 1543;
const TITLE = 'Priority Master';

const COLOR_PRESETS = [
  { hex: '#93c5fd', name: 'Blue' },
  { hex: '#fca5a5', name: 'Red' },
  { hex: '#86efac', name: 'Green' },
  { hex: '#fdba74', name: 'Orange' },
  { hex: '#d8b4fe', name: 'Purple' },
  { hex: '#f9a8d4', name: 'Pink' },
  { hex: '#a5b4fc', name: 'Indigo' },
  { hex: '#67e8f9', name: 'Cyan' },
];

const fieldClass = FIELD_CONTROL_CLASS;


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
  const [color, setColor] = useState('');
  const [reminder, setReminder] = useState<PriorityReminderRule>(() =>
    defaultReminderForPriorityName('')
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(!!editingId);
  const [loadError, setLoadError] = useState(false);
  const [loadRetryKey, setLoadRetryKey] = useState(0);
  const reminderTouchedRef = useRef(false);

  const patchReminder = (patch: Partial<PriorityReminderRule>) => {
    reminderTouchedRef.current = true;
    setReminder((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    fetchFillValues(companyNo);
  }, [companyNo, fetchFillValues]);

  // Seed sensible defaults from priority name until the user edits reminder fields.
  useEffect(() => {
    if (editingId || reminderTouchedRef.current) return;
    setReminder(() => {
      const next = defaultReminderForPriorityName(name);
      const daily = guessDailyFrequencyNo(fillValues?.frequency as any);
      return {
        ...next,
        frequencyNo: next.frequencyNo || daily,
      };
    });
  }, [name, editingId, fillValues?.frequency]);

  useEffect(() => {
    if (!editingId) {
      setIsLoadingRecord(false);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setIsLoadingRecord(true);
    setLoadError(false);
    apiService
      .get<any>(`/api/master/task-priorities/load-data/${editingId}?companyNo=${companyNo}`)
      .then((response) => {
        if (cancelled) return;
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            const loadedName = dl.taskPriorityName || dl.name || '';
            setName(loadedName);
            setPriorityDuration(dl.priorityDuration ? dl.priorityDuration : null);
            setPriorityFrequencyNo(
              dl.priorityDurationFrequencyNo ? dl.priorityDurationFrequencyNo.toString() : ''
            );
            setSequence(dl.sequenceNo ? dl.sequenceNo : null);
            setCode(dl.code || '');
            setColor(dl.colorCoding || '');
            const parsed = parseReminderFromApi(dl, loadedName);
            const daily = guessDailyFrequencyNo(fillValues?.frequency as any);
            setReminder({
              ...parsed,
              frequencyNo: parsed.frequencyNo || daily,
            });
          } else {
            setLoadError(true);
          }
        } else {
          setLoadError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load priority details:', err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecord(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId, companyNo, fillValues?.frequency, loadRetryKey]);

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
    if (reminder.enabled) {
      if (reminder.leadDays < 0) {
        newErrors.reminderLeadDays = 'Lead days cannot be negative';
      }
      if (!reminder.frequencyNo) {
        newErrors.reminderFrequencyNo = 'Select how often to remind';
      }
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
    setServerError(null);
    const corePayload = {
      operTaskPriorityNo: editingId ? parseInt(editingId) : null,
      taskPriorityName: name,
      priorityDuration: Number(priorityDuration) || null,
      priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || null,
      sequenceNo: Number(sequence) || null,
      colorCoding: color || null,
    };
    try {
      const reminderPayload = toReminderApiPayload(reminder);
      await apiService.post('/api/master/task-priorities/save', {
        ...corePayload,
        ...reminderPayload,
      });
      setShowSuccessAlert(true);
    } catch (err: any) {
      // Backend may not accept reminder fields yet — retry core fields only.
      const msg = String(err?.message || err?.response?.data?.message || JSON.stringify(err?.response?.data || ''));
      const looksUnknownField =
        /reminder|isReminder|leadDays|overdue/i.test(msg) ||
        /unknown|not valid|unexpected|could not|invalid column/i.test(msg);

      if (looksUnknownField) {
        try {
          await apiService.post('/api/master/task-priorities/save', corePayload);
          setShowSuccessAlert(true);
          toast.message('Priority saved', {
            description: 'Reminder settings will store once the backend supports them.',
          });
          return;
        } catch (retryErr: any) {
          const parsed = parseApiSaveError(retryErr);
          setErrors(parsed.fieldErrors);
          setServerError(parsed.serverError);
          return;
        }
      }

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

  const reminderFreqLabel = resolveFrequencyLabel(
    reminder.frequencyNo,
    fillValues?.frequency as any
  );
  const reminderPreview = formatReminderSummary(reminder, reminderFreqLabel);

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
      onSuccessOk={() => {
        setShowSuccessAlert(false);
        goToList();
      }}
      isLoadingRecord={isLoadingRecord}
      loadError={loadError}
      onRetryLoad={() => setLoadRetryKey((k) => k + 1)}
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
                  sortAlphabetically={false}
                  className={cn(
                    fieldClass,
                    errors.priorityFrequencyNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Color Code</FieldLabel>
              <div className="flex flex-wrap items-center gap-2 w-full">
                <Select
                  value={
                    color === ''
                      ? 'none'
                      : COLOR_PRESETS.map((p) => p.hex).includes(color)
                        ? color
                        : 'custom'
                  }
                  onValueChange={(val) => {
                    if (val === 'none') setColor('');
                    else if (val === 'custom') setColor('#000000');
                    else setColor(val);
                  }}
                >
                  <SelectTrigger className={cn(fieldClass, 'w-full')}>
                    <SelectValue placeholder="Select color code" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[8px]">
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <X size={14} className="text-slate-400" />
                        <span>None</span>
                      </div>
                    </SelectItem>
                    {COLOR_PRESETS.map((preset) => (
                      <SelectItem key={preset.hex} value={preset.hex}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-[var(--tm-border)]"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border border-[var(--tm-border)] bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                        <span>Custom Color</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {color !== '' && !COLOR_PRESETS.map((p) => p.hex).includes(color) && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)]">
                    <input
                      type="color"
                      value={color || '#000000'}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 border-0 bg-transparent cursor-pointer rounded"
                    />
                    <span className="text-xs font-mono font-medium text-slate-500 uppercase">{color}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
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

            <div className="space-y-1.5 min-w-0 sm:col-span-2 pt-2">
              <FieldLabel>Preview</FieldLabel>
              <div className="flex items-center h-12 px-3 rounded-[8px] border border-[var(--tm-border)]/50 bg-[var(--tm-elevated)] overflow-hidden">
                {color ? (
                  <span
                    className="inline-flex px-3 py-1.5 text-sm font-semibold rounded-[6px] shadow-sm"
                    style={{ backgroundColor: color, color: getContrastColor(color) }}
                  >
                    {name || 'Priority Name'}
                  </span>
                ) : (
                  <span className="inline-flex px-3 py-1.5 text-sm font-medium rounded-[6px] text-slate-300 border border-[var(--tm-border)]">
                    {name || 'Priority Name'} (No Color)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <Bell size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Reminder notifications</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              How often tasks with this priority should remind before / after due date
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={reminder.enabled}
              onCheckedChange={(val) => patchReminder({ enabled: Boolean(val) })}
            />
            <span className="text-xs font-semibold text-slate-200">Enable reminders for this priority</span>
          </label>

          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3',
              !reminder.enabled && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="reminderLeadDays">Start reminding (days before due)</FieldLabel>
              <FieldControl error={errors.reminderLeadDays}>
                <Input
                  id="reminderLeadDays"
                  type="number"
                  min={0}
                  placeholder="0 = on due date"
                  value={reminder.leadDays}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    patchReminder({ leadDays: Number.isFinite(val) ? val : 0 });
                    if (errors.reminderLeadDays) {
                      setErrors((prev) => ({ ...prev, reminderLeadDays: '' }));
                    }
                  }}
                  className={cn(
                    fieldClass,
                    errors.reminderLeadDays &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
              <p className="text-[10px] text-slate-500">HOT usually 1; low priority can use 0 (due day only).</p>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Reminder frequency</FieldLabel>
              <FieldControl error={errors.reminderFrequencyNo}>
                <Combobox
                  options={frequencyOptions}
                  value={reminder.frequencyNo}
                  onChange={(val) => {
                    patchReminder({ frequencyNo: val });
                    if (errors.reminderFrequencyNo) {
                      setErrors((prev) => ({ ...prev, reminderFrequencyNo: '' }));
                    }
                  }}
                  placeholder="e.g. Days / Weekly"
                  sortAlphabetically={false}
                  className={cn(
                    fieldClass,
                    errors.reminderFrequencyNo &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={reminder.overdueEnabled}
                  onCheckedChange={(val) => patchReminder({ overdueEnabled: Boolean(val) })}
                />
                <span className="text-xs font-medium text-slate-300">
                  Keep reminding after the due date (overdue)
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-[8px] border border-[#0EA5E9]/20 bg-[var(--tm-tint)]/40 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[#0EA5E9]">{reminderPreview}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Tasks using this priority inherit this rule. Delivery starts when the notification backend is live.
            </p>
          </div>
        </div>
      </section>
    </MasterFormShell>
  );
}
