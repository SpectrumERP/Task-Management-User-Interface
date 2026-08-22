import { useEffect, useState } from 'react';
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
import { Edit, Trash2, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      newErrors.name = 'category Name is required';
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
      {/* Disabled System Code */}
      <div className="flex items-center gap-0.5 px-1 mb-4">
        <label className="text-[11px] font-medium text-slate-700 normal-case">Code:</label>
        <div className="text-xs font-medium text-slate-500 select-none">
          {editingId ? code : 'AUTO-GEN-CODE'}
        </div>
      </div>

      {/* Standard Name Input */}
      <div className="space-y-0">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Category Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter category name" value={name} maxLength={50} onChange={(e) => {
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

      {/* Color Coding Option */}
      <div className="space-y-0.5">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 block">Color Code</label>
        <div className="flex flex-wrap items-center gap-3">
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
            <SelectTrigger className="w-full sm:w-[220px] h-10 bg-white border-slate-200 rounded-xl focus:ring-[#006699]/20">
              <SelectValue placeholder="Select color code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <X size={14} className="text-slate-400" />
                  <span>None</span>
                </div>
              </SelectItem>
              {COLOR_PRESETS.map((preset) => (
                <SelectItem key={preset.hex} value={preset.hex}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: preset.hex }} />
                    <span>{preset.name}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-slate-200 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                  <span>Custom Color</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {color !== '' && !COLOR_PRESETS.map(p => p.hex).includes(color) && (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50">
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

      <div className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row gap-6 pt-1">
          <div className="flex items-center gap-0.5">
            <Checkbox
              id="business-benefit"
              checked={isBusinessBenefitApplicable}
              onCheckedChange={(checked) => setIsBusinessBenefitApplicable(!!checked)}
            />
            <label htmlFor="business-benefit" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
              Business Benefit
            </label>
          </div>
        </div>

        {/* Type (optional, multiple) */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Type</label>
          <MultiSelect
            options={taskTypeOptions}
            value={selectedTypeNos}
            onChange={setSelectedTypeNos}
            placeholder="Select type(s) (optional)"
            className="bg-white border-slate-200 hover:border-slate-300 rounded-xl"
          />
        </div>

        {/* Checklist Editor */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center">
            Checklist Items
            <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
              {checklist.length}
            </span>
          </label>
          <div className="flex gap-0.5">
            <Input placeholder="Enter description" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
              className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
            />
            <Button
              type="button"
              onClick={addChecklistItem}
              className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
            >
              Add
            </Button>
          </div>

          {checklist.length > 0 && (
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all w-full">
              <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                {checklist.map((item, index) => {
                  const desc = typeof item === 'string' ? item : item.description;
                  const isChecked = typeof item === 'string' ? false : item.isChecked;
                  const isEditing = editingChecklistIdx === index;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
                        isEditing ? "bg-slate-50/70" : "bg-white hover:bg-slate-50/30"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          id={`cl-item-${index}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleChecklistItem(index)}
                          className="h-4 w-4 rounded border-slate-300 shrink-0"
                        />
                        {isEditing ? (
                          <Input value={tempEditText} onChange={(e) => setTempEditText(e.target.value)}
                            placeholder="Edit checklist"
                            className={cn(
                              "h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] px-2.5 rounded-lg w-full transition-all",
                              !tempEditText.trim() && "border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400"
                            )}
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
                          <span className={cn("text-xs font-medium text-slate-750 truncate", isChecked && "line-through text-slate-400 font-semibold")}>
                            {desc}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={!tempEditText.trim()}
                              onClick={() => {
                                if (!tempEditText.trim()) return;
                                const next = [...checklist];
                                next[index] = { ...next[index], description: tempEditText.trim() };
                                setChecklist(next);
                                setEditingChecklistIdx(null);
                                setTempEditText('');
                              }}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed p-1.5 rounded-lg transition-all"
                              title="Save"
                            >
                              <CheckCircle size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChecklistIdx(null);
                                setTempEditText('');
                              }}
                              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                              title="Cancel"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChecklistIdx(index);
                                setTempEditText(desc);
                              }}
                              className="text-slate-400 hover:text-[#006699] hover:bg-[#e1ecf7]/50 p-1.5 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeChecklistItem(index)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sub-tasks Editor */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center">
            Sub-tasks
            <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
              {subtasks.length}
            </span>
          </label>
          <div className="flex gap-0.5">
            <Combobox options={taskTypeOptions}
              value={newSubtaskTaskTypeNo}
              onChange={(val) => setNewSubtaskTaskTypeNo(val)}
              placeholder="Select task type"
              className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-[220px] min-w-[220px] transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
            />
            <Input placeholder="Enter sub-task description" value={newSubtaskItem} onChange={(e) => setNewSubtaskItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubtaskItem();
                }
              }}
              className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
            />
            <Button
              type="button"
              onClick={addSubtaskItem}
              className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
            >
              Add
            </Button>
          </div>

          {subtasks.length > 0 && (
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all w-full">
              <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                {subtasks.map((item, index) => {
                  const desc = typeof item === 'string' ? item : item.description;
                  const taskTypeNo = typeof item === 'string' ? '' : (item.taskTypeNo || '');
                  const taskTypeLabel = taskTypeOptions.find((t) => t.value === taskTypeNo)?.label || '';
                  const isEditing = editingSubtaskIdx === index;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
                        isEditing ? "bg-slate-50/70" : "bg-white hover:bg-slate-50/30"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                        {isEditing ? (
                          <div className="flex items-center gap-0.5 w-full">
                            <Combobox options={taskTypeOptions}
                              value={tempEditSubtaskTaskTypeNo}
                              onChange={(val) => setTempEditSubtaskTaskTypeNo(val)}
                              placeholder="Select task type"
                              className="h-8 rounded-lg border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-[220px] min-w-[220px] transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                            />
                            <Input value={tempEditText} onChange={(e) => setTempEditText(e.target.value)}
                              placeholder="Edit sub-task description"
                              className={cn(
                                "h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] px-2.5 rounded-lg w-full transition-all",
                                !tempEditText.trim() && "border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400"
                              )}
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
                          <div className="min-w-0 flex items-center gap-0.5">
                            {taskTypeLabel && (
                              <span className="inline-flex items-center rounded-full bg-[#e1ecf7] px-2 py-0.5 text-[10px] font-medium text-[#006699] shrink-0">
                                {taskTypeLabel}
                              </span>
                            )}
                            <span className="text-xs font-medium text-slate-750 truncate">
                              {desc}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={!tempEditText.trim()}
                              onClick={() => {
                                if (!tempEditText.trim()) return;
                                const next = [...subtasks];
                                next[index] = { ...next[index], description: tempEditText.trim(), taskTypeNo: tempEditSubtaskTaskTypeNo };
                                setSubtasks(next);
                                setEditingSubtaskIdx(null);
                                setTempEditText('');
                                setTempEditSubtaskTaskTypeNo('');
                              }}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed p-1.5 rounded-lg transition-all"
                              title="Save"
                            >
                              <CheckCircle size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubtaskIdx(null);
                                setTempEditText('');
                                setTempEditSubtaskTaskTypeNo('');
                              }}
                              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                              title="Cancel"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubtaskIdx(index);
                                setTempEditText(desc);
                                setTempEditSubtaskTaskTypeNo(taskTypeNo);
                              }}
                              className="text-slate-400 hover:text-[#006699] hover:bg-[#e1ecf7]/50 p-1.5 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSubtaskItem(index)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Custom Fields Section */}
        <CustomFieldsSection
          customFields={categoryCustomFields}
          onChange={setCategoryCustomFields}
          categoryFillValues={categoryFillValues}
        />
      </div>
    </MasterFormShell>
  );
}
