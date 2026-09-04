import { useEffect, useState, type ReactNode } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/Combobox';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomFieldsSection } from '@/components/ui/CustomFieldsSection';
import { Edit, Trash2, X, CheckCircle, Layers, ListChecks, ListTodo, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1561;
const TITLE = 'Category Master';
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
      className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-600"
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

interface ChecklistItem {
  description: string;
  isChecked: boolean;
}
interface SubtaskItem {
  description: string;
  isChecked: boolean;
  taskTypeNo?: string;
}
interface CustomField {
  customFieldNo: string;
  fieldValue: string;
}

interface CategoryFormProps {
  id?: string;
}

export function CategoryForm({ id }: CategoryFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('category', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isApprovalApplicable, setIsApprovalApplicable] = useState(false);
  const [isInReviewRequired, setIsInReviewRequired] = useState(false);
  const [isBusinessBenefitApplicable, setIsBusinessBenefitApplicable] = useState(false);
  const [color, setColor] = useState('');
  const [selectedTypeNos, setSelectedTypeNos] = useState<string[]>([]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistIdx, setEditingChecklistIdx] = useState<number | null>(null);
  const [tempEditText, setTempEditText] = useState('');

  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskItem, setNewSubtaskItem] = useState('');
  const [newSubtaskTaskTypeNo, setNewSubtaskTaskTypeNo] = useState('');
  const [editingSubtaskIdx, setEditingSubtaskIdx] = useState<number | null>(null);
  const [tempEditSubtaskTaskTypeNo, setTempEditSubtaskTaskTypeNo] = useState('');

  const [categoryFillValues, setCategoryFillValues] = useState<any>(null);
  const [categoryCustomFields, setCategoryCustomFields] = useState<CustomField[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    apiService.get<any>(`/api/master/task-categories/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setCategoryFillValues(response.data || response);
    }).catch(err => console.error('Failed to fetch category fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/master/task-categories/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.operTaskCategoryName || dl.name || '');
          setIsApprovalApplicable(dl.isMultiLevelApproval || false);
          setIsInReviewRequired(dl.isInReviewApplicable || false);
          setIsBusinessBenefitApplicable(dl.isBusinessBenefitApplicable || false);
          setChecklist(Array.isArray(dl.checkLists) ? dl.checkLists.map((cl: any) => ({ description: cl.checkListDescription || cl.description || '', isChecked: !!cl.isChecked })) : []);
          const rawSubtasks = dl.subtasks || dl.subTasks;
          setSubtasks(Array.isArray(rawSubtasks) ? rawSubtasks.map((st: any) => ({
            description: st.title || st.subtaskTitle || st.description || st.taskName || st.subTaskName || (typeof st === 'string' ? st : ''),
            isChecked: !!st.isChecked,
            taskTypeNo: (st.taskTypeNo ?? st.operTaskTypeNo ?? st.taskType?.operTaskTypeNo ?? '').toString()
          })) : []);
          setCategoryCustomFields(Array.isArray(dl.customFields) ? dl.customFields.map((cf: any) => ({
            customFieldNo: (cf.customFieldNo ?? cf.customFieldNo ?? '').toString(),
            fieldValue: cf.fieldValue || cf.value || ''
          })) : []);
          setSelectedTypeNos(Array.isArray(dl.types) ? dl.types.map((t: any) => (t.operTaskTypeNo ?? t.OperTaskTypeNo ?? '').toString()).filter(Boolean) : []);
          setColor(dl.colorCoding || '');
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load category details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Category Name is required';
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
        operTaskCategoryNo: editingId ? parseInt(editingId) : null,
        operTaskCategoryName: name,
        isMultiLevelApproval: isApprovalApplicable,
        isInReviewApplicable: isInReviewRequired,
        isBusinessBenefitApplicable: isBusinessBenefitApplicable,
        checkLists: checklist.map(c => ({
          description: typeof c === 'string' ? c : c.description,
          isChecked: typeof c === 'string' ? false : c.isChecked
        })),
        subtasks: subtasks.map(s => ({
          subtaskTitle: typeof s === 'string' ? s : s.description,
          operTaskTypeNo: typeof s === 'string' ? null : (parseInt(s.taskTypeNo || '') || null)
        })),
        customFields: categoryCustomFields.map(cf => ({
          customFieldNo: parseInt(cf.customFieldNo) || null,
          fieldValue: cf.fieldValue
        })),
        types: selectedTypeNos.map(t => ({ operTaskTypeNo: parseInt(t) })),
        colorCoding: color || null
      };
      await apiService.post('/api/master/task-categories/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, { description: newChecklistItem.trim(), isChecked: false }]);
      setNewChecklistItem('');
    }
  };
  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };
  const toggleChecklistItem = (index: number) => {
    setChecklist(checklist.map((c, i) => (i === index ? { ...c, isChecked: !c.isChecked } : c)));
  };

  const addSubtaskItem = () => {
    if (newSubtaskItem.trim()) {
      setSubtasks([...subtasks, { description: newSubtaskItem.trim(), isChecked: false, taskTypeNo: newSubtaskTaskTypeNo }]);
      setNewSubtaskItem('');
      setNewSubtaskTaskTypeNo('');
    }
  };
  const removeSubtaskItem = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const taskTypeOptions = ((categoryFillValues?.taskTypes || categoryFillValues?.taskType || []) as any[]).map((t: any) => ({
    label: t.operTaskTypeName || t.taskTypeName || t.TaskTypeName || t.name || '',
    value: (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString()
  }));

  return (
    <MasterFormShell
      type="category"
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
      <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <Layers size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Category Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Name, color, types and benefit flags for this category
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Code</FieldLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={editingId ? code || '—' : 'AUTO-GEN-CODE'}
                className={cn(fieldClass, 'bg-[#f8fbfd] text-slate-500 cursor-default select-none focus-visible:ring-0 focus-visible:border-slate-200/80')}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="categoryName" required>Category Name</FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="categoryName"
                  placeholder="Enter category name"
                  value={name}
                  maxLength={50}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={cn(fieldClass, errors.name && 'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400')}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Color Code</FieldLabel>
              <div className="flex flex-wrap items-center gap-2 w-full">
                <Select
                  value={
                    color === '' ? 'none' :
                      COLOR_PRESETS.map(p => p.hex).includes(color) ? color : 'custom'
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
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: preset.hex }} />
                          <span>{preset.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-200 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                        <span>Custom Color</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {color !== '' && !COLOR_PRESETS.map(p => p.hex).includes(color) && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border border-slate-200 rounded-[8px] bg-[#f8fbfd]">
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
              <FieldLabel>Type</FieldLabel>
              <MultiSelect
                options={taskTypeOptions}
                value={selectedTypeNos}
                onChange={setSelectedTypeNos}
                placeholder="Select type(s) (optional)"
                className={cn(fieldClass, 'h-auto min-h-10 w-full')}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100">
            <label htmlFor="business-benefit" className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <Checkbox
                id="business-benefit"
                checked={isBusinessBenefitApplicable}
                onCheckedChange={(checked) => setIsBusinessBenefitApplicable(!!checked)}
              />
              Business Benefit
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <ListChecks size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Checklist Items</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Items checked when tasks in this category are worked</p>
          </div>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[#e8f3f8] px-2 text-[11px] font-semibold text-[#006699] ring-1 ring-[#006699]/12">
            {checklist.length}
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter description"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
              className={fieldClass}
            />
            <Button
              type="button"
              onClick={addChecklistItem}
              className="h-10 px-3.5 rounded-[8px] bg-[#006699] hover:bg-[#005580] text-white font-semibold text-xs gap-1 shrink-0"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add
            </Button>
          </div>

          {checklist.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-slate-200 bg-[#f8fbfd] px-4 py-8 text-center">
              <p className="text-xs font-medium text-slate-500">No checklist items yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {checklist.map((item, index) => {
                const desc = typeof item === 'string' ? item : item.description;
                const isChecked = typeof item === 'string' ? false : item.isChecked;
                const isEditing = editingChecklistIdx === index;

                return (
                  <div
                    key={index}
                    className={cn(
                      'rounded-[8px] border border-slate-200/80 bg-white px-3 py-2.5 flex items-center gap-3',
                      isEditing && 'border-[#006699]/25 bg-[#f8fbfd]/60'
                    )}
                  >
                    <Checkbox
                      id={`cl-item-${index}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleChecklistItem(index)}
                      className="h-4 w-4 rounded border-slate-300 shrink-0"
                    />
                    {isEditing ? (
                      <Input
                        value={tempEditText}
                        onChange={(e) => setTempEditText(e.target.value)}
                        placeholder="Edit checklist"
                        className={cn(fieldClass, 'h-8', !tempEditText.trim() && 'border-red-400')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!tempEditText.trim()) return;
                            const next = [...checklist];
                            next[index] = { ...next[index], description: tempEditText.trim() };
                            setChecklist(next);
                            setEditingChecklistIdx(null);
                            setTempEditText('');
                          } else if (e.key === 'Escape') {
                            setEditingChecklistIdx(null);
                            setTempEditText('');
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className={cn('text-xs font-medium text-slate-800 flex-1 min-w-0 break-words', isChecked && 'line-through text-slate-400')}>
                        {desc}
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 shrink-0">
                      {isEditing ? (
                        <>
                          <Button type="button" variant="ghost" size="icon" disabled={!tempEditText.trim()} onClick={() => {
                            if (!tempEditText.trim()) return;
                            const next = [...checklist];
                            next[index] = { ...next[index], description: tempEditText.trim() };
                            setChecklist(next);
                            setEditingChecklistIdx(null);
                            setTempEditText('');
                          }} className="h-7 w-7 rounded-[6px] text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle size={14} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingChecklistIdx(null); setTempEditText(''); }} className="h-7 w-7 rounded-[6px] text-slate-400 hover:bg-slate-100">
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingChecklistIdx(index); setTempEditText(desc); }} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#006699] hover:bg-[#e8f3f8]">
                            <Edit size={13} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={13} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <ListTodo size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Sub-tasks</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Default sub-tasks created with this category</p>
          </div>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[#e8f3f8] px-2 text-[11px] font-semibold text-[#006699] ring-1 ring-[#006699]/12">
            {subtasks.length}
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Combobox
              options={taskTypeOptions}
              value={newSubtaskTaskTypeNo}
              onChange={(val) => setNewSubtaskTaskTypeNo(val)}
              placeholder="Select task type"
              className={cn(fieldClass, 'sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px]')}
            />
            <Input
              placeholder="Enter sub-task description"
              value={newSubtaskItem}
              onChange={(e) => setNewSubtaskItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubtaskItem();
                }
              }}
              className={cn(fieldClass, 'flex-1')}
            />
            <Button
              type="button"
              onClick={addSubtaskItem}
              className="h-10 px-3.5 rounded-[8px] bg-[#006699] hover:bg-[#005580] text-white font-semibold text-xs gap-1 shrink-0"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add
            </Button>
          </div>

          {subtasks.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-slate-200 bg-[#f8fbfd] px-4 py-8 text-center">
              <p className="text-xs font-medium text-slate-500">No sub-tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map((item, index) => {
                const desc = typeof item === 'string' ? item : item.description;
                const taskTypeNo = typeof item === 'string' ? '' : (item.taskTypeNo || '');
                const taskTypeLabel = taskTypeOptions.find((t) => t.value === taskTypeNo)?.label || '';
                const isEditing = editingSubtaskIdx === index;

                return (
                  <div
                    key={index}
                    className={cn(
                      'rounded-[8px] border border-slate-200/80 bg-white px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5',
                      isEditing && 'border-[#006699]/25 bg-[#f8fbfd]/60'
                    )}
                  >
                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                        <Combobox
                          options={taskTypeOptions}
                          value={tempEditSubtaskTaskTypeNo}
                          onChange={(val) => setTempEditSubtaskTaskTypeNo(val)}
                          placeholder="Select task type"
                          className={cn(fieldClass, 'h-8 sm:w-[180px] sm:min-w-[180px]')}
                        />
                        <Input
                          value={tempEditText}
                          onChange={(e) => setTempEditText(e.target.value)}
                          placeholder="Edit sub-task description"
                          className={cn(fieldClass, 'h-8 flex-1', !tempEditText.trim() && 'border-red-400')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!tempEditText.trim()) return;
                              const next = [...subtasks];
                              next[index] = { ...next[index], description: tempEditText.trim(), taskTypeNo: tempEditSubtaskTaskTypeNo };
                              setSubtasks(next);
                              setEditingSubtaskIdx(null);
                              setTempEditText('');
                              setTempEditSubtaskTaskTypeNo('');
                            } else if (e.key === 'Escape') {
                              setEditingSubtaskIdx(null);
                              setTempEditText('');
                              setTempEditSubtaskTaskTypeNo('');
                            }
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                        {taskTypeLabel ? (
                          <span className="inline-flex items-center rounded-[6px] bg-[#e8f3f8] px-2 py-0.5 text-[10px] font-semibold text-[#006699] ring-1 ring-[#006699]/12">
                            {taskTypeLabel}
                          </span>
                        ) : null}
                        <span className="text-xs font-medium text-slate-800 break-words">{desc}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-0.5 shrink-0 self-end sm:self-auto">
                      {isEditing ? (
                        <>
                          <Button type="button" variant="ghost" size="icon" disabled={!tempEditText.trim()} onClick={() => {
                            if (!tempEditText.trim()) return;
                            const next = [...subtasks];
                            next[index] = { ...next[index], description: tempEditText.trim(), taskTypeNo: tempEditSubtaskTaskTypeNo };
                            setSubtasks(next);
                            setEditingSubtaskIdx(null);
                            setTempEditText('');
                            setTempEditSubtaskTaskTypeNo('');
                          }} className="h-7 w-7 rounded-[6px] text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle size={14} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingSubtaskIdx(null); setTempEditText(''); setTempEditSubtaskTaskTypeNo(''); }} className="h-7 w-7 rounded-[6px] text-slate-400 hover:bg-slate-100">
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingSubtaskIdx(index); setTempEditText(desc); setTempEditSubtaskTaskTypeNo(taskTypeNo); }} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#006699] hover:bg-[#e8f3f8]">
                            <Edit size={13} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSubtaskItem(index)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={13} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <CustomFieldsSection
        customFields={categoryCustomFields}
        onChange={setCategoryCustomFields}
        categoryFillValues={categoryFillValues}
      />
    </MasterFormShell>
  );
}
