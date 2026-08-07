import { useForm, Controller, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info, Users, Clock, TrendingUp, CheckCircle, Plus, Trash2, UserPlus, History, Check, Loader2, FileText, Paperclip, UploadCloud, Trash, Image, RefreshCw, X, Sparkles, Edit2, ExternalLink, AlertCircle, Camera } from 'lucide-react';
import { Task, TaskStatus } from '@/types/task';
import { attachmentService } from '@/services/attachmentService';
import { toast } from 'sonner';
import { useTaskStore } from '@/store/useTaskStore';

import { useEffect, useState, useMemo, useRef } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { Combobox } from '@/components/ui/Combobox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { format } from 'date-fns';
import { TaskActivity } from './TaskActivity';
import { MasterCreateDialog } from '@/components/master/MasterCreateDialog';
import { useFormDraft } from '@/hooks/useFormDraft';

const formatFileSize = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

import { CustomFieldsSection } from '@/components/ui/CustomFieldsSection';
import CameraComp from '@/components/ui/CameraComp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';



import { useNavigate, useSearchParams, useBlocker, Link } from 'react-router-dom';

const standaloneSubtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  ownerLoginNo: z.string().min(1, 'Task Owner is required'),
  endDate: z.string().optional(),
  completionRemark: z.string().optional(),
  completionDate: z.string().optional(),
  operTaskNo: z.any().optional(),
  assignedDisplayName: z.string().optional(),
  type_No: z.string().optional()
});

const getTaskSchema = (isSubTask: boolean, fillValues?: TaskFillValues | null) => z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  code: z.string().optional(),
  description: z.string().optional(),
  priority_No: z.string().min(1, 'Priority is required'),
  type_No: z.string().min(1, 'Type is required'),
  folder_No: z.string().min(1, 'Folder is required'),
  category_No: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  company: z.string().min(1, 'Company is required'),
  location_No: z.string().min(1, 'Location is required'),
  owner_user_No: z.string().min(1, 'Assigned to is required'),
  originator_user_No: z.string().min(1, 'Task Owner is required'),
  status: z.string().min(1, 'Status is required'),
  isPrivate: z.boolean().optional().default(false),
  start_date: z.string().optional(),
  end_date: isSubTask ? z.string().min(1, 'Due Date is required for sub-tasks') : z.string().optional(),
  completionDate: z.string().optional(),
  completionRemark: z.string().max(500, 'Remark cannot exceed 500 characters').optional(),
  roadBlock: z.string().max(1000, 'Road Block cannot exceed 1000 characters').optional(),
  isAllDay: z.boolean().optional().default(false),
  calendarColor: z.string().optional().default(''),
  recurrence: z.object({
    pattern: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    until: z.string().optional().nullable()
  }).optional().default({ pattern: 'NONE', until: null }),
  estimated_effort_value: z.string().optional()
    .refine(val => !val || val === '' || parseFloat(val) > 0, {
      message: 'Estimated effort must be greater than 0'
    }),
  estimated_effort_unit: z.string().optional(),
  attachments: z.array(z.object({
    id: z.number(),
    name: z.string(),
    size: z.number().optional().nullable(),
    storedFileName: z.string().nullable().optional(),
    storedFilePath: z.string().nullable().optional(),
    relativePath: z.string().nullable().optional()
  })).optional().default([]),
  is_business_benefit_applicable: z.boolean(),
  business_benefit_type_No: z.string().optional(),
  business_benefit_description: z.string().optional(),
  estimated_benefit_amount: z.string().optional()
    .refine(val => !val || val === '' || parseFloat(val) > 0, {
      message: 'Estimated benefit must be greater than 0'
    }),
  actual_benefit_amount: z.string().optional()
    .refine(val => !val || val === '' || parseFloat(val) > 0, {
      message: 'Actual benefit must be greater than 0'
    }),
  benefit_period: z.string().optional(),
  collaborators: z.array(z.object({
    userName: z.string().min(1, 'User Name is required'),
    displayName: z.string().min(1, 'Display Name is required'),
    email: z.string().optional(),
    loginNo: z.union([z.number(), z.string()]).optional(),
    isFromTeam: z.boolean().optional()
  })).optional().default([]),
  informed_to: z.array(z.object({
    userName: z.string().min(1, 'User Name is required'),
    displayName: z.string().min(1, 'Display Name is required'),
    email: z.string().optional(),
    loginNo: z.union([z.number(), z.string()]).optional(),
    isFromTeam: z.boolean().optional()
  })).optional().default([]),
  actual_efforts: z.array(z.object({
    date: z.string().optional(),
    hours: z.string().optional(),
    description: z.string().optional(),
    operTaskEffortLogDetailNo: z.number().optional(),
    createdBy: z.object({
      loginNo: z.number().optional(),
      displayName: z.string().optional(),
      email: z.string().optional(),
      userName: z.string().optional(),
      isFromTeam: z.boolean().optional()
    }).optional()
  })).optional().default([]),
  check_list: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'),
    completed: z.boolean()
  })).optional().default([]),
  sub_tasks: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    ownerLoginNo: z.string().min(1, 'Task Owner is required'),
    endDate: z.string().optional(),
    completionRemark: z.string().optional(),
    completionDate: z.string().optional(),
    operTaskNo: z.any().optional(),
    assignedDisplayName: z.string().optional(),
    type_No: z.string().optional()
  })).optional().default([]),
  custom_fields: z.array(z.object({
    customFieldNo: z.string(),
    fieldValue: z.string().optional().default('')
  })).optional().default([]),
  executionNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date) {
    if (new Date(data.end_date) < new Date(data.start_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Due Date cannot be earlier than Start Date',
        path: ['end_date']
      });
    }
  }
  if (data.is_business_benefit_applicable) {
    if (!data.business_benefit_type_No || data.business_benefit_type_No === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Benefit Type is required',
        path: ['business_benefit_type_No'],
      });
    }

    // Skip estimated amount validation if valuation type is Intangible or valuationTypeNo is 2
    let shouldSkipAmountVal = false;
    if (fillValues?.benefitType && data.business_benefit_type_No) {
      const selectedType = fillValues.benefitType.find(
        (b: any) => (b.BusinessBenefitTypeNo ?? b.businessBenefitTypeNo ?? '').toString() === data.business_benefit_type_No
      );
      if (selectedType) {
        const st = selectedType as any;
        const valType = (st.ValuationType || st.valuationType || st.valuationTypeName || st.ValuationTypeName || st.valuationtypeNo || st.valuationtype || '').toString().toLowerCase();
        const valTypeNo = st.ValuationTypeNo ?? st.valuationTypeNo ?? st.valuationtypeNo ?? st.valuationtype;
        if (valType.includes('intangible') || valTypeNo === 2 || valTypeNo === '2') {
          shouldSkipAmountVal = true;
        }
      }
    }

    if (!shouldSkipAmountVal) {
      if (!data.estimated_benefit_amount || isNaN(parseFloat(data.estimated_benefit_amount)) || parseFloat(data.estimated_benefit_amount) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Estimated benefit amount must be greater than 0',
          path: ['estimated_benefit_amount'],
        });
      }
    }

    if (!data.benefit_period || data.benefit_period === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Benefit Period is required',
        path: ['benefit_period'],
      });
    }
  }
});

interface TaskFormProps {
  initialStatus?: TaskStatus;
  initialData?: Task;
  parentTask?: Task;
  onComplete?: () => void;
  onRefreshData?: () => void;
  onSaveStateChange?: (isSaving: boolean) => void;
}

interface TaskFillValues {
  priority: { OperTaskPriorityNo: number; Priority: string; Code: string; PriorityDuration?: number; PriorityDurationFrequencyNo?: number }[];
  type: { OperTaskTypeNo: number; "Task Type": string; Code: string }[];
  category: { OperTaskCategoryNo: number; Category: string; Code: string; colorCoding?: string; ColorCoding?: string }[];
  location: { OperLocationNo: number; Location: string; Code: string }[];
  benefitType: { BusinessBenefitTypeNo: number; "Business Benefit": string; Code: string }[];
  status: { StatusNo: number; Status: string; IsDefault: boolean }[];
  userGroup: { UserGroupNo: number; UserGroupName: string; Code: string }[];
  folder: { TaskFolderNo: number; "Folder Name": string; Code: string }[];
  frequency?: { FrequencyNo: number; Frequency?: string; FrequencyName?: string }[];
  taskCompany?: any[];
}

const statusTransitions: Record<string, string[]> = {
  "Draft": ["Approval In Progress", "Open"],
  "Approval In Progress": ["Open", "Rejected"],
  "Rejected": ["Close"],
  "Open": ["In Progress"],
  "In Progress": ["Complete", "Hold"],
  "Hold": ["In Progress"],
  "Complete": ["In Review"],
  "In Review": ["Reopen", "Close"],
  "Reopen": ["In Progress"],
  "Close": []
};

function FormSection({ title, icon: Icon, children, headerAction }: { title?: string, icon?: any, children?: React.ReactNode, headerAction?: React.ReactNode }) {
  return (
    <div className="space-y-0 pt-2 first:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-l-4 border-[#006699] -ml-4 sm:-ml-8 pl-3 sm:pl-7">
        <div className="flex items-center gap-0.5">
          {Icon && <Icon size={16} className="text-[#006699]" />}
          {title && <h3 className="text-sm font-medium text-slate-800">{title}</h3>}
        </div>
        {headerAction}
      </div>
      <div className="pl-0">
        {children}
      </div>
    </div>
  );
}

const resolveFrequencyValue = (val: any): string => {
  if (!val) return '1';
  const valStr = val.toString().toLowerCase();
  if (valStr === 'hours' || valStr === 'hour' || valStr === '1') return '1';
  if (valStr === 'days' || valStr === 'day' || valStr === '2') return '2';
  if (valStr === 'minutes' || valStr === 'minute' || valStr === '3') return '3';
  if (valStr === 'weeks' || valStr === 'week' || valStr === '4') return '4';
  if (valStr === 'months' || valStr === 'month' || valStr === '5') return '5';
  if (valStr === 'years' || valStr === 'year' || valStr === '6') return '6';
  return '1';
};

const resolveCompanyValue = (company: any, authCompanies: any[] | null): string => {
  if (!company) return '';

  let extractedVal = '';
  if (typeof company === 'object') {
    const coId = company.companyNo || company.CompanyNo || company.id;
    const coName = company.companyName || company.CompanyName || company.name || company.alias || '';
    extractedVal = (coId !== undefined && coId !== null ? coId : coName).toString();
  } else {
    extractedVal = company.toString();
  }

  if (!extractedVal) return '';

  const matched = authCompanies?.find(c => {
    const cid = (c.companyNo || c.CompanyNo || '').toString();
    const cname = (c.companyName || c.CompanyName || c.name || '').toString();
    const calias = (c.alias || '').toString();
    return cid === extractedVal ||
      cname.toLowerCase() === extractedVal.toLowerCase() ||
      calias.toLowerCase() === extractedVal.toLowerCase();
  });

  return matched?.companyNo?.toString() || matched?.CompanyNo?.toString() || extractedVal;
};

export function TaskForm({ initialStatus, initialData, parentTask: parentTaskProp, onComplete, onRefreshData, onSaveStateChange }: TaskFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentTaskNoQuery = searchParams.get('parentTaskNo');
  const parentTaskNo = parentTaskNoQuery ? parseInt(parentTaskNoQuery) : (initialData?.parent_task_No || null);
  const isSubTask = parentTaskNo !== null && parentTaskNo > 0;

  const formRights = useAuthStore(state => state.formRights) || {};
  const [activeMasterType, setActiveMasterType] = useState<string | null>(null);

  const { addTask, updateTask, fetchFillValues, selectedFolder, tasks } = useTaskStore();
  const [localParentTask, setLocalParentTask] = useState<Task | null>(null);
  const parentTask = parentTaskProp || tasks.find(t => t.taskNo === parentTaskNo) || localParentTask;
  const [localSubtasks, setLocalSubtasks] = useState<any[]>(() => {
    if (initialData?.subTasks && initialData.subTasks.length > 0) {
      return initialData.subTasks.map((st: any) => ({
        taskNo: st.operTaskNo || st.taskNo,
        code: st.code,
        title: st.title,
        status: st.status?.statusName || st.status || 'Draft',
        start_date: st.startDate || st.start_date,
        categoryName: st.category?.categoryName || st.categoryName,
        typeName: st.type?.typeName || st.typeName,
        priority: st.priority?.priorityName || st.priority,
        assignedDisplayName: st.assignedTo?.displayName || st.assignedTo?.userName || st.assignedDisplayName || '',
        ownerLoginNo: st.assignedTo?.id || st.assignedTo?.loginNo || st.owner?.id || st.ownerLoginNo || st.owner_user_No || '',
        endDate: st.endDate || st.end_date || '',
        completionDate: st.completionDate || '',
        completionRemark: st.completionRemark || '',
        type_No: st.type?.operTaskTypeNo || st.operTaskTypeNo || '',
        operTaskTypeNo: st.type?.operTaskTypeNo || st.operTaskTypeNo || '',
        category_No: st.category?.operTaskCategoryNo || st.operTaskCategoryNo || '',
        priority_No: st.priority?.operTaskPriorityNo || st.operTaskPriorityNo || '',
        status_No: st.status?.operTaskStatusNo || st.operTaskStatusNo || ''
      }));
    }
    return initialData?.taskNo ? tasks.filter(t => t.parent_task_No === initialData.taskNo) : [];
  });

  useEffect(() => {
    if (initialData?.subTasks && initialData.subTasks.length > 0) {
      setLocalSubtasks(initialData.subTasks.map((st: any) => ({
        taskNo: st.operTaskNo || st.taskNo,
        code: st.code,
        title: st.title,
        status: st.status?.statusName || st.status || 'Draft',
        start_date: st.startDate || st.start_date,
        categoryName: st.category?.categoryName || st.categoryName,
        typeName: st.type?.typeName || st.typeName,
        priority: st.priority?.priorityName || st.priority,
        assignedDisplayName: st.assignedTo?.displayName || st.assignedTo?.userName || st.assignedDisplayName || '',
        ownerLoginNo: st.assignedTo?.id || st.assignedTo?.loginNo || st.owner?.id || st.ownerLoginNo || st.owner_user_No || '',
        endDate: st.endDate || st.end_date || '',
        completionDate: st.completionDate || '',
        completionRemark: st.completionRemark || '',
        type_No: st.type?.operTaskTypeNo || st.operTaskTypeNo || '',
        operTaskTypeNo: st.type?.operTaskTypeNo || st.operTaskTypeNo || '',
        category_No: st.category?.operTaskCategoryNo || st.operTaskCategoryNo || '',
        priority_No: st.priority?.operTaskPriorityNo || st.priority_No || '',
        status_No: st.status?.operTaskStatusNo || st.status_No || ''
      })));
    } else {
      setLocalSubtasks(initialData?.taskNo ? tasks.filter(t => t.parent_task_No === initialData.taskNo) : []);
    }
  }, [initialData, tasks]);

  const fetchSubtasksSilent = async () => {
    if (!initialData?.taskNo) return;
    try {
      const response = await apiService.get<{ success: boolean; data: any; message?: string }>(`/api/crm/tasks/load-data/${initialData.taskNo}`);
      if (response.success && response.data?.subTasks) {
        setLocalSubtasks(response.data.subTasks.map((st: any) => ({
          taskNo: st.operTaskNo || st.taskNo,
          code: st.code,
          title: st.title,
          status: st.status?.statusName || st.status || 'Draft',
          start_date: st.startDate || st.start_date,
          categoryName: st.category?.categoryName || st.categoryName,
          typeName: st.type?.typeName || st.typeName,
          priority: st.priority?.priorityName || st.priority,
          assignedDisplayName: st.assignedTo?.displayName || st.assignedTo?.userName || st.assignedDisplayName || '',
          ownerLoginNo: st.assignedTo?.id || st.assignedTo?.loginNo || st.owner?.id || st.ownerLoginNo || st.owner_user_No || '',
          endDate: st.endDate || st.end_date || '',
          completionDate: st.completionDate || '',
          completionRemark: st.completionRemark || ''
        })));
      }
    } catch (err) {
      console.error("Failed to silently refresh subtasks", err);
    }
  };

  const { company: authCompanies, user: authUser } = useAuthStore();
  const [selectedCollabTeam, setSelectedCollabTeam] = useState<string>("");
  const [selectedInformTeam, setSelectedInformTeam] = useState<string>("");
  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formDataToSave, setFormDataToSave] = useState<any>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    tempId: string;
    name: string;
    status: 'pending' | 'uploading' | 'verifying' | 'success' | 'failed';
    errorMessage?: string;
    fileObject: File;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [invalidFiles, setInvalidFiles] = useState<Array<{
    name: string;
    size: number;
    reason: string;
  }>>([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [isSubtasksModalOpen, setIsSubtasksModalOpen] = useState(false);
  const [isStandaloneSubtaskModalOpen, setIsStandaloneSubtaskModalOpen] = useState(false);

  const handleMasterCreateSuccess = async (createdId: string, label: string) => {
    try {
      const currentCompany = form.getValues('company');
      const companyNo = currentCompany || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
      // 1. Force refresh full fillValues from API
      const updatedValues = await fetchFillValues(companyNo.toString(), true);
      if (updatedValues) {
        setFillValues(updatedValues as TaskFillValues);
      }

      // 2. Determine target Hook Form field and resolve target ID if not returned directly from API
      let resolvedId = createdId;
      if (!resolvedId && activeMasterType) {
        // Fallback: search updated values list by exact/case-insensitive name match
        if (activeMasterType === 'category' && updatedValues?.category) {
          const matched = updatedValues.category.find(c => c.Category.toLowerCase() === label.toLowerCase());
          if (matched) resolvedId = matched.OperTaskCategoryNo.toString();
        } else if (activeMasterType === 'type' && updatedValues?.type) {
          const matched = updatedValues.type.find(t => t["Task Type"].toLowerCase() === label.toLowerCase());
          if (matched) resolvedId = matched.OperTaskTypeNo.toString();
        } else if (activeMasterType === 'priority' && updatedValues?.priority) {
          const matched = updatedValues.priority.find(p => p.Priority.toLowerCase() === label.toLowerCase());
          if (matched) resolvedId = matched.OperTaskPriorityNo.toString();
        } else if (activeMasterType === 'folder' && updatedValues?.folder) {
          const matched = updatedValues.folder.find(f => f["Folder Name"].toLowerCase() === label.toLowerCase());
          if (matched) resolvedId = matched.TaskFolderNo.toString();
        } else if (activeMasterType === 'location' && updatedValues?.location) {
          const matched = updatedValues.location.find(l => l.Location.toLowerCase() === label.toLowerCase());
          if (matched) resolvedId = matched.OperLocationNo.toString();
        }
      }

      // 3. Update controller field value
      if (resolvedId && activeMasterType) {
        if (activeMasterType === 'category') {
          form.setValue('category_No', resolvedId);
          handleCategoryChange(resolvedId);
        } else if (activeMasterType === 'type') {
          form.setValue('type_No', resolvedId);
        } else if (activeMasterType === 'priority') {
          form.setValue('priority_No', resolvedId);
        } else if (activeMasterType === 'folder') {
          form.setValue('folder_No', resolvedId);
        } else if (activeMasterType === 'location') {
          form.setValue('location_No', resolvedId);
        }
        toast.success(`${label} created and selected successfully.`);
      }
    } catch (error) {
      console.error("Failed to auto-select newly created master:", error);
    }
  };

  const dateParam = searchParams.get('date');

  // Parse sections to hide
  const hideSectionsParam = searchParams.get('hideSections') || '';
  const hiddenSections = hideSectionsParam.split(',').map(s => s.trim().toLowerCase());

  const isShowTopAdditionalFields = searchParams.get('isShowTopAdditionalFields') === 'true';

  const { saveDraft, clearDraft, getDraft, isRestoringRef } = useFormDraft(initialData?.taskNo || null);
  const [showDraftRestore, setShowDraftRestore] = useState(false);

  useEffect(() => {
    // Logic for restoring draft
  }, [initialData]);

  const handleRestoreDraft = () => {
    const draftData = getDraft();
    if (draftData) {
      isRestoringRef.current = true;
      const { _localSubtasks, ...formData } = draftData;

      if (_localSubtasks) {
        setLocalSubtasks(_localSubtasks);
      }

      form.reset(formData);
      setTimeout(() => {
        // Trigger a change to ensure form is dirty after restore so the blocker works
        form.setValue('title', formData.title, { shouldDirty: true });
        isRestoringRef.current = false;
      }, 500);
      toast.success('Draft restored successfully.');
    }
    setShowDraftRestore(false);
  };

  const formResolver = useMemo(() => {
    return zodResolver(getTaskSchema(isSubTask, fillValues));
  }, [isSubTask, fillValues]);

  const standaloneSubtaskForm = useForm({
    resolver: zodResolver(standaloneSubtaskSchema),
    defaultValues: {
      id: "",
      title: "",
      description: "",
      ownerLoginNo: "",
      endDate: "",
      completionRemark: "",
      completionDate: "",
      operTaskNo: 0,
      assignedDisplayName: "",
      type_No: ""
    }
  });

  const form = useForm({
    resolver: formResolver,
    mode: 'onChange',
    shouldFocusError: false,
    defaultValues: {
      title: initialData?.title || '',
      code: initialData?.code || '',
      tags: initialData?.tags || [],
      company: resolveCompanyValue(initialData?.company, authCompanies) || (isSubTask && parentTask ? resolveCompanyValue(parentTask.company, authCompanies) : ''),
      description: initialData?.description || searchParams.get('description') || '',
      priority_No: initialData?.priority_No?.toString() || (isSubTask && parentTask ? parentTask.priority_No.toString() : '') || searchParams.get('priority_No') || '',
      type_No: initialData?.type_No?.toString() || (isSubTask && parentTask ? parentTask.type_No.toString() : '') || searchParams.get('type_No') || '',
      folder_No: (initialData as any)?.folder_No?.toString() || (initialData as any)?.folderNo?.toString() || (isSubTask && parentTask ? (parentTask.project_No || (parentTask as any).folder_No || (parentTask as any).folderNo)?.toString() : '') || selectedFolder?.TaskFolderNo?.toString() || searchParams.get('folder_No') || '1',
      category_No: initialData?.category_No?.toString() || (isSubTask && parentTask ? parentTask.category_No.toString() : '') || searchParams.get('category_No') || '',
      location_No: initialData?.location_No?.toString() || (isSubTask && parentTask ? parentTask.location_No.toString() : '') || searchParams.get('location_No') || '',
      start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString() : (dateParam ? new Date(dateParam).toISOString() : (searchParams.get('start_date') ? new Date(searchParams.get('start_date') as string).toISOString() : '')),
      end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString() : (searchParams.get('end_date') ? new Date(searchParams.get('end_date') as string).toISOString() : ''),
      completionDate: initialData?.completionDate ? new Date(initialData.completionDate).toISOString() : '',
      completionRemark: initialData?.completionRemark || '',
      roadBlock: initialData?.roadBlock || '',
      estimated_effort_value: initialData?.estimated_effort_value?.toString() || searchParams.get('estimated_effort_value') || '',
      estimated_effort_unit: resolveFrequencyValue(initialData?.estimated_effort_unit || searchParams.get('estimated_effort_unit') || 'hours'),
      is_business_benefit_applicable: initialData?.is_business_benefit_applicable || false,
      business_benefit_type_No: initialData?.business_benefit_type_No?.toString() || '',
      business_benefit_description: initialData?.business_benefit_description || '',
      estimated_benefit_amount: initialData?.estimated_benefit_amount?.toString() || '',
      actual_benefit_amount: initialData?.actual_benefit_amount?.toString() || '',
      benefit_period: initialData?.benefit_period || 'Monthly',
      originator_user_No: initialData?.originator_user_No?.toString() || '',
      owner_user_No: initialData?.owner_user_No?.toString() || searchParams.get('owner_user_No') || '',
      collaborators: initialData?.collaborators || [],
      informed_to: initialData?.informed_to || [],
      actual_efforts: initialData?.actual_efforts?.map(e => ({
        date: e.date,
        hours: e.hours?.toString() || '',
        description: e.description,
        createdBy: e.createdBy,
      })) || [],
      check_list: initialData?.check_list || [],
      sub_tasks: [],
      custom_fields: (initialData as any)?.customFields?.map((cf: any) => ({
        customFieldNo: (cf.customFieldNo ?? '').toString(),
        fieldValue: cf.fieldValue || ''
      })) || [],
      executionNotes: initialData?.executionNotes || initialData?.execution_notes || '',
      status: initialData?.status || initialStatus || 'Draft',
      isPrivate: initialData?.isPrivate || searchParams.get('isPrivate') === 'true' || false,
      isAllDay: initialData?.isAllDay ?? false,
      calendarColor: initialData?.calendarColor || '',
      recurrence: initialData?.recurrence || { pattern: 'NONE', until: null },
      attachments: (initialData?.attachments || initialData?.attachments || []).map((a: any) => ({
        id: a.id || a.docNo || a.operTaskAttachmentDetailNo || null,
        name: a.docName || a.name || a.fileName || a.storedFileName || 'attachment',
        size: a.docSize || a.size || null,
        storedFileName: a.storedFileName || '',
        storedFilePath: a.storedFilePath || '',
        relativePath: a.relativePath || a.storedFilePath || ''
      }))
    }
  });

  useEffect(() => {
    if (isSubTask && !initialData && !isLoadingOptions) {
      const timer = setTimeout(() => {
        form.setFocus('title');
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isSubTask, initialData, isLoadingOptions, form]);

  useEffect(() => {
    if (isSubTask && parentTaskNo && !parentTaskProp && !tasks.find(t => t.taskNo === parentTaskNo)) {
      const fetchParent = async () => {
        try {
          const response = await apiService.get<{ success: boolean; data: any }>(`/api/crm/tasks/load-data/${parentTaskNo}`);
          if (response.success && response.data) {
            const d = response.data;
            const mappedParent: Task = {
              taskNo: d.operTaskNo,
              code: d.code || '',
              title: d.title || '',
              description: d.description || '',
              priority_No: d.priority?.operTaskPriorityNo || null,
              category_No: d.category?.operTaskCategoryNo || null,
              type_No: d.type?.operTaskTypeNo || null,
              tags: d.tags ? (typeof d.tags === 'string' ? d.tags.split(',') : d.tags) : [],
              originator_user_No: d.originator?.id || 1,
              owner_user_No: d.owner?.id || null,
              location_No: d.location?.operTaskLocationNo || null,
              company: d?.taskCompany?.taskCompanyNo || '',
              start_date: d.startDate,
              end_date: d.endDate,
              estimated_effort_value: d.estimatedEfforts?.hours || '',
              estimated_effort_unit: 'hours',
              is_business_benefit_applicable: d.isBusinessBenefitApplicable || false,
              business_benefit_type_No: d.businessBenefit?.businessBenefitType?.businessBenefitTypeNo || d.businessBenefit?.businessBenefitTypeNo || '',
              business_benefit_description: d.businessBenefit?.businessBenefitDescription || '',
              estimated_benefit_amount: d.businessBenefit?.estimatedBenefitAmount || '',
              actual_benefit_amount: d.businessBenefit?.actualBenefitAmount || '',
              benefit_period: 'One Time',
              status_No: d.status?.operTaskStatusNo || 1,
              status: d.status?.statusName || 'Draft',
              priority: d.priority?.priorityName || 'Low Priority',
              categoryName: d.category?.categoryName || '',
              typeName: d.type?.typeName || '',
              assignedDisplayName: d.owner?.displayName || '',
              originatorDisplayName: d.originator?.displayName || '',
              collaborators: [],
              informed_to: [],
              check_list: [],
              task_comments: [],
              actual_efforts: [],
              isAllDay: d.isAllday ?? d.isAllDay ?? false,
              calendarColor: d.colorCoding || '',
              executionNotes: d.executionNotes || '',
              execution_notes: d.executionNotes || ''
            };
            setLocalParentTask(mappedParent);

            // Pre-fill the inherited fields in the form dynamically
            form.setValue('category_No', mappedParent.category_No.toString());
            form.setValue('company', resolveCompanyValue(mappedParent.company, authCompanies));
            form.setValue('type_No', mappedParent.type_No.toString());
            const parsedFolderVal = (d.project?.operTaskProjectNo || d.project?.projectNo || d.project?.project_No || d.project?.operTaskFolderNo || d.project?.folderNo || d.folder?.operTaskFolderNo || d.folder?.folderNo || d.folder?.TaskFolderNo || d.folder?.taskFolderNo || d.folder?.operTaskFolderDetailNo || d.project?.operTaskProjectDetailNo || d.project_No || d.projectNo || d.folder_No || d.folderNo || '').toString();
            form.setValue('folder_No', parsedFolderVal && parsedFolderVal !== '0' ? parsedFolderVal : (selectedFolder?.TaskFolderNo?.toString() || ''));
            form.setValue('location_No', mappedParent.location_No.toString());
            form.setValue('priority_No', mappedParent.priority_No.toString());
          }
        } catch (error) {
          console.error("Failed to load fallback parent task:", error);
        }
      };
      fetchParent();
    }
  }, [isSubTask, parentTaskNo, parentTaskProp, tasks, authCompanies, selectedFolder, form]);

  const localSubtasksRef = useRef(localSubtasks);
  useEffect(() => {
    localSubtasksRef.current = localSubtasks;
  }, [localSubtasks]);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (!form.formState.isDirty || isRestoringRef.current) return;
      const timer = setTimeout(() => {
        saveDraft({
          ...form.getValues(),
          _localSubtasks: localSubtasksRef.current
        });
      }, 3000);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.formState.isDirty, saveDraft]);

  // Also auto-save when localSubtasks change manually (e.g., delete subtask)
  useEffect(() => {
    if (!form.formState.isDirty || isRestoringRef.current) return;
    const timer = setTimeout(() => {
      saveDraft({
        ...form.getValues(),
        _localSubtasks: localSubtasks
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [localSubtasks, form.formState.isDirty, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  // Block in-app navigation if the form is dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      form.formState.isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const currentStatus = form.watch('status');
  const isBenefitApplicable = form.watch('is_business_benefit_applicable');
  const selectedBenefitTypeNo = form.watch('business_benefit_type_No');
  const isAllDay = form.watch('isAllDay');

  const shouldHideBenefitAmount = useMemo(() => {
    if (!isBenefitApplicable || !selectedBenefitTypeNo) return false;

    const selectedType = fillValues?.benefitType?.find(
      (b: any) => (b.BusinessBenefitTypeNo ?? b.businessBenefitTypeNo ?? '').toString() === selectedBenefitTypeNo
    );

    if (!selectedType) return false;

    const st = selectedType as any;
    const valuationType = (st.ValuationType || st.valuationType || st.valuationTypeName || st.ValuationTypeName || st.valuationtypeNo || st.valuationtype || '').toString().toLowerCase();

    const valuationTypeNo = st.ValuationTypeNo ?? st.valuationTypeNo ?? st.valuationtypeNo ?? st.valuationtype;

    return valuationType.includes('intangible') || valuationTypeNo === 2 || valuationTypeNo === '2';
  }, [isBenefitApplicable, selectedBenefitTypeNo, fillValues]);

  const checklist = form.watch('check_list') || [];

  const [isBenefitDisabled, setIsBenefitDisabled] = useState(false);

  const { fields: collabFields, append: appendCollab, remove: removeCollab, replace: replaceCollab } = useFieldArray({
    control: form.control,
    name: "collaborators"
  });

  const { fields: informFields, append: appendInform, remove: removeInform, replace: replaceInform } = useFieldArray({
    control: form.control,
    name: "informed_to"
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist, replace: replaceChecklist } = useFieldArray({
    control: form.control,
    name: "check_list"
  });

  const { fields: subtaskFields, append: appendSubtask, remove: removeSubtask, replace: replaceSubtask } = useFieldArray({
    control: form.control,
    name: "sub_tasks"
  });

  const [savingSubtaskIndex, setSavingSubtaskIndex] = useState<number | null>(null);

  const handleSaveInlineSubtask = async (index: number) => {
    const st = form.getValues().sub_tasks?.[index];
    if (!st) return;
    let hasError = false;

    if (!st.title) {
      form.setError(`sub_tasks.${index}.title`, { type: 'manual', message: 'Sub-task title is required' });
      hasError = true;
    } else {
      form.clearErrors(`sub_tasks.${index}.title`);
    }

    if (!st.ownerLoginNo || parseInt(st.ownerLoginNo) <= 0) {
      form.setError(`sub_tasks.${index}.ownerLoginNo`, { type: 'manual', message: 'Owner is required' });
      hasError = true;
    } else {
      form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
    }

    if (hasError) return;

    if (!initialData?.taskNo) {
      // Local Save logic for new tasks
      const newFakeTaskNo = st.operTaskNo || -Date.now();

      // Find user display name for the read-only view
      const assignedDisplayName = st.assignedDisplayName || '-';

      const savedTask = {
        taskNo: newFakeTaskNo,
        code: '',
        title: st.title,
        status: 'Draft',
        ownerLoginNo: st.ownerLoginNo,
        assignedDisplayName: assignedDisplayName,
        endDate: st.endDate || null,
        completionDate: st.completionDate || null,
        completionRemark: st.completionRemark || null,
      };

      setLocalSubtasks(prev => {
        const existingIndex = prev.findIndex(t => t.taskNo === newFakeTaskNo);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = savedTask;
          return updated;
        }
        return [...prev, savedTask];
      });

      removeSubtask(index);
      return;
    }
    try {
      setSavingSubtaskIndex(index);
      const payload = {
        operTaskNo: st.operTaskNo || null,
        parentTaskNo: initialData.taskNo,
        operTaskTypeNo: st.type_No ? parseInt(st.type_No) : null,
        title: st.title,
        ownerLoginNo: st.ownerLoginNo ? parseInt(st.ownerLoginNo) : 0,
        endDate: st.endDate || null,
        completionRemark: st.completionRemark || null,
        completionDate: st.completionDate || null
      };
      const response = await apiService.post<{ success: boolean; data: any; message?: string }>('/api/crm/tasks/subtasks/save', payload);

      if (response.success) {
        toast.success(response.message || 'Sub-task saved successfully');
        removeSubtask(index);
        fetchSubtasksSilent();
      } else {
        toast.error(response.message || 'Failed to save sub-task');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the sub-task');
    } finally {
      setSavingSubtaskIndex(null);
    }
  };

  const handleInlineEdit = (st: any) => {
    appendSubtask({
      id: Date.now().toString(),
      operTaskNo: st.taskNo,
      type_No: st.type_No?.toString() || st.operTaskTypeNo?.toString() || '',
      title: st.title || '',
      description: '',
      ownerLoginNo: st.ownerLoginNo?.toString() || st.assignedTo?.id?.toString() || st.assignedTo?.loginNo?.toString() || st.owner?.id?.toString() || '',
      endDate: st.endDate || '',
      completionDate: st.completionDate || '',
      completionRemark: st.completionRemark || ''
    });
  };

  const [subtaskToDelete, setSubtaskToDelete] = useState<number | null>(null);
  const [isDeletingSubtask, setIsDeletingSubtask] = useState(false);

  const handleDeleteSubtask = async () => {
    if (!subtaskToDelete) return;

    // For locally created subtasks (negative taskNo), just remove from local state
    if (subtaskToDelete < 0) {
      setLocalSubtasks(prev => prev.filter(t => t.taskNo !== subtaskToDelete));
      toast.success('sub-task removed successfully');
      setSubtaskToDelete(null);
      return;
    }

    try {
      setIsDeletingSubtask(true);
      const response = await apiService.delete<{ success: boolean; message?: string }>(`/api/crm/tasks/delete?operTaskNo=${subtaskToDelete}`, {});
      if (response.success) {
        toast.success(response.message || 'Sub-task deleted successfully');
        setSubtaskToDelete(null);
        fetchSubtasksSilent();
      } else {
        toast.error(response.message || 'Failed to delete sub-task');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while deleting the sub-task');
    } finally {
      setIsDeletingSubtask(false);
    }
  };

  const handleCategoryChange = async (categoryNo: string) => {
    if (!categoryNo) {
      setIsBenefitDisabled(false);
      return;
    }

    try {
      const compNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
      let response: any = null;
      try {
        response = await apiService.get<any>(`/api/master/task-categories/load-data/${categoryNo}?companyNo=${compNo}`);
      } catch (e) {
        console.error(e);
      }

      if (response?.success && response?.data) {
        const data = response.data;

        // 1. If isBusinessBenefitApplicable is true, set the value and disable for user
        if (data.isBusinessBenefitApplicable) {
          form.setValue('is_business_benefit_applicable', true, { shouldDirty: true, shouldValidate: true });
          setIsBenefitDisabled(true);
        } else {
          setIsBenefitDisabled(false);
        }

        // 2. Set the checkLists data in the checklist section
        if (data.checkLists && data.checkLists.length > 0) {
          const mappedCheckList = data.checkLists.map((item: any) => ({
            id: (item.checkListNo || Date.now() + Math.random()).toString(),
            description: item.checkListDescription || '',
            completed: item.isChecked || false
          }));
          replaceChecklist(mappedCheckList);
        } else {
          replaceChecklist([]);
        }

        // 3. Set the subtasks data in the subtask templates section (for new tasks)
        const rawSubTasks = data.subtasks || data.subTasks;
        if (rawSubTasks && rawSubTasks.length > 0) {
          if (!initialData) {
            // New task: load templates into editable mode
            const editableSubtasks = rawSubTasks.map((item: any, index: number) => ({
              id: Date.now().toString() + index,
              operTaskNo: null,
              title: item.title || item.subtaskTitle || item.description || item.taskName || item.subTaskName || '',
              type_No: item.operTaskTypeNo?.toString() || item.typeNo?.toString() || '',
              description: '',
              ownerLoginNo: '',
              endDate: '',
              completionDate: '',
              completionRemark: ''
            }));
            replaceSubtask(editableSubtasks);
            setLocalSubtasks(prev => prev.filter(t => t.taskNo > 0));
          } else {
            // Existing task: load templates into read-only view
            const mappedSubTasks = rawSubTasks.map((item: any, index: number) => ({
              taskNo: -(Date.now() + index),
              code: '',
              title: item.title || item.subtaskTitle || item.description || item.taskName || item.subTaskName || '',
              type_No: item.operTaskTypeNo?.toString() || item.typeNo?.toString() || '',
              status: 'Draft',
              ownerLoginNo: '',
              assignedDisplayName: '-',
              endDate: '',
              completionDate: '',
              completionRemark: ''
            }));
            setLocalSubtasks(prev => {
              const savedTasks = prev.filter(t => t.taskNo > 0);
              return [...savedTasks, ...mappedSubTasks];
            });
          }
        } else {
          setLocalSubtasks(prev => prev.filter(t => t.taskNo > 0));
          if (!initialData) {
            replaceSubtask([]);
          }
        }

        // 4. Set the customFields data in the custom fields section
        if (data.customFields && Array.isArray(data.customFields) && data.customFields.length > 0) {
          const mappedCustomFields = data.customFields.map((cf: any) => ({
            customFieldNo: (cf.customFieldNo ?? '').toString(),
            fieldValue: cf.fieldValue || '',
            displayColumn: cf.displayColumn || '',
            cascadedColumn: cf.cascadedColumn || ''
          }));
          form.setValue('custom_fields', mappedCustomFields, { shouldDirty: true, shouldValidate: true });
        } else {
          form.setValue('custom_fields', [], { shouldDirty: true, shouldValidate: true });
        }
      }
    } catch (error) {
      console.error('Failed to load category details:', error);
    }
  };

  const currentCompany = form.watch('company');

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const initialCompany = form.getValues('company') || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
        const response = await fetchFillValues(initialCompany.toString(), true);
        if (response) {
          setFillValues(response as TaskFillValues);
        }

        // Set default values if not editing
        if (!initialData) {
          form.setValue('status', 'Draft');
          if (authUser) {
            form.setValue('originator_user_No', authUser.LoginNo?.toString() || authUser.loginNo?.toString() || '101');
          }

          if (response) {
            const categoryParam = searchParams.get('category');
            if (categoryParam && (response as any).category) {
              const matchedCategory = (response as any).category.find((c: any) => c.Category?.toLowerCase() === categoryParam.toLowerCase());
              if (matchedCategory) {
                form.setValue('category_No', matchedCategory.OperTaskCategoryNo.toString());
                handleCategoryChange(matchedCategory.OperTaskCategoryNo.toString());
              }
            }

            const typeParam = searchParams.get('type');
            if (typeParam && (response as any).type) {
              const matchedType = (response as any).type.find((t: any) => t['Task Type']?.toLowerCase() === typeParam.toLowerCase());
              if (matchedType) {
                form.setValue('type_No', matchedType.OperTaskTypeNo.toString());
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch task options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCompanies, authUser, initialData, form, fetchFillValues, searchParams]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        code: initialData.code || '',
        description: initialData.description,
        isPrivate: initialData.isPrivate || false,
        priority_No: initialData.priority_No.toString(),
        type_No: initialData.type_No.toString(),
        folder_No: (initialData as any).folder_No?.toString() || (initialData as any).folderNo?.toString() || selectedFolder?.TaskFolderNo?.toString() || '',
        category_No: initialData.category_No.toString(),
        tags: initialData.tags,
        company: resolveCompanyValue(initialData.company, authCompanies),
        location_No: initialData.location_No.toString(),
        owner_user_No: initialData.owner_user_No.toString(),
        originator_user_No: initialData.originator_user_No.toString(),
        status: initialData.status,
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        completionDate: initialData.completionDate || '',
        completionRemark: initialData.completionRemark || '',
        roadBlock: initialData.roadBlock || '',
        isAllDay: (initialData as any).isAllday || (initialData as any).isAllDay || false,
        calendarColor: (initialData as any).colorCoding || (initialData as any).calendarColor || '',
        estimated_effort_value: initialData.estimated_effort_value?.toString() || '',
        estimated_effort_unit: resolveFrequencyValue(initialData.estimated_effort_unit),
        is_business_benefit_applicable: initialData.is_business_benefit_applicable || false,
        business_benefit_type_No: initialData.business_benefit_type_No?.toString() || '',
        business_benefit_description: initialData.business_benefit_description || '',
        estimated_benefit_amount: initialData.estimated_benefit_amount?.toString() || '',
        actual_benefit_amount: initialData.actual_benefit_amount?.toString() || '',
        benefit_period: initialData.benefit_period || 'One Time',
        collaborators: initialData.collaborators?.map(c => ({ userName: c.userName || '', displayName: c.displayName || '', email: c.email || '', loginNo: c.loginNo })) || [],
        informed_to: initialData.informed_to?.map(i => ({ userName: i.userName || '', displayName: i.displayName || '', email: i.email || '', loginNo: i.loginNo })) || [],
        actual_efforts: initialData.actual_efforts?.map(e => ({ date: e.date, hours: e.hours?.toString() || '', description: e.description, operTaskEffortLogDetailNo: e.operTaskEffortLogDetailNo, createdBy: e.createdBy })) || [],
        check_list: initialData.check_list || [],
        sub_tasks: [],
        custom_fields: (initialData as any).customFields?.map((cf: any) => ({
          customFieldNo: (cf.customFieldNo ?? '').toString(),
          fieldValue: cf.fieldValue || ''
        })) || [],
        executionNotes: initialData.executionNotes || initialData.execution_notes || '',
        attachments: (initialData.attachments || initialData.attachments || []).map((a: any) => ({
          id: a.id || a.docNo || a.operTaskAttachmentDetailNo || null,
          name: a.docName || a.name || a.fileName || a.storedFileName || 'attachment',
          size: a.docSize || a.size || null,
          storedFileName: a.storedFileName || '',
          storedFilePath: a.storedFilePath || '',
          relativePath: a.relativePath || a.storedFilePath || ''
        })),
      });
      if (initialData.collaboratorUserGroupNo) {
        setSelectedCollabTeam(initialData.collaboratorUserGroupNo.toString());
      }
      if (initialData.infromToUserGroupNo) {
        setSelectedInformTeam(initialData.infromToUserGroupNo.toString());
      }

      // Fetch category metadata to enrich custom fields with displayColumn and cascadedColumn
      const fetchCategoryMetadata = async () => {
        const categoryNo = initialData.category_No?.toString();
        if (!categoryNo) return;
        const compNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
        try {
          const response = await apiService.get<any>(`/api/master/task-categories/load-data/${categoryNo}?companyNo=${compNo}`);
          if (response?.success && response?.data?.customFields) {
            const metaFields = response.data.customFields;
            const currentFields = form.getValues('custom_fields') || [];
            if (currentFields.length > 0) {
              const enrichedFields = currentFields.map((cf: any) => {
                const meta = metaFields.find((m: any) => (m.customFieldNo || '').toString() === cf.customFieldNo);
                return {
                  ...cf,
                  displayColumn: meta?.displayColumn || '',
                  cascadedColumn: meta?.cascadedColumn || ''
                };
              });
              form.setValue('custom_fields', enrichedFields, { shouldDirty: false, shouldValidate: true });
            }
          }
        } catch (e) {
          console.error("Failed to fetch category metadata for custom fields", e);
        }
      };

      fetchCategoryMetadata();
    }
  }, [initialData, form, authCompanies]);

  // Dynamically default the folder field to the navbar's selected workspace folder on task creation
  useEffect(() => {
    if (!initialData && selectedFolder && !form.getValues('folder_No')) {
      form.setValue('folder_No', selectedFolder.TaskFolderNo.toString());
    }
  }, [selectedFolder, initialData, form]);

  const handleTeamSelection = async (groupNo: string, type: 'collaborator' | 'inform') => {
    const group = fillValues?.userGroup.find(g => g.UserGroupNo.toString() === groupNo);
    if (!group) return;

    try {
      const response = await apiService.get<{ success: boolean; data: { users: any[] } }>(`/api/security/user-groups/load-data/${groupNo}`);
      if (response.success && response.data && response.data.users) {
        const members = response.data.users;

        if (type === 'collaborator') {
          setSelectedCollabTeam(groupNo);
          members.forEach(member => {
            if (!(form.getValues('collaborators') || []).some(c => c.email === member.email)) {
              appendCollab({
                userName: member.loginId,
                displayName: member.printingName,
                email: member.email || `${member.loginId}@glacier.com`,
                loginNo: member.loginNo,
                isFromTeam: true
              });
            }
          });
        } else {
          setSelectedInformTeam(groupNo);
          members.forEach(member => {
            if (!(form.getValues('informed_to') || []).some(i => i.email === member.email)) {
              appendInform({
                userName: member.loginId,
                displayName: member.printingName,
                email: member.email || `${member.loginId}@glacier.com`,
                loginNo: member.loginNo,
                isFromTeam: true
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load user group members:', error);
    }
  };



  const onValidationError = (errors: any) => {
    console.error('Form Validation Errors:', errors);

    // Order of fields matching their visual top-to-bottom layout
    const fieldOrder = [
      'title',
      'description',
      'category_No',
      'type_No',
      'priority_No',
      'company',
      'location_No',
      'owner_user_No',
      'collaborators',
      'informed_to',
      'start_date',
      'end_date',
      'estimated_effort_value',
      'business_benefit_type_No',
      'benefit_period',
      'estimated_benefit_amount',
      'actual_benefit_amount',
      'business_benefit_description'
    ];

    const firstErrorField = fieldOrder.find(field => errors[field]);
    if (firstErrorField) {
      console.log('Focusing first error field:', firstErrorField);
      const element = document.getElementById(`form-group-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Try focusing actual input or custom triggers
        setTimeout(() => {
          const focusable = element.querySelector('button, input:not([type="hidden"]), select, textarea') as HTMLElement;
          if (focusable) {
            focusable.focus();
          }
        }, 150); // slight delay to allow scroll to complete
      }
    }
  };

  const startUpload = async (tempId: string, file: File) => {
    const companyNo = authCompanies?.[0]?.HeadOfficeNo || authCompanies?.[0]?.headOfficeNo || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

    try {
      // 1. Create entry in DB
      setUploadingFiles(prev =>
        prev.map(f => f.tempId === tempId ? { ...f, status: 'uploading' } : f)
      );
      const dbEntry = await attachmentService.createEntry(file.name, companyNo, 1547);  // 1547: Task form no (replace with dynamic formNo)

      // 2. Upload file payload
      setUploadingFiles(prev =>
        prev.map(f => f.tempId === tempId ? { ...f, status: 'verifying' } : f)
      );
      await attachmentService.uploadFile(dbEntry.id, file);

      // 3. Verify status
      const isVerified = await attachmentService.checkStatus(dbEntry.id);
      if (!isVerified) {
        throw new Error("Upload status could not be verified by the backend.");
      }

      // Successful upload! Add to form attachments list
      const currentAttachments = form.getValues('attachments') || [];
      const de = dbEntry as any;
      form.setValue('attachments', [...currentAttachments, {
        id: de.id,
        name: de.docName || de.name || file.name,
        size: de.docSize || de.size || file.size,
        storedFileName: de.storedFileName,
        storedFilePath: de.storedFilePath,
        relativePath: de.relativePath
      }]);

      // Remove from active uploading status
      setUploadingFiles(prev => prev.filter(f => f.tempId !== tempId));
      toast.success(`"${file.name}" uploaded successfully!`);
    } catch (error: any) {
      console.error(`Upload failed for file: ${file.name}`, error);
      const errorMsg = error?.message || "File upload failed. Please try again.";
      setUploadingFiles(prev =>
        prev.map(f => f.tempId === tempId ? { ...f, status: 'failed', errorMessage: errorMsg } : f)
      );
      toast.error(`"${file.name}" failed: ${errorMsg}`);
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const failed: Array<{ name: string; size: number; reason: string }> = [];

    files.forEach(file => {
      // Validation: Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        failed.push({
          name: file.name,
          size: file.size,
          reason: "File size exceeds the 10MB limit."
        });
        return;
      }

      // Validation: PDF/Images only
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isImage && !isPdf) {
        failed.push({
          name: file.name,
          size: file.size,
          reason: "Unsupported file type. Only PDF and Image files are allowed."
        });
        return;
      }

      validFiles.push(file);
    });

    if (failed.length > 0) {
      setInvalidFiles(failed);
      setShowWarningDialog(true);
    }

    // Process valid files
    validFiles.forEach(file => {
      const tempId = Math.random().toString(36).substring(2, 9);

      // Add to queue
      setUploadingFiles(prev => [...prev, {
        tempId,
        name: file.name,
        status: 'pending',
        fileObject: file
      }]);

      // Start upload sequence
      startUpload(tempId, file);
    });
  };

  const handleCameraAttachmentUploaded = (attachment: any) => {
    const currentAttachments = form.getValues('attachments') || [];
    form.setValue('attachments', [...currentAttachments, {
      id: attachment.docNo || attachment.id,
      name: attachment.docName || attachment.name || attachment.fileName,
      size: attachment.docSize || attachment.size
    }], { shouldDirty: true });
    setIsCameraModalOpen(false);
    toast.success("Camera attachment uploaded successfully");
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    processFiles(Array.from(files));

    // Reset input
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const handleRetryUpload = (tempId: string) => {
    const queueItem = uploadingFiles.find(f => f.tempId === tempId);
    if (!queueItem) return;

    setUploadingFiles(prev =>
      prev.map(f => f.tempId === tempId ? { ...f, status: 'pending', errorMessage: undefined } : f)
    );
    startUpload(tempId, queueItem.fileObject);
  };

  const handleRemoveUploading = (tempId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.tempId !== tempId));
  };

  const handleRemoveAttachment = (id: number, name: string) => {
    setAttachmentToDelete({ id, name });
  };

  const confirmRemoveAttachment = async () => {
    if (!attachmentToDelete) return;
    const { id } = attachmentToDelete;
    setIsDeletingAttachment(true);
    try {
      if (id) {
        await attachmentService.deleteAttachment(id);
      }
      const currentAttachments = form.getValues('attachments') || [];
      form.setValue('attachments', currentAttachments.filter((a: any) => a.id !== id), { shouldDirty: true });
      toast.success("Attachment removed successfully.");
      setAttachmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete attachment from server:', error);
      // apiService already raises detailed toast warnings on failure
    } finally {
      setIsDeletingAttachment(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (uploadingFiles.some(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'verifying')) {
      toast.error("Please wait for all attachments to finish uploading before saving the task.");
      return;
    }
    console.log('onSubmit triggered with data:', data);
    setFormDataToSave(data);
    setShowConfirm(true);
  };

  const proceedSubmit = async (data: any) => {
    console.log('proceedSubmit triggered with data:', data);
    setShowConfirm(false); // Close confirmation immediately

    // (effort frequency mapping handled by form value directly)

    // Mapping for benefit frequency (period)
    const benefitFrequencyMap: Record<string, number> = {
      'One Time': 1,
      'Monthly': 2,
      'Annually': 3
    };

    // Find status number from fillValues
    const statusObj = fillValues?.status.find(s => s.Status === data.status);
    const statusNo = statusObj?.StatusNo || null;

    // Combine collaborators and informTo into members
    const members = [
      ...data.collaborators.map((c: any) => ({
        loginNo: c.loginNo || null,
        isCollaborator: true
      })),
      ...data.informed_to.map((i: any) => ({
        loginNo: i.loginNo || null,
        isCollaborator: false
      }))
    ];

    const payload = {
      operTaskNo: initialData ? initialData.taskNo : null,
      companyNo: parseInt(data.company) || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1,
      OperTaskCompanyNo: parseInt(data.company) || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1,
      title: data.title || null,
      code: data.code || null,
      description: data.description || null,
      executionNotes: data.executionNotes || null,
      isPrivate: data.isPrivate,
      operTaskPriorityNo: parseInt(data.priority_No) || null,
      operTaskCategoryNo: parseInt(data.category_No) || null,
      operTaskTypeNo: parseInt(data.type_No) || null,
      categoryNo: parseInt(data.category_No) || null,
      tags: data.tags && data.tags.length > 0 ? data.tags.join(',') : null,
      collaboratorUserGroupNo: parseInt(selectedCollabTeam) || null,
      infromToUserGroupNo: parseInt(selectedInformTeam) || null,
      originatorLoginNo: parseInt(data.originator_user_No) || null,
      ownerLoginNo: parseInt(data.owner_user_No) || null,
      parentTaskNo: parentTaskNo || null,
      operTaskLocationNo: parseInt(data.location_No) || null,
      startDate: data.start_date ? new Date(data.start_date).toISOString() : null,
      endDate: data.end_date ? new Date(data.end_date).toISOString() : null,
      completionDate: data.completionDate ? new Date(data.completionDate).toISOString() : null,
      completionRemark: data.completionRemark || null,
      roadBlock: data.roadBlock || null,
      estimatedEfforts: parseFloat(data.estimated_effort_value) || null,
      estimatedEffortsFequencyNo: data.estimated_effort_unit ? parseInt(data.estimated_effort_unit) : null,
      isBusinessBenefitApplicable: data.is_business_benefit_applicable,
      businessBenefitTypeNo: data.is_business_benefit_applicable ? (parseInt(data.business_benefit_type_No) || null) : null,
      businessBenefitDescription: data.is_business_benefit_applicable ? (data.business_benefit_description || null) : null,
      estimatedBenefitAmount: data.is_business_benefit_applicable ? (parseFloat(data.estimated_benefit_amount) || null) : null,
      actualBenefitAmount: data.is_business_benefit_applicable ? (parseFloat(data.actual_benefit_amount) || null) : null,
      benefitFrequencyNo: data.is_business_benefit_applicable ? (benefitFrequencyMap[data.benefit_period] || null) : null,
      statusNo: statusNo || null,
      folderNo: parseInt(data.folder_No) || selectedFolder?.TaskFolderNo || null,
      isAllday: data.isAllDay,
      colorCoding: data.calendarColor || null,
      createdBy: authUser?.loginNo || authUser?.LoginNo || 1,
      createdDate: new Date().toISOString(),
      checkLists: data.check_list.map((item: any, index: number) => ({
        description: item.description || null,
        sequenceNo: index + 1,
        isChecked: item.completed || false,
        checkedOn: new Date().toISOString()
      })),
      subTasks: [
        ...(!initialData ? localSubtasks.map((st: any) => ({
          operTaskNo: null,
          operTaskTypeNo: st.type_No ? parseInt(st.type_No) : (st.operTaskTypeNo ? parseInt(st.operTaskTypeNo) : null),
          title: st.title || null,
          description: st.description || null,
          ownerLoginNo: st.ownerLoginNo ? parseInt(st.ownerLoginNo) : null,
          endDate: st.endDate ? new Date(st.endDate).toISOString() : null,
          completionRemark: st.completionRemark || null,
          completionDate: st.completionDate ? new Date(st.completionDate).toISOString() : null,
          statusNo: 1
        })) : []),
        ...(data.sub_tasks || []).map((st: any) => ({
          operTaskNo: st.operTaskNo || null,
          operTaskTypeNo: st.type_No ? parseInt(st.type_No) : null,
          title: st.title || null,
          description: st.description || null,
          ownerLoginNo: st.ownerLoginNo ? parseInt(st.ownerLoginNo) : null,
          endDate: st.endDate ? new Date(st.endDate).toISOString() : null,
          completionRemark: st.completionRemark || null,
          completionDate: st.completionDate ? new Date(st.completionDate).toISOString() : null,
          statusNo: 1
        }))
      ],
      customFields: data.custom_fields.map((cf: any) => ({
        customFieldNo: parseInt(cf.customFieldNo) || null,
        fieldValue: cf.fieldValue || ''
      })),
      comments: [],
      effortLogs: data.actual_efforts.map((effort: any) => ({
        LoginNo: effort.createdBy?.loginNo || 0,
        effortDate: effort.date ? new Date(effort.date).toISOString() : null,
        efforts: parseFloat(effort.hours) || null,
        description: effort.description || null
      })),
      members: members,
      attachment: (data.attachments || []).map((a: any) => ({
        docNo: a.id
      }))
    };

    console.log('Final Submission Payload:', payload);

    if (onSaveStateChange) onSaveStateChange(true);
    try {
      if (initialData) {
        await apiService.post(`/api/crm/tasks/save`, payload);
        updateTask(initialData.taskNo, {
          ...data,
          parent_task_No: parentTaskNo || undefined
        });
      } else {
        const response: any = await apiService.post(`/api/crm/tasks/save`, payload);
        addTask({
          ...data,
          parent_task_No: parentTaskNo || undefined,
          taskNo: response?.data?.operTaskNo || Math.floor(Math.random() * 1000) + 100
        });
      }
      clearDraft();
      form.reset(data); // Reset form state to clear isDirty flag
      setShowSuccessAlert(true);
    } catch (error: any) {
      console.error('Failed to save task:', error);

      if (error && error.data && typeof error.data === 'object') {
        const backendData = error.data;
        if (backendData.errors && Array.isArray(backendData.errors)) {
          backendData.errors.forEach((err: any) => {
            const prop = err.propertyName;
            const message = err.errorMessage;

            // Map backend properties to react-hook-form keys
            let formKey: any = null;
            if (prop === 'Title' || prop === 'title') formKey = 'title';
            else if (prop === 'Description' || prop === 'description') formKey = 'description';
            else if (prop === 'OperTaskPriorityNo' || prop === 'operTaskPriorityNo') formKey = 'priority_No';
            else if (prop === 'OperTaskCategoryNo' || prop === 'operTaskCategoryNo') formKey = 'category_No';
            else if (prop === 'OperTaskTypeNo' || prop === 'operTaskTypeNo') formKey = 'type_No';
            else if (prop === 'FolderNo' || prop === 'folderNo') formKey = 'folder_No';
            else if (prop === 'StartDate' || prop === 'startDate') formKey = 'start_date';
            else if (prop === 'EndDate' || prop === 'endDate') formKey = 'end_date';
            else if (prop === 'OwnerLoginNo' || prop === 'ownerLoginNo') formKey = 'owner_user_No';
            else if (prop === 'OriginatorLoginNo' || prop === 'originatorLoginNo') formKey = 'originator_user_No';
            else if (prop === 'BusinessBenefitTypeNo' || prop === 'businessBenefitTypeNo') formKey = 'business_benefit_type_No';
            else if (prop === 'EstimatedBenefitAmount' || prop === 'estimatedBenefitAmount') formKey = 'estimated_benefit_amount';
            else if (prop === 'ActualBenefitAmount' || prop === 'actualBenefitAmount') formKey = 'actual_benefit_amount';
            else if (prop === 'BenefitFrequencyNo' || prop === 'benefitFrequencyNo') formKey = 'benefit_period';
            else if (prop === 'BusinessBenefitDescription' || prop === 'businessBenefitDescription') formKey = 'business_benefit_description';
            else if (prop === 'EstimatedEfforts' || prop === 'estimatedEfforts') formKey = 'estimated_effort_value';
            else if (prop === 'EstimatedEffortsFrequencyNo' || prop === 'estimatedEffortsFrequencyNo' || prop === 'EstimatedEffortsFequencyNo' || prop === 'estimatedEffortsFequencyNo') formKey = 'estimated_effort_unit';

            if (formKey) {
              form.setError(formKey, {
                type: 'manual',
                message: message
              });
            }
          });
        }
      }
    } finally {
      if (onSaveStateChange) onSaveStateChange(false);
    }
  };

  const isPrivateTask = form.watch('isPrivate');
  const taskOriginator = form.watch('originator_user_No');

  useEffect(() => {
    if (isPrivateTask) {
      if (taskOriginator) {
        form.setValue('owner_user_No', taskOriginator);
      }
      replaceCollab([]);
      replaceInform([]);
    }
  }, [isPrivateTask, taskOriginator, form, replaceCollab, replaceInform]);

  const selectedPriorityNo = form.watch('priority_No');
  const selectedStartDate = form.watch('start_date');

  useEffect(() => {
    if (!fillValues?.priority || !selectedPriorityNo) return;

    const priorityObj = fillValues.priority.find(p => p.OperTaskPriorityNo.toString() === selectedPriorityNo);
    if (priorityObj && priorityObj.PriorityDuration && priorityObj.PriorityDurationFrequencyNo) {
      const baseDate = selectedStartDate ? new Date(selectedStartDate) : new Date();
      const newEndDate = new Date(baseDate);

      const duration = priorityObj.PriorityDuration;
      const freqNo = priorityObj.PriorityDurationFrequencyNo;
      const frequencyObj = fillValues.frequency?.find(f => f.FrequencyNo === freqNo);
      const freqName = (frequencyObj?.FrequencyName || frequencyObj?.Frequency || '').toLowerCase();

      if (freqName === 'hours' || freqName === 'hour') {
        newEndDate.setHours(newEndDate.getHours() + duration);
      } else if (freqName === 'days' || freqName === 'day') {
        newEndDate.setDate(newEndDate.getDate() + duration);
      } else if (freqName === 'weeks' || freqName === 'week') {
        newEndDate.setDate(newEndDate.getDate() + (duration * 7));
      } else if (freqName === 'months' || freqName === 'month') {
        newEndDate.setMonth(newEndDate.getMonth() + duration);
      } else if (freqName === 'years' || freqName === 'year') {
        newEndDate.setFullYear(newEndDate.getFullYear() + duration);
      } else {
        // Fallback to old hardcoded map just in case frequency list wasn't populated
        if (freqNo === 1) newEndDate.setHours(newEndDate.getHours() + duration);
        else if (freqNo === 2) newEndDate.setDate(newEndDate.getDate() + duration);
      }

      form.setValue('end_date', newEndDate.toISOString());
    }
  }, [selectedPriorityNo, selectedStartDate, fillValues, form]);

  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  if (isLoadingOptions) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 text-[#006699] animate-spin" />
        <p className="text-slate-500 font-medium text-sm animate-pulse">Synchronizing Application Data...</p>
      </div>
    );
  }

  // Status flow logic
  const allowedNextStatuses = initialData && currentStatus
    ? statusTransitions[currentStatus] || []
    : [];

  const filteredStatuses = fillValues?.status.filter(s => {
    return s.Status === currentStatus || allowedNextStatuses.includes(s.Status);
  }) || [];

  // Company options from fillValues taskCompany, fallback to auth data
  const companyOptions = (fillValues?.taskCompany && fillValues.taskCompany.length > 0)
    ? fillValues.taskCompany.map(c => ({
      label: c.AliasName || c.CompanyName || c.Code || 'Unknown Company',
      value: (c.OperTaskCompanyNo || '').toString()
    }))
    : authCompanies?.map(c => ({
      label: c.CompanyName || c.companyName || c.name || 'Unknown Company',
      value: (c.companyNo || c.CompanyNo || '').toString()
    })) || [];

  const collabError = form.formState.errors.collaborators;
  const hasCollabError = collabError && !Array.isArray(collabError) && (collabError as any).message;

  const informError = form.formState.errors.informed_to;
  const hasInformError = informError && !Array.isArray(informError) && (informError as any).message;

  return (
    <Card className="border-none shadow-none bg-transparent relative">
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-slate-900/10 backdrop-blur-md border-2 border-dashed border-[#006699] rounded-3xl flex flex-col items-center justify-center pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="bg-white/95 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-slate-100">
            <div className="h-16 w-16 bg-sky-50 rounded-2xl flex items-center justify-center text-[#006699] border border-sky-100 shadow-sm animate-bounce">
              <UploadCloud size={32} />
            </div>
            <h3 className="mt-4 text-base font-medium text-slate-800">Drop to Upload</h3>
            <p className="mt-2 text-xs font-medium text-slate-500">Release files anywhere to attach to this task.</p>
            <div className="mt-4 flex items-center gap-4 text-[10px] font-medium text-slate-400">
              <span>PDF & Images Only</span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
              <span>Max 10MB</span>
            </div>
          </div>
        </div>
      )}
      <form
        id="task-form"
        onSubmit={form.handleSubmit(onSubmit, onValidationError)}
        className="space-y-4 divide-y divide-slate-400"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        {/* 1. Basic Information */}
        <FormSection
          title="Task Detail"
          icon={Info}
          headerAction={
            <div className="flex flex-wrap items-center gap-0.5">
              <Controller
                name="isPrivate"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2 mr-2">
                    <Checkbox id="isPrivate" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="isPrivate" className="text-xs font-medium text-slate-700 cursor-pointer">Private Task</label>
                  </div>
                )}
              />
              <div className="flex items-center gap-0.5 sm:gap-3 bg-slate-50/80 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
                <Label className="text-[10px] font-medium text-slate-700">Status <span className="text-red-500 font-medium">*</span></Label>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="rounded-xl h-8 border-transparent bg-transparent text-slate-900 shadow-none hover:bg-slate-100 w-[120px] sm:w-[160px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {filteredStatuses.map(s => (
                          <SelectItem key={s.StatusNo} value={s.Status}>{s.Status}</SelectItem>
                        ))}
                        {filteredStatuses.length === 0 && (
                          <SelectItem value={currentStatus} disabled>{currentStatus}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && <p className="text-[10px] text-red-500 font-medium ml-1 absolute -bottom-4">{form.formState.errors.status.message}</p>}
              </div>
            </div>
          }
        >
          <div className="space-y-0">
            {initialData?.parentTask && (
              <div className="mb-5 flex items-center gap-1.5 border border-blue-100 bg-blue-50/50 px-3 py-1.5 rounded-lg w-fit">
                <ExternalLink size={12} className="text-blue-600" />
                <span className="text-[11px] text-slate-600 font-medium">Parent Task:</span>
                <Link to={`/task/${initialData.parentTask.operTaskNo}`} className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:underline transition-colors">
                  {initialData.parentTask.title}
                </Link>
              </div>
            )}
            {/* Row 1: Task ID & Task Title */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-8 gap-y-4">
              <div className="flex items-center gap-1.5 h-full pt-4" id="form-group-code">
                <Label className="text-slate-700 font-medium text-[11px] ml-1">Task Code:</Label>
                <div className="text-xs font-medium text-slate-500 select-none bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  {form.watch('code') || 'AUTO-GEN-CODE'}
                </div>
              </div>
              <div className="space-y-0 lg:col-span-3" id="form-group-title">
                <Label className="text-slate-700 font-medium text-[11px] ml-1">
                  Task Title <span className="text-red-500 font-medium">*</span>
                </Label>
                <Input placeholder="Enter task title" {...form.register('title')} className={cn("rounded-xl h-9 text-slate-900 shadow-sm transition-all", form.formState.errors.title ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")} maxLength={200} />
                {form.formState.errors.title && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.title.message}</p>}
              </div>
            </div>

            {/* Row 2: Task Description */}
            <div className="space-y-0" id="form-group-description">
              <Label className="text-slate-700 font-medium text-[11px] ml-1">Task Description</Label>
              <Textarea placeholder="Enter description" className={cn("min-h-[60px] rounded-xl p-3 leading-relaxed text-slate-900 shadow-sm transition-all", form.formState.errors.description ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")} {...form.register('description')} maxLength={1000} />
              {form.formState.errors.description && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.description.message}</p>}
            </div>

            {/* Row 4: Tags */}
            <div className="space-y-0">
              <Label className="text-slate-700 font-medium text-[11px] ml-1">Tags</Label>
              <Controller
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <TagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    placeholder="Add tags..."
                    className="min-h-[36px] py-1 border-slate-300 shadow-sm input-section"
                  />
                )}
              />
              <p className="text-[10px] text-slate-500 font-medium ml-1 mt-1">Note: Press Enter or type a comma to add a tag.</p>
            </div>
          </div>
        </FormSection>

        {!hiddenSections.includes('categories') && (
          <FormSection
            title="Category Detail"
            icon={Info}
          >
            {/* Row 3: Category, Type, Priority */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4">
              <div className="space-y-0" id="form-group-category_No">
                <Label className="text-slate-700 font-medium text-[11px] ml-1">Category <span className="text-red-500 font-medium">*</span></Label>
                <Controller
                  name="category_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox disabled={isSubTask} options={fillValues?.category.filter(c => c.Category.toLowerCase() !== 'all' && c.Category.toLowerCase() !== '[all]')
                      .map(c => ({ label: c.Category, value: c.OperTaskCategoryNo.toString() })) || []}
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        handleCategoryChange(val);
                      }}
                      placeholder="Select category"
                      className={form.formState.errors.category_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      isClearable={false}
                      onAddNew={formRights[1561]?.isSave ? () => {
                        setActiveMasterType('category');
                        setIsMasterCreateOpen(true);
                      } : undefined}
                      addNewLabel="Add New Category"
                    />
                  )}
                />
                {form.formState.errors.category_No && <p className="text-[10px] text-red-500 font-medium ml-1">Category is required</p>}
              </div>
              <div className="space-y-0" id="form-group-type_No">
                <Label className="text-slate-700 font-medium text-[11px] ml-1">Type <span className="text-red-500 font-medium">*</span></Label>
                <Controller
                  name="type_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox disabled={isSubTask} options={fillValues?.type.filter(t => t["Task Type"].toLowerCase() !== 'all' && t["Task Type"].toLowerCase() !== '[all]')
                      .map(t => ({ label: t["Task Type"], value: t.OperTaskTypeNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select type"
                      className={form.formState.errors.type_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      onAddNew={formRights[1560]?.isSave ? () => {
                        setActiveMasterType('type');
                        setIsMasterCreateOpen(true);
                      } : undefined}
                      addNewLabel="Add New Type"
                    />
                  )}
                />
                {form.formState.errors.type_No && <p className="text-[10px] text-red-500 font-medium ml-1">Type is required</p>}
              </div>
              <div className="space-y-0" id="form-group-folder_No">
                <Label className="text-slate-700 font-medium text-[11px] ml-1">Folder <span className="text-red-500 font-medium">*</span></Label>
                <Controller
                  name="folder_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox disabled={isSubTask} options={fillValues?.folder.map(f => ({ label: f["Folder Name"], value: f.TaskFolderNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select folder"
                      className={form.formState.errors.folder_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      isClearable={false}
                      onAddNew={formRights[1542]?.isSave ? () => {
                        setActiveMasterType('folder');
                        setIsMasterCreateOpen(true);
                      } : undefined}
                      addNewLabel="Add New Folder"
                    />
                  )}
                />
                {form.formState.errors.folder_No && <p className="text-[10px] text-red-500 font-medium ml-1">Folder is required</p>}
              </div>
              <div className="space-y-0" id="form-group-priority_No">
                <Label className="text-slate-700 font-medium text-[11px] ml-1">Priority <span className="text-red-500 font-medium">*</span></Label>
                <Controller
                  name="priority_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox disabled={isSubTask} options={fillValues?.priority.filter(p => p.Priority.toLowerCase() !== 'all' && p.Priority.toLowerCase() !== '[all]')
                      .map(p => ({ label: p.Priority, value: p.OperTaskPriorityNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select priority"
                      className={form.formState.errors.priority_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      onAddNew={formRights[1543]?.isSave ? () => {
                        setActiveMasterType('priority');
                        setIsMasterCreateOpen(true);
                      } : undefined}
                      addNewLabel="Add New Priority"
                    />
                  )}
                />
                {form.formState.errors.priority_No && <p className="text-[10px] text-red-500 font-medium ml-1">Priority is required</p>}
              </div>
            </div>

          </FormSection>
        )}

        {/* 2. Ownership & Responsibility */}
        {!hiddenSections.includes('ownership') && (
          <FormSection title="Ownership" icon={Users}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-0" id="form-group-company">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Company <span className="text-red-500 font-medium">*</span></Label>
                  <Controller
                    name="company"
                    control={form.control}
                    render={({ field }) => (
                      <Combobox disabled={isSubTask} options={companyOptions} value={field.value} onChange={field.onChange} placeholder="Select company" className={form.formState.errors.company ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""} onAddNew={formRights[1565]?.isSave ? () => {
                        setActiveMasterType('task-company');
                        setIsMasterCreateOpen(true);
                      } : undefined}
                        addNewLabel="Add New Company"
                      />
                    )}
                  />
                  {form.formState.errors.company && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.company.message}</p>}
                </div>
                <div className="space-y-0" id="form-group-location_No">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Business location <span className="text-red-500 font-medium">*</span></Label>
                  <Controller
                    name="location_No"
                    control={form.control}
                    render={({ field }) => (
                      <Combobox disabled={isSubTask} options={fillValues?.location.filter(l => l.Location.toLowerCase() !== 'all' && l.Location.toLowerCase() !== '[all]')
                        .map(l => ({ label: l.Location, value: l.OperLocationNo.toString() })) || []}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select location"
                        className={form.formState.errors.location_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                        onAddNew={formRights[1541]?.isSave ? () => {
                          setActiveMasterType('location');
                          setIsMasterCreateOpen(true);
                        } : undefined}
                        addNewLabel="Add New Location"
                      />
                    )}
                  />
                  {form.formState.errors.location_No && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.location_No.message}</p>}
                </div>
                <div className="space-y-0" id="form-group-owner_user_No">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">
                    Task Owner <span className="text-red-500 font-medium">*</span>
                  </Label>
                  <Controller
                    name="owner_user_No"
                    control={form.control}
                    render={({ field }) => (
                      <UserCombobox value={field.value} onChange={(user) => field.onChange(user.loginNo.toString())}
                        placeholder="Select member"
                        initialLabel={initialData?.assignedDisplayName || undefined}
                        className={form.formState.errors.owner_user_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                        disabled={isPrivateTask}
                      />
                    )}
                  />
                  {form.formState.errors.owner_user_No && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.owner_user_No.message}</p>}
                </div>
                <div className="space-y-0" id="form-group-originator_user_No">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Task Originator <span className="text-red-500 font-medium">*</span></Label>
                  <Controller
                    name="originator_user_No"
                    control={form.control}
                    render={({ field }) => (
                      <UserCombobox value={field.value} onChange={(user) => field.onChange(user.loginNo.toString())}
                        placeholder="Select member"
                        initialLabel={initialData ? (initialData.originatorDisplayName || undefined) : (authUser?.PrintingName || authUser?.name || undefined)}
                        className={form.formState.errors.originator_user_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                        isClearable={false}
                      />
                    )}
                  />
                  {form.formState.errors.originator_user_No && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.originator_user_No.message}</p>}
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {/* 2. Inform To */}
        {!hiddenSections.includes('informto') && (
          <FormSection>
            <div className="space-y-3">
              {!isPrivateTask && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Collaborators Grid */}
                  <div className="space-y-0" id="form-group-collaborators">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-[11px] font-medium text-slate-700">Collaborators</h4>
                        <div className="flex items-center gap-0.5 mb-2">
                          <Label className="text-slate-700 font-medium text-[11px] font-medium">Team:</Label>
                          <div className="relative flex items-center">
                            <Select value={selectedCollabTeam} onValueChange={(val) => handleTeamSelection(val, 'collaborator')}>
                              <SelectTrigger className={cn("rounded-lg h-6 border-slate-300 text-[9px] w-[140px] bg-slate-50 shadow-none px-2", selectedCollabTeam && "[&>span]:pr-5")}>
                                <SelectValue placeholder="Select team" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {fillValues?.userGroup.map(group => (
                                  <SelectItem key={group.UserGroupNo} value={group.UserGroupNo.toString()} className="text-[10px]">{group.UserGroupName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedCollabTeam && (
                              <div
                                className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 cursor-pointer z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCollabTeam('');
                                  const current = form.getValues('collaborators') || [];
                                  replaceCollab(current.filter(c => !c.isFromTeam));
                                }}
                              >
                                <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button type="button" onClick={() => appendCollab({ userName: '', displayName: '', email: '' })} variant="ghost" size="sm" className="h-7 text-[9px] font-medium text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
                        <UserPlus size={12} /> Add
                      </Button>
                    </div>
                    <div className={cn("bg-slate-50/50 rounded-xl border overflow-hidden shadow-sm transition-all border-slate-200", hasCollabError && "border-red-500 ring-2 ring-red-500/10")}>
                      <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-slate-100/95 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                              <th className="px-3 py-1.5 font-medium text-slate-700">User Name</th>
                              <th className="px-3 py-1.5 font-medium text-slate-700">Display Name</th>
                              <th className="px-3 py-1.5 font-medium text-slate-700">Email</th>
                              <th className="px-2 py-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {collabFields.map((field, index) => (
                              <tr key={field.id} className="group hover:bg-white transition-colors">
                                <td className="px-2 py-1">
                                  <Controller
                                    name={`collaborators.${index}.userName`}
                                    control={form.control}
                                    render={({ field: nameField }) => (
                                      <UserCombobox value={nameField.value} onChange={(user) => {
                                        nameField.onChange(user.loginId);
                                        form.setValue(`collaborators.${index}.displayName`, user.printingName);
                                        form.setValue(`collaborators.${index}.email`, user.email || '');
                                        form.setValue(`collaborators.${index}.loginNo`, user.loginNo);
                                      }}
                                        placeholder="Select username"
                                        className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-sm font-medium text-slate-900 bg-transparent shadow-none px-2"
                                        initialLabel={nameField.value}
                                        disabled={field.isFromTeam}
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Input disabled {...form.register(`collaborators.${index}.displayName`)} placeholder="Display Name" className="h-7 rounded-lg border-transparent md: bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                                </td>
                                <td className="px-2 py-1">
                                  <Input disabled {...form.register(`collaborators.${index}.email`)} placeholder="Email" className="h-7 rounded-lg border-transparent md: bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                                </td>
                                <td className="px-1 py-1 text-center">
                                  {!field.isFromTeam && (
                                    <button type="button" onClick={() => removeCollab(index)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {collabFields.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic font-medium">No collaborators.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {hasCollabError && <p className="text-[10px] text-red-500 font-medium ml-1">{collabError.message}</p>}
                  </div>

                  {/* Inform To Grid */}
                  <div className="space-y-0" id="form-group-informed_to">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-[11px] font-medium text-slate-700">Inform To</h4>
                        <div className="flex items-center gap-0.5 mb-2">
                          <Label className="text-slate-700 font-medium text-[11px] font-medium">Team:</Label>
                          <div className="relative flex items-center">
                            <Select value={selectedInformTeam} onValueChange={(val) => handleTeamSelection(val, 'inform')}>
                              <SelectTrigger className={cn("rounded-lg h-6 border-slate-300 text-[9px] w-[140px] bg-slate-50 shadow-none px-2", selectedCollabTeam && "[&>span]:pr-5")}>
                                <SelectValue placeholder="Select team" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {fillValues?.userGroup.map(group => (
                                  <SelectItem key={group.UserGroupNo} value={group.UserGroupNo.toString()} className="text-[10px]">{group.UserGroupName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedInformTeam && (
                              <div
                                className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 cursor-pointer z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedInformTeam('');
                                  const current = form.getValues('informed_to') || [];
                                  replaceInform(current.filter(i => !i.isFromTeam));
                                }}
                              >
                                <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button type="button" onClick={() => appendInform({ userName: '', displayName: '', email: '' })} variant="ghost" size="sm" className="h-7 text-[9px] font-medium text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
                        <UserPlus size={12} /> Add
                      </Button>
                    </div>
                    <div className={cn("bg-slate-50/50 rounded-xl border overflow-hidden shadow-sm transition-all border-slate-200", hasInformError && "border-red-500 ring-2 ring-red-500/10")}>
                      <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-100/95 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                              <th className="px-3 py-1.5 font-medium text-slate-700">User Name</th>
                              <th className="px-3 py-1.5 font-medium text-slate-700">Display Name</th>
                              <th className="px-3 py-1.5 font-medium text-slate-700">Email</th>
                              <th className="px-2 py-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {informFields.map((field, index) => (
                              <tr key={field.id} className="group hover:bg-white transition-colors">
                                <td className="px-2 py-1">
                                  <Controller
                                    name={`informed_to.${index}.userName`}
                                    control={form.control}
                                    render={({ field: nameField }) => (
                                      <UserCombobox value={nameField.value} onChange={(user) => {
                                        nameField.onChange(user.loginId);
                                        form.setValue(`informed_to.${index}.displayName`, user.printingName);
                                        form.setValue(`informed_to.${index}.email`, user.email || '');
                                        form.setValue(`informed_to.${index}.loginNo`, user.loginNo);
                                      }}
                                        placeholder="Select username"
                                        className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-sm bg-transparent shadow-none px-2"
                                        initialLabel={nameField.value}
                                        disabled={field.isFromTeam}
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Input disabled {...form.register(`informed_to.${index}.displayName`)} placeholder="Display Name" className="h-7 rounded-lg border-transparent md: bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                                </td>
                                <td className="px-2 py-1">
                                  <Input disabled {...form.register(`informed_to.${index}.email`)} placeholder="Email" className="h-7 rounded-lg border-transparent md: bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                                </td>
                                <td className="px-1 py-1 text-center">
                                  {!field.isFromTeam && (
                                    <button type="button" onClick={() => removeInform(index)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {informFields.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic font-medium">No informed users.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {hasInformError && <p className="text-[10px] text-red-500 font-medium ml-1">{informError.message}</p>}
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        )}

        {isShowTopAdditionalFields && (
          <FormSection title="Additional Fields" icon={Sparkles}>
            <CustomFieldsSection
              customFields={(form.watch('custom_fields') as any) || []}
              onChange={(fields) => form.setValue('custom_fields', fields as any, { shouldDirty: true, shouldValidate: true })}
              companyNo={authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1}
              hideAddButton={true}
              viewMode="grid"
              hideLabel={true}
            />
          </FormSection>
        )}

        {/* 3. Timeline */}
        {!hiddenSections.includes('timeline') && (
          <FormSection title="Timeline & Effort" icon={Clock}>
            <div className="space-y-3">
              {/* Row 1: Start Date, Due Date, All-Day Checkbox */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

                <div className="space-y-0 flex flex-col justify-end">
                  <Controller
                    name="isAllDay"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2 bg-slate-50/70 border border-slate-200/80 px-4 rounded-2xl shadow-sm transition-all hover:bg-slate-100/30 h-11">
                        <Checkbox
                          id="isAllDay"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5 rounded-md border-slate-300 focus-visible:ring-[#006699]"
                        />
                        <label htmlFor="isAllDay" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">All-Day Task</label>
                      </div>
                    )}
                  />
                </div>
                <div className="space-y-0" id="form-group-start_date">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Start Date</Label>
                  <Controller
                    name="start_date"
                    control={form.control}
                    render={({ field }) => (
                      <DateTimePicker date={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                        placeholder={isAllDay ? "Select start date" : "Select start date & time"}
                        hideTime={isAllDay}
                        className={form.formState.errors.start_date ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      />
                    )}
                  />
                  {form.formState.errors.start_date && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.start_date.message}</p>}
                </div>

                <div className="space-y-0" id="form-group-end_date">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">
                    Due Date {isSubTask && <span className="text-red-500 font-medium">*</span>}
                  </Label>
                  <Controller
                    name="end_date"
                    control={form.control}
                    render={({ field }) => (
                      <DateTimePicker date={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                        placeholder={isAllDay ? "Select due date" : "Select due date & time"}
                        hideTime={isAllDay}
                        className={form.formState.errors.end_date ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      />
                    )}
                  />
                  {form.formState.errors.end_date && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.end_date.message}</p>}
                </div>
              </div>

              {/* Row 2: Estimated Effort, Calendar Color */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-2">
                <div className="space-y-0 md:col-span-1" id="form-group-estimated_effort_value">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Estimated Effort</Label>
                  <div className="flex gap-0.5">
                    <div className="flex-1 space-y-0">
                      <Input type="number" step="0" placeholder="" {...form.register('estimated_effort_value')} isDecimal={false} className={cn("rounded-xl h-9 text-slate-900 shadow-sm text-right w-full transition-all", form.formState.errors.estimated_effort_value ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")} maxLength={8} />
                    </div>
                    <Controller
                      name="estimated_effort_unit"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={cn("rounded-xl h-9 text-slate-900 shadow-sm w-32 transition-all", form.formState.errors.estimated_effort_unit ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")}>
                            <SelectValue placeholder="Select estimated effort unit" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl bg-white border border-slate-200">
                            {fillValues?.frequency?.map(f => (
                              <SelectItem key={f.FrequencyNo} value={f.FrequencyNo.toString()}>
                                {f.FrequencyName || f.Frequency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {form.formState.errors.estimated_effort_value && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.estimated_effort_value.message}</p>}
                  {!form.formState.errors.estimated_effort_value && form.formState.errors.estimated_effort_unit && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.estimated_effort_unit.message}</p>}
                </div>

                <div className="space-y-0 md:col-span-1" id="form-group-calendarColor">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Calendar Color</Label>
                  <Controller
                    name="calendarColor"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex flex-wrap items-center gap-3">
                        <Select
                          value={
                            !field.value || field.value === 'none' || field.value === '' ? 'none' :
                              [
                                '#93c5fd', '#fca5a5', '#86efac', '#fdba74',
                                '#d8b4fe', '#f9a8d4', '#a5b4fc', '#67e8f9'
                              ].includes(field.value) ? field.value : 'custom'
                          }
                          onValueChange={(val) => {
                            if (val === 'none') field.onChange('');
                            else if (val === 'custom') field.onChange('#000000'); // default custom
                            else field.onChange(val);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[220px] h-10 bg-white border-slate-200 rounded-xl focus:ring-[#006699]/20">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <X size={14} className="text-slate-400" />
                                <span>None</span>
                              </div>
                            </SelectItem>
                            {[
                              { hex: '#93c5fd', name: 'Blue' },
                              { hex: '#fca5a5', name: 'Red' },
                              { hex: '#86efac', name: 'Green' },
                              { hex: '#fdba74', name: 'Orange' },
                              { hex: '#d8b4fe', name: 'Purple' },
                              { hex: '#f9a8d4', name: 'Pink' },
                              { hex: '#a5b4fc', name: 'Indigo' },
                              { hex: '#67e8f9', name: 'Cyan' },
                            ].map((preset) => (
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

                        {/* Custom Color Input */}
                        {field.value && field.value !== 'none' && ![
                          '#93c5fd', '#fca5a5', '#86efac', '#fdba74',
                          '#d8b4fe', '#f9a8d4', '#a5b4fc', '#67e8f9'
                        ].includes(field.value) && (
                            <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50">
                              <input
                                type="color"
                                value={field.value || '#000000'}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-7 h-7 border-0 bg-transparent cursor-pointer rounded"
                              />
                              <span className="text-xs font-mono font-medium text-slate-500 uppercase">{field.value}</span>
                            </div>
                          )}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {/* 4. Business Impact */}
        {!hiddenSections.includes('business_benefit') && (
          <FormSection title="Business Benefit Section" icon={TrendingUp}>
            <div className="space-y-3">
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-300 flex items-center gap-3 shadow-sm transition-all hover:bg-slate-100/50">
                <Controller
                  name="is_business_benefit_applicable"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="benefit-section"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isBenefitDisabled}
                      className="h-5 w-5 rounded-md border-slate-400"
                    />
                  )}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="benefit-section" className="text-sm font-medium text-slate-700 cursor-pointer">Business Benefit Applicable</Label>
                </div>
              </div>

              {isBenefitApplicable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-0" id="form-group-business_benefit_type_No">
                    <Label className="text-slate-700 font-medium text-[11px] ml-1">Benefit Type</Label>
                    <Controller
                      name="business_benefit_type_No"
                      control={form.control}
                      render={({ field }) => (
                        <Combobox options={(fillValues?.benefitType || []).filter((b: any) => {
                          const label = b["Business Benefit"] || b.BusinessBenefitTypeName || b.businessBenefitTypeName || b.BenefitTypeName || b.benefitTypeName || b.typeName || b.Name || b.name || b.Code || b.code || '';
                          const lower = label.toLowerCase();
                          return lower !== 'all' && lower !== '[all]';
                        })
                          .map((b: any) => {
                            const val = (b.BusinessBenefitTypeNo ?? b.businessBenefitTypeNo ?? '').toString();
                            const label = b["Business Benefit"] || b.BusinessBenefitTypeName || b.businessBenefitTypeName || b.BenefitTypeName || b.benefitTypeName || b.typeName || b.Name || b.name || b.Code || b.code || `Benefit Type #${val}`;
                            return { label, value: val };
                          })
                        }
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select business benefit type"
                          className={form.formState.errors.business_benefit_type_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                          onAddNew={formRights[1545]?.isSave ? () => {
                            setActiveMasterType('benefit-type');
                            setIsMasterCreateOpen(true);
                          } : undefined}
                        />
                      )}
                    />
                    {form.formState.errors.business_benefit_type_No && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.business_benefit_type_No.message}</p>}
                  </div>
                  <div className="space-y-0" id="form-group-benefit_period">
                    <Label className="text-slate-700 font-medium text-[11px] ml-1">Benefit Period</Label>
                    <Controller
                      name="benefit_period"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={cn("rounded-xl h-9 text-slate-900 shadow-sm transition-all", form.formState.errors.benefit_period ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")}>
                            <SelectValue placeholder="Select benefit period" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="One Time">One Time</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.benefit_period && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.benefit_period.message}</p>}
                  </div>
                  {!shouldHideBenefitAmount && (
                    <>
                      <div className="space-y-0" id="form-group-estimated_benefit_amount">
                        <Label className="text-slate-700 font-medium text-[11px] ml-1">Estimated Benefit Amount</Label>
                        <Input type="number" step="0.01" placeholder="" {...form.register('estimated_benefit_amount')} isDecimal={true} decimalPlaces={2} className={cn("rounded-xl h-9 text-slate-900 shadow-sm text-right transition-all", form.formState.errors.estimated_benefit_amount ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")} maxLength={8} />
                        {form.formState.errors.estimated_benefit_amount && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.estimated_benefit_amount.message}</p>}
                      </div>
                      <div className="space-y-0" id="form-group-actual_benefit_amount">
                        <Label className="text-slate-700 font-medium text-[11px] ml-1">Actual Benefit Amount</Label>
                        <Input type="number" step="0.01" placeholder="" {...form.register('actual_benefit_amount')} isDecimal={true} decimalPlaces={2} className={cn("rounded-xl h-9 text-slate-900 shadow-sm text-right transition-all", form.formState.errors.actual_benefit_amount ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:ring-[#006699]/15 focus:border-[#006699]")} maxLength={8} />
                        {form.formState.errors.actual_benefit_amount && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.actual_benefit_amount.message}</p>}
                      </div>
                    </>
                  )}
                  <div className="space-y-0 md:col-span-2" id="form-group-business_benefit_description">
                    <Label className="text-slate-700 font-medium text-[11px] ml-1">Benefit Description</Label>
                    <Textarea placeholder="Enter business benefit description" {...form.register('business_benefit_description')} className={cn("min-h-[80px] rounded-xl input-section text-slate-900 shadow-sm transition-all", form.formState.errors.business_benefit_description ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#006699]/15 focus:border-[#006699]")} />
                    {form.formState.errors.business_benefit_description && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.business_benefit_description.message}</p>}
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        )}

        {!isSubTask && !hiddenSections.includes('subtasks') && (
          <FormSection
            title='Sub Tasks'
            icon={FileText}
            headerAction={
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={subtaskFields.length > 0}
                onClick={() => appendSubtask({ id: Date.now().toString(), type_No: '', title: '', description: '', ownerLoginNo: '', endDate: '', completionRemark: '', completionDate: '', operTaskNo: 0 })}
                className="rounded-xl font-medium border-slate-300 hover:bg-slate-50 h-7 px-3 text-[10px] shadow-sm gap-0.5 transition-all active:scale-95 text-slate-700 shrink-0 disabled:opacity-50"
              >
                <Plus size={12} className="text-[#006699]" /> Add Sub-Task
              </Button>
            }
          >
            <div className="space-y-0">
              {form.formState.errors.sub_tasks && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-600" />
                  <span className="text-xs font-semibold text-red-600">
                    Please correct the highlighted errors in the sub-tasks before saving.
                  </span>
                </div>
              )}
              {localSubtasks.length > 0 || subtaskFields.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-1 py-0.5 text-[10px] font-medium text-slate-500 w-[40px]">Sl. No.</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 w-[180px]">Type</th>
                        <th className="pl-2 pr-0.5 py-0.5 text-[10px] font-medium text-slate-500">Sub-Task Title <span className="text-red-500">*</span></th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500">Status</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500">Task Owner <span className="text-red-500">*</span></th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 whitespace-nowrap">Due Date</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 whitespace-nowrap">Completion Date</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 min-w-[180px] max-w-[250px]">Completion Remark</th>
                        <th className="pl-0.5 pr-2 py-0.5 text-[10px] font-medium text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {localSubtasks.map((task: any, idx: number) => {
                        const editIndex = subtaskFields.findIndex(sf => sf.operTaskNo === task.taskNo);
                        if (editIndex !== -1) {
                          const field = subtaskFields[editIndex];
                          const index = editIndex;
                          return (
                            <tr key={field.id} className="bg-[#f8fbff] hover:bg-[#f0f6fc] transition-colors group">
                              <td className="px-1 py-1 align-top text-xs font-medium text-slate-500 mt-1">
                                {idx + 1}.
                              </td>
                              <td className="px-0.5 py-0 align-top w-[180px]">
                                <Controller
                                  name={`sub_tasks.${index}.type_No`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <div className="flex flex-col mt-1.5">
                                      <Combobox options={fillValues?.type?.map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] })) || []}
                                        value={subField.value || ''}
                                        onChange={(val) => {
                                          subField.onChange(val);
                                        }}
                                        placeholder="Select type"
                                      />
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <div className="flex flex-grow items-start gap-0.5 py-1.5">
                                  <div className="flex-1">
                                    <span className="text-xs font-medium text-slate-800 break-words pt-0.5">{task.title}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <div className="flex items-center">
                                  <span className="text-[10px] font-medium text-slate-400">{task.status || 'Draft'}</span>
                                </div>
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Controller
                                  name={`sub_tasks.${index}.ownerLoginNo`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <div className="flex flex-col">
                                      <UserCombobox value={subField.value || ''} onChange={(user) => {
                                        const val = user.loginNo?.toString() || (user as any).LoginNo?.toString() || (user as any).id?.toString();
                                        subField.onChange(val);
                                        form.setValue(`sub_tasks.${index}.assignedDisplayName`, user.printingName || user.loginId || val);
                                        form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
                                      }}
                                        placeholder="Search owner"
                                        error={!!form.formState.errors.sub_tasks?.[index]?.ownerLoginNo}
                                      />
                                      {form.formState.errors.sub_tasks?.[index]?.ownerLoginNo && (
                                        <span className="text-[9px] text-red-500 font-medium mt-1 block">{form.formState.errors.sub_tasks[index]?.ownerLoginNo?.message}</span>
                                      )}
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Controller
                                  name={`sub_tasks.${index}.endDate`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                      placeholder="Select date"
                                      hideTime={true}
                                    />
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Controller
                                  name={`sub_tasks.${index}.completionDate`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                      placeholder="Select date"
                                      hideTime={true}
                                    />
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Textarea {...form.register(`sub_tasks.${index}.completionRemark`)} placeholder="Remark..." rows={1} className="border-slate-200 shadow-sm min-h-[20px] h-auto py-1.5 px-2 rounded-md font-normal text-slate-700 placeholder:text-slate-400 transition-all duration-300 focus-visible:ring-[#006699]/20" maxLength={500} />
                              </td>
                              <td className="px-0.5 py-0 text-right align-top">
                                <div className="h-8 flex items-center justify-end gap-0.5">
                                  <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px] font-medium border-slate-300 text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={() => removeSubtask(index)} title="Cancel">
                                    <X size={12} className="mr-1" />
                                  </Button>
                                  <Button type="button" size="sm" className="h-7 px-2 text-[10px] font-medium bg-[#006699] hover:bg-[#005580] text-white disabled:opacity-50" disabled={savingSubtaskIndex === index} onClick={() => handleSaveInlineSubtask(index)} title="Save">
                                    {savingSubtaskIndex === index ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={task.taskNo} className="bg-white hover:bg-slate-50 transition-colors group">
                            <td className="px-1 py-1 align-top text-xs font-medium text-slate-500 mt-1">
                              {idx + 1}.
                            </td>
                            <td className="px-0.5 py-0 align-top w-[180px]">
                              <span className="text-xs font-semibold text-slate-700 block mt-2">
                                {fillValues?.type?.find(t => t.OperTaskTypeNo.toString() === task.type_No?.toString() || t.OperTaskTypeNo.toString() === task.operTaskTypeNo?.toString())?.["Task Type"] || '-'}
                              </span>
                            </td>
                            <td className="px-0.5 py-0 min-w-[300px]">
                              <div className="flex flex-col gap-0.5 whitespace-normal py-1.5 pl-2">
                                <div className="flex gap-0.5 items-start">
                                  <span className="text-xs font-medium text-slate-800 break-words pt-0.5">{task.title}</span>
                                </div>
                                {task.code || task.taskNo > 0 ? (
                                  <span className="text-[10px] font-medium text-slate-400">{task.code || `${task.taskNo}`}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-0.5 py-0">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-medium  ",
                                task.status === 'Done' || task.status === 'Complete' ? "bg-green-100/80 text-green-800" :
                                  task.status === 'In Progress' ? "bg-blue-100/80 text-blue-800" :
                                    task.status === 'In Review' ? "bg-purple-100/80 text-purple-800" :
                                      "bg-slate-200/80 text-slate-800"
                              )}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-0.5 py-0">
                              <div className="flex items-center gap-0.5">
                                {task.assignedDisplayName && task.assignedDisplayName !== '-' && (
                                  <UserAvatar loginNo={task.ownerLoginNo ? parseInt(task.ownerLoginNo as string) : undefined} displayName={task.assignedDisplayName} size="sm" />
                                )}
                                <span className="text-xs font-semibold text-slate-700">{task.assignedDisplayName || '-'}</span>
                              </div>
                            </td>
                            <td className="px-0.5 py-0 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-700">{task.endDate ? format(new Date(task.endDate), 'MMM dd, yyyy') : '-'}</span>
                            </td>
                            <td className="px-0.5 py-0 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-700">{task.completionDate ? format(new Date(task.completionDate), 'MMM dd, yyyy') : '-'}</span>
                            </td>
                            <td className="px-0.5 py-0">
                              <span className="text-xs font-semibold text-slate-700 truncate block" title={task.completionRemark}>{task.completionRemark || '-'}</span>
                            </td>
                            <td className="px-0.5 py-0 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-300 text-slate-600 disabled:opacity-50" disabled={subtaskFields.length > 0} onClick={() => handleInlineEdit(task)} title="Inline Edit"><Edit2 size={12} /></Button>
                                {task.taskNo > 0 && (
                                  <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-300 text-[#006699]" onClick={() => navigate(`/task/${task.taskNo}`)} title="Full Edit"><ExternalLink size={12} /></Button>
                                )}
                                <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setSubtaskToDelete(task.taskNo)} title="Delete"><Trash2 size={12} /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Render newly added subtasks */}
                      {subtaskFields.map((field, index) => {
                        if (localSubtasks.some((st: any) => st.taskNo === field.operTaskNo)) return null;
                        return (
                          <tr key={field.id} className="bg-[#f8fbff] hover:bg-[#f0f6fc] transition-colors group">
                            <td className="px-1 py-1 align-top text-xs font-medium text-slate-500 mt-1">
                              {localSubtasks.length + index + 1}.
                            </td>
                            <td className="px-0.5 py-0 align-top w-[180px]">
                              <Controller
                                name={`sub_tasks.${index}.type_No`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <div className="flex flex-col mt-1.5">
                                    <Combobox options={fillValues?.type?.map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] })) || []}
                                      value={subField.value || ''}
                                      onChange={(val) => {
                                        subField.onChange(val);
                                      }}
                                      placeholder="Select type"
                                    />
                                  </div>
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 min-w-[400px] align-top">
                              <div className="flex items-start gap-0.5 py-1.5 pl-2.5">
                                <div className="flex-1">
                                  <Input {...form.register(`sub_tasks.${index}.title`)} placeholder="Enter task title" className={cn("border-slate-200 shadow-sm h-8 px-2 rounded-md font-normal text-slate-700 placeholder:text-slate-400 transition-all duration-300 focus-visible:ring-[#006699]/20",)} maxLength={200} />
                                  {form.formState.errors.sub_tasks?.[index]?.title && (
                                    <span className="text-[9px] text-red-500 font-medium mt-1 block">{form.formState.errors.sub_tasks[index]?.title?.message}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <div className="h-9 flex items-center">
                                <span className="text-[10px] font-medium text-slate-400">Draft</span>
                              </div>
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Controller
                                name={`sub_tasks.${index}.ownerLoginNo`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <div className="flex flex-col">
                                    <UserCombobox value={subField.value || ''} onChange={(user) => {
                                      const val = user.loginNo?.toString() || (user as any).LoginNo?.toString() || (user as any).id?.toString();
                                      subField.onChange(val);
                                      form.setValue(`sub_tasks.${index}.assignedDisplayName`, user.printingName || user.loginId || val);
                                      form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
                                    }}
                                      placeholder="Search owner..."
                                    />
                                    {form.formState.errors.sub_tasks?.[index]?.ownerLoginNo && (
                                      <span className="text-[9px] text-red-500 font-medium mt-1 block">{form.formState.errors.sub_tasks[index]?.ownerLoginNo?.message}</span>
                                    )}
                                  </div>
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Controller
                                name={`sub_tasks.${index}.endDate`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                    placeholder="Select date"
                                    hideTime={true}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Controller
                                name={`sub_tasks.${index}.completionDate`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                    placeholder="Select date"
                                    hideTime={true}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Textarea {...form.register(`sub_tasks.${index}.completionRemark`)} placeholder="Enter remark" rows={1} className="border-slate-200 shadow-sm min-h-[20px] h-auto py-2 px-3 rounded-md font-normal text-slate-700 placeholder:text-slate-400 transition-all duration-300 focus-visible:ring-[#006699]/20" maxLength={500} />
                            </td>
                            <td className="px-0.5 py-0 text-right align-top">
                              <div className="h-9 flex items-center justify-end gap-0.5">
                                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px] font-medium border-slate-300 text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={() => removeSubtask(index)} title="Cancel">
                                  <X size={12} />
                                </Button>
                                <Button type="button" size="sm" className="h-7 px-2 text-[10px] font-medium bg-[#006699] hover:bg-[#005580] text-white disabled:opacity-50" disabled={savingSubtaskIndex === index} onClick={() => handleSaveInlineSubtask(index)} title="Save">
                                  {savingSubtaskIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </FormSection>
        )}

        {/* 5. Execution Detail */}
        {!hiddenSections.includes('checklist') && (
          <FormSection
            title={checklist.length > 0 ? `Check Lists (${completedCount}/${checklist.length} (${progressPercent}%))` : "Check Lists"}
            icon={CheckCircle}
            headerAction={
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => appendChecklist({ id: Date.now().toString(), description: '', completed: false })}
                className="rounded-xl font-medium border-slate-300 hover:bg-slate-50 h-7 px-3 text-[10px] shadow-sm gap-0.5 transition-all active:scale-95 text-slate-700"
              >
                <Plus size={12} className="text-[#006699]" /> Add Checklist Item
              </Button>
            }
          >
            <div className="space-y-3">
              {/* Checklist Section */}
              <div className="mb-6 space-y-3">

                <div className="space-y-0">
                  {checklistFields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "group flex items-center gap-0.5 px-1 rounded-xl border transition-all duration-300",
                        form.watch(`check_list.${index}.completed`)
                          ? "bg-slate-50/80 border-slate-200 opacity-70"
                          : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#006699]/30 focus-within:border-[#006699] focus-within:ring-2 focus-within:ring-[#006699]/10"
                      )}
                    >
                      <Controller
                        name={`check_list.${index}.completed`}
                        control={form.control}
                        render={({ field: checkField }) => (
                          <button
                            type="button"
                            onClick={() => checkField.onChange(!checkField.value)}
                            className={cn(
                              "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                              checkField.value
                                ? "bg-[#006699] border-[#006699] text-white rotate-0 scale-100"
                                : "border-slate-300 text-transparent hover:border-[#006699] rotate-45 scale-90"
                            )}
                          >
                            <Check size={14} strokeWidth={4} />
                          </button>
                        )}
                      />
                      <div className="flex-1">
                        <Input {...form.register(`check_list.${index}.description`)} placeholder="Enter checklist" className={cn("border-none bg-transparent shadow-none p-0 h-auto transition-all duration-300 focus-visible:ring-0", form.watch(`check_list.${index}.completed`) ? "text-slate-400 line-through decoration-2" : "text-slate-800")} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeChecklist(index)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}

                </div>
              </div>
            </div>
          </FormSection>
        )}

        {/* 6. Execution Notes */}
        {!hiddenSections.includes('execution_note') && (
          <FormSection title="Task Execution Note" icon={FileText}>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="space-y-0">
                <label className="text-[10px] font-medium text-slate-700 ml-1">
                  Execution Notes
                </label>
                <Controller
                  name="executionNotes"
                  control={form.control}
                  render={({ field }) => (
                    <Textarea {...field} placeholder="Enter execution note" className="min-h-[100px] input-section bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#006699]/15 focus-visible:ring-offset-0 text-slate-800" maxLength={1000} />
                  )}
                />
              </div>
              {/* Row 3: Completion Date, Completion Remark */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-2">
                <div className="space-y-0.5 md:col-span-1" id="form-group-completionDate">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Completion Date</Label>
                  <Controller
                    name="completionDate"
                    control={form.control}
                    render={({ field }) => (
                      <DateTimePicker date={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                        placeholder={isAllDay ? "Select completion date" : "Select completion date & time"}
                        hideTime={isAllDay}
                        className={form.formState.errors.completionDate ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                      />
                    )}
                  />
                  {form.formState.errors.completionDate && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.completionDate.message}</p>}
                </div>

                <div className="space-y-0.5 md:col-span-2" id="form-group-completionRemark">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Completion Remark</Label>
                  <Textarea placeholder="Enter completion remark" {...form.register('completionRemark')} maxLength={500} className={cn("min-h-[80px] resize-none rounded-xl transition-all text-slate-900 ", form.formState.errors.completionRemark ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:border-[#006699] focus:ring-[#006699]/15")} />
                  {form.formState.errors.completionRemark && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.completionRemark.message}</p>}
                </div>
              </div>
              {/* Row 4: Road Block Remark */}
              <div className="grid grid-cols-1 gap-4 items-start pt-2">
                <div className="space-y-0.5" id="form-group-roadBlock">
                  <Label className="text-slate-700 font-medium text-[11px] ml-1">Road Block Remark</Label>
                  <Textarea placeholder="Enter road block remark" {...form.register('roadBlock')} maxLength={1000} className={cn("min-h-[80px] resize-none rounded-xl transition-all text-slate-900 ", form.formState.errors.roadBlock ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "border-slate-300 focus:border-[#006699] focus:ring-[#006699]/15")} />
                  {form.formState.errors.roadBlock && <p className="text-[10px] text-red-500 font-medium ml-1">{form.formState.errors.roadBlock.message}</p>}
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {!hiddenSections.includes('attachments') && (
          <FormSection title="Attachments" icon={Paperclip}>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#006699] rounded-2xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={handleFileSelection}
                  className="hidden"
                />
                <div className="h-12 w-12 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#006699] group-hover:scale-110 transition-all">
                  <UploadCloud size={22} />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-700">Drag & drop files or click to upload</p>
                <p className="mt-1 text-[10px] font-medium text-slate-500">Only PDF and Images are supported (Max size: 10MB)</p>
              </div>

              {/* <div
                onClick={() => setIsCameraModalOpen(true)}
                className="flex flex-col items-center justify-center border border-slate-200 hover:border-[#006699] rounded-2xl py-3 bg-white hover:bg-slate-50 transition-all cursor-pointer group"
              >
                <Camera size={20} className="text-[#006699]" />
              </div> */}
              {/* Active Uploading Files Queue */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-medium text-slate-500 ml-1">Uploading Queue</h4>
                  <div className="space-y-0">
                    {uploadingFiles.map(file => (
                      <motion.div
                        key={file.tempId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-sm",
                          file.status === 'failed' ? "bg-red-50/50 border-red-200" : "bg-slate-50/50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                            file.status === 'failed' ? "bg-red-100 border-red-200 text-red-600" : "bg-white border-slate-200 text-[#006699]"
                          )}>
                            {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={16} /> : <Image size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-900 truncate leading-none mb-1">{file.name}</p>
                            <span className="text-[9px] font-medium flex items-center gap-0.5">
                              {file.status === 'pending' && <span className="text-slate-500">Pending upload...</span>}
                              {file.status === 'uploading' && (
                                <span className="text-[#006699] flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin" /> Registering entry...
                                </span>
                              )}
                              {file.status === 'verifying' && (
                                <span className="text-blue-600 flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin" /> Uploading file payload...
                                </span>
                              )}
                              {file.status === 'failed' && (
                                <span className="text-red-600 font-medium flex items-center gap-1">
                                  Failed: {file.errorMessage || "Network error"}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {file.status === 'failed' && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRetryUpload(file.tempId)}
                              className="h-8 w-8 rounded-lg border border-red-200/50 bg-white text-red-600 hover:bg-red-100/50 flex items-center justify-center transition-all shadow-sm"
                            >
                              <RefreshCw size={13} />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveUploading(file.tempId)}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-all shadow-sm"
                          >
                            <X size={13} />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Successfully Uploaded Attachments List */}
              {(() => {
                const attachments = form.watch('attachments') || [];
                if (attachments.length === 0) return null;

                return (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-medium text-slate-500 ml-1">Attached Documents ({attachments.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachments.map((file: any) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center justify-between p-3 bg-slate-50/30 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                              {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={16} /> : <Image size={16} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-0.5 mb-0.5">
                                <p className="text-xs font-medium text-slate-900 truncate max-w-[180px] leading-tight">{file.name}</p>
                                {file.size ? (
                                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">({formatFileSize(file.size)})</span>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => attachmentService.downloadAttachment(file.id, file.name)}
                                className="text-[9px] font-medium text-[#006699] hover:underline block text-left"
                              >
                                View document
                              </button>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveAttachment(file.id, file.name)}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm"
                          >
                            <Trash size={13} />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </FormSection>
        )}

        {/* 8. Time Logs */}
        {initialData?.taskNo && !hiddenSections.includes('actual_efforts') && (
          <FormSection title="Time Logs" icon={History}>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <TaskActivity
                taskNo={initialData.taskNo}
                comments={initialData.task_comments || []}
                efforts={initialData.actual_efforts || []}
                onRefresh={() => {
                  if (onRefreshData) {
                    onRefreshData();
                  } else {
                    window.location.reload();
                  }
                }}
              />
            </div>
          </FormSection>
        )}

        {!isShowTopAdditionalFields && (
          <FormSection title="Additional Fields" icon={Sparkles}>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <CustomFieldsSection
                customFields={(form.watch('custom_fields') as any) || []}
                onChange={(fields) => form.setValue('custom_fields', fields as any, { shouldDirty: true, shouldValidate: true })}
                companyNo={currentCompany || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1}
                hideAddButton={true}
                viewMode="grid"
              />
            </div>
          </FormSection>
        )}
      </form>

      {/* Floating Sub-Task Actions (Right Center) */}
      <div className="fixed right-6 top-[57%] -translate-y-1/2 flex flex-row items-center z-40 bg-white/95 backdrop-blur-md rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200 overflow-hidden transition-all hover:shadow-md">
        <button
          type="button"
          disabled={(localSubtasks.length + subtaskFields.length) === 0}
          onClick={() => setIsSubtasksModalOpen(true)}
          className="flex items-center gap-2 py-2 pl-3 pr-2 text-[14px] font-semibold text-[#005580] hover:bg-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          Sub-Tasks
          <span className="bg-[#006699] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full min-w-[24px] text-center tracking-wide">
            {localSubtasks.length + subtaskFields.length}
          </span>
        </button>
        <div className="w-[1.5px] h-6 bg-slate-200/80" />
        <button
          type="button"
          onClick={() => setIsStandaloneSubtaskModalOpen(true)}
          className="flex items-center gap-1.5 pl-2 pr-3 text-[14px] font-semibold text-[#005580] hover:bg-[#f8fafc] transition-colors"
        >
          <Plus size={18} strokeWidth={2.5} /> Add
        </button>
      </div>

      {/* Save/Update Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl bg-white/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
              Confirm {initialData ? "Update" : "Save"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to {initialData ? "update" : "save"}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setFormDataToSave(null);
              }}
              className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              onClick={() => {
                if (formDataToSave) {
                  setShowConfirm(false);
                  proceedSubmit(formDataToSave);
                }
              }}
              className="h-10 px-5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs shadow-md shadow-[#006699]/10 gap-0.5 transition-transform hover:scale-[1.02] active:scale-95"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Deletion Confirmation Dialog */}
      <Dialog open={!!attachmentToDelete} onOpenChange={(open) => !open && !isDeletingAttachment && setAttachmentToDelete(null)}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl bg-white/95 backdrop-blur-xl [&>button]:hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
              Remove Attachment
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to delete?
              {/* Are you sure <span className="font-medium text-slate-700">"{attachmentToDelete?.name}"</span>? */}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingAttachment}
              onClick={() => setAttachmentToDelete(null)}
              className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              disabled={isDeletingAttachment}
              onClick={confirmRemoveAttachment}
              className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md shadow-red-600/10 gap-0.5 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center min-w-[70px]"
            >
              {isDeletingAttachment ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Deleting...</span>
                </>
              ) : (
                "Yes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Alert Dialog */}
      <Dialog open={showSuccessAlert} onOpenChange={(open) => {
        if (!open) {
          setShowSuccessAlert(false);
          if (onComplete) onComplete();
        }
      }}>
        <DialogContent className="rounded-3xl max-w-xs p-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full border border-emerald-100/80 flex items-center justify-center mb-4 shadow-sm relative">
              {/* Inner glowing pulse ring */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
              <CheckCircle className="w-7 h-7 text-emerald-600 relative z-10" />
            </div>

            <h3 className="text-lg font-medium text-slate-800 tracking-tight mb-1">
              Success
            </h3>

            <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">
              Data save sucessfully.
            </p>
          </div>

          <div className="p-4 bg-slate-50/80 border-t border-slate-100/50 flex justify-center">
            <Button
              type="button"
              onClick={() => {
                setShowSuccessAlert(false);
                if (onComplete) onComplete();
              }}
              className="w-full h-10 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs shadow-md shadow-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Criteria Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="rounded-3xl max-w-md p-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm animate-pulse shrink-0">
                <Info size={24} />
              </div>
              <div>
                <DialogTitle className="text-base font-medium text-slate-800 tracking-tight">
                  File Upload Blocked
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
                  Some files do not meet the upload criteria.
                </DialogDescription>
              </div>
            </div>

            {/* List of failed files */}
            <div className="mt-4 max-h-[160px] overflow-y-auto space-y-0 border border-slate-100/80 rounded-2xl p-3 bg-slate-50/50">
              {invalidFiles.map((file, idx) => (
                <div key={idx} className="flex items-start gap-0.5 text-xs">
                  <span className="text-red-500 font-medium shrink-0 mt-0.5">✕</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-700 truncate leading-tight">{file.name}</p>
                    <p className="text-[10px] font-medium text-red-500 leading-none mt-0.5">{file.reason}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 self-center">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>

            {/* Criteria requirements list */}
            <div className="mt-5 space-y-3.5">
              <h4 className="text-[10px] font-medium text-slate-500">
                Attachment Criteria Requirements
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100/60 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-400 leading-none mb-1.5">Allowed Types</p>
                  <p className="text-xs font-medium text-slate-700">PDF & Images</p>
                  <p className="text-[9px] font-medium text-slate-400 mt-1">.pdf, .jpg, .jpeg, .png, .gif, .webp</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100/60 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-400 leading-none mb-1.5">Maximum Size</p>
                  <p className="text-xs font-medium text-slate-700">10 MB</p>
                  <p className="text-[9px] font-medium text-slate-400 mt-1">Per individual file</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button
              type="button"
              onClick={() => setShowWarningDialog(false)}
              className="w-full sm:w-auto h-9 text-xs font-medium rounded-xl bg-slate-800 text-white hover:bg-slate-900 border-none shadow-sm transition-all"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtask Deletion Confirmation Dialog */}
      <Dialog open={!!subtaskToDelete} onOpenChange={(open) => !open && !isDeletingSubtask && setSubtaskToDelete(null)}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl bg-white/95 backdrop-blur-xl [&>button]:hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={16} className="text-red-600" />
              </div>
              Do you want to delete?
            </DialogTitle>
            {/* <DialogDescription className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this sub-task? This action cannot be undone.
            </DialogDescription> */}
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSubtaskToDelete(null)}
              disabled={isDeletingSubtask}
              className="rounded-xl text-xs font-medium h-9 px-4 text-slate-600 hover:bg-slate-200/50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSubtask}
              disabled={isDeletingSubtask}
              className="rounded-xl text-xs font-medium h-9 px-5 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 gap-0.5 transition-all"
            >
              {isDeletingSubtask ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Sub-Tasks Modal */}
      <Dialog open={isSubtasksModalOpen} onOpenChange={setIsSubtasksModalOpen}>
        <DialogContent className="rounded-3xl w-[95vw] max-w-[1400px] p-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden flex flex-col h-[45vh] max-h-[95vh] !gap-0">
          <DialogHeader className="px-4 pt-4 pb-0 border-b border-slate-100/50 bg-slate-50/50 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-lg font-medium text-slate-800 tracking-tight flex items-center gap-2">
                <FileText size={20} className="text-[#006699]" />
                Manage Sub-Tasks
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                View, add, edit, or delete sub-tasks for this task.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-1 sm:p-2 overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-0 mt-2 h-full">
              {form.formState.errors.sub_tasks && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-600" />
                  <span className="text-xs font-semibold text-red-600">
                    Please correct the highlighted errors in the sub-tasks before saving.
                  </span>
                </div>
              )}
              {localSubtasks.length > 0 || subtaskFields.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-1 py-0.5 text-[10px] font-medium text-slate-500 w-[40px]">Sl. No.</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 w-[180px]">Type</th>
                        <th className="pl-2 pr-0.5 py-0.5 text-[10px] font-medium text-slate-500">Sub-Task Title <span className="text-red-500">*</span></th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500">Status</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500">Task Owner <span className="text-red-500">*</span></th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 whitespace-nowrap">Due Date</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 whitespace-nowrap">Completion Date</th>
                        <th className="px-0.5 py-0.5 text-[10px] font-medium text-slate-500 min-w-[180px] max-w-[250px]">Completion Remark</th>
                        <th className="pl-0.5 pr-2 py-0.5 text-[10px] font-medium text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {localSubtasks.map((task: any, idx: number) => {
                        const editIndex = subtaskFields.findIndex(sf => sf.operTaskNo === task.taskNo);
                        if (editIndex !== -1) {
                          const field = subtaskFields[editIndex];
                          const index = editIndex;
                          return (
                            <tr key={field.id} className="bg-[#f8fbff] hover:bg-[#f0f6fc] transition-colors group">
                              <td className="px-1 py-1 align-top text-xs font-medium text-slate-500 mt-1">
                                {idx + 1}.
                              </td>
                              <td className="px-0.5 py-0 align-top w-[180px]">
                                <Controller
                                  name={`sub_tasks.${index}.type_No`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <div className="flex flex-col mt-1.5">
                                      <Combobox options={fillValues?.type?.map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] })) || []}
                                        value={subField.value || ''}
                                        onChange={(val) => {
                                          subField.onChange(val);
                                        }}
                                        placeholder="Select type"
                                      />
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <div className="flex flex-grow items-start gap-0.5 py-1.5">
                                  <div className="flex-1">
                                    <span className="text-xs font-medium text-slate-800 break-words pt-0.5">{task.title}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <div className="flex items-center">
                                  <span className="text-[10px] font-medium text-slate-400">{task.status || 'Draft'}</span>
                                </div>
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Controller
                                  name={`sub_tasks.${index}.ownerLoginNo`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <div className="flex flex-col">
                                      <UserCombobox value={subField.value || ''} onChange={(user) => {
                                        const val = user.loginNo?.toString() || (user as any).LoginNo?.toString() || (user as any).id?.toString();
                                        subField.onChange(val);
                                        form.setValue(`sub_tasks.${index}.assignedDisplayName`, user.printingName || user.loginId || val);
                                        form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
                                      }}
                                        placeholder="Search owner"
                                        error={!!form.formState.errors.sub_tasks?.[index]?.ownerLoginNo}
                                      />
                                      {form.formState.errors.sub_tasks?.[index]?.ownerLoginNo && (
                                        <span className="text-[9px] text-red-500 font-medium mt-1 block">{form.formState.errors.sub_tasks[index]?.ownerLoginNo?.message}</span>
                                      )}
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Controller
                                  name={`sub_tasks.${index}.endDate`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                      placeholder="Select date"
                                      hideTime={true}
                                    />
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Controller
                                  name={`sub_tasks.${index}.completionDate`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                      placeholder="Select date"
                                      hideTime={true}
                                    />
                                  )}
                                />
                              </td>
                              <td className="px-0.5 py-0 align-top">
                                <Textarea {...form.register(`sub_tasks.${index}.completionRemark`)} placeholder="Remark..." rows={1} className="border-slate-200 shadow-sm min-h-[20px] h-auto py-1.5 px-2 rounded-md font-normal text-slate-700 placeholder:text-slate-400 transition-all duration-300 focus-visible:ring-[#006699]/20" maxLength={500} />
                              </td>
                              <td className="px-0.5 py-0 text-right align-top">
                                <div className="h-8 flex items-center justify-end gap-0.5">
                                  <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px] font-medium border-slate-300 text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={() => removeSubtask(index)} title="Cancel">
                                    <X size={12} className="mr-1" />
                                  </Button>
                                  <Button type="button" size="sm" className="h-7 px-2 text-[10px] font-medium bg-[#006699] hover:bg-[#005580] text-white disabled:opacity-50" disabled={savingSubtaskIndex === index} onClick={() => handleSaveInlineSubtask(index)} title="Save">
                                    {savingSubtaskIndex === index ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={task.taskNo} className="bg-white hover:bg-slate-50 transition-colors group">
                            <td className="px-1 py-1 align-top text-xs font-medium text-slate-500 mt-1">
                              {idx + 1}.
                            </td>
                            <td className="px-0.5 py-0 align-top w-[180px]">
                              <span className="text-xs font-semibold text-slate-700 block mt-2">
                                {fillValues?.type?.find(t => t.OperTaskTypeNo.toString() === task.type_No?.toString() || t.OperTaskTypeNo.toString() === task.operTaskTypeNo?.toString())?.["Task Type"] || '-'}
                              </span>
                            </td>
                            <td className="px-0.5 py-0 min-w-[300px]">
                              <div className="flex flex-col gap-0.5 whitespace-normal py-1.5 pl-2">
                                <div className="flex gap-0.5 items-start">
                                  <span className="text-xs font-medium text-slate-800 break-words pt-0.5">{task.title}</span>
                                </div>
                                {task.code || task.taskNo > 0 ? (
                                  <span className="text-[10px] font-medium text-slate-400">{task.code || `${task.taskNo}`}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-0.5 py-0">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-medium  ",
                                task.status === 'Done' || task.status === 'Complete' ? "bg-green-100/80 text-green-800" :
                                  task.status === 'In Progress' ? "bg-blue-100/80 text-blue-800" :
                                    task.status === 'In Review' ? "bg-purple-100/80 text-purple-800" :
                                      "bg-slate-200/80 text-slate-800"
                              )}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-0.5 py-0">
                              <div className="flex items-center gap-0.5">
                                {task.assignedDisplayName && task.assignedDisplayName !== '-' && (
                                  <UserAvatar loginNo={task.ownerLoginNo ? parseInt(task.ownerLoginNo as string) : undefined} displayName={task.assignedDisplayName} size="sm" />
                                )}
                                <span className="text-xs font-semibold text-slate-700">{task.assignedDisplayName || '-'}</span>
                              </div>
                            </td>
                            <td className="px-0.5 py-0 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-700">{task.endDate ? format(new Date(task.endDate), 'MMM dd, yyyy') : '-'}</span>
                            </td>
                            <td className="px-0.5 py-0 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-700">{task.completionDate ? format(new Date(task.completionDate), 'MMM dd, yyyy') : '-'}</span>
                            </td>
                            <td className="px-0.5 py-0">
                              <span className="text-xs font-semibold text-slate-700 truncate block" title={task.completionRemark}>{task.completionRemark || '-'}</span>
                            </td>
                            <td className="px-0.5 py-0 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-300 text-slate-600 disabled:opacity-50" disabled={subtaskFields.length > 0} onClick={() => handleInlineEdit(task)} title="Inline Edit"><Edit2 size={12} /></Button>
                                {task.taskNo > 0 && (
                                  <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-300 text-[#006699]" onClick={() => navigate(`/task/${task.taskNo}`)} title="Full Edit"><ExternalLink size={12} /></Button>
                                )}
                                <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setSubtaskToDelete(task.taskNo)} title="Delete"><Trash2 size={12} /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Render newly added subtasks */}
                      {subtaskFields.map((field, index) => {
                        if (localSubtasks.some((st: any) => st.taskNo === field.operTaskNo)) return null;
                        return (
                          <tr key={field.id} className="bg-[#f8fbff] hover:bg-[#f0f6fc] transition-colors group">
                            <td className="px-1 py-1 align-top text-xs font-medium text-slate-500 mt-1">
                              {localSubtasks.length + index + 1}.
                            </td>
                            <td className="px-0.5 py-0 align-top w-[180px]">
                              <Controller
                                name={`sub_tasks.${index}.type_No`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <div className="flex flex-col mt-1.5">
                                    <Combobox options={fillValues?.type?.map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] })) || []}
                                      value={subField.value || ''}
                                      onChange={(val) => {
                                        subField.onChange(val);
                                      }}
                                      placeholder="Select type"
                                    />
                                  </div>
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 min-w-[400px] align-top">
                              <div className="flex items-start gap-0.5 py-1.5 pl-2.5">
                                <div className="flex-1">
                                  <Input {...form.register(`sub_tasks.${index}.title`)} placeholder="Enter task title" className={cn("border-slate-200 shadow-sm h-8 px-2 rounded-md font-normal text-slate-700 placeholder:text-slate-400 transition-all duration-300 focus-visible:ring-[#006699]/20",)} maxLength={200} />
                                  {form.formState.errors.sub_tasks?.[index]?.title && (
                                    <span className="text-[9px] text-red-500 font-medium mt-1 block">{form.formState.errors.sub_tasks[index]?.title?.message}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <div className="h-9 flex items-center">
                                <span className="text-[10px] font-medium text-slate-400">Draft</span>
                              </div>
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Controller
                                name={`sub_tasks.${index}.ownerLoginNo`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <div className="flex flex-col">
                                    <UserCombobox value={subField.value || ''} onChange={(user) => {
                                      const val = user.loginNo?.toString() || (user as any).LoginNo?.toString() || (user as any).id?.toString();
                                      subField.onChange(val);
                                      form.setValue(`sub_tasks.${index}.assignedDisplayName`, user.printingName || user.loginId || val);
                                      form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
                                    }}
                                      placeholder="Search owner..."
                                    />
                                    {form.formState.errors.sub_tasks?.[index]?.ownerLoginNo && (
                                      <span className="text-[9px] text-red-500 font-medium mt-1 block">{form.formState.errors.sub_tasks[index]?.ownerLoginNo?.message}</span>
                                    )}
                                  </div>
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Controller
                                name={`sub_tasks.${index}.endDate`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                    placeholder="Select date"
                                    hideTime={true}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Controller
                                name={`sub_tasks.${index}.completionDate`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <DateTimePicker date={subField.value ? new Date(subField.value) : undefined} onChange={(date) => subField.onChange(date ? date.toISOString() : '')}
                                    placeholder="Select date"
                                    hideTime={true}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-0.5 py-0 align-top">
                              <Textarea {...form.register(`sub_tasks.${index}.completionRemark`)} placeholder="Enter remark" rows={1} className="border-slate-200 shadow-sm min-h-[20px] h-auto py-2 px-3 rounded-md font-normal text-slate-700 placeholder:text-slate-400 transition-all duration-300 focus-visible:ring-[#006699]/20" maxLength={500} />
                            </td>
                            <td className="px-0.5 py-0 text-right align-top">
                              <div className="h-9 flex items-center justify-end gap-0.5">
                                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px] font-medium border-slate-300 text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={() => removeSubtask(index)} title="Cancel">
                                  <X size={12} />
                                </Button>
                                <Button type="button" size="sm" className="h-7 px-2 text-[10px] font-medium bg-[#006699] hover:bg-[#005580] text-white disabled:opacity-50" disabled={savingSubtaskIndex === index} onClick={() => handleSaveInlineSubtask(index)} title="Save">
                                  {savingSubtaskIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50/50 border-t border-slate-100/50 rounded-b-3xl shrink-0">
            <Button
              type="button"
              onClick={() => setIsSubtasksModalOpen(false)}
              className="h-10 px-6 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm shadow-md transition-all"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={setIsMasterCreateOpen}
        type={activeMasterType as any}
        companyNo={currentCompany || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1}
        fillValues={fillValues}
        onSuccess={handleMasterCreateSuccess}
      />

      <Dialog open={showDraftRestore} onOpenChange={setShowDraftRestore}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unsaved Draft Found</DialogTitle>
            <DialogDescription>
              We found an unsaved draft for this task. Would you like to restore it and continue working?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-0.5 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowDraftRestore(false); clearDraft(); }}>
              Discard
            </Button>
            <Button onClick={handleRestoreDraft} className="bg-[#006699] hover:bg-[#005580]">
              Restore Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Blocker Dialog */}
      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' ? blocker.reset?.() : null}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-3xl border-slate-200">
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-0.5 text-xl font-medium text-slate-800">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <AlertCircle size={18} strokeWidth={3} />
              </div>
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2 font-medium">
              You have unsaved changes in this task. Are you sure you want to leave this page? Your unsaved changes might be lost (though a draft is usually saved).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl font-medium border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => blocker.reset?.()}>
              Stay on Page
            </Button>
            <Button type="button" variant="default" className="flex-1 rounded-xl font-medium bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg" onClick={() => blocker.proceed?.()}>
              Leave Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCameraModalOpen} onOpenChange={setIsCameraModalOpen}>
        <DialogContent className="rounded-3xl max-w-2xl p-0 border-none shadow-2xl bg-white overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Camera size={18} className="text-[#006699]" />
              Capture Attachment
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Take a photo and upload it as a Task attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 overflow-y-auto flex-1">
            <CameraComp
              companyNo={authCompanies?.[0]?.HeadOfficeNo || authCompanies?.[0]?.headOfficeNo || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1}
              formNo={1547}
              fileNamePrefix="task-capture"
              className="border-slate-100 shadow-none"
              onUploaded={handleCameraAttachmentUploaded}
              onCancel={() => setIsCameraModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      {/* Standalone Sub-Task Form Modal */}
      <Dialog open={isStandaloneSubtaskModalOpen} onOpenChange={setIsStandaloneSubtaskModalOpen}>
        <DialogContent className="rounded-3xl w-[95vw] max-w-2xl p-0 border-none shadow-2xl bg-white overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-lg font-medium text-slate-800 tracking-tight flex items-center gap-2">
                <FileText size={20} className="text-[#006699]" />
                Add Sub-Task
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                Enter details to add a new sub-task.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <FormProvider {...standaloneSubtaskForm}>
              <form id="standaloneSubtaskForm" onSubmit={standaloneSubtaskForm.handleSubmit(async (data) => {
                if (!initialData?.taskNo) {
                  const newFakeTaskNo = -Date.now();
                  const savedTask = {
                    taskNo: newFakeTaskNo,
                    code: '',
                    title: data.title,
                    status: 'Draft',
                    ownerLoginNo: data.ownerLoginNo,
                    assignedDisplayName: data.assignedDisplayName || '-',
                    endDate: data.endDate || null,
                    completionDate: data.completionDate || null,
                    completionRemark: data.completionRemark || null,
                    type_No: data.type_No || null,
                    operTaskTypeNo: data.type_No || null,
                  };
                  setLocalSubtasks(prev => [...prev, savedTask]);
                  toast.success('Sub-task added');
                  standaloneSubtaskForm.reset();
                } else {
                  try {
                    const payload = {
                      operTaskNo: null,
                      parentTaskNo: initialData.taskNo,
                      operTaskTypeNo: data.type_No ? parseInt(data.type_No) : null,
                      title: data.title,
                      ownerLoginNo: data.ownerLoginNo ? parseInt(data.ownerLoginNo) : 0,
                      endDate: data.endDate || null,
                      completionRemark: data.completionRemark || null,
                      completionDate: data.completionDate || null
                    };
                    const response = await apiService.post<{ success: boolean; data: any; message?: string }>('/api/crm/tasks/subtasks/save', payload);
                    
                    if (response.success) {
                      toast.success(response.message || 'Sub-task saved successfully');
                      fetchSubtasksSilent();
                      standaloneSubtaskForm.reset();
                    } else {
                      toast.error(response.message || 'Failed to save sub-task');
                    }
                  } catch (err: any) {
                    toast.error(err.message || 'An error occurred while saving the sub-task');
                  }
                }
              })} className="space-y-4">

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-medium text-xs">Sub-Task Title <span className="text-red-500">*</span></Label>
                  <Input
                    {...standaloneSubtaskForm.register("title")}
                    className="w-full text-sm rounded-xl h-10 border-slate-300 focus-visible:ring-[#006699]/30 font-medium"
                    placeholder="Enter sub-task title..."
                  />
                  {standaloneSubtaskForm.formState.errors.title && (
                    <span className="text-xs text-red-500 font-semibold">{standaloneSubtaskForm.formState.errors.title.message as string}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-medium text-xs">Type</Label>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="type_No"
                      render={({ field }) => (
                        <Combobox
                          options={fillValues?.type?.map(t => ({ label: t["Task Type"], value: t.OperTaskTypeNo.toString() })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select Type"
                          className="w-full text-sm rounded-xl h-10 border-slate-300"
                        />
                      )}
                    />
                  </div>

                  {/* Task Owner */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-medium text-xs">Task Owner <span className="text-red-500">*</span></Label>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="ownerLoginNo"
                      render={({ field }) => (
                        <UserCombobox
                          value={field.value}
                          onChange={(user) => {
                            field.onChange(user.loginNo.toString());
                            standaloneSubtaskForm.setValue("assignedDisplayName", user.printingName || "");
                          }}
                          placeholder="Select Owner"
                          modal={true}
                          className="w-full text-sm rounded-xl h-10 border-slate-300"
                        />
                      )}
                    />
                    {standaloneSubtaskForm.formState.errors.ownerLoginNo && (
                      <span className="text-xs text-red-500 font-semibold">{standaloneSubtaskForm.formState.errors.ownerLoginNo.message as string}</span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-medium text-xs">Due Date</Label>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <DateTimePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? date.toISOString() : "")}
                          placeholder="Select date & time"
                        />
                      )}
                    />
                  </div>

                  {/* Completion Date */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-medium text-xs">Completion Date</Label>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="completionDate"
                      render={({ field }) => (
                        <DateTimePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? date.toISOString() : "")}
                          placeholder="Select date & time"
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Completion Remark */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-slate-700 font-medium text-xs">Completion Remark</Label>
                  <Textarea
                    {...standaloneSubtaskForm.register("completionRemark")}
                    className="w-full text-sm rounded-xl min-h-[80px] border-slate-300 focus-visible:ring-[#006699]/30 resize-y custom-scrollbar"
                    placeholder="Enter completion remarks..."
                  />
                </div>

              </form>
            </FormProvider>
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsStandaloneSubtaskModalOpen(false)} className="rounded-xl text-slate-600 hover:text-slate-800">
              Close
            </Button>
            <Button type="submit" form="standaloneSubtaskForm" className="rounded-xl bg-[#006699] hover:bg-[#005580] text-white">
              <CheckCircle size={16} className="mr-2" /> Add Sub-Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
