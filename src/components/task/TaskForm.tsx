/* eslint-disable @typescript-eslint/no-explicit-any -- TaskForm maps loosely-typed API payloads throughout */
import { useForm, Controller, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info, Users, TrendingUp, CheckCircle, Plus, Trash2, UserPlus, History, Check, FileText, Paperclip, UploadCloud, Trash, Image, RefreshCw, X, Sparkles, Edit2, ExternalLink, AlertCircle, Camera, ChevronUp, ChevronDown, Bell, FileEdit, Layers, type LucideIcon } from 'lucide-react';
import { BrandLoader, InlineLoader } from '@/components/ui/BrandLoader';
import { Task, TaskStatus } from '@/types/task';
import { attachmentService } from '@/services/attachmentService';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';
import { useTaskStore } from '@/store/useTaskStore';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { InlineAttachmentRename } from '@/components/master/shared/InlineAttachmentRename';
import { useConfirmDelete } from '@/components/master/shared/useConfirmDelete';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { FieldInfoControl } from '@/components/ui/info-tooltip';
import { TagInput } from '@/components/ui/TagInput';
import { cn } from '@/lib/utils';
import { SortableHeader } from '@/components/shared/useTableSort';
import { getStatusTextClass, getStatusChipClass, getStatusDotClass, filterSelectableStatuses, resolveCanonicalStatus, STATUS_TRANSITIONS, statusMatchesPill } from '@/lib/taskStatusGroups';
import {
  ALLOWED_UPLOAD_EXTENSIONS_LABEL,
  ALLOWED_UPLOAD_HELPER_TEXT,
  ALLOWED_UPLOAD_TYPES_LABEL,
  UPLOAD_ACCEPT_ATTR,
  validateUploadFile,
} from '@/lib/allowedUploadFiles';
import { sortByLabel } from '@/lib/sortOptions';
import { formatDateOnly, toUtcIso, toUtcIsoOrEmpty } from '@/lib/dateTime';
import {
  formatReminderSummary,
  guessDailyFrequencyNo,
  parseReminderFromApi,
  resolveFrequencyLabel,
} from '@/lib/priorityReminder';
import { motion } from 'framer-motion';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { canUserChangeTaskAssignee } from '@/lib/taskAccess';
import { Combobox } from '@/components/ui/Combobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { TruncatedText } from '@/components/master/shared/TruncatedCellTip';
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
const CameraComp = lazy(() => import('@/components/ui/CameraComp'));
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';



import { useNavigate, useSearchParams, useBlocker, Link } from 'react-router-dom';
import { taskUrl } from '@/lib/dealMonitor';
import { useSettings } from '@/hooks/useSettings';

const standaloneSubtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  ownerLoginNo: z.string().min(1, 'Task Assign To is required'),
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
  type_No: z.string().optional(),
  folder_No: z.string().optional(),
  category_No: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  company: z.string().min(1, 'Company is required'),
  location_No: z.string().min(1, 'Location is required'),
  owner_user_No: z.string().min(1, 'Task Assigned To is required'),
  originator_user_No: z.string().min(1, 'Task Assign By is required'),
  status: z.string().min(1, 'Status is required'),
  isPrivate: z.boolean().optional().default(false),
  start_date: z.string().optional(),
  end_date: isSubTask ? z.string().min(1, 'Due Date is required for sub-tasks') : z.string().optional(),
  completionDate: z.string().optional(),
  completionRemark: z.string().max(500, 'Remark cannot exceed 500 characters').optional(),
  road_block_remarks: z.array(z.object({
    id: z.string(),
    date: z.string().min(1, 'Date is required'),
    remark: z.string().min(1, 'Remark is required'),
    proposedSolution: z.string().optional(),
    status_No: z.string().min(1, 'Status is required'),
  })).optional().default([]),
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
  })).superRefine((items, ctx) => {
    const seen = new Set();
    items.forEach((item, index) => {
      const desc = item.description.trim().toLowerCase();
      if (desc && seen.has(desc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate checklist items are not allowed",
          path: [index, 'description']
        });
      }
      seen.add(desc);
    });
  }).optional().default([]),
  sub_tasks: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    ownerLoginNo: z.string().min(1, 'Task Assign To is required'),
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
  execution_logs: z.array(z.object({
    id: z.string(),
    date: z.string().min(1, 'Date is required'),
    remark: z.string().min(1, 'Remark is required'),
  })).optional().default([]),
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

    if (!data.business_benefit_description || data.business_benefit_description.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Benefit Description is required',
        path: ['business_benefit_description'],
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
  /** When true, form is view-only (e.g. General user viewing parent task). */
  readOnly?: boolean;
}

interface TaskFillValues {
  priority: { OperTaskPriorityNo: number; Priority: string; Code: string; PriorityDuration?: number; PriorityDurationFrequencyNo?: number; ColorCoding?: string; IsReminderEnabled?: boolean; isReminderEnabled?: boolean; ReminderLeadDays?: number; reminderLeadDays?: number; ReminderFrequencyNo?: number; reminderFrequencyNo?: number; IsOverdueReminderEnabled?: boolean; isOverdueReminderEnabled?: boolean }[];
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

const statusTransitions: Record<string, string[]> = STATUS_TRANSITIONS;

// The backend stores both the Task Execution Log and Road Block Remarks in a single
// `executionChallenges` array, distinguished by `typeNo` (1 = execution log, 2 = road block).
// This splits that array back into the two form-side field arrays when loading a task.
const splitExecutionChallenges = (challenges?: any[] | null) => {
  const list = Array.isArray(challenges) ? challenges : [];
  const toDateInputValue = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return toUtcIsoOrEmpty(d);
  };
  const execution_logs = list
    .filter((c: any) => Number(c.typeNo ?? c.TypeNo) === 1)
    .map((c: any, idx: number) => ({
      id: (c.operTaskExecutionChallengeNo ?? c.id ?? `${idx}-log`).toString(),
      date: toDateInputValue(c.logDate ?? c.LogDate),
      remark: c.remarks ?? c.Remarks ?? '',
    }));
  const road_block_remarks = list
    .filter((c: any) => Number(c.typeNo ?? c.TypeNo) === 2)
    .map((c: any, idx: number) => ({
      id: (c.operTaskExecutionChallengeNo ?? c.id ?? `${idx}-block`).toString(),
      date: toDateInputValue(c.logDate ?? c.LogDate),
      remark: c.remarks ?? c.Remarks ?? '',
      proposedSolution: c.proposedSolution ?? c.ProposedSolution ?? '',
      status_No: (c.statusNo ?? c.StatusNo ?? '').toString(),
    }));
  return { execution_logs, road_block_remarks };
};


function FormSection({ title, icon: Icon, children, headerAction, tourId }: { title?: string, icon?: LucideIcon, children?: React.ReactNode, headerAction?: React.ReactNode, tourId?: string }) {
  return (
    <section data-page-tour={tourId} className="crm-form-section rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
      <div className="crm-form-section-head flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className="crm-form-section-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
              <Icon size={14} strokeWidth={1.75} />
            </span>
          )}
          {title && <h3 className="text-sm font-semibold text-slate-100 tracking-tight truncate">{title}</h3>}
        </div>
        {headerAction}
      </div>
      <div className="p-3 sm:p-4">
        {children}
      </div>
    </section>
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

/** Session-local IDs for optimistic UI (avoid Date.now/Math.random for React Compiler purity). */
let taskFormClientIdSeq = 0;
const nextClientId = () => {
  taskFormClientIdSeq += 1;
  return `c-${taskFormClientIdSeq}`;
};
const nextFakeTaskNo = () => {
  taskFormClientIdSeq += 1;
  return -taskFormClientIdSeq;
};
const nextClientTaskNo = () => {
  taskFormClientIdSeq += 1;
  return 100 + taskFormClientIdSeq;
};

export function TaskForm({ initialStatus, initialData, parentTask: parentTaskProp, onComplete, onRefreshData, onSaveStateChange, readOnly = false }: TaskFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentTaskNoQuery = searchParams.get('parentTaskNo');
  const parentTaskNo = parentTaskNoQuery ? parseInt(parentTaskNoQuery) : (initialData?.parent_task_No || null);
  const isSubTask = parentTaskNo !== null && parentTaskNo > 0;
  const isDealMonitorContext = initialData?.categoryName?.toLowerCase() === 'deal monitor' || searchParams.get('category')?.toLowerCase() === 'deal monitor';
  const { isHideType, isHideFolder, categoryFieldCaption, typeFieldCaption, tagCaption, isHideDetailSection } = useSettings();
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const formRights = useAuthStore(state => state.formRights) || {};
  const [activeMasterType, setActiveMasterType] = useState<string | null>(null);

  const { addTask, updateTask, fetchFillValues, selectedFolder, tasks } = useTaskStore();
  const [localParentTask, setLocalParentTask] = useState<Task | null>(null);
  const parentTask = parentTaskProp || tasks.find(t => t.taskNo === parentTaskNo) || localParentTask;

  const mapApiSubtasks = (subTasks: any[]) =>
    subTasks.map((st: any) => ({
      taskNo: st.operTaskNo || st.taskNo,
      code: st.code,
      title: st.title,
      status: st.status?.statusName || st.status || 'Assigned',
      start_date: st.startDate || st.start_date,
      categoryName: st.category?.categoryName || st.categoryName,
      typeName: st.type?.typeName || st.typeName,
      priority: st.priority?.priorityName || st.priority,
      assignedDisplayName: st.assignedTo?.displayName || st.assignedTo?.userName || st.assignedDisplayName || '',
      ownerLoginNo: st.assignedTo?.id || st.assignedTo?.loginNo || st.owner?.id || st.ownerLoginNo || st.owner_user_No || '',
      originatorLoginNo: st.originator?.id || st.originator?.loginNo || st.originatorLoginNo || st.createdBy?.id || '',
      endDate: st.endDate || st.end_date || '',
      completionDate: st.completionDate || '',
      completionRemark: st.completionRemark || '',
      type_No: st.type?.operTaskTypeNo || st.operTaskTypeNo || '',
      operTaskTypeNo: st.type?.operTaskTypeNo || st.operTaskTypeNo || '',
      category_No: st.category?.operTaskCategoryNo || st.operTaskCategoryNo || '',
      priority_No: st.priority?.operTaskPriorityNo || st.operTaskPriorityNo || st.priority_No || '',
      status_No: st.status?.operTaskStatusNo || st.operTaskStatusNo || st.status_No || '',
    }));

  const buildLocalSubtasks = (data: typeof initialData, storeTasks: typeof tasks) => {
    if (data?.subTasks && data.subTasks.length > 0) {
      return mapApiSubtasks(data.subTasks);
    }
    return data?.taskNo ? storeTasks.filter((t) => t.parent_task_No === data.taskNo) : [];
  };

  const [localSubtasks, setLocalSubtasks] = useState<any[]>(() => buildLocalSubtasks(initialData, tasks));
  const subtasksSyncKey =
    initialData?.subTasks && initialData.subTasks.length > 0
      ? `api:${initialData.taskNo}:${initialData.subTasks.length}`
      : `store:${initialData?.taskNo ?? 'new'}:${initialData?.taskNo ? tasks.filter((t) => t.parent_task_No === initialData.taskNo).length : 0}`;
  const [prevSubtasksSyncKey, setPrevSubtasksSyncKey] = useState(subtasksSyncKey);
  if (subtasksSyncKey !== prevSubtasksSyncKey) {
    setPrevSubtasksSyncKey(subtasksSyncKey);
    setLocalSubtasks(buildLocalSubtasks(initialData, tasks));
  }

  const fetchSubtasksSilent = async () => {
    if (!initialData?.taskNo) return;
    try {
      const response = await apiService.get<{ success: boolean; data: any; message?: string }>(`/api/crm/tasks/load-data/${initialData.taskNo}`);
      if (response.success && response.data?.subTasks) {
        setLocalSubtasks(mapApiSubtasks(response.data.subTasks));
      }
    } catch (err) {
      console.error("Failed to silently refresh subtasks", err);
    }
  };

  const { company: authCompanies, user: authUser } = useAuthStore();

  /** Assign To editable only for the original assigner (or on create). Uses persisted originator, not the live form field. */
  const canChangeAssignee = canUserChangeTaskAssignee(authUser, initialData, {
    isNewTask: !initialData?.taskNo,
  });
  const [selectedCollabTeam, setSelectedCollabTeam] = useState<string>(
    () => initialData?.collaboratorUserGroupNo?.toString() || ""
  );
  const [selectedInformTeam, setSelectedInformTeam] = useState<string>(
    () => initialData?.infromToUserGroupNo?.toString() || ""
  );
  const collabTeamKey = initialData?.collaboratorUserGroupNo?.toString() || "";
  const informTeamKey = initialData?.infromToUserGroupNo?.toString() || "";
  const [prevCollabTeamKey, setPrevCollabTeamKey] = useState(collabTeamKey);
  const [prevInformTeamKey, setPrevInformTeamKey] = useState(informTeamKey);
  if (collabTeamKey !== prevCollabTeamKey) {
    setPrevCollabTeamKey(collabTeamKey);
    setSelectedCollabTeam(collabTeamKey);
  }
  if (informTeamKey !== prevInformTeamKey) {
    setPrevInformTeamKey(informTeamKey);
    setSelectedInformTeam(informTeamKey);
  }
  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: number; name: string } | null>(null);
  const [attachmentToRename, setAttachmentToRename] = useState<{ id: number; name: string } | null>(null);
  const [isRenamingAttachment, setIsRenamingAttachment] = useState(false);
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  const rowDeleteConfirm = useConfirmDelete('item');
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
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
        } else if (activeMasterType === 'benefit-type' && updatedValues?.benefitType) {
          const matched = updatedValues.benefitType.find((b: any) => {
            const bName = b["Business Benefit"] || b.BusinessBenefitTypeName || b.businessBenefitTypeName || b.BenefitTypeName || b.benefitTypeName || b.typeName || b.Name || b.name || '';
            return bName.toLowerCase() === label.toLowerCase();
          });
          if (matched) resolvedId = (matched.BusinessBenefitTypeNo || '').toString();
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
        } else if (activeMasterType === 'benefit-type') {
          form.setValue('business_benefit_type_No', resolvedId);
          form.clearErrors('business_benefit_type_No');
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

  const standaloneAssignedDisplayName = useWatch({
    control: standaloneSubtaskForm.control,
    name: "assignedDisplayName",
  });

  const executionChallengeDefaults = splitExecutionChallenges(initialData?.executionChallenges);

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
      type_No: initialData?.type_No?.toString() || (isSubTask && parentTask ? parentTask.type_No?.toString() || '' : '') || searchParams.get('type_No') || '',
      folder_No: (initialData as any)?.folder_No?.toString() || (initialData as any)?.folderNo?.toString() || (isSubTask && parentTask ? (parentTask.project_No || (parentTask as any).folder_No || (parentTask as any).folderNo)?.toString() : '') || selectedFolder?.TaskFolderNo?.toString() || searchParams.get('folder_No') || '1',
      category_No: initialData?.category_No?.toString() || (isSubTask && parentTask ? parentTask.category_No.toString() : '') || searchParams.get('category_No') || '',
      location_No: initialData?.location_No?.toString() || (isSubTask && parentTask ? parentTask.location_No.toString() : '') || searchParams.get('location_No') || '',
      start_date: initialData?.start_date ? toUtcIsoOrEmpty(initialData.start_date) : (dateParam ? toUtcIsoOrEmpty(dateParam) : (searchParams.get('start_date') ? toUtcIsoOrEmpty(searchParams.get('start_date') as string) : toUtcIsoOrEmpty(new Date()))),
      end_date: initialData?.end_date ? toUtcIsoOrEmpty(initialData.end_date) : (searchParams.get('end_date') ? toUtcIsoOrEmpty(searchParams.get('end_date') as string) : ''),
      completionDate: initialData?.completionDate ? toUtcIsoOrEmpty(initialData.completionDate) : '',
      completionRemark: initialData?.completionRemark || '',
      road_block_remarks: executionChallengeDefaults.road_block_remarks,
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
      execution_logs: executionChallengeDefaults.execution_logs,
      status: initialData?.status || initialStatus || 'Assigned',
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
              estimated_effort_unit: resolveFrequencyValue(d.estimatedEfforts?.frequency?.frequencyNo || d.estimatedEfforts?.frequency?.frequencyName || '1'),
              is_business_benefit_applicable: d.isBusinessBenefitApplicable || false,
              business_benefit_type_No: d.businessBenefit?.businessBenefitType?.businessBenefitTypeNo || d.businessBenefit?.businessBenefitTypeNo || '',
              business_benefit_description: d.businessBenefit?.businessBenefitDescription || '',
              estimated_benefit_amount: d.businessBenefit?.estimatedBenefitAmount || '',
              actual_benefit_amount: d.businessBenefit?.actualBenefitAmount || '',
              benefit_period: 'One Time',
              status_No: d.status?.operTaskStatusNo || 1,
              status: d.status?.statusName || 'Assigned',
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
            form.setValue('type_No', mappedParent.type_No?.toString() || '');
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
  }, [form, form.watch, form.formState.isDirty, saveDraft, isRestoringRef]);

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
  }, [localSubtasks, form, form.formState.isDirty, saveDraft, isRestoringRef]);

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
      !isSubmitSuccessful &&
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

  const { fields: executionLogFields, append: appendExecutionLog, remove: removeExecutionLog } = useFieldArray({
    control: form.control,
    name: "execution_logs"
  });

  const [collabSortCol, setCollabSortCol] = useState<string | null>('userName');
  const [collabSortDesc, setCollabSortDesc] = useState(false);
  const [informSortCol, setInformSortCol] = useState<string | null>('userName');
  const [informSortDesc, setInformSortDesc] = useState(false);

  const sortPeopleRows = useCallback(
    (
      rows: Array<{ userName?: string; displayName?: string; email?: string; isFromTeam?: boolean; loginNo?: number | string }>,
      key: string,
      desc: boolean
    ) => {
      const team = rows.filter((r) => r.isFromTeam);
      const empty = rows.filter((r) => !r.isFromTeam && !r.loginNo && !r.userName && !r.displayName);
      const filled = rows.filter((r) => !r.isFromTeam && (r.loginNo || r.userName || r.displayName));
      const sorted = [...filled].sort((a, b) => {
        const av = String((a as Record<string, unknown>)[key] ?? '');
        const bv = String((b as Record<string, unknown>)[key] ?? '');
        const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true });
        return desc ? -cmp : cmp;
      });
      return [...team, ...sorted, ...empty];
    },
    []
  );

  const handleCollabSort = (key: string) => {
    const nextDesc = collabSortCol === key ? !collabSortDesc : false;
    setCollabSortCol(key);
    setCollabSortDesc(nextDesc);
    const rows = form.getValues('collaborators') || [];
    replaceCollab(sortPeopleRows(rows, key, nextDesc) as any);
  };

  const handleInformSort = (key: string) => {
    const nextDesc = informSortCol === key ? !informSortDesc : false;
    setInformSortCol(key);
    setInformSortDesc(nextDesc);
    const rows = form.getValues('informed_to') || [];
    replaceInform(sortPeopleRows(rows, key, nextDesc) as any);
  };

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist, replace: replaceChecklist } = useFieldArray({
    control: form.control,
    name: "check_list"
  });

  const { fields: subtaskFields, append: appendSubtask, remove: removeSubtask, replace: replaceSubtask } = useFieldArray({
    control: form.control,
    name: "sub_tasks"
  });

  const { fields: roadBlockFields, append: appendRoadBlock, remove: removeRoadBlock } = useFieldArray({
    control: form.control,
    name: "road_block_remarks"
  });

  // Subtask "Type" field must always show for Deal Monitor tasks, irrespective of isHideType.
  const selectedCategoryNo = form.watch('category_No');
  const isDealMonitorCategory = initialData?.categoryName?.toLowerCase() === 'deal monitor'
    || fillValues?.category.find(c => c.OperTaskCategoryNo.toString() === selectedCategoryNo)?.Category?.toLowerCase() === 'deal monitor';
  const showSubtaskType = !isHideType || isDealMonitorCategory;

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
      form.setError(`sub_tasks.${index}.ownerLoginNo`, { type: 'manual', message: 'Assign To is required' });
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
        status: 'Assigned',
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
      id: nextClientId(),
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
              status: 'Assigned',
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
        const response = await fetchFillValues(initialCompany.toString());
        if (response) {
          setFillValues(response as TaskFillValues);
        }

        // Set default values if not editing
        if (!initialData) {
          form.setValue('status', 'Assigned');
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
      const resetExecutionChallenges = splitExecutionChallenges(initialData.executionChallenges);
      form.reset({
        title: initialData.title,
        code: initialData.code || '',
        description: initialData.description,
        isPrivate: initialData.isPrivate || false,
        priority_No: initialData.priority_No.toString(),
        type_No: initialData.type_No?.toString() || '',
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
        road_block_remarks: resetExecutionChallenges.road_block_remarks,
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
        execution_logs: resetExecutionChallenges.execution_logs,
        attachments: (initialData.attachments || initialData.attachments || []).map((a: any) => ({
          id: a.id || a.docNo || a.operTaskAttachmentDetailNo || null,
          name: a.docName || a.name || a.fileName || a.storedFileName || 'attachment',
          size: a.docSize || a.size || null,
          storedFileName: a.storedFileName || '',
          storedFilePath: a.storedFilePath || '',
          relativePath: a.relativePath || a.storedFilePath || ''
        })),
      });
      // Collab / inform team selects sync from initialData during render (see collabTeamKey above)

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
  }, [initialData, form, authCompanies, selectedFolder?.TaskFolderNo]);

  // Dynamically default the folder field to the navbar's selected workspace folder on task creation
  useEffect(() => {
    if (!initialData && selectedFolder && !form.getValues('folder_No')) {
      form.setValue('folder_No', selectedFolder.TaskFolderNo.toString());
    }
  }, [selectedFolder, selectedFolder?.TaskFolderNo, initialData, form]);

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
                email: member.email || "",
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
                email: member.email || "",
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

    const hiddenFields = [
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

      // If the field is inside the hidden 'Show More' section, expand it first
      const isFieldHidden = isHideDetailSection && !showMoreDetails && hiddenFields.includes(firstErrorField);
      if (isFieldHidden) {
        setShowMoreDetails(true);
      }

      // Add a slight delay to allow React to render the expanded section if it was hidden
      setTimeout(() => {
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
      }, isFieldHidden ? 100 : 0);
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
      const result = validateUploadFile(file);
      if (!result.ok) {
        failed.push({
          name: file.name,
          size: file.size,
          reason: result?.reason,
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

  const confirmRenameAttachment = async (newName: string) => {
    if (!attachmentToRename) return;
    const { id } = attachmentToRename;
    setIsRenamingAttachment(true);
    try {
      if (id) {
        await attachmentService.renameAttachment(id, newName, 1547);
      }
      const currentAttachments = form.getValues('attachments') || [];
      const updatedAttachments = currentAttachments.map((a: any) =>
        a.id === id ? { ...a, name: newName } : a
      );
      form.setValue('attachments', updatedAttachments, { shouldDirty: true });
      toast.success("Attachment renamed successfully.");
      setAttachmentToRename(null);
    } catch (error) {
      console.error('Failed to rename attachment on server:', error);
      toast.error('Failed to rename attachment');
    } finally {
      setIsRenamingAttachment(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (uploadingFiles.some(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'verifying')) {
      toast.error("Please wait for all attachments to finish uploading before saving the task.");
      return;
    }
    setPendingSaveData(data);
    setShowConfirmDialog(true);
  };

  const proceedSubmit = async (data: any) => {
    console.log('proceedSubmit triggered with data:', data);

    // Guard: only original assigner may change Assign To (payload must match persisted owner if locked)
    if (initialData?.taskNo && !canChangeAssignee) {
      const originalOwner = initialData.owner_user_No != null ? String(initialData.owner_user_No) : '';
      if (String(data.owner_user_No || '') !== originalOwner) {
        data.owner_user_No = originalOwner;
        form.setValue('owner_user_No', originalOwner);
        toast.error('Only the user who assigned this task can change Assign To.');
      }
    }

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

    // Task Execution Log (typeNo 1) and Road Block Remarks (typeNo 2) save into one combined array
    const executionChallenges = [
      ...(data.execution_logs || []).map((r: any) => ({
        typeNo: 1,
        logDate: r.date ? toUtcIso(r.date) : null,
        remarks: r.remark || null,
        proposedSolution: null,
        statusNo: null,
      })),
      ...(data.road_block_remarks || []).map((r: any) => ({
        typeNo: 2,
        logDate: r.date ? toUtcIso(r.date) : null,
        remarks: r.remark || null,
        proposedSolution: r.proposedSolution || null,
        statusNo: parseInt(r.status_No) || null,
      })),
    ];

    const payload = {
      operTaskNo: initialData ? initialData.taskNo : null,
      companyNo: parseInt(data.company) || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1,
      OperTaskCompanyNo: parseInt(data.company) || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1,
      title: data.title || null,
      code: data.code || null,
      description: data.description || null,
      executionChallenges,
      isPrivate: data.isPrivate,
      operTaskPriorityNo: parseInt(data.priority_No) || null,
      operTaskCategoryNo: parseInt(data.category_No) || null,
      operTaskTypeNo: isHideType ? null : (parseInt(data.type_No) || null),
      categoryNo: parseInt(data.category_No) || null,
      tags: data.tags && data.tags.length > 0 ? data.tags.join(',') : null,
      collaboratorUserGroupNo: parseInt(selectedCollabTeam) || null,
      infromToUserGroupNo: parseInt(selectedInformTeam) || null,
      originatorLoginNo: parseInt(data.originator_user_No) || null,
      ownerLoginNo: parseInt(data.owner_user_No) || null,
      parentTaskNo: parentTaskNo || null,
      operTaskLocationNo: parseInt(data.location_No) || null,
      startDate: data.start_date ? toUtcIso(data.start_date) : null,
      endDate: data.end_date ? toUtcIso(data.end_date) : null,
      completionDate: data.completionDate ? toUtcIso(data.completionDate) : null,
      completionRemark: data.completionRemark || null,
      estimatedEfforts: parseFloat(data.estimated_effort_value) || null,
      estimatedEffortsFequencyNo: data.estimated_effort_unit ? parseInt(data.estimated_effort_unit) : null,
      isBusinessBenefitApplicable: data.is_business_benefit_applicable,
      businessBenefitTypeNo: data.is_business_benefit_applicable ? (parseInt(data.business_benefit_type_No) || null) : null,
      businessBenefitDescription: data.is_business_benefit_applicable ? (data.business_benefit_description || null) : null,
      estimatedBenefitAmount: data.is_business_benefit_applicable ? (parseFloat(data.estimated_benefit_amount) || null) : null,
      actualBenefitAmount: data.is_business_benefit_applicable ? (parseFloat(data.actual_benefit_amount) || null) : null,
      benefitFrequencyNo: data.is_business_benefit_applicable ? (benefitFrequencyMap[data.benefit_period] || null) : null,
      statusNo: statusNo || null,
      folderNo: isHideFolder ? null : (parseInt(data.folder_No) || selectedFolder?.TaskFolderNo || null),
      isAllday: data.isAllDay,
      colorCoding: data.calendarColor || null,
      createdBy: authUser?.loginNo || authUser?.LoginNo || 1,
      createdDate: toUtcIso(new Date()),
      checkLists: data.check_list.map((item: any, index: number) => ({
        description: item.description || null,
        sequenceNo: index + 1,
        isChecked: item.completed || false,
        checkedOn: toUtcIso(new Date())
      })),
      subTasks: [
        ...(!initialData ? localSubtasks.map((st: any) => ({
          operTaskNo: null,
          operTaskTypeNo: st.type_No ? parseInt(st.type_No) : (st.operTaskTypeNo ? parseInt(st.operTaskTypeNo) : null),
          title: st.title || null,
          description: st.description || null,
          ownerLoginNo: st.ownerLoginNo ? parseInt(st.ownerLoginNo) : null,
          endDate: st.endDate ? toUtcIso(st.endDate) : null,
          completionRemark: st.completionRemark || null,
          completionDate: st.completionDate ? toUtcIso(st.completionDate) : null,
          statusNo: 1
        })) : []),
        ...(data.sub_tasks || []).map((st: any) => ({
          operTaskNo: st.operTaskNo || null,
          operTaskTypeNo: st.type_No ? parseInt(st.type_No) : null,
          title: st.title || null,
          description: st.description || null,
          ownerLoginNo: st.ownerLoginNo ? parseInt(st.ownerLoginNo) : null,
          endDate: st.endDate ? toUtcIso(st.endDate) : null,
          completionRemark: st.completionRemark || null,
          completionDate: st.completionDate ? toUtcIso(st.completionDate) : null,
          statusNo: 1
        }))
      ],
      customFields: data.custom_fields.map((cf: any) => ({
        customFieldNo: parseInt(cf.customFieldNo) || null,
        fieldValue: cf.fieldValue || ''
      })),
      comments: [],
      effortLogs: data.actual_efforts.map((effort: any) => ({
        LoginNo: effort.createdBy?.loginNo || null,
        effortDate: effort.date ? toUtcIso(effort.date) : null,
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
          taskNo: response?.data?.operTaskNo || nextClientTaskNo()
        });
      }
      clearDraft();
      setIsSubmitSuccessful(true);

      setTimeout(() => {
        form.reset(data); // Reset form state to clear isDirty flag
        toast.success('Data saved successfully.');
        if (onComplete) onComplete();
      }, 0);
    } catch (error: any) {
      console.error('Failed to save task:', error);

      let mappedFieldError = false;
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
              mappedFieldError = true;
              form.setError(formKey, {
                type: 'manual',
                message: message
              });
            }
          });
        }
      }
      if (!mappedFieldError && shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to save task. Please try again.'));
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


  const selectedPriorityReminderText = useMemo(() => {
    if (!fillValues?.priority || !selectedPriorityNo) return '';
    const priorityObj = fillValues.priority.find(
      (p) => p.OperTaskPriorityNo.toString() === selectedPriorityNo
    );
    if (!priorityObj) return '';
    const rule = parseReminderFromApi(priorityObj as any, priorityObj.Priority);
    const freqNo = rule.frequencyNo || guessDailyFrequencyNo(fillValues.frequency as any);
    const label = resolveFrequencyLabel(freqNo, fillValues.frequency as any);
    return formatReminderSummary({ ...rule, frequencyNo: freqNo }, label);
  }, [fillValues, selectedPriorityNo]);



  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  if (isLoadingOptions) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BrandLoader size="sm" message="Loading application data" />
      </div>
    );
  }

  // Status flow — only the five canonical statuses
  const allowedStatuses = filterSelectableStatuses(fillValues?.status);
  const currentPill = resolveCanonicalStatus(currentStatus);
  const allowedNextPills = currentPill && initialData
    ? statusTransitions[currentPill] || []
    : [];

  const filteredStatuses = (() => {
    if (!initialData || currentPill === 'Complete' || currentPill === 'Cancelled') {
      return allowedStatuses;
    }
    // Legacy / unknown status → allow moving into any of the five
    if (!currentPill) return allowedStatuses;
    return allowedStatuses.filter((s) => {
      if (statusMatchesPill(s.Status, currentStatus || '')) return true;
      return allowedNextPills.some((pill) => statusMatchesPill(s.Status, pill));
    });
  })();

  // Company options from fillValues taskCompany, fallback to auth data
  const companyOptions = (fillValues?.taskCompany && fillValues.taskCompany.length > 0)
    ? fillValues.taskCompany.map(c => ({
      label: c.CompanyName || c.AliasName || c.Code || 'Unknown Company',
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

  const executionLogError = form.formState.errors.execution_logs;
  const hasExecutionLogError = executionLogError && !Array.isArray(executionLogError) && (executionLogError as any).message;

  return (
    <Card className="border-none shadow-none bg-transparent relative">
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-slate-900/10 backdrop-blur-md border-2 border-dashed border-[#0EA5E9] rounded-3xl flex flex-col items-center justify-center pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="bg-[var(--tm-surface)]/95 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-[var(--tm-border)]">
            <div className="h-16 w-16 bg-sky-500/15 rounded-2xl flex items-center justify-center text-[#0EA5E9] border border-sky-500/30 shadow-sm animate-bounce">
              <UploadCloud size={32} />
            </div>
            <h3 className="mt-4 text-base font-medium text-slate-100">Drop to Upload</h3>
            <p className="mt-2 text-xs font-medium text-slate-500">Release files anywhere to attach to this task.</p>
            <div className="mt-4 flex items-center gap-4 text-[10px] font-medium text-slate-400">
              <span>{ALLOWED_UPLOAD_TYPES_LABEL}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
              <span>Max 25MB</span>
            </div>
          </div>
        </div>
      )}
      <form
        id="task-form"
        onSubmit={readOnly ? (e) => e.preventDefault() : form.handleSubmit(onSubmit, onValidationError)}
        className="space-y-2.5"
        onDragEnter={readOnly ? undefined : handleDragEnter}
        onDragOver={readOnly ? undefined : handleDragOver}
        onDragLeave={readOnly ? undefined : handleDragLeave}
        onDrop={readOnly ? undefined : handleDrop}
      >
        {readOnly && (
          <div className="rounded-xl border border-[#0EA5E9]/30 bg-[#E5F6FD]/80 dark:bg-[#0C4A6E]/40 dark:border-[#38BDF8]/25 px-3.5 py-2.5 text-xs font-medium text-[#0369A1] dark:text-[#7DD3FC]">
            View only — you can review this task but cannot edit it. Edit is allowed only for tasks assigned to you.
          </div>
        )}

        <fieldset disabled={readOnly} className="min-w-0 space-y-2.5 border-0 p-0 m-0">

          {/* 1. Basic Information */}
          <FormSection
            title="Task Detail"
            icon={Info}
            tourId="task-form-detail"
            headerAction={
              <div className="flex flex-wrap items-center gap-0.5">
                <Controller
                  name="isPrivate"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-2 mr-2">
                      <Checkbox id="isPrivate" checked={field.value} onCheckedChange={field.onChange} />
                      <label htmlFor="isPrivate" className="text-xs font-medium text-slate-200 cursor-pointer">Private Task</label>
                    </div>
                  )}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">
                    Status
                    <span className="text-red-400 ml-0.5" aria-hidden>
                      *
                    </span>
                  </span>
                  <FieldControl error={form.formState.errors.status?.message}>
                    <Controller
                      name="status"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger
                            aria-required
                            className={cn(
                              'h-8 w-auto min-w-[128px] max-w-[168px] gap-2 rounded-full border px-3 text-xs font-semibold shadow-tm-control focus:ring-2 focus:ring-brand/20 focus:ring-offset-0 [&>span]:truncate',
                              getStatusChipClass(field.value)
                            )}
                          >

                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-[10px] min-w-[160px]">
                            {filteredStatuses.map((s) => (
                              <SelectItem key={s.StatusNo} value={s.Status} className="text-xs">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={cn('size-1.5 rounded-full', getStatusDotClass(s.Status))}
                                    aria-hidden
                                  />
                                  <span className={getStatusTextClass(s.Status)}>{s.Status}</span>
                                </span>
                              </SelectItem>
                            ))}
                            {filteredStatuses.length === 0 && (
                              <SelectItem value={currentStatus} disabled>
                                {currentStatus}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldControl>
                </div>
              </div>
            }
          >
            <div className="space-y-2.5">
              {initialData?.parentTask && (
                <div className="mb-1 flex items-center gap-1.5 border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 rounded-[8px] w-fit">
                  <ExternalLink size={12} className="text-blue-400" />
                  <span className="text-[11px] text-slate-300 font-medium">Parent Task:</span>
                  <Link to={taskUrl(initialData.parentTask.operTaskNo, isDealMonitorCategory ? 'deal monitor' : undefined)} className="text-[11px] font-semibold text-blue-400 hover:text-blue-800 hover:underline transition-colors">
                    {initialData.parentTask.title} ({initialData.parentTask.code})
                  </Link>
                </div>
              )}
              {/* Row 1: Task ID & Task Title */}
              <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2.5 items-start">
                <div className="space-y-1.5" id="form-group-code">
                  <FieldLabel>Task Code</FieldLabel>
                  <div className="h-10 flex items-center text-xs font-medium text-slate-500 select-none bg-[var(--tm-muted)] px-3 rounded-[8px] border border-[var(--tm-border)] whitespace-nowrap">
                    {form.watch('code') || 'AUTO-GEN-CODE'}
                  </div>
                </div>
                <div className="space-y-1.5 min-w-0" id="form-group-title">
                  <FieldLabel required>Task Title</FieldLabel>
                  <FieldControl error={form.formState.errors.title?.message}>
                    <Input placeholder="Enter task title" {...form.register('title')} className={cn("h-10 rounded-[8px] border-[var(--tm-border)]/80 text-xs text-slate-50 shadow-sm transition-all", form.formState.errors.title ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")} maxLength={200} />
                  </FieldControl>
                </div>
              </div>

              {/* Row 2: Task Description */}
              <div className="space-y-1.5" id="form-group-description">
                <FieldLabel>Task Description</FieldLabel>
                <FieldControl error={form.formState.errors.description?.message}>
                  <Textarea placeholder="Enter task description" className={cn("min-h-[60px] rounded-[8px] border-[var(--tm-border)]/80 p-3 leading-relaxed text-xs text-slate-50 shadow-sm transition-all", form.formState.errors.description ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")} {...form.register('description')} maxLength={1000} />
                </FieldControl>
              </div>

              {/* Row 4: Tags */}
              <FieldInfoControl info={tagCaption} className="space-y-1.5">
                <FieldLabel>Tags/Keywords</FieldLabel>
                <Controller
                  name="tags"
                  control={form.control}
                  render={({ field }) => (
                    <TagInput
                      tags={field.value || []}
                      onChange={field.onChange}
                      placeholder="Enter tags/keywords"
                      className="pr-9"
                    />
                  )}
                />
                <p className="mt-1 text-xs text-[#94a3b8]">Note: Press Enter or type a comma to add a tag.</p>
              </FieldInfoControl>
            </div>
          </FormSection>

          {!hiddenSections.includes('categories') && (
            <FormSection
              title="Category Detail"
              icon={Info}
              tourId="task-form-category"
            >
              {/* Row 3: Category, Type, Priority */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-2.5">
                <FieldInfoControl info={categoryFieldCaption} className="space-y-1.5" id="form-group-category_No">
                  <FieldLabel required>Category</FieldLabel>
                  <FieldControl error={form.formState.errors.category_No ? 'Category is required' : undefined}>
                    <Controller
                      name="category_No"
                      control={form.control}
                      render={({ field }) => (
                        <Combobox disabled={isSubTask || isDealMonitorContext} options={fillValues?.category.filter(c => c.Category.toLowerCase() !== 'all' && c.Category.toLowerCase() !== '[all]')
                          .filter(c => isDealMonitorContext || c.Category.toLowerCase() !== 'deal monitor')
                          .map(c => ({ label: c.Category, value: c.OperTaskCategoryNo.toString(), colorCoding: c.colorCoding || c.ColorCoding })) || []}
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                            handleCategoryChange(val);
                          }}
                          placeholder="Select category"
                          className={form.formState.errors.category_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                          onAddNew={formRights[1561]?.isSave ? () => {
                            setActiveMasterType('category');
                            setIsMasterCreateOpen(true);
                          } : undefined}
                          addNewLabel="Add New Category"
                        />
                      )}
                    />
                  </FieldControl>
                </FieldInfoControl>
                {
                  !isHideType &&
                  <FieldInfoControl info={typeFieldCaption} className="space-y-1.5" id="form-group-type_No">
                    <FieldLabel>Type</FieldLabel>
                    <FieldControl error={form.formState.errors.type_No ? 'Type is required' : undefined}>
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
                    </FieldControl>
                  </FieldInfoControl>
                }
                {
                  !isHideFolder &&
                  <div className="space-y-1.5" id="form-group-folder_No">
                    <FieldLabel>Folder</FieldLabel>
                    <FieldControl error={form.formState.errors.folder_No ? 'Folder is required' : undefined}>
                      <Controller
                        name="folder_No"
                        control={form.control}
                        render={({ field }) => (
                          <Combobox disabled={isSubTask} options={fillValues?.folder.map(f => ({ label: f["Folder Name"], value: f.TaskFolderNo.toString() })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select folder"
                            className={form.formState.errors.folder_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                            onAddNew={formRights[1542]?.isSave ? () => {
                              setActiveMasterType('folder');
                              setIsMasterCreateOpen(true);
                            } : undefined}
                            addNewLabel="Add New Folder"
                          />
                        )}
                      />
                    </FieldControl>
                  </div>
                }
                <div className="space-y-1.5" id="form-group-priority_No">
                  <FieldLabel required>Priority</FieldLabel>
                  <FieldControl error={form.formState.errors.priority_No ? 'Priority is required' : undefined}>
                    <Controller
                      name="priority_No"
                      control={form.control}
                      render={({ field }) => (
                        <Combobox disabled={isSubTask} options={fillValues?.priority.filter(p => p.Priority.toLowerCase() !== 'all' && p.Priority.toLowerCase() !== '[all]')
                          .map(p => ({ label: p.Priority, value: p.OperTaskPriorityNo.toString(), colorCoding: p.ColorCoding })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select priority"
                          sortAlphabetically={false}
                          className={form.formState.errors.priority_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                          onAddNew={formRights[1543]?.isSave ? () => {
                            setActiveMasterType('priority');
                            setIsMasterCreateOpen(true);
                          } : undefined}
                          addNewLabel="Add New Priority"
                        />
                      )}
                    />
                  </FieldControl>
                  {selectedPriorityReminderText ? (
                    <div className="flex items-start gap-1.5 rounded-[8px] border border-[#0EA5E9]/15 bg-[var(--tm-tint)]/35 px-2.5 py-1.5">
                      <Bell size={12} className="mt-0.5 shrink-0 text-[#0EA5E9]" strokeWidth={2} />
                      <p className="text-[10px] leading-snug text-slate-400">
                        <span className="font-semibold text-[#0EA5E9]">{selectedPriorityReminderText}</span>
                        <span className="block mt-0.5 text-slate-500">
                          Based on priority master. Notifications send when the reminder service is live.
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Row 4: Timeline & Effort */}
                {/* <div className="space-y-1.5 flex flex-col justify-end">
                  <Controller
                    name="isAllDay"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2 bg-[var(--tm-muted)]/70 border border-[var(--tm-border)]/80 px-4 rounded-[8px] shadow-sm transition-all hover:bg-[var(--tm-muted)]/30 h-10">
                        <Checkbox
                          id="isAllDay"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5 rounded-md border-[#3D4F66] focus-visible:ring-[#0EA5E9]"
                        />
                        <label htmlFor="isAllDay" className="text-sm font-semibold text-slate-200 cursor-pointer select-none">All-Day Task</label>
                      </div>
                    )}
                  />
                </div> */}
                <div className="space-y-1.5" id="form-group-start_date">
                  <FieldLabel>Start Date</FieldLabel>
                  <FieldControl error={form.formState.errors.start_date?.message}>
                    <Controller
                      name="start_date"
                      control={form.control}
                      render={({ field }) => (
                        <DateTimePicker date={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(toUtcIsoOrEmpty(date))}
                          placeholder={isAllDay ? "Select start date" : "Select start date & time"}
                          hideTime={isAllDay}
                          className={form.formState.errors.start_date ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                        />
                      )}
                    />
                  </FieldControl>
                </div>

                <div className="space-y-1.5" id="form-group-end_date">
                  <FieldLabel required={isSubTask}>Due Date</FieldLabel>
                  <FieldControl error={form.formState.errors.end_date?.message}>
                    <Controller
                      name="end_date"
                      control={form.control}
                      render={({ field }) => (
                        <DateTimePicker date={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(toUtcIsoOrEmpty(date))}
                          placeholder={isAllDay ? "Select due date" : "Select due date & time"}
                          hideTime={isAllDay}
                          autoSelectTodayOnOpen={true}
                          className={form.formState.errors.end_date ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                        />
                      )}
                    />
                  </FieldControl>
                </div>

                {/* <div className="space-y-1.5" id="form-group-estimated_effort_value">
                  <FieldLabel>Estimated Effort</FieldLabel>
                  <FieldControl error={form.formState.errors.estimated_effort_value?.message || (!form.formState.errors.estimated_effort_value ? form.formState.errors.estimated_effort_unit?.message : undefined)}>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <Input type="number" step="0" placeholder="" {...form.register('estimated_effort_value')} isDecimal={false} className={cn("h-10 rounded-[8px] border-[var(--tm-border)]/80 text-xs text-slate-50 shadow-sm text-right w-full transition-all", form.formState.errors.estimated_effort_value ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")} maxLength={8} />
                      </div>
                      <Controller
                        name="estimated_effort_unit"
                        control={form.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={cn("h-10 rounded-[8px] border-[var(--tm-border)]/80 text-xs text-slate-50 shadow-sm w-20 transition-all", form.formState.errors.estimated_effort_unit ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")}>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[8px] bg-[var(--tm-surface)] border border-[var(--tm-border)]">
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
                  </FieldControl>
                </div> */}
              </div>
              {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-2.5 mt-2.5 items-start">
                <div className="space-y-1.5 md:col-span-1" id="form-group-calendarColor">
                  <FieldLabel>Calendar Color</FieldLabel>
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
                          <SelectTrigger className="w-full h-10 bg-[var(--tm-surface)] border-[var(--tm-border)]/80 rounded-[8px] text-xs focus:ring-[#0EA5E9]/20">
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
                                  <div className="w-4 h-4 rounded-full border border-[var(--tm-border)]" style={{ backgroundColor: preset.hex }} />
                                  <span>{preset.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-[var(--tm-border)] bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                                <span>Custom Color</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {field.value && field.value !== 'none' && ![
                          '#93c5fd', '#fca5a5', '#86efac', '#fdba74',
                          '#d8b4fe', '#f9a8d4', '#a5b4fc', '#67e8f9'
                        ].includes(field.value) && (
                            <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-muted)]">
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
              </div> */}

            </FormSection>
          )}

          {/* 2. Ownership & Responsibility */}
          {!hiddenSections.includes('ownership') && (
            <FormSection title="Ownership" icon={Users} tourId="task-form-ownership">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5" id="form-group-company">
                    <FieldLabel required>Company</FieldLabel>
                    <FieldControl error={form.formState.errors.company?.message}>
                      <Controller
                        name="company"
                        control={form.control}
                        render={({ field }) => (
                          <Combobox
                            disabled={isSubTask}
                            options={companyOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select company"
                            className={form.formState.errors.company ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                            onAddNew={formRights[1565]?.isSave ? () => {
                              setActiveMasterType('task-company');
                              setIsMasterCreateOpen(true);
                            } : undefined}
                            addNewLabel="Add New Company"
                          />
                        )}
                      />
                    </FieldControl>
                  </div>
                  <div className="space-y-1.5" id="form-group-location_No">
                    <FieldLabel required>Task Location</FieldLabel>
                    <FieldControl error={form.formState.errors.location_No?.message}>
                      <Controller
                        name="location_No"
                        control={form.control}
                        render={({ field }) => (
                          <LocationCombobox
                            disabled={isSubTask}
                            value={field.value}
                            onChange={(location) => field.onChange(location.operLocationNo ? location.operLocationNo.toString() : '')}
                            initialLabel={initialData?.locationName || undefined}
                            placeholder="Select location"
                            error={!!form.formState.errors.location_No}
                            onAddNew={formRights[1541]?.isSave ? () => {
                              setActiveMasterType('location');
                              setIsMasterCreateOpen(true);
                            } : undefined}
                            addNewLabel="Add New Location"
                          />
                        )}
                      />
                    </FieldControl>
                  </div>
                  <div className="space-y-1.5" id="form-group-owner_user_No">
                    <FieldLabel required>Task Assign To</FieldLabel>
                    <FieldControl error={form.formState.errors.owner_user_No?.message}>
                      <Controller
                        name="owner_user_No"
                        control={form.control}
                        render={({ field }) => (
                          <UserCombobox value={field.value} onChange={(user) => field.onChange(user.loginNo.toString())}
                            placeholder="Select Assign To"
                            initialLabel={initialData?.assignedDisplayName || undefined}
                            className={form.formState.errors.owner_user_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                            disabled={isPrivateTask || !canChangeAssignee}
                          />
                        )}
                      />
                    </FieldControl>
                  </div>
                  <div className="space-y-1.5" id="form-group-originator_user_No">
                    <FieldLabel required>Task Assign By</FieldLabel>
                    <FieldControl error={form.formState.errors.originator_user_No?.message}>
                      <Controller
                        name="originator_user_No"
                        control={form.control}
                        render={({ field }) => (
                          <UserCombobox value={field.value} onChange={(user) => field.onChange(user.loginNo.toString())}
                            placeholder="Select Assign By"
                            initialLabel={initialData ? (initialData.originatorDisplayName || undefined) : (authUser?.PrintingName || authUser?.name || undefined)}
                            className={form.formState.errors.originator_user_No ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : ""}
                          />
                        )}
                      />
                    </FieldControl>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* 2. Inform To */}
          {!hiddenSections.includes('informto') && !isPrivateTask && (
            <FormSection title="Inform To" icon={Users}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                {/* Collaborators / Supporters */}
                <div
                  id="form-group-collaborators"
                  className="rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/40 overflow-hidden min-w-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                        <UserPlus size={13} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-slate-100 truncate">Collaborators / Supporters</p>
                        {collabFields.length > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0EA5E9] px-1.5 text-[10px] font-semibold text-white">
                            {collabFields.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <FieldLabel className="text-[10px] shrink-0">Team</FieldLabel>
                        <div className="relative flex items-center">
                          <Select value={selectedCollabTeam} onValueChange={(val) => handleTeamSelection(val, 'collaborator')}>
                            <SelectTrigger className={cn("rounded-[8px] h-8 border-[var(--tm-border)] text-[11px] w-[148px] bg-[var(--tm-surface)] shadow-none", selectedCollabTeam && "[&>span]:pr-5")}>
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[8px]">
                              {sortByLabel(fillValues?.userGroup || [], {
                                getLabel: (g) => g.UserGroupName || '',
                                getValue: (g) => String(g.UserGroupNo),
                              }).map(group => (
                                <SelectItem key={group.UserGroupNo} value={group.UserGroupNo.toString()} className="text-xs">{group.UserGroupName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedCollabTeam && (
                            <button
                              type="button"
                              className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 z-10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedCollabTeam('');
                                const current = form.getValues('collaborators') || [];
                                replaceCollab(current.filter(c => !c.isFromTeam));
                              }}
                              title="Clear team"
                            >
                              <X className="h-3 w-3 text-slate-400 hover:text-slate-300" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => appendCollab({ userName: '', displayName: '', email: '' })}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-[8px] text-[11px] font-medium border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[var(--tm-tint)] gap-1 px-2.5"
                      >
                        <Plus size={12} /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5 max-h-[480px] overflow-y-auto scrollbar-hide">
                    {collabFields.length === 0 ? (
                      <FieldControl
                        className="text-center p-6 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-surface)] flex flex-col items-center justify-center"
                        error={hasCollabError ? (collabError as any).message : undefined}
                      >
                        <p className="text-xs text-slate-500 font-medium">No collaborators added yet.</p>
                      </FieldControl>
                    ) : (
                      <FieldControl error={hasCollabError ? (collabError as any).message : undefined}>
                        <div className="overflow-x-auto border border-[var(--tm-border)]/60 rounded-[8px] bg-[var(--tm-surface)]/80">
                          <table className="tm-data-table w-full text-left border-collapse min-w-[600px]">
                            <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                              <tr>
                                <th className="tm-col-sr px-3 py-2.5 w-10 border-r border-[var(--tm-border)] text-left">#</th>
                                <th className="px-3 py-2.5 w-[30%] border-r border-[var(--tm-border)]">
                                  <SortableHeader
                                    label="User Name"
                                    sortKey="userName"
                                    sortCol={collabSortCol}
                                    sortDesc={collabSortDesc}
                                    onSort={handleCollabSort}
                                  />
                                </th>
                                <th className="px-3 py-2.5 w-[30%] border-r border-[var(--tm-border)]">
                                  <SortableHeader
                                    label="Display Name"
                                    sortKey="displayName"
                                    sortCol={collabSortCol}
                                    sortDesc={collabSortDesc}
                                    onSort={handleCollabSort}
                                  />
                                </th>
                                <th className="px-3 py-2.5 w-[40%] border-r border-[var(--tm-border)]">
                                  <SortableHeader
                                    label="Email"
                                    sortKey="email"
                                    sortCol={collabSortCol}
                                    sortDesc={collabSortDesc}
                                    onSort={handleCollabSort}
                                  />
                                </th>
                                <th className="px-1 py-2.5 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--tm-border)]">
                              {collabFields.map((field, index) => {
                                const displayName = form.watch(`collaborators.${index}.displayName`);
                                const email = form.watch(`collaborators.${index}.email`);
                                const loginNo = form.watch(`collaborators.${index}.loginNo`);
                                const userErr = form.formState.errors.collaborators?.[index]?.userName?.message;
                                const nameErr = form.formState.errors.collaborators?.[index]?.displayName?.message;

                                if (field.isFromTeam) {
                                  return (
                                    <tr key={field.id} className="hover:bg-[var(--tm-muted)]/30 transition-colors">
                                      <td className="px-3 py-2.5 text-center">
                                        <input type="hidden" {...form.register(`collaborators.${index}.userName`)} />
                                        <input type="hidden" {...form.register(`collaborators.${index}.displayName`)} />
                                        <input type="hidden" {...form.register(`collaborators.${index}.email`)} />
                                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                                          {index + 1}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <span className="text-slate-400 italic text-[11px]">From Team</span>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <UserAvatar loginNo={loginNo ? Number(loginNo) : null} displayName={displayName} size="sm" />
                                          <span className="font-semibold text-slate-100">{displayName || '—'}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-500 break-all">{email || '—'}</td>
                                      <td className="px-3 py-2.5 text-center text-slate-500">-</td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={field.id} className="hover:bg-[var(--tm-muted)]/30 transition-colors group">
                                    <td className="px-3 py-2.5 text-center align-top pt-3">
                                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                      <FieldControl error={userErr} className="mb-0">
                                        <Controller
                                          name={`collaborators.${index}.userName`}
                                          control={form.control}
                                          render={({ field: nameField }) => (
                                            <UserCombobox
                                              value={nameField.value}
                                              onChange={(user) => {
                                                const currentCollaborators = form.getValues('collaborators') || [];

                                                if (
                                                  currentCollaborators.some((c, i) => i !== index && c.loginNo === user.loginNo)
                                                ) {
                                                  toast.error('This user is already added as a collaborator.');
                                                  nameField.onChange('');
                                                  return;
                                                }

                                                nameField.onChange(user.loginId);
                                                form.setValue(`collaborators.${index}.displayName`, user.printingName);
                                                form.setValue(`collaborators.${index}.email`, user.email || '');
                                                form.setValue(`collaborators.${index}.loginNo`, user.loginNo);
                                                form.clearErrors(`collaborators.${index}.userName`);
                                                form.clearErrors(`collaborators.${index}.displayName`);
                                              }}
                                              placeholder="Select username"
                                              className={cn("rounded-[6px] h-8 text-[11px] w-full", userErr && "border-red-400")}
                                              initialLabel={nameField.value}
                                            />
                                          )}
                                        />
                                      </FieldControl>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                      <FieldControl error={nameErr} className="mb-0">
                                        <Input
                                          disabled
                                          {...form.register(`collaborators.${index}.displayName`)}
                                          placeholder="Display Name"
                                          className={cn("h-8 rounded-[6px] text-[11px] disabled:opacity-100 disabled:text-slate-100 bg-[var(--tm-muted)] w-full", nameErr && "border-red-400")}
                                        />
                                      </FieldControl>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                      <Input
                                        disabled
                                        {...form.register(`collaborators.${index}.email`)}
                                        placeholder="Email"
                                        className="h-8 rounded-[6px] text-[11px] disabled:opacity-100 disabled:text-slate-100 bg-[var(--tm-muted)] w-full"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center align-top pt-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const row = form.getValues(`collaborators.${index}`);
                                          rowDeleteConfirm.requestConfirm({
                                            entityLabel: 'collaborator',
                                            recordName: row?.displayName || row?.email || 'Collaborator',
                                            onConfirm: () => removeCollab(index),
                                          });
                                        }}
                                        className="inline-flex h-6 w-6 items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-[6px] transition-colors"
                                        title="Remove collaborator"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </FieldControl>
                    )}
                  </div>
                </div>

                {/* Report To */}
                <div
                  id="form-group-informed_to"
                  className="rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/40 overflow-hidden min-w-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                        <Users size={13} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-slate-100 truncate">Report To</p>
                        {informFields.length > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0EA5E9] px-1.5 text-[10px] font-semibold text-white">
                            {informFields.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <FieldLabel className="text-[10px] shrink-0">Team</FieldLabel>
                        <div className="relative flex items-center">
                          <Select value={selectedInformTeam} onValueChange={(val) => handleTeamSelection(val, 'inform')}>
                            <SelectTrigger className={cn("rounded-[8px] h-8 border-[var(--tm-border)] text-[11px] w-[148px] bg-[var(--tm-surface)] shadow-none", selectedInformTeam && "[&>span]:pr-5")}>
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[8px]">
                              {sortByLabel(fillValues?.userGroup || [], {
                                getLabel: (g) => g.UserGroupName || '',
                                getValue: (g) => String(g.UserGroupNo),
                              }).map(group => (
                                <SelectItem key={group.UserGroupNo} value={group.UserGroupNo.toString()} className="text-xs">{group.UserGroupName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedInformTeam && (
                            <button
                              type="button"
                              className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 z-10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedInformTeam('');
                                const current = form.getValues('informed_to') || [];
                                replaceInform(current.filter(i => !i.isFromTeam));
                              }}
                              title="Clear team"
                            >
                              <X className="h-3 w-3 text-slate-400 hover:text-slate-300" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => appendInform({ userName: '', displayName: '', email: '' })}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-[8px] text-[11px] font-medium border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[var(--tm-tint)] gap-1 px-2.5"
                      >
                        <Plus size={12} /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5 max-h-[480px] overflow-y-auto scrollbar-hide">
                    {informFields.length === 0 ? (
                      <FieldControl
                        className="text-center p-6 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-surface)] flex flex-col items-center justify-center"
                        error={hasInformError ? (informError as any).message : undefined}
                      >
                        <p className="text-xs text-slate-500 font-medium">No report-to users added yet.</p>
                      </FieldControl>
                    ) : (
                      <FieldControl error={hasInformError ? (informError as any).message : undefined}>
                        <div className="overflow-x-auto border border-[var(--tm-border)]/60 rounded-[8px] bg-[var(--tm-surface)]/80">
                          <table className="tm-data-table w-full text-left border-collapse min-w-[600px]">
                            <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                              <tr>
                                <th className="tm-col-sr px-3 py-2.5 w-10 border-r border-[var(--tm-border)] text-left">#</th>
                                <th className="px-3 py-2.5 w-[30%] border-r border-[var(--tm-border)]">
                                  <SortableHeader
                                    label="User Name"
                                    sortKey="userName"
                                    sortCol={informSortCol}
                                    sortDesc={informSortDesc}
                                    onSort={handleInformSort}
                                  />
                                </th>
                                <th className="px-3 py-2.5 w-[30%] border-r border-[var(--tm-border)]">
                                  <SortableHeader
                                    label="Display Name"
                                    sortKey="displayName"
                                    sortCol={informSortCol}
                                    sortDesc={informSortDesc}
                                    onSort={handleInformSort}
                                  />
                                </th>
                                <th className="px-3 py-2.5 w-[40%] border-r border-[var(--tm-border)]">
                                  <SortableHeader
                                    label="Email"
                                    sortKey="email"
                                    sortCol={informSortCol}
                                    sortDesc={informSortDesc}
                                    onSort={handleInformSort}
                                  />
                                </th>
                                <th className="px-1 py-2.5 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--tm-border)]">
                              {informFields.map((field, index) => {
                                const displayName = form.watch(`informed_to.${index}.displayName`);
                                const email = form.watch(`informed_to.${index}.email`);
                                const loginNo = form.watch(`informed_to.${index}.loginNo`);
                                const userErr = form.formState.errors.informed_to?.[index]?.userName?.message;
                                const nameErr = form.formState.errors.informed_to?.[index]?.displayName?.message;

                                if (field.isFromTeam) {
                                  return (
                                    <tr key={field.id} className="hover:bg-[var(--tm-muted)]/30 transition-colors">
                                      <td className="px-3 py-2.5 text-center">
                                        <input type="hidden" {...form.register(`informed_to.${index}.userName`)} />
                                        <input type="hidden" {...form.register(`informed_to.${index}.displayName`)} />
                                        <input type="hidden" {...form.register(`informed_to.${index}.email`)} />
                                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                                          {index + 1}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <span className="text-slate-400 italic text-[11px]">From Team</span>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <UserAvatar loginNo={loginNo ? Number(loginNo) : null} displayName={displayName} size="sm" />
                                          <span className="font-semibold text-slate-100">{displayName || '—'}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-500 break-all">{email || '—'}</td>
                                      <td className="px-3 py-2.5 text-center text-slate-500">-</td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={field.id} className="hover:bg-[var(--tm-muted)]/30 transition-colors group">
                                    <td className="px-3 py-2.5 text-center align-top pt-3">
                                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                      <FieldControl error={userErr} className="mb-0">
                                        <Controller
                                          name={`informed_to.${index}.userName`}
                                          control={form.control}
                                          render={({ field: nameField }) => (
                                            <UserCombobox
                                              value={nameField.value}
                                              onChange={(user) => {
                                                const currentInformed = form.getValues('informed_to') || [];

                                                if (
                                                  currentInformed.some((c, i) => i !== index && c.loginNo === user.loginNo)
                                                ) {
                                                  toast.error('This user is already added as an Report To user.');
                                                  nameField.onChange('');
                                                  return;
                                                }

                                                nameField.onChange(user.loginId);
                                                form.setValue(`informed_to.${index}.displayName`, user.printingName);
                                                form.setValue(`informed_to.${index}.email`, user.email || '');
                                                form.setValue(`informed_to.${index}.loginNo`, user.loginNo);
                                                form.clearErrors(`informed_to.${index}.userName`);
                                                form.clearErrors(`informed_to.${index}.displayName`);
                                              }}
                                              placeholder="Select username"
                                              className={cn("rounded-[6px] h-8 text-[11px] w-full", userErr && "border-red-400")}
                                              initialLabel={nameField.value}
                                            />
                                          )}
                                        />
                                      </FieldControl>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                      <FieldControl error={nameErr} className="mb-0">
                                        <Input
                                          disabled
                                          {...form.register(`informed_to.${index}.displayName`)}
                                          placeholder="Display Name"
                                          className={cn("h-8 rounded-[6px] text-[11px] disabled:opacity-100 disabled:text-slate-100 bg-[var(--tm-muted)] w-full", nameErr && "border-red-400")}
                                        />
                                      </FieldControl>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                      <Input
                                        disabled
                                        {...form.register(`informed_to.${index}.email`)}
                                        placeholder="Email"
                                        className="h-8 rounded-[6px] text-[11px] disabled:opacity-100 disabled:text-slate-100 bg-[var(--tm-muted)] w-full"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center align-top pt-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const row = form.getValues(`informed_to.${index}`);
                                          rowDeleteConfirm.requestConfirm({
                                            entityLabel: 'report-to user',
                                            recordName: row?.displayName || row?.email || 'User',
                                            onConfirm: () => removeInform(index),
                                          });
                                        }}
                                        className="inline-flex h-6 w-6 items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-[6px] transition-colors"
                                        title="Remove report-to user"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </FieldControl>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {isShowTopAdditionalFields && (form.watch('custom_fields') as any[])?.length > 0 && (
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

          {!hiddenSections.includes('attachments') && (
            <FormSection title="Attachments" icon={Paperclip} tourId="task-form-attachments">
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer?.files;
                    if (files?.length) processFiles(Array.from(files));
                  }}
                  className="group relative flex items-center gap-3.5 rounded-[8px] border border-dashed border-[#0EA5E9]/25 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] px-3.5 py-3 cursor-pointer transition-all hover:border-[#0EA5E9]/45 hover:shadow-[0_8px_24px_-16px_rgba(14,165,233,0.35)]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={UPLOAD_ACCEPT_ATTR}
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-surface)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12 shadow-sm group-hover:bg-[var(--tm-tint)] transition-colors">
                    <UploadCloud size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-100 leading-tight">
                      Drop files here or{' '}
                      <span className="text-[#0EA5E9] underline decoration-[#0EA5E9]/30 underline-offset-2">
                        browse
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                      {ALLOWED_UPLOAD_HELPER_TEXT}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex h-8 items-center rounded-[7px] bg-[#0EA5E9] px-3 text-[11px] font-semibold text-white shadow-sm shadow-[#0EA5E9]/20 group-hover:bg-[#0284C7] transition-colors">
                    Upload
                  </span>
                </div>

                {uploadingFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-0.5">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Uploading
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                        {uploadingFiles.length}
                      </span>
                    </div>
                    <div className="rounded-[8px] border border-[var(--tm-border)]/80 overflow-hidden divide-y divide-[var(--tm-border)] bg-[var(--tm-surface)]">
                      {uploadingFiles.map((file) => (
                        <motion.div
                          key={file.tempId}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2',
                            file.status === 'failed' ? 'bg-red-500/10' : 'bg-[var(--tm-surface)]'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ring-1',
                              file.status === 'failed'
                                ? 'bg-red-500/10 text-red-400 ring-red-500/30'
                                : 'bg-[var(--tm-tint)] text-[#0EA5E9] ring-[#0EA5E9]/12'
                            )}
                          >
                            {file.status === 'failed' ? (
                              file.name.toLowerCase().endsWith('.pdf') ? (
                                <FileText size={14} />
                              ) : (
                                <Image size={14} />
                              )
                            ) : (
                              <InlineLoader size={14} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
                              {file.name}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] font-medium mt-0.5',
                                file.status === 'failed' ? 'text-red-400' : 'text-slate-400'
                              )}
                            >
                              {file.status === 'pending' && 'Pending upload...'}
                              {file.status === 'uploading' && 'Registering entry...'}
                              {file.status === 'verifying' && 'Uploading file payload...'}
                              {file.status === 'failed' && (file.errorMessage || 'Upload failed')}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {file.status === 'failed' && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRetryUpload(file.tempId)}
                                className="h-7 w-7 rounded-[7px] text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                              >
                                <RefreshCw size={12} />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveUploading(file.tempId)}
                              className="h-7 w-7 rounded-[7px] text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const attachments = form.watch('attachments') || [];
                  if (attachments.length === 0) return null;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-0.5">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Attached
                        </h4>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tm-tint)] px-1.5 text-[10px] font-semibold text-[#0EA5E9] tabular-nums">
                          {attachments.length}
                        </span>
                      </div>
                      <div className="rounded-[8px] border border-[var(--tm-border)]/80 overflow-hidden divide-y divide-[var(--tm-border)] bg-[var(--tm-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                        {attachments.map((file: any) => {
                          const isPdf = (file.name || '').toLowerCase().endsWith('.pdf');
                          return (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group/file flex items-center gap-2.5 px-2.5 py-2 hover:bg-[var(--tm-elevated)] transition-colors"
                            >
                              <span
                                className={cn(
                                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ring-1',
                                  isPdf
                                    ? 'bg-[var(--tm-tint)] text-[#0EA5E9] ring-[#0EA5E9]/12'
                                    : 'bg-violet-500/15 text-violet-400 ring-violet-500/30'
                                )}
                              >
                                {isPdf ? <FileText size={14} /> : <Image size={14} />}
                              </span>
                              {attachmentToRename?.id === file.id ? (
                                <InlineAttachmentRename
                                  originalName={file.name || 'document'}
                                  saving={isRenamingAttachment}
                                  onSave={confirmRenameAttachment}
                                  onCancel={() => setAttachmentToRename(null)}
                                />
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
                                        {file.name}
                                      </p>
                                      {file.size ? (
                                        <span className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
                                          {formatFileSize(file.size)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        attachmentService.downloadAttachment(file.id, file.name)
                                      }
                                      className="mt-0.5 text-[10px] font-semibold text-[#0EA5E9] hover:underline underline-offset-2"
                                    >
                                      View
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      title="Rename"
                                      aria-label="Rename attachment"
                                      disabled={attachmentToRename != null}
                                      onClick={() => setAttachmentToRename({ id: file.id, name: file.name })}
                                      className="h-7 w-7 shrink-0 rounded-[7px] text-slate-400 opacity-70 group-hover/file:opacity-100 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                                    >
                                      <FileEdit size={12} />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleRemoveAttachment(file.id, file.name)}
                                      className="h-7 w-7 shrink-0 rounded-[7px] text-slate-400 opacity-70 group-hover/file:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                      <Trash size={12} />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </FormSection>
          )}

          {(!isHideDetailSection || showMoreDetails) && (
            <>

              {/* 4. Business Impact */}
              {!hiddenSections.includes('business_benefit') && (
                <FormSection
                  title="Business Benefit"
                  icon={TrendingUp}
                  headerAction={
                    <div className="flex items-center gap-2 shrink-0 border border-[var(--tm-border)]/80 rounded-[8px] px-2 py-1 bg-[var(--tm-surface)]">
                      <Controller
                        name="is_business_benefit_applicable"
                        control={form.control}
                        render={({ field }) => (
                          <Checkbox
                            id="benefit-section"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isBenefitDisabled}
                            className="h-4 w-4 rounded-md border-slate-400"
                          />
                        )}
                      />
                      <Label htmlFor="benefit-section" className="text-xs font-medium text-slate-200 cursor-pointer">Business Benefit Applicable</Label>
                    </div>
                  }
                >
                  <div className="space-y-2.5">
                    {isBenefitApplicable && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5" id="form-group-business_benefit_type_No">
                          <FieldLabel required>Benefit Type</FieldLabel>
                          <FieldControl error={form.formState.errors.business_benefit_type_No?.message}>
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
                          </FieldControl>
                        </div>
                        <div className="space-y-1.5" id="form-group-benefit_period">
                          <FieldLabel required>Benefit Period</FieldLabel>
                          <FieldControl error={form.formState.errors.benefit_period?.message}>
                            <Controller
                              name="benefit_period"
                              control={form.control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className={cn("h-10 rounded-[8px] border-[var(--tm-border)]/80 text-xs text-slate-50 shadow-sm transition-all", form.formState.errors.benefit_period ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")}>
                                    <SelectValue placeholder="Select benefit period" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[8px]">
                                    <SelectItem value="One Time">One Time</SelectItem>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="Annually">Annually</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </FieldControl>
                        </div>
                        {!shouldHideBenefitAmount && (
                          <>
                            <div className="space-y-1.5" id="form-group-estimated_benefit_amount">
                              <FieldLabel required>Estimated Benefit Amount</FieldLabel>
                              <FieldControl error={form.formState.errors.estimated_benefit_amount?.message}>
                                <Input type="number" step="0.01" placeholder="" {...form.register('estimated_benefit_amount')} isDecimal={true} decimalPlaces={2} className={cn("h-10 rounded-[8px] border-[var(--tm-border)]/80 text-xs text-slate-50 shadow-sm text-right transition-all", form.formState.errors.estimated_benefit_amount ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")} maxLength={8} />
                              </FieldControl>
                            </div>
                            <div className="space-y-1.5" id="form-group-actual_benefit_amount">
                              <FieldLabel>Actual Benefit Amount</FieldLabel>
                              <FieldControl error={form.formState.errors.actual_benefit_amount?.message}>
                                <Input type="number" step="0.01" placeholder="" {...form.register('actual_benefit_amount')} isDecimal={true} decimalPlaces={2} className={cn("h-10 rounded-[8px] border-[var(--tm-border)]/80 text-xs text-slate-50 shadow-sm text-right transition-all", form.formState.errors.actual_benefit_amount ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")} maxLength={8} />
                              </FieldControl>
                            </div>
                          </>
                        )}
                        <div className="space-y-1.5 md:col-span-2" id="form-group-business_benefit_description">
                          <FieldLabel required>Benefit Description</FieldLabel>
                          <FieldControl error={form.formState.errors.business_benefit_description?.message}>
                            <Textarea placeholder="Enter business benefit description" {...form.register('business_benefit_description')} className={cn("min-h-[80px] rounded-[8px] border-[var(--tm-border)]/80 input-section text-xs text-slate-50 shadow-sm transition-all", form.formState.errors.business_benefit_description ? "!border-red-500 focus:!border-red-500 hover:!border-red-500 focus:ring-red-500/10" : "focus:ring-[#0EA5E9]/15 focus:border-[#0EA5E9]")} />
                          </FieldControl>
                        </div>
                      </div>
                    )}
                  </div>
                </FormSection>
              )}


              {/* 5. Checklist */}
              {!hiddenSections.includes('checklist') && (
                <FormSection
                  title="Checklist"
                  icon={CheckCircle}
                  headerAction={
                    <div className="flex flex-wrap items-center gap-2">
                      {checklistFields.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--tm-tint)] px-2.5 py-1 text-[10px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                          {completedCount}/{checklistFields.length}
                          <span className="text-[#0EA5E9]/70 font-medium">({progressPercent}%)</span>
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => appendChecklist({ id: Date.now().toString(), description: '', completed: false })}
                        className="rounded-[8px] font-medium border-[#0EA5E9]/40 text-[#0EA5E9] hover:bg-[var(--tm-tint)] h-7 px-3 text-[10px] shadow-sm gap-0.5 transition-all active:scale-95"
                      >
                        <Plus size={12} className="text-[#0EA5E9]" /> Add Checklist Item
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    {checklistFields.length > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-[var(--tm-muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0EA5E9] transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}

                    {checklistFields.length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)] flex flex-col items-center justify-center gap-1">
                        <p className="text-xs text-slate-500 font-medium">No checklist items yet.</p>
                        <p className="text-[10px] text-slate-400 font-medium">Add items to track task completion.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {checklistFields.map((field, index) => {
                          const isCompleted = form.watch(`check_list.${index}.completed`);
                          const descError = form.formState.errors.check_list?.[index]?.description?.message;
                          return (
                            <motion.div
                              key={field.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.04, 0.2) }}
                              className={cn(
                                "relative rounded-[8px] border bg-[var(--tm-surface)] overflow-hidden transition-all",
                                "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
                                isCompleted
                                  ? "border-[var(--tm-border)]/80 bg-[var(--tm-muted)]/60"
                                  : "border-[var(--tm-border)]/80 hover:border-[#0EA5E9]/30 hover:shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)]",
                                descError && "border-red-300"
                              )}
                            >
                              <div className="relative flex items-start gap-3 pl-3 pr-11 py-3">
                                <span className={cn(
                                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-semibold ring-1 mt-0.5",
                                  isCompleted
                                    ? "bg-[var(--tm-muted)] text-slate-400 ring-[var(--tm-border)]"
                                    : "bg-[var(--tm-tint)] text-[#0EA5E9] ring-[#0EA5E9]/12"
                                )}>
                                  {index + 1}
                                </span>

                                <Controller
                                  name={`check_list.${index}.completed`}
                                  control={form.control}
                                  render={({ field: checkField }) => (
                                    <button
                                      type="button"
                                      onClick={() => checkField.onChange(!checkField.value)}
                                      className={cn(
                                        "mt-0.5 h-7 w-7 shrink-0 rounded-[7px] border-2 flex items-center justify-center transition-all duration-200",
                                        checkField.value
                                          ? "bg-[#0EA5E9] border-[#0EA5E9] text-white"
                                          : "border-[#3D4F66] text-transparent hover:border-[#0EA5E9] bg-[var(--tm-surface)]"
                                      )}
                                      title={checkField.value ? "Mark incomplete" : "Mark complete"}
                                    >
                                      <Check size={14} strokeWidth={3} />
                                    </button>
                                  )}
                                />

                                <div className="min-w-0 flex-1 space-y-1">
                                  <FieldLabel required className="sr-only">Checklist item</FieldLabel>
                                  <FieldControl error={descError}>
                                    <Input
                                      {...form.register(`check_list.${index}.description`)}
                                      placeholder="Enter checklist item…"
                                      className={cn(
                                        "rounded-[8px] h-10 text-xs border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-none",
                                        isCompleted && "text-slate-400 line-through decoration-slate-300 bg-[var(--tm-muted)]",
                                        descError && "border-red-400"
                                      )}
                                    />
                                  </FieldControl>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const row = form.getValues(`check_list.${index}`);
                                    rowDeleteConfirm.requestConfirm({
                                      entityLabel: 'checklist item',
                                      recordName: row?.description || 'Checklist item',
                                      onConfirm: () => removeChecklist(index),
                                    });
                                  }}
                                  className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-500/10 hover:text-red-400 hover:bg-red-500/20 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-500/30 transition-colors"
                                  title="Remove checklist item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormSection>
              )}

              {/* 6. Task Execution Log */}
              {!hiddenSections.includes('execution_note') && (
                <FormSection
                  title="Task Execution Log"
                  icon={FileText}
                  headerAction={
                    <div className="flex flex-wrap items-center gap-2">
                      {executionLogFields.length > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0EA5E9] px-1.5 text-[10px] font-semibold text-white">
                          {executionLogFields.length}
                        </span>
                      )}
                       <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => appendExecutionLog({ id: Date.now().toString(), date: new Date().toISOString(), remark: '' })}
                        className="rounded-[8px] font-medium border-[#0EA5E9]/40 text-[#0EA5E9] hover:bg-[var(--tm-tint)] h-7 px-3 text-[10px] shadow-sm gap-0.5 transition-all active:scale-95"
                      >
                      <Plus size={12} className="text-[#0EA5E9]" /> Add Log
                    </Button>
                    </div>
                  }
                >
                  <div className="space-y-3">

                    {/* Log entries panel */}
                  <div className="rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/50 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                          <History size={12} strokeWidth={1.75} />
                        </span>
                        <p className="text-[11px] font-semibold text-slate-200 truncate">Log entries</p>
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {executionLogFields.length === 0 ? (
                        <FieldControl
                          className="text-center p-6 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-surface)] flex flex-col items-center justify-center gap-1"
                          error={hasExecutionLogError ? (executionLogError as any).message : undefined}
                        >
                          <p className="text-xs text-slate-500 font-medium">No execution logs yet.</p>
                          <p className="text-[10px] text-slate-400 font-medium">Add a log entry with date and remark.</p>
                        </FieldControl>
                      ) : (
                        <FieldControl error={hasExecutionLogError ? (executionLogError as any).message : undefined} className="space-y-2.5 max-h-[340px] overflow-y-auto scrollbar-hide">
                          {executionLogFields.map((field, index) => {
                            const dateErr = form.formState.errors.execution_logs?.[index]?.date?.message;
                            const remarkErr = form.formState.errors.execution_logs?.[index]?.remark?.message;
                            const logDate = form.watch(`execution_logs.${index}.date`);
                            const logRemark = form.watch(`execution_logs.${index}.remark`);
                            return (
                              <div
                                key={field.id}
                                className={cn(
                                  "relative rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-hidden transition-all",
                                  "shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#0EA5E9]/30 hover:shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)]",
                                  (dateErr || remarkErr) && "border-red-300"
                                )}
                              >
                                <div className="relative flex items-start gap-3 pl-3 pr-11 py-2.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-semibold text-slate-100 leading-snug">
                                      {logDate ? new Date(logDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : `Log entry ${index + 1}`}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5 break-words line-clamp-2">
                                      {logRemark?.trim() || 'Add date and remark'}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeExecutionLog(index)}
                                    className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-500/10 hover:text-red-400 hover:bg-red-500/20 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-500/30 transition-colors"
                                    title="Remove log"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <div className="p-3.5 grid grid-cols-1 md:grid-cols-5 gap-2">
                                  <div className="space-y-1">
                                    <FieldLabel required>Date</FieldLabel>
                                    <Controller
                                      name={`execution_logs.${index}.date`}
                                      control={form.control}
                                      render={({ field: dateField }) => (
                                        <FieldControl error={dateErr}>
                                          <DateTimePicker
                                            date={dateField.value ? new Date(dateField.value) : undefined}
                                            onChange={(date) => {
                                              dateField.onChange(date ? date.toISOString() : '');
                                              form.clearErrors(`execution_logs.${index}.date`);
                                            }}
                                            placeholder="Select date"
                                            hideTime
                                            className={cn(
                                              "h-10 rounded-[8px] text-xs border-[var(--tm-border)] w-full max-w-sm",
                                              dateErr && "border-red-400"
                                            )}
                                          />
                                        </FieldControl>
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-4">
                                    <FieldLabel required>Remark</FieldLabel>
                                    <FieldControl error={remarkErr}>
                                      <Textarea
                                        {...form.register(`execution_logs.${index}.remark`)}
                                        placeholder="Enter remark"
                                        rows={1}
                                        className={cn(
                                          "min-h-[20px] py-2.5 resize-none rounded-[8px] border-[var(--tm-border)] text-xs text-slate-50 w-full",
                                          remarkErr && "border-red-400"
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </FieldControl>
                      )}
                    </div>
                  </div>

                    {/* Completion panel */}
                    <div className="rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                          <CheckCircle size={12} strokeWidth={1.75} />
                        </span>
                        <p className="text-[11px] font-semibold text-slate-200">Completion</p>
                      </div>
                      <div className="p-3.5 grid grid-cols-1 md:grid-cols-5 gap-2">
                        <div className="space-y-1" id="form-group-completionDate">
                          <FieldLabel>Completion Date</FieldLabel>
                          <FieldControl error={form.formState.errors.completionDate?.message}>
                            <Controller
                              name="completionDate"
                              control={form.control}
                              render={({ field }) => (
                                <DateTimePicker
                                  date={field.value ? new Date(field.value) : undefined}
                                  onChange={(date) => field.onChange(toUtcIsoOrEmpty(date))}
                                  placeholder={isAllDay ? "Select completion date" : "Select completion date & time"}
                                  hideTime={isAllDay}
                                  className={cn(
                                    "h-10 rounded-[8px] text-xs border-[var(--tm-border)] w-full max-w-sm",
                                    form.formState.errors.completionDate && "border-red-400"
                                  )}
                                />
                              )}
                            />
                          </FieldControl>
                        </div>

                        <div className="space-y-1 col-span-4" id="form-group-completionRemark">
                          <FieldLabel>Completion Remark</FieldLabel>
                          <FieldControl error={form.formState.errors.completionRemark?.message}>
                            <Textarea
                              placeholder="Enter completion remark"
                              {...form.register('completionRemark')}
                              maxLength={500}
                              rows={1}
                              className={cn(
                                "min-h-[20px] resize-none rounded-[8px] border-[var(--tm-border)] text-xs text-slate-50 w-full",
                                form.formState.errors.completionRemark && "border-red-400"
                              )}
                            />
                          </FieldControl>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* 6b. Challenges */}
              {!hiddenSections.includes('execution_note') && (
                <FormSection
                  title="Challenges"
                  icon={AlertCircle}
                  headerAction={
                    <div className="flex flex-wrap items-center gap-2">
                      {roadBlockFields.length > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0EA5E9] px-1.5 text-[10px] font-semibold text-white">
                          {roadBlockFields.length}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => appendRoadBlock({ id: Date.now().toString(), date: '', remark: '', proposedSolution: '', status_No: '' })}
                        className="rounded-[8px] font-medium border-[#0EA5E9]/40 text-[#0EA5E9] hover:bg-[var(--tm-tint)] h-7 px-3 text-[10px] shadow-sm gap-0.5 transition-all active:scale-95"
                      >
                        <Plus size={12} className="text-[#0EA5E9]" /> Add Challenges
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-2.5">
                    {roadBlockFields.length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)] flex flex-col items-center justify-center gap-1">
                        <p className="text-xs text-slate-500 font-medium">No challenges added yet.</p>
                        <p className="text-[10px] text-slate-400 font-medium">Track blockers with date, remark, and status.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-hide">
                        {roadBlockFields.map((field, index) => {
                          const dateErr = form.formState.errors.road_block_remarks?.[index]?.date?.message;
                          const remarkErr = form.formState.errors.road_block_remarks?.[index]?.remark?.message;
                          const statusErr = form.formState.errors.road_block_remarks?.[index]?.status_No?.message;
                          const challengeDate = form.watch(`road_block_remarks.${index}.date`);
                          const challengeRemark = form.watch(`road_block_remarks.${index}.remark`);
                          const challengeStatus = form.watch(`road_block_remarks.${index}.status_No`);
                          const statusLabel = fillValues?.status.find(s => s.StatusNo.toString() === challengeStatus)?.Status;
                          return (
                            <div
                              key={field.id}
                              className={cn(
                                "relative rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-hidden transition-all",
                                "shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#0EA5E9]/30 hover:shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)]",
                                (dateErr || remarkErr || statusErr) && "border-red-300"
                              )}
                            >
                              <div className="relative flex items-start gap-3 pl-3 pr-11 py-2.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[12px] font-semibold text-slate-100 leading-snug">
                                      {challengeDate
                                        ? formatDateOnly(challengeDate)
                                        : `Challenge ${index + 1}`}
                                    </p>
                                    {statusLabel ? (
                                      <span className="inline-flex items-center rounded-[6px] bg-[var(--tm-tint)] px-1.5 py-0.5 text-[10px] font-semibold text-[#0EA5E9]">
                                        {statusLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5 break-words line-clamp-2">
                                    {challengeRemark?.trim() || 'Add remark, solution, and status'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const remark = form.getValues(`road_block_remarks.${index}.remark`);
                                    rowDeleteConfirm.requestConfirm({
                                      entityLabel: 'challenge',
                                      recordName: (remark || '').trim() || 'Challenge',
                                      onConfirm: () => removeRoadBlock(index),
                                    });
                                  }}
                                  className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-500/10 hover:text-red-400 hover:bg-red-500/20 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-500/30 transition-colors"
                                  title="Remove challenge"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              <div className="p-3.5 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <FieldLabel required>Date</FieldLabel>
                                    <Controller
                                      name={`road_block_remarks.${index}.date`}
                                      control={form.control}
                                      render={({ field: dateField }) => (
                                        <FieldControl error={dateErr}>
                                          <DateTimePicker
                                            date={dateField.value ? new Date(dateField.value) : undefined}
                                            onChange={(date) => {
                                              dateField.onChange(toUtcIsoOrEmpty(date));
                                              form.clearErrors(`road_block_remarks.${index}.date`);
                                            }}
                                            placeholder="Select date"
                                            hideTime
                                            className={cn(
                                              "h-10 rounded-[8px] text-xs border-[var(--tm-border)] w-full",
                                              dateErr && "border-red-400"
                                            )}
                                          />
                                        </FieldControl>
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <FieldLabel required>Status</FieldLabel>
                                    <Controller
                                      name={`road_block_remarks.${index}.status_No`}
                                      control={form.control}
                                      render={({ field: statusField }) => (
                                        <FieldControl error={statusErr}>
                                          <Select
                                            onValueChange={(val) => {
                                              statusField.onChange(val);
                                              form.clearErrors(`road_block_remarks.${index}.status_No`);
                                            }}
                                            value={statusField.value}
                                          >
                                            <SelectTrigger className={cn(
                                              "rounded-[8px] h-10 border-[var(--tm-border)] text-xs bg-[var(--tm-surface)] shadow-none",
                                              statusErr && "border-red-400"
                                            )}>
                                              <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-[8px]">
                                              {filterSelectableStatuses(fillValues?.status)
                                                .map(s => (
                                                  <SelectItem key={s.StatusNo} value={s.StatusNo.toString()} className="text-xs">{s.Status}</SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </FieldControl>
                                      )}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <FieldLabel required>Remarks</FieldLabel>
                                  <FieldControl error={remarkErr}>
                                    <Textarea
                                      {...form.register(`road_block_remarks.${index}.remark`)}
                                      placeholder="Enter remark"
                                      rows={3}
                                      className={cn(
                                        "min-h-[88px] py-2.5 resize-none rounded-[8px] border-[var(--tm-border)] text-xs text-slate-50 w-full",
                                        remarkErr && "border-red-400"
                                      )}
                                    />
                                  </FieldControl>
                                </div>

                                <div className="space-y-1">
                                  <FieldLabel>Proposed Solution</FieldLabel>
                                  <Textarea
                                    {...form.register(`road_block_remarks.${index}.proposedSolution`)}
                                    placeholder="Enter proposed solution"
                                    rows={3}
                                    className="min-h-[88px] py-2.5 resize-none rounded-[8px] border-[var(--tm-border)] text-xs text-slate-50 w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormSection>
              )}

              {/* 8. Time Logs */}
              {initialData?.taskNo && !hiddenSections.includes('actual_efforts') && (
                <FormSection title="Time Logs" icon={History}>
                  <div className="space-y-2.5">
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

              {!isShowTopAdditionalFields && (form.watch('custom_fields') as any[])?.length > 0 && (
                <FormSection title="Additional Fields" icon={Sparkles}>
                  <div className="space-y-2.5">
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
            </>
          )}

          {isHideDetailSection && (
            <div className="flex justify-center py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMoreDetails(v => !v)}
                className="rounded-[8px] font-medium border-[#0EA5E9]/40 text-[#0EA5E9] hover:bg-[var(--tm-tint)] h-9 px-4 text-xs shadow-sm gap-1.5 transition-all active:scale-95"
              >
                {showMoreDetails ? (
                  <>Show less details <ChevronUp size={14} /></>
                ) : (
                  <>Show more details <ChevronDown size={14} /></>
                )}
              </Button>
            </div>
          )}
        </fieldset>
      </form>

      {/* Floating Sub-Task Actions (Right Center) */}
      {!isSubTask && (
        <div className="fixed right-6 top-[67%] -translate-y-1/2 flex flex-row items-center z-40 bg-white/95 backdrop-blur-md rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200 overflow-hidden transition-all hover:shadow-md">
          <button
            type="button"
            disabled={(localSubtasks.length + subtaskFields.length) === 0}
            onClick={() => setIsSubtasksModalOpen(true)}
            className="flex items-center gap-2 py-2 pl-3 pr-2 text-[14px] font-semibold text-[#005580] hover:bg-[#f8fafc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Layers size={16} className="text-[#005580]" /> Sub-Tasks
            <span className="bg-[#005580] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
              {localSubtasks.length + subtaskFields.length}
            </span>
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => setIsStandaloneSubtaskModalOpen(true)}
            className="flex items-center gap-1.5 pl-2 pr-3 py-2 text-[14px] font-semibold text-[#005580] hover:bg-[#f8fafc] transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} /> Add
          </button>
        </div>
      )}

      {/* Deletion Confirmation Dialog */}
      <MasterDeleteDialog
        open={rowDeleteConfirm.open}
        onOpenChange={rowDeleteConfirm.onOpenChange}
        onConfirm={rowDeleteConfirm.handleConfirm}
        recordName={rowDeleteConfirm.recordName}
        entityLabel={rowDeleteConfirm.entityLabel}
        confirming={rowDeleteConfirm.confirming}
      />
      <MasterDeleteDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingAttachment) setAttachmentToDelete(null);
        }}
        onConfirm={confirmRemoveAttachment}
        recordName={attachmentToDelete?.name}
        entityLabel="attachment"
        confirming={isDeletingAttachment}
      />


      {/* Success feedback is toast + onComplete (see save handler) */}

      {/* Criteria Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="rounded-3xl max-w-md p-0 border-none shadow-2xl bg-[var(--tm-surface)]/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-amber-500/15 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/30 shadow-sm animate-pulse shrink-0">
                <Info size={24} />
              </div>
              <div>
                <DialogTitle className="text-base font-medium text-slate-100 tracking-tight">
                  File Upload Blocked
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
                  Some files do not meet the upload criteria.
                </DialogDescription>
              </div>
            </div>

            {/* List of failed files */}
            <div className="mt-4 max-h-[160px] overflow-y-auto space-y-0 border border-[var(--tm-border)]/80 rounded-2xl p-3 bg-[var(--tm-muted)]/50">
              {invalidFiles.map((file, idx) => (
                <div key={idx} className="flex items-start gap-0.5 text-xs">
                  <span className="text-red-500 font-medium shrink-0 mt-0.5">✕</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-200 truncate leading-tight">{file.name}</p>
                    <p className="text-[10px] font-medium text-red-500 leading-none mt-0.5">{file.reason}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 self-center">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>

            {/* Criteria requirements list */}
            <div className="mt-5 space-y-2.5">
              <h4 className="text-[10px] font-medium text-slate-500">
                Attachment Criteria Requirements
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--tm-muted)]/80 border border-[var(--tm-border)]/60 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-400 leading-none mb-1.5">Allowed Types</p>
                  <p className="text-xs font-medium text-slate-200">{ALLOWED_UPLOAD_TYPES_LABEL}</p>
                  <p className="text-[9px] font-medium text-slate-400 mt-1">{ALLOWED_UPLOAD_EXTENSIONS_LABEL}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--tm-muted)]/80 border border-[var(--tm-border)]/60 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-400 leading-none mb-1.5">Maximum Size</p>
                  <p className="text-xs font-medium text-slate-200">10 MB</p>
                  <p className="text-[9px] font-medium text-slate-400 mt-1">Per individual file</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 pt-2 bg-[var(--tm-muted)]/50 flex justify-end gap-0.5 rounded-b-3xl">
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
      <MasterDeleteDialog
        open={subtaskToDelete != null}
        onOpenChange={(open) => {
          if (!open && !isDeletingSubtask) setSubtaskToDelete(null);
        }}
        onConfirm={handleDeleteSubtask}
        entityLabel="sub-task"
        confirming={isDeletingSubtask}
      />



      {/* Sub-Tasks Modal */}
      <Dialog open={isSubtasksModalOpen} onOpenChange={setIsSubtasksModalOpen}>
        <DialogContent className="rounded-[12px] w-[95vw] max-w-4xl p-0 border border-[var(--tm-border)]/80 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] bg-[var(--tm-surface)] overflow-hidden flex flex-col min-h-[40vh] max-h-[92vh] gap-0 [&>button]:hidden">
          <DialogHeader className="px-5 py-3.5 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex flex-row items-center gap-3 shrink-0 space-y-0 text-left">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
              <FileText size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-[15px] font-semibold text-slate-100 tracking-tight">
                  Manage Sub-Tasks
                </DialogTitle>
                {(() => {
                  const count =
                    localSubtasks.length +
                    subtaskFields.filter((sf) => !localSubtasks.some((st: any) => st.taskNo === sf.operTaskNo)).length;
                  if (count <= 0) return null;
                  return (
                    <span className="inline-flex items-center rounded-[6px] bg-[var(--tm-tint)] px-2 py-0.5 text-[11px] font-medium text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                      {count} {count === 1 ? 'sub-task' : 'sub-tasks'}
                    </span>
                  );
                })()}
              </div>
              <DialogDescription className="text-[12px] font-medium text-slate-500 mt-0.5">
                View, add, edit, or delete sub-tasks for this task.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSubtasksModalOpen(false)}
              className="h-8 w-8 p-0 rounded-[8px] shrink-0 text-slate-400 hover:text-slate-300 hover:bg-[var(--tm-muted)]"
              aria-label="Close"
            >
              <X size={15} strokeWidth={1.75} />
            </Button>
          </DialogHeader>

          <div className="px-5 py-4 overflow-y-auto flex-1 scrollbar-hide">
            <div className="space-y-3">
              {form.formState.errors.sub_tasks && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-[8px] flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-xs font-semibold text-red-400">
                    Please correct the highlighted errors in the sub-tasks before saving.
                  </span>
                </div>
              )}

              {localSubtasks.length === 0 && subtaskFields.length === 0 ? (
                <div className="text-center p-10 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)] flex flex-col items-center justify-center gap-1">
                  <p className="text-xs text-slate-500 font-medium">No sub-tasks yet.</p>
                  <p className="text-[10px] text-slate-400 font-medium">Use Add on the floating action to create one.</p>
                </div>
              ) : (
                <>
                  {localSubtasks.map((task: any, idx: number) => {
                    const editIndex = subtaskFields.findIndex(sf => sf.operTaskNo === task.taskNo);
                    if (editIndex !== -1) {
                      const field = subtaskFields[editIndex];
                      const index = editIndex;
                      const ownerErr = form.formState.errors.sub_tasks?.[index]?.ownerLoginNo?.message;
                      return (
                        <div
                          key={field.id}
                          className="relative rounded-[8px] border border-[#0EA5E9]/25 bg-[var(--tm-surface)] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                        >
                          <div className="relative flex items-center gap-3 pl-4 pr-3 py-2.5 bg-gradient-to-r from-[var(--tm-tint)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-surface)] text-[12px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/15">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-slate-100 truncate leading-tight">{task.title || 'Sub-Task'}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{task.status || 'Assigned'} · Editing</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button type="button" size="sm" variant="outline" className="h-8 px-2.5 text-[11px] font-medium border-[#3D4F66] text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-[8px]" onClick={() => removeSubtask(index)} title="Cancel">
                                <X size={12} className="mr-1" /> Cancel
                              </Button>
                              <Button type="button" size="sm" className="h-8 px-2.5 text-[11px] font-medium bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 rounded-[8px]" disabled={savingSubtaskIndex === index} onClick={() => handleSaveInlineSubtask(index)} title="Save">
                                {savingSubtaskIndex === index ? <InlineLoader size={12} className="mr-1" /> : <Check size={12} className="mr-1" />}
                                Save
                              </Button>
                            </div>
                          </div>

                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {showSubtaskType && (
                              <div className="space-y-1 sm:col-span-2">
                                <FieldLabel>Type</FieldLabel>
                                <Controller
                                  name={`sub_tasks.${index}.type_No`}
                                  control={form.control}
                                  render={({ field: subField }) => (
                                    <Combobox
                                      options={fillValues?.type?.map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] })) || []}
                                      value={subField.value || ''}
                                      onChange={(val) => subField.onChange(val)}
                                      placeholder="Select type"
                                      className="rounded-[8px] h-10 text-xs"
                                    />
                                  )}
                                />
                              </div>
                            )}
                            <div className="space-y-1 sm:col-span-2">
                              <FieldLabel>Sub-Task Title</FieldLabel>
                              <p className="text-xs font-medium text-slate-100 break-words rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-muted)] px-3 py-2.5">
                                {task.title}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <FieldLabel required>Task Assign To</FieldLabel>
                              <Controller
                                name={`sub_tasks.${index}.ownerLoginNo`}
                                control={form.control}
                                render={({ field: subField }) => {
                                  const canChangeSubAssignee = canUserChangeTaskAssignee(
                                    authUser,
                                    { originatorLoginNo: task.originatorLoginNo },
                                    { isNewTask: !task.taskNo || Number(task.taskNo) < 0 }
                                  );
                                  return (
                                    <FieldControl error={ownerErr}>
                                      <UserCombobox
                                        className={cn("rounded-[8px] h-10 text-xs", ownerErr && "border-red-400")}
                                        value={subField.value || ''}
                                        onChange={(user) => {
                                          const val = user.loginNo?.toString() || (user as any).LoginNo?.toString() || (user as any).id?.toString();
                                          subField.onChange(val);
                                          form.setValue(`sub_tasks.${index}.assignedDisplayName`, user.printingName || user.loginId || val);
                                          form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
                                        }}
                                        placeholder="Search owner"
                                        modal={true}
                                        error={!!ownerErr}
                                        disabled={!canChangeSubAssignee}
                                      />
                                    </FieldControl>
                                  );
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <FieldLabel>Due Date</FieldLabel>
                              <Controller
                                name={`sub_tasks.${index}.endDate`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <DateTimePicker
                                    date={subField.value ? new Date(subField.value) : undefined}
                                    onChange={(date) => subField.onChange(toUtcIsoOrEmpty(date))}
                                    placeholder="Select date"
                                    hideTime={true}
                                    className="h-10 rounded-[8px] text-xs border-[var(--tm-border)]"
                                  />
                                )}
                              />
                            </div>
                            <div className="space-y-1">
                              <FieldLabel>Completion Date</FieldLabel>
                              <Controller
                                name={`sub_tasks.${index}.completionDate`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <DateTimePicker
                                    date={subField.value ? new Date(subField.value) : undefined}
                                    onChange={(date) => subField.onChange(toUtcIsoOrEmpty(date))}
                                    placeholder="Select date"
                                    hideTime={true}
                                    className="h-10 rounded-[8px] text-xs border-[var(--tm-border)]"
                                  />
                                )}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <FieldLabel>Completion Remark</FieldLabel>
                              <Textarea
                                {...form.register(`sub_tasks.${index}.completionRemark`)}
                                placeholder="Enter remark"
                                rows={3}
                                className="min-h-[80px] resize-none rounded-[8px] border-[var(--tm-border)] text-xs"
                                maxLength={500}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const typeLabel = fillValues?.type?.find(
                      t => t.OperTaskTypeNo.toString() === task.type_No?.toString() || t.OperTaskTypeNo.toString() === task.operTaskTypeNo?.toString()
                    )?.["Task Type"];

                    return (
                      <div
                        key={task.taskNo}
                        className="relative rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-hidden group shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#0EA5E9]/30 hover:shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)] transition-all"
                      >
                        <div className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[12px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-slate-100 break-words leading-snug">{task.title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={cn('text-[10px]', getStatusTextClass(task.status))}>
                                {task.status || 'Assigned'}
                              </span>
                              {(task.code || task.taskNo > 0) && (
                                <span className="text-[10px] font-medium text-slate-400">{task.code || `#${task.taskNo}`}</span>
                              )}
                              {showSubtaskType && typeLabel ? (
                                <span className="text-[10px] font-medium text-slate-500">{typeLabel}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 rounded-[8px] border-[var(--tm-border)] text-slate-300 disabled:opacity-50" disabled={subtaskFields.length > 0} onClick={() => handleInlineEdit(task)} title="Inline Edit">
                              <Edit2 size={13} />
                            </Button>
                            {task.taskNo > 0 && (
                              <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 rounded-[8px] border-[var(--tm-border)] text-[#0EA5E9]" onClick={() => navigate(`/task/${task.taskNo}`)} title="Full Edit">
                                <ExternalLink size={13} />
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 rounded-[8px] border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setSubtaskToDelete(task.taskNo)} title="Delete">
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>

                        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-slate-400 mb-1">Assign To</p>
                            <div className="flex items-center gap-2 min-w-0">
                              {task.assignedDisplayName && task.assignedDisplayName !== '-' ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <UserAvatar
                                    loginNo={task.ownerLoginNo ? parseInt(task.ownerLoginNo as string) : undefined}
                                    displayName={task.assignedDisplayName}
                                    size="sm"
                                    className="shrink-0"
                                  />
                                  <TruncatedText
                                    text={task.assignedDisplayName}
                                    className="text-xs font-medium text-slate-200"
                                  />
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-slate-200 break-words">-</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-slate-400 mb-1">Due Date</p>
                            <p className="text-xs font-medium text-slate-200">{task.endDate ? formatDateOnly(task.endDate) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-slate-400 mb-1">Completion Date</p>
                            <p className="text-xs font-medium text-slate-200">{task.completionDate ? formatDateOnly(task.completionDate) : '-'}</p>
                          </div>
                          <div className="sm:col-span-2 min-w-0">
                            <p className="text-[10px] font-medium text-slate-400 mb-1">Completion Remark</p>
                            <p className="text-xs font-medium text-slate-200 break-words whitespace-pre-wrap">{task.completionRemark || '-'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {subtaskFields.map((field, index) => {
                    if (localSubtasks.some((st: any) => st.taskNo === field.operTaskNo)) return null;
                    const titleErr = form.formState.errors.sub_tasks?.[index]?.title?.message;
                    const ownerErr = form.formState.errors.sub_tasks?.[index]?.ownerLoginNo?.message;
                    return (
                      <div
                        key={field.id}
                        className="relative rounded-[8px] border border-[#0EA5E9]/25 bg-[var(--tm-surface)] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                      >
                        <div className="relative flex items-center gap-3 pl-4 pr-3 py-2.5 bg-gradient-to-r from-[var(--tm-tint)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-surface)] text-[12px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/15">
                            {localSubtasks.length + index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-slate-100 leading-tight">New sub-task</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Draft · Editing</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button type="button" size="sm" variant="outline" className="h-8 px-2.5 text-[11px] font-medium border-[#3D4F66] text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-[8px]" onClick={() => removeSubtask(index)} title="Cancel">
                              <X size={12} className="mr-1" /> Cancel
                            </Button>
                            <Button type="button" size="sm" className="h-8 px-2.5 text-[11px] font-medium bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 rounded-[8px]" disabled={savingSubtaskIndex === index} onClick={() => handleSaveInlineSubtask(index)} title="Save">
                              {savingSubtaskIndex === index ? <InlineLoader size={12} className="mr-1" /> : <Check size={12} className="mr-1" />}
                              Save
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {showSubtaskType && (
                            <div className="space-y-1 sm:col-span-2">
                              <FieldLabel>Type</FieldLabel>
                              <Controller
                                name={`sub_tasks.${index}.type_No`}
                                control={form.control}
                                render={({ field: subField }) => (
                                  <Combobox
                                    options={fillValues?.type?.map(t => ({ value: t.OperTaskTypeNo.toString(), label: t["Task Type"] })) || []}
                                    value={subField.value || ''}
                                    onChange={(val) => subField.onChange(val)}
                                    placeholder="Select type"
                                    className="rounded-[8px] h-10 text-xs"
                                  />
                                )}
                              />
                            </div>
                          )}
                          <div className="space-y-1 sm:col-span-2">
                            <FieldLabel required>Sub-Task Title</FieldLabel>
                            <FieldControl error={titleErr}>
                              <Input
                                {...form.register(`sub_tasks.${index}.title`)}
                                placeholder="Enter task title"
                                className={cn("rounded-[8px] h-10 text-xs border-[var(--tm-border)]", titleErr && "border-red-400")}
                                maxLength={200}
                              />
                            </FieldControl>
                          </div>
                          <div className="space-y-1">
                            <FieldLabel required>Task Assign To</FieldLabel>
                            <Controller
                              name={`sub_tasks.${index}.ownerLoginNo`}
                              control={form.control}
                              render={({ field: subField }) => (
                                <FieldControl error={ownerErr}>
                                  <UserCombobox
                                    className={cn("rounded-[8px] h-10 text-xs", ownerErr && "border-red-400")}
                                    value={subField.value || ''}
                                    onChange={(user) => {
                                      const val = user.loginNo?.toString() || (user as any).LoginNo?.toString() || (user as any).id?.toString();
                                      subField.onChange(val);
                                      form.setValue(`sub_tasks.${index}.assignedDisplayName`, user.printingName || user.loginId || val);
                                      form.clearErrors(`sub_tasks.${index}.ownerLoginNo`);
                                    }}
                                    placeholder="Search owner"
                                    modal={true}
                                    error={!!ownerErr}
                                  />
                                </FieldControl>
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>Due Date</FieldLabel>
                            <Controller
                              name={`sub_tasks.${index}.endDate`}
                              control={form.control}
                              render={({ field: subField }) => (
                                <DateTimePicker
                                  date={subField.value ? new Date(subField.value) : undefined}
                                  onChange={(date) => subField.onChange(toUtcIsoOrEmpty(date))}
                                  placeholder="Select date"
                                  hideTime={true}
                                  className="h-10 rounded-[8px] text-xs border-[var(--tm-border)]"
                                />
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>Completion Date</FieldLabel>
                            <Controller
                              name={`sub_tasks.${index}.completionDate`}
                              control={form.control}
                              render={({ field: subField }) => (
                                <DateTimePicker
                                  date={subField.value ? new Date(subField.value) : undefined}
                                  onChange={(date) => subField.onChange(toUtcIsoOrEmpty(date))}
                                  placeholder="Select date"
                                  hideTime={true}
                                  className="h-10 rounded-[8px] text-xs border-[var(--tm-border)]"
                                />
                              )}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <FieldLabel>Completion Remark</FieldLabel>
                            <Textarea
                              {...form.register(`sub_tasks.${index}.completionRemark`)}
                              placeholder="Enter remark"
                              rows={3}
                              className="min-h-[80px] resize-none rounded-[8px] border-[var(--tm-border)] text-xs"
                              maxLength={500}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="px-5 py-3.5 bg-[var(--tm-elevated)] border-t border-[var(--tm-border)] shrink-0">
            <Button
              type="button"
              onClick={() => setIsSubtasksModalOpen(false)}
              className="h-9 px-5 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-medium text-xs shadow-sm"
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

      {/* Confirmation Save Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-100">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9]/15 text-[#0EA5E9] ring-1 ring-[#0EA5E9]/25">
                <AlertCircle size={16} strokeWidth={2.5} />
              </div>
              Confirm Save
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-medium leading-relaxed text-slate-400">
              Are you sure you want to save this task?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 rounded-[8px] text-xs font-semibold border-[var(--tm-border)] text-slate-300 hover:bg-[var(--tm-muted)] hover:text-slate-100 shadow-none"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingSaveData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              autoFocus
              className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20"
              onClick={async () => {
                if (pendingSaveData) {
                  setShowConfirmDialog(false);
                  await proceedSubmit(pendingSaveData);
                  setPendingSaveData(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button onClick={handleRestoreDraft} className="bg-[#0EA5E9] hover:bg-[#0284C7]">
              Restore Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Blocker Dialog */}
      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' ? blocker.reset?.() : null}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-100">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/25">
                <AlertCircle size={16} strokeWidth={2.5} />
              </div>
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-medium leading-relaxed text-slate-400">
              You have unsaved edits on this task. Leave now? A draft will be kept so you can restore it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-semibold border-[var(--tm-border)] text-slate-300 hover:bg-[var(--tm-muted)] hover:text-slate-100"
              onClick={() => blocker.proceed?.()}
            >
              Leave
            </Button>
            <Button
              type="button"
              className="rounded-xl font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm"
              onClick={() => blocker.reset?.()}
            >
              Keep editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isCameraModalOpen && (
        <Dialog open={isCameraModalOpen} onOpenChange={setIsCameraModalOpen}>
          <DialogContent className="rounded-3xl max-w-2xl p-0 border-none shadow-2xl bg-[var(--tm-surface)] overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-5 pb-3 border-b border-[var(--tm-border)]">
              <DialogTitle className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
                <Camera size={18} className="text-[#0EA5E9]" />
                Capture Attachment
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500">
                Take a photo and upload it as a Task attachment.
              </DialogDescription>
            </DialogHeader>
            <div className="p-5 overflow-y-auto flex-1">
              <Suspense fallback={
                <div className="flex items-center justify-center py-16">
                  <BrandLoader size="sm" message="Loading camera" />
                </div>
              }>
                <CameraComp
                  companyNo={authCompanies?.[0]?.HeadOfficeNo || authCompanies?.[0]?.headOfficeNo || authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1}
                  formNo={1547}
                  fileNamePrefix="task-capture"
                  className="border-[var(--tm-border)] shadow-none"
                  onUploaded={handleCameraAttachmentUploaded}
                  onCancel={() => setIsCameraModalOpen(false)}
                />
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Standalone Sub-Task Form Modal */}
      <Dialog open={isStandaloneSubtaskModalOpen} onOpenChange={setIsStandaloneSubtaskModalOpen}>
        <DialogContent className="rounded-[12px] w-[95vw] max-w-3xl p-0 border border-[var(--tm-border)]/80 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] bg-[var(--tm-surface)] flex flex-col max-h-[92vh] overflow-hidden gap-0 [&>button]:hidden">
          <DialogHeader className="px-5 py-3.5 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] flex flex-row items-center gap-3 shrink-0 space-y-0 text-left">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
              <FileText size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[15px] font-semibold text-slate-100 tracking-tight">
                Add Sub-Task
              </DialogTitle>
              <DialogDescription className="text-[12px] font-medium text-slate-500 mt-0.5">
                Enter details to add a new sub-task.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsStandaloneSubtaskModalOpen(false)}
              className="h-8 w-8 p-0 rounded-[8px] shrink-0 text-slate-400 hover:text-slate-300 hover:bg-[var(--tm-muted)]"
              aria-label="Close"
            >
              <X size={15} strokeWidth={1.75} />
            </Button>
          </DialogHeader>

          <div className="px-5 py-4 overflow-y-auto flex-1 scrollbar-hide">
            <FormProvider {...standaloneSubtaskForm}>
              <form id="standaloneSubtaskForm" onSubmit={standaloneSubtaskForm.handleSubmit(async (data) => {
                if (!initialData?.taskNo) {
                  const newFakeTaskNo = nextFakeTaskNo();
                  const savedTask = {
                    taskNo: newFakeTaskNo,
                    code: '',
                    title: data.title,
                    status: 'Assigned',
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
              })} className="space-y-3.5">

                <div className="space-y-1">
                  <FieldLabel required>Sub-Task Title</FieldLabel>
                  <FieldControl error={standaloneSubtaskForm.formState.errors.title?.message as string | undefined}>
                    <Input
                      {...standaloneSubtaskForm.register("title")}
                      className={cn(
                        "w-full text-xs rounded-[8px] h-10 border-[var(--tm-border)] font-medium",
                        standaloneSubtaskForm.formState.errors.title && "border-red-400"
                      )}
                      placeholder="Enter sub-task title..."
                    />
                  </FieldControl>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {showSubtaskType && (
                    <div className="space-y-1 sm:col-span-2">
                      <FieldLabel>Type</FieldLabel>
                      <Controller
                        control={standaloneSubtaskForm.control}
                        name="type_No"
                        render={({ field }) => (
                          <Combobox
                            options={fillValues?.type?.map(t => ({ label: t["Task Type"], value: t.OperTaskTypeNo.toString() })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Type"
                            className="w-full text-xs rounded-[8px] h-10 border-[var(--tm-border)]"
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel required>Task Assign To</FieldLabel>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="ownerLoginNo"
                      render={({ field }) => (
                        <FieldControl error={standaloneSubtaskForm.formState.errors.ownerLoginNo?.message as string | undefined}>
                          <UserCombobox
                            value={field.value}
                            onChange={(user) => {
                              field.onChange(user.loginNo.toString());
                              standaloneSubtaskForm.setValue("assignedDisplayName", user.printingName || "");
                              standaloneSubtaskForm.clearErrors("ownerLoginNo");
                            }}
                            placeholder="Select Assign To"
                            modal={true}
                            className={cn(
                              "w-full text-xs rounded-[8px] h-10 border-[var(--tm-border)]",
                              standaloneSubtaskForm.formState.errors.ownerLoginNo && "border-red-400"
                            )}
                          />
                        </FieldControl>
                      )}
                    />
                    {standaloneAssignedDisplayName ? (
                      <p className="text-[11px] text-slate-500 break-words pt-0.5">
                        {standaloneAssignedDisplayName}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>Due Date</FieldLabel>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <DateTimePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(toUtcIsoOrEmpty(date))}
                          placeholder="Select date & time"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>Completion Date</FieldLabel>
                    <Controller
                      control={standaloneSubtaskForm.control}
                      name="completionDate"
                      render={({ field }) => (
                        <DateTimePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(toUtcIsoOrEmpty(date))}
                          placeholder="Select date & time"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <FieldLabel>Completion Remark</FieldLabel>
                  <Textarea
                    {...standaloneSubtaskForm.register("completionRemark")}
                    className="w-full text-xs rounded-[8px] min-h-[88px] border-[var(--tm-border)] resize-none"
                    placeholder="Enter completion remarks..."
                  />
                </div>

              </form>
            </FormProvider>
          </div>
          <DialogFooter className="px-5 py-3.5 bg-[var(--tm-elevated)] border-t border-[var(--tm-border)] shrink-0 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStandaloneSubtaskModalOpen(false)}
              className="rounded-[8px] h-9 text-xs font-medium border-[var(--tm-border)] text-slate-300 hover:bg-[var(--tm-surface)]"
            >
              Close
            </Button>
            <Button
              type="submit"
              form="standaloneSubtaskForm"
              className="rounded-[8px] h-9 text-xs font-medium bg-[#0EA5E9] hover:bg-[#0284C7] text-white gap-1.5"
            >
              <Check size={14} /> Add Sub-Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
