import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/Combobox';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { CustomFieldsSection } from '@/components/ui/CustomFieldsSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { X, Loader2, Save, Sparkles, AlertCircle, Layers, Sliders, Folder, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@radix-ui/react-label';
import { fetchStatesByCountry } from './shared/geo';

interface MasterCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'category' | 'type' | 'priority' | 'folder' | 'location' | 'company' | 'benefit-type' | 'country' | 'state' | 'city' | 'task-company' | 'meeting-category' | 'meeting-type' | null;
  companyNo: string | number;
  fillValues: any; // TaskFillValues from parent
  onSuccess: (id: string, label: string) => void;
}

export function MasterCreateDialog({
  open,
  onOpenChange,
  type,
  companyNo,
  fillValues,
  onSuccess,
}: MasterCreateDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Nested Master Creation State
  const [isNestedMasterOpen, setIsNestedMasterOpen] = useState(false);
  const [nestedMasterType, setNestedMasterType] = useState<'country' | 'state' | 'city' | null>(null);

  // Category State
  const [isApprovalApplicable, setIsApprovalApplicable] = useState(false);
  const [isInReviewRequired, setIsInReviewRequired] = useState(false);
  const [isBusinessBenefitApplicable, setIsBusinessBenefitApplicable] = useState(false);
  const [checklist, setChecklist] = useState<{ description: string; isChecked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [color, setColor] = useState('');
  const [subtasks, setSubtasks] = useState<{ description: string; isChecked: boolean }[]>([]);
  const [newSubtaskItem, setNewSubtaskItem] = useState('');
  const [categoryFillValues, setCategoryFillValues] = useState<any>(null);
  const [categoryCustomFields, setCategoryCustomFields] = useState<{ customFieldNo: string; fieldValue: string }[]>([]);
  const [selectedTypeNos, setSelectedTypeNos] = useState<string[]>([]);

  // Priority State
  const [priorityDuration, setPriorityDuration] = useState<number | null>(null);
  const [priorityFrequencyNo, setPriorityFrequencyNo] = useState('');
  const [sequence, setSequence] = useState<number | null>(null);

  // Folder State
  const [description, setDescription] = useState('');
  const [parentFolderNo, setParentFolderNo] = useState('');
  const [folderFillValues, setFolderFillValues] = useState<any>(null);

  // Location State
  const [parentLocationNo, setParentLocationNo] = useState('');
  const [inchargeNo, setInchargeNo] = useState('');
  const [inchargeLabel, setInchargeLabel] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [countryNo, setCountryNo] = useState('');
  const [stateNo, setStateNo] = useState('');
  const [cityNo, setCityNo] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [availableCityStates, setAvailableCityStates] = useState<any[]>([]);
  const [locationFillValues, setLocationFillValues] = useState<any>(null);

  // Task Company State
  const [aliasName, setAliasName] = useState('');
  const [locationName, setLocationName] = useState('');

  // Reset state when opening/changing type
  useEffect(() => {
    if (!open || !type) return;

    setName('');
    setErrors({});
    setServerError(null);

    // Reset Category
    setIsApprovalApplicable(false);
    setIsInReviewRequired(false);
    setIsBusinessBenefitApplicable(false);
    setChecklist([]);
    setNewChecklistItem('');
    setColor('');
    setSubtasks([]);
    setNewSubtaskItem('');
    setCategoryCustomFields([]);
    setSelectedTypeNos([]);

    // Reset Priority
    setPriorityDuration(null);
    setPriorityFrequencyNo('');
    setSequence(null);

    // Reset Folder
    setDescription('');
    setParentFolderNo('');

    // Reset Location
    setParentLocationNo('');
    setInchargeNo('');
    setInchargeLabel('');
    setAddress1('');
    setAddress2('');
    setAddress3('');
    setCountryNo('');
    setStateNo('');
    setCityNo('');
    setPinCode('');
    setLocationRegion('');
    
    // Reset Task Company
    setAliasName('');
    setLocationName('');

    // Asynchronously fetch fill values needed specifically for master sub-forms
    const activeCompanyNo = companyNo || 1;
    if (type === 'category') {
      apiService.get<any>(`/api/master/task-categories/fill-values?companyNo=${activeCompanyNo}`).then((response) => {
        setCategoryFillValues(response.data || response);
      }).catch(err => console.error("Failed to load category fill values:", err));
    } else if (type === 'folder') {
      apiService.get<any>(`/api/master/task-folders/fill-values?companyNo=${activeCompanyNo}`).then((response) => {
        setFolderFillValues(response.data || response);
      }).catch(err => console.error("Failed to load folder fill values:", err));
    } else if (type === 'location' || type === 'task-company' || type === 'state' || type === 'city') {
      apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${activeCompanyNo}`).then((response) => {
        setLocationFillValues(response);
      }).catch(err => console.error("Failed to load location fill values:", err));
    }
  }, [open, type, companyNo]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = `${type} Name is required`;
    }

    if (type === 'priority') {
      if (priorityDuration !== null && priorityDuration <= 0) {
        newErrors.priorityDuration = 'Duration must be positive';
      }
      if (sequence !== null && sequence <= 0) {
        newErrors.sequence = 'Sequence must be positive';
      }
    } else if (type === 'folder') {
      if (!description.trim()) {
        newErrors.description = 'Description is required';
      }
    } else if (type === 'location') {
      if (!address1.trim()) {
        newErrors.address1 = 'Address Line 1 is required';
      }
      if (!pinCode.trim()) {
        newErrors.pinCode = 'PIN/ZIP is required';
      }
      if (!countryNo || countryNo === 'none' || countryNo === '') {
        newErrors.countryNo = 'Country is required';
      }
      if (!stateNo || stateNo === 'none' || stateNo === '') {
        newErrors.stateNo = 'State is required';
      }
      if (!cityNo || cityNo === 'none' || cityNo === '') {
        newErrors.cityNo = 'City is required';
      }
      if (!inchargeNo || inchargeNo === 'none' || inchargeNo === '') {
        newErrors.inchargeNo = 'Incharge is required';
      }
    } else if (type === 'state') {
      if (!countryNo || countryNo === 'none' || countryNo === '') {
        newErrors.countryNo = 'Country is required';
      }
    } else if (type === 'city') {
      if (!countryNo || countryNo === 'none' || countryNo === '') {
        newErrors.countryNo = 'Country is required to select a State';
      }
      if (!stateNo || stateNo === 'none' || stateNo === '') {
        newErrors.stateNo = 'State is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    setServerError(null);


    try {
      let response: any = null;

      if (type === 'category') {
        const payload = {
          operTaskCategoryNo: null,
          operTaskCategoryName: name,
          isMultiLevelApproval: isApprovalApplicable,
          isInReviewApplicable: isInReviewRequired,
          isBusinessBenefitApplicable: isBusinessBenefitApplicable,
          checkLists: checklist.map(c => ({
            description: c.description,
            isChecked: c.isChecked
          })),
          subtasks: subtasks.map(s => ({
            subtaskTitle: s.description
          })),
          customFields: categoryCustomFields.map(cf => ({
            customFieldNo: parseInt(cf.customFieldNo) || null,
            fieldValue: cf.fieldValue
          })),
          types: selectedTypeNos.map(t => ({ operTaskTypeNo: parseInt(t) })),
          colorCoding: color || null
        };
        response = await apiService.post('/api/master/task-categories/save', payload);
      } else if (type === 'type') {
        const payload = {
          operTaskTypeNo: null,
          operTaskTypeName: name
        };
        response = await apiService.post('/api/master/task-types/save', payload);
      } else if (type === 'priority') {
        const payload = {
          operTaskPriorityNo: null,
          taskPriorityName: name,
          priorityDuration: Number(priorityDuration) || null,
          priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || null,
          sequenceNo: Number(sequence) || null
        };
        response = await apiService.post('/api/master/task-priorities/save', payload);
      } else if (type === 'folder') {
        const payload = {
          taskFolderNo: null,
          taskFolderName: name,
          description: description,
          parentFolderNo: parentFolderNo === 'none' || !parentFolderNo ? 0 : parseInt(parentFolderNo),
          sequenceNo: sequence !== null ? Number(sequence) : null
        };
        response = await apiService.post('/api/master/task-folders/save', payload);
      } else if (type === 'location') {
        const cleanParent = parentLocationNo === 'none' ? '' : parentLocationNo;
        const cleanIncharge = inchargeNo === 'none' ? '' : inchargeNo;
        const payload = {
          operLocationNo: null,
          operLocationName: name,
          operLocationInchargeNo: cleanIncharge ? parseInt(cleanIncharge) || null : null,
          operLocationParentNo: cleanParent ? parseInt(cleanParent) || null : null,
          address1,
          address2,
          address3,
          cityNo: parseInt(cityNo) || null,
          pinCode,
          stateNo: parseInt(stateNo) || null,
          countryNo: parseInt(countryNo) || null,
          regionNo: parseInt(locationRegion) || null
        };
        response = await apiService.post('/api/master/task-locations/save', payload);
      } else if (type === 'task-company') {
        const payload = {
          operTaskCompanyNo: null,
          companyName: name,
          aliasName: aliasName || null,
          locationName: locationName || null,
          address1: address1 || null,
          address2: address2 || null,
          address3: address3 || null,
          cityNo: parseInt(cityNo) || null,
          pinCode: pinCode || null,
          stateNo: parseInt(stateNo) || null,
          countryNo: parseInt(countryNo) || null
        };
        response = await apiService.post('/api/crm/task-companies/save', payload);
      } else if (type === 'country') {
        const payload = {
          countryNo: null,
          countryName: name,
          companyNo: companyNo || 1
        };
        response = await apiService.post('/api/master/countries/save', payload);
      } else if (type === 'state') {
        const payload = {
          stateNo: null,
          stateName: name,
          gstStateCode: null,
          isUnionTerritory: false,
          countryNo: parseInt(countryNo) || null,
          companyNo: companyNo || 1
        };
        response = await apiService.post('/api/master/states/save', payload);
      } else if (type === 'city') {
        const payload = {
          cityNo: null,
          cityName: name,
          stateNo: parseInt(stateNo) || null,
          companyNo: companyNo || 1
        };
        response = await apiService.post('/api/master/cities/save', payload);
      }

      // Resolve the saved record's ID
      let createdId = '';
      if (response) {
        const data = response.data || response;
        if (type === 'category') createdId = (data.operTaskCategoryNo || data.id || '').toString();
        else if (type === 'type') createdId = (data.operTaskTypeNo || data.id || '').toString();
        else if (type === 'priority') createdId = (data.operTaskPriorityNo || data.id || '').toString();
        else if (type === 'folder') createdId = (data.taskFolderNo || data.id || '').toString();
        else if (type === 'location') createdId = (data.operLocationNo || data.id || '').toString();
        else if (type === 'task-company') createdId = (data.operTaskCompanyNo || data.id || '').toString();
        else if (type === 'country') createdId = (data.countryNo || data.id || '').toString();
        else if (type === 'state') createdId = (data.stateNo || data.id || '').toString();
        else if (type === 'city') createdId = (data.cityNo || data.id || '').toString();
      }

      // Success Callback!
      onSuccess(createdId, name);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Master dialog save failed:", err);
      if (err && err.data) {
        const errData = err.data;
        if (Array.isArray(errData.errors)) {
          const newFieldErrors: Record<string, string> = {};
          errData.errors.forEach((e: any) => {
            if (e && e.propertyName && e.errorMessage) {
              newFieldErrors[e.propertyName.toLowerCase()] = e.errorMessage;
            }
          });
          setErrors(newFieldErrors);
        }
        setServerError(errData.message || err.message || 'Operation failed.');
      } else {
        setServerError(err?.message || 'Operation failed due to connection error.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getMasterTitle = () => {
    switch (type) {
      case 'category': return 'Category Master';
      case 'type': return 'Type Master';
      case 'priority': return 'Priority Master';
      case 'folder': return 'Folder Master';
      case 'location': return 'Location Master';
      case 'task-company': return 'Task Company Master';
      case 'country': return 'Country Master';
      case 'state': return 'State Master';
      case 'city': return 'City Master';
      default: return 'Master Form';
    }
  };

  const getMasterIcon = () => {
    switch (type) {
      case 'category': return Layers;
      case 'type': return Sliders;
      case 'priority': return AlertCircle;
      case 'folder': return Folder;
      case 'location': return MapPin;
      default: return Sparkles;
    }
  };

  const Icon = getMasterIcon();

  const taskTypeOptions = ((categoryFillValues?.taskTypes || categoryFillValues?.taskType || []) as any[]).map((t: any) => ({
    label: t.operTaskTypeName || t.taskTypeName || t.TaskTypeName || t.name || '',
    value: (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString()
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-lg p-0 bg-white max-h-[85vh] flex flex-col">
        <DialogHeader className="rounded-t-3xl p-5 pb-4 border-b border-slate-100 flex flex-row items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-2xl bg-[#006699]/10 flex items-center justify-center text-[#006699]">
            <Icon size={18} className="stroke-[2.5]" />
          </div>
          <div className="flex-1 text-left">
            <DialogTitle className="text-sm font-medium text-slate-800 leading-none">
              Create New {getMasterTitle().replace(' Master', '')}
            </DialogTitle>
            {/* <DialogDescription className="text-[10px] text-slate-500 font-medium mt-1">
              Fill in the fields below to register a new master entry.
            </DialogDescription> */}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Name / Label */}
          <div className="space-y-0">
            <Label  className="text-[10px] font-medium text-slate-700 ml-1">{`${getMasterTitle().replace(' Master', '')} Name`} <span className="text-red-500">*</span></Label>
            <Input placeholder={`Enter new ${getMasterTitle().replace(' Master', '').toLowerCase()} name...`} value={name} onChange={(e) => {
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

          {/* Type specific sub-forms */}
          {type === 'category' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 pt-1">
                <div className="flex items-center gap-0.5">
                  <Checkbox
                    id="dialog-business-benefit"
                    checked={isBusinessBenefitApplicable}
                    onCheckedChange={(checked) => setIsBusinessBenefitApplicable(!!checked)}
                  />
                  <Label htmlFor="dialog-business-benefit"  className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                    Business Benefit
                  </Label>
                </div>
              </div>

              {/* Type (optional, multiple) */}
              <div className="space-y-0">
                <Label className="text-[10px] font-medium text-slate-700 ml-1 block">Type</Label>
                <MultiSelect
                  options={taskTypeOptions}
                  value={selectedTypeNos}
                  onChange={setSelectedTypeNos}
                  placeholder="Select type(s) (optional)"
                  className="bg-white border-slate-200 hover:border-slate-300 rounded-xl"
                />
              </div>

              {/* Color Coding Option */}
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1 block">Color Code</Label>
                <div className="flex flex-wrap items-center gap-0.5">
                  {[
                    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4'
                  ].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      className={cn(
                        "h-6 w-6 rounded-full border transition-all hover:scale-110 active:scale-95",
                        color === hex ? "border-slate-800 scale-105" : "border-transparent"
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <div className="flex items-center gap-0.5 ml-auto border border-slate-200 rounded-xl px-2 py-0.5 bg-slate-50/50">
                    <input
                      type="color"
                      value={color || '#000000'}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-5 h-5 border-0 bg-transparent cursor-pointer rounded"
                    />
                    <span className="text-[9px] font-mono font-medium text-slate-500">{color || 'NONE'}</span>
                  </div>
                </div>
              </div>

              {/* Checklist Editor */}
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1 flex items-center">
                  Checklist Items
                  <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
                    {checklist.length}
                  </span>
                </Label>
                <div className="flex gap-0.5">
                  <Input placeholder="Add description..." value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)}
                    className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistItem.trim()) {
                          setChecklist([...checklist, { description: newChecklistItem.trim(), isChecked: false }]);
                          setNewChecklistItem('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newChecklistItem.trim()) {
                        setChecklist([...checklist, { description: newChecklistItem.trim(), isChecked: false }]);
                        setNewChecklistItem('');
                      }
                    }}
                    className="rounded-xl h-8 px-3 border-[#006699] text-[#006699] hover:bg-[#e1ecf7]"
                  >
                    Add
                  </Button>
                </div>

                {checklist.length > 0 && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100/50">
                    {checklist.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 text-xs font-medium text-slate-700">
                        <span className="truncate">{item.description}</span>
                        <button
                          type="button"
                          onClick={() => setChecklist(checklist.filter((_, i) => i !== index))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtask Templates */}
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1 flex items-center">
                  Subtask Templates
                  <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
                    {subtasks.length}
                  </span>
                </Label>
                <div className="flex gap-0.5">
                  <Input placeholder="Add subtask title..." value={newSubtaskItem} onChange={(e) => setNewSubtaskItem(e.target.value)}
                    className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubtaskItem.trim()) {
                          setSubtasks([...subtasks, { description: newSubtaskItem.trim(), isChecked: false }]);
                          setNewSubtaskItem('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newSubtaskItem.trim()) {
                        setSubtasks([...subtasks, { description: newSubtaskItem.trim(), isChecked: false }]);
                        setNewSubtaskItem('');
                      }
                    }}
                    className="rounded-xl h-8 px-3 border-[#006699] text-[#006699] hover:bg-[#e1ecf7]"
                  >
                    Add
                  </Button>
                </div>

                {subtasks.length > 0 && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100/50">
                    {subtasks.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 text-xs font-medium text-slate-700">
                        <span className="truncate">{item.description}</span>
                        <button
                          type="button"
                          onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
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
          )}

          {type === 'priority' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Priority Duration Value</Label>
                <Input type="number" min={1} value={priorityDuration ?? ''} onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setPriorityDuration(val);
                    if (errors.priorityDuration) setErrors(prev => ({ ...prev, priorityDuration: '' }));
                  }}
                  className="bg-white border-slate-200 h-10 rounded-xl"
                />
                {errors.priorityDuration && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityDuration}</p>}
              </div>

              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Frequency Unit</Label>
                <Combobox options={(fillValues?.frequency || []).map((f: any) => ({
                    label: f.FrequencyName || f.Frequency || f.name || '',
                    value: (f.FrequencyNo || f.id || '').toString()
                  }))}
                  value={priorityFrequencyNo}
                  onChange={setPriorityFrequencyNo}
                  placeholder="Select frequency..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full"
                />
              </div>

              <div className="space-y-0 col-span-2">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Sequence Number</Label>
                <Input type="number" min={1} value={sequence ?? ''} onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setSequence(val);
                    if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
                  }}
                  className="bg-white border-slate-200 h-10 rounded-xl"
                />
                {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
              </div>
            </div>
          )}

          {type === 'folder' && (
            <div className="space-y-3">
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Folder Description <span className="text-red-500">*</span></Label>
                <Input placeholder="Enter short folder purpose..." value={description} onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                  }}
                  className="bg-white border-slate-200 h-10 rounded-xl"
                />
                {errors.description && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.description}</p>}
              </div>

              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Parent Folder</Label>
                <Combobox options={[ { label: 'No Parent (Root)', value: 'none' }, ...(Array.isArray(folderFillValues?.folders) ? folderFillValues.folders : Array.isArray(folderFillValues?.parentFolder) ? folderFillValues.parentFolder : Array.isArray(folderFillValues?.data) ? folderFillValues.data : Array.isArray(folderFillValues) ? folderFillValues : []).map((f: any) => ({
                            label: f.folderName || f.taskFolderName || f.FolderName || f.name || '',
                            value: (f.taskFolderNo || f.TaskFolderNo || f.id || '').toString()
                          }))
                  ]}
                  value={parentFolderNo}
                  onChange={setParentFolderNo}
                  placeholder="Select Parent Folder..."
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                />
              </div>
            </div>
          )}

          {type === 'location' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">Parent Location</Label>
                  <Combobox options={[ { label: "No Parent (Root)", value: "none" }, ...(locationFillValues?.data?.locations || locationFillValues?.locations || []).map((l: any) => ({
                        label: l.operLocationName || l.locationName || l.name || '',
                        value: (l.operLocationNo || l.id || '').toString()
                      }))
                    ]}
                    value={parentLocationNo}
                    onChange={setParentLocationNo}
                    placeholder="Select Parent"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                  />
                </div>

                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">Incharge Lead <span className="text-red-500">*</span></Label>
                  <UserCombobox value={inchargeNo} onChange={(user) => {
                      setInchargeNo(user.loginNo.toString());
                      setInchargeLabel(user.printingName);
                      if (errors.inchargeNo) setErrors(prev => ({ ...prev, inchargeNo: '' }));
                    }}
                    initialLabel={inchargeLabel}
                    placeholder="Search Incharge..."
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                  />
                  {errors.inchargeNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.inchargeNo}</p>}
                </div>
              </div>

              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Location Region</Label>
                <Combobox options={(locationFillValues?.data?.regions || locationFillValues?.regions || []).map((r: any) => ({
                    label: r.regionName || '',
                    value: (r.regionNo || '').toString()
                  }))}
                  value={locationRegion}
                  onChange={setLocationRegion}
                  placeholder="Select Region"
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                />
              </div>

              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1 block">Address <span className="text-red-500">*</span></Label>
                <div className="space-y-0">
                  <Input placeholder="Address Line 1" value={address1} onChange={(e) => {
                      setAddress1(e.target.value);
                      if (errors.address1) setErrors(prev => ({ ...prev, address1: '' }));
                    }}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                  {errors.address1 && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.address1}</p>}
                  <Input placeholder="Address Line 2 (Optional)" value={address2} onChange={(e) => setAddress2(e.target.value)}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                  <Input placeholder="Address Line 3 (Optional)" value={address3} onChange={(e) => setAddress3(e.target.value)}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">Country <span className="text-red-500">*</span></Label>
                  <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                      label: c.countryName || '',
                      value: (c.countryNo || '').toString()
                    }))}
                    value={countryNo}
                    onChange={(val) => {
                      setCountryNo(val);
                      if (errors.countryNo) setErrors(prev => ({ ...prev, countryNo: '' }));
                    }}
                    placeholder="Select Country"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                    onAddNew={() => {
                      setNestedMasterType('country');
                      setIsNestedMasterOpen(true);
                    }}
                  />
                  {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
                </div>
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">State / Province <span className="text-red-500">*</span></Label>
                  <Combobox options={(locationFillValues?.data?.states || locationFillValues?.states || []).map((s: any) => ({
                      label: s.stateName || '',
                      value: (s.stateNo || '').toString()
                    }))}
                    value={stateNo}
                    onChange={(val) => {
                      setStateNo(val);
                      if (errors.stateNo) setErrors(prev => ({ ...prev, stateNo: '' }));
                    }}
                    placeholder="Select State"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                    onAddNew={() => {
                      setNestedMasterType('state');
                      setIsNestedMasterOpen(true);
                    }}
                  />
                  {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0.5.5">
                <div className="space-y-0 col-span-2">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">City <span className="text-red-500">*</span></Label>
                  <Combobox options={(locationFillValues?.data?.cities || locationFillValues?.cities || []).map((c: any) => ({
                      label: c.cityName || '',
                      value: (c.cityNo || '').toString()
                    }))}
                    value={cityNo}
                    onChange={(val) => {
                      setCityNo(val);
                      if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
                    }}
                    placeholder="Select City"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                    onAddNew={() => {
                      setNestedMasterType('city');
                      setIsNestedMasterOpen(true);
                    }}
                  />
                  {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
                </div>
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">PIN / ZIP Code <span className="text-red-500">*</span></Label>
                  <Input placeholder="ZIP" value={pinCode} onChange={(e) => {
                      setPinCode(e.target.value);
                      if (errors.pinCode) setErrors(prev => ({ ...prev, pinCode: '' }));
                    }}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                  {errors.pinCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.pinCode}</p>}
                </div>
              </div>
            </div>
          )}

          {type === 'task-company' && (
            <div className="space-y-3">
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Alias Name</Label>
                <Input placeholder="Enter alias" value={aliasName} onChange={(e) => setAliasName(e.target.value)}
                  maxLength={15}
                  className="bg-white border-slate-200 h-10 rounded-xl"
                />
              </div>
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Location Name</Label>
                <Input placeholder="Enter location name" value={locationName} onChange={(e) => setLocationName(e.target.value)}
                  maxLength={50}
                  className="bg-white border-slate-200 h-10 rounded-xl"
                />
              </div>

              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1 block">Address</Label>
                <div className="space-y-0">
                  <Input placeholder="Address Line 1" value={address1} onChange={(e) => setAddress1(e.target.value)}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                  <Input placeholder="Address Line 2 (Optional)" value={address2} onChange={(e) => setAddress2(e.target.value)}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                  <Input placeholder="Address Line 3 (Optional)" value={address3} onChange={(e) => setAddress3(e.target.value)}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">Country</Label>
                  <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                      label: c.countryName || '',
                      value: (c.countryNo || '').toString()
                    }))}
                    value={countryNo}
                    onChange={setCountryNo}
                    placeholder="Select Country"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                    onAddNew={() => {
                      setNestedMasterType('country');
                      setIsNestedMasterOpen(true);
                    }}
                  />
                </div>
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">State / Province</Label>
                  <Combobox options={(locationFillValues?.data?.states || locationFillValues?.states || []).map((s: any) => ({
                      label: s.stateName || '',
                      value: (s.stateNo || '').toString()
                    }))}
                    value={stateNo}
                    onChange={setStateNo}
                    placeholder="Select State"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                    onAddNew={() => {
                      setNestedMasterType('state');
                      setIsNestedMasterOpen(true);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0.5.5">
                <div className="space-y-0 col-span-2">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">City</Label>
                  <Combobox options={(locationFillValues?.data?.cities || locationFillValues?.cities || []).map((c: any) => ({
                      label: c.cityName || '',
                      value: (c.cityNo || '').toString()
                    }))}
                    value={cityNo}
                    onChange={setCityNo}
                    placeholder="Select City"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                    onAddNew={() => {
                      setNestedMasterType('city');
                      setIsNestedMasterOpen(true);
                    }}
                  />
                </div>
                <div className="space-y-0">
                  <Label  className="text-[10px] font-medium text-slate-700 ml-1">PIN / ZIP Code</Label>
                  <Input placeholder="ZIP" value={pinCode} onChange={(e) => setPinCode(e.target.value)}
                    className="bg-white border-slate-200 h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'state' && (
            <div className="space-y-3">
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Country <span className="text-red-500">*</span></Label>
                <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || fillValues?.data?.countries || fillValues?.countries || []).map((c: any) => ({
                    label: c.countryName || '',
                    value: (c.countryNo || '').toString()
                  }))}
                  value={countryNo}
                  onChange={(val) => {
                    setCountryNo(val);
                    if (errors.countryNo) setErrors(prev => ({ ...prev, countryNo: '' }));
                  }}
                  placeholder="Select Country"
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                />
                {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
              </div>
            </div>
          )}

          {type === 'city' && (
            <div className="space-y-3">
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">Country <span className="text-red-500">*</span></Label>
                <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || fillValues?.data?.countries || fillValues?.countries || []).map((c: any) => ({
                    label: c.countryName || '',
                    value: (c.countryNo || '').toString()
                  }))}
                  value={countryNo}
                  onChange={(val) => {
                    setCountryNo(val);
                    setStateNo('');
                    setAvailableCityStates([]);
                    if (errors.countryNo) setErrors(prev => ({ ...prev, countryNo: '' }));
                    if (val) {
                      fetchStatesByCountry(val).then((states) => {
                        setAvailableCityStates(states);
                      });
                    }
                  }}
                  placeholder="Select Country first"
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                />
              </div>
              <div className="space-y-0">
                <Label  className="text-[10px] font-medium text-slate-700 ml-1">State / Province <span className="text-red-500">*</span></Label>
                <Combobox options={availableCityStates.map((s: any) => ({
                    label: s.stateName || '',
                    value: (s.stateNo || '').toString()
                  }))}
                  value={stateNo}
                  onChange={(val) => {
                    setStateNo(val);
                    if (errors.stateNo) setErrors(prev => ({ ...prev, stateNo: '' }));
                  }}
                  placeholder={countryNo ? "Select State" : "Select country first"}
                  disabled={!countryNo}
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                />
                {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
              </div>
            </div>
          )}

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-start gap-0.5 animate-pulse mt-2">
              <span className="font-medium select-none">⚠️ Error:</span>
              <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 rounded-b-3xl bg-slate-50/50 border-t border-slate-100 flex justify-end gap-0.5 shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 font-medium text-slate-500 hover:bg-slate-100 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl h-10 bg-[#006699] hover:bg-[#005580] font-medium text-white shadow-md text-xs gap-0.5 min-w-[90px] flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Entry
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {isNestedMasterOpen && (
        <MasterCreateDialog
          open={isNestedMasterOpen}
          onOpenChange={setIsNestedMasterOpen}
          type={nestedMasterType}
          companyNo={companyNo}
          fillValues={fillValues}
          onSuccess={(id) => {
            if (nestedMasterType === 'country') {
              setCountryNo(id);
            } else if (nestedMasterType === 'state') {
              setStateNo(id);
            } else if (nestedMasterType === 'city') {
              setCityNo(id);
            }
            // Trigger a re-fetch of fill values so the new item is available in the lists
            const activeCompanyNo = companyNo || 1;
            apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${activeCompanyNo}`).then((response) => {
              setLocationFillValues(response);
            }).catch(err => console.error("Failed to load location fill values:", err));
          }}
        />
      )}
    </Dialog>
  );
}
