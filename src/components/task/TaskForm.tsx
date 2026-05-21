import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info, Users, Clock, TrendingUp, CheckCircle, Plus, Trash2, UserPlus, History, Check, Loader2, FileText } from 'lucide-react';
import { Task, TaskStatus } from '@/types/task';
import { useTaskStore } from '@/store/useTaskStore';
import { useEffect, useState, useMemo } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { Combobox } from '@/components/ui/Combobox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { TaskActivity } from './TaskActivity';
import { TaskListView } from './TaskListView';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';



import { useNavigate, useSearchParams } from 'react-router-dom';

const getTaskSchema = (isSubTask: boolean) => z.object({
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
  estimated_effort_value: z.string().optional()
    .refine(val => !val || val === '' || parseFloat(val) > 0, {
      message: 'Estimated effort must be greater than 0'
    }),
  estimated_effort_unit: z.string().optional(),
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
    email: z.string().email('Invalid email'),
    loginNo: z.number().optional(),
    isFromTeam: z.boolean().optional()
  })).optional().default([]),
  informed_to: z.array(z.object({
    userName: z.string().min(1, 'User Name is required'),
    displayName: z.string().min(1, 'Display Name is required'),
    email: z.string().email('Invalid email'),
    loginNo: z.number().optional(),
    isFromTeam: z.boolean().optional()
  })).optional().default([]),
  actual_efforts: z.array(z.object({
    date: z.string().min(1, 'Date is required'),
    hours: z.string().min(1, 'Hours is required'),
    description: z.string().optional()
  })).optional().default([]),
  check_list: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'),
    completed: z.boolean()
  })).optional().default([]),
  executionNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.is_business_benefit_applicable) {
    if (!data.business_benefit_type_No || data.business_benefit_type_No === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Benefit Type is required',
        path: ['business_benefit_type_No'],
      });
    }
    if (!data.estimated_benefit_amount || isNaN(parseFloat(data.estimated_benefit_amount)) || parseFloat(data.estimated_benefit_amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Estimated benefit amount must be greater than 0',
        path: ['estimated_benefit_amount'],
      });
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
  frequency?: { FrequencyNo: number; Frequency: string }[];
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

function FormSection({ title, icon: Icon, children, headerAction }: { title: string, icon: any, children: React.ReactNode, headerAction?: React.ReactNode }) {
  return (
    <div className="space-y-4 pt-6 first:pt-0">
      <div className="flex items-center justify-between px-1 border-l-4 border-[#006699] -ml-8 pl-7">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#006699]" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
        </div>
        {headerAction}
      </div>
      <div className="pl-0">
        {children}
      </div>
    </div>
  );
}

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

  const { addTask, updateTask, fetchFillValues, selectedFolder, tasks } = useTaskStore();
  const [localParentTask, setLocalParentTask] = useState<Task | null>(null);
  const parentTask = parentTaskProp || tasks.find(t => t.taskNo === parentTaskNo) || localParentTask;
  const subtasks = useMemo(() => {
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
      }));
    }
    return tasks.filter(t => t.parent_task_No === initialData?.taskNo);
  }, [tasks, initialData]);

  const { company: authCompanies, user: authUser } = useAuthStore();
  const [selectedCollabTeam, setSelectedCollabTeam] = useState<string>("");
  const [selectedInformTeam, setSelectedInformTeam] = useState<string>("");
  const [fillValues, setFillValues] = useState<TaskFillValues | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formDataToSave, setFormDataToSave] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(getTaskSchema(isSubTask)),
    shouldFocusError: false,
    defaultValues: {
      title: initialData?.title || '',
      code: initialData?.code || '',
      description: initialData?.description || '',
      priority_No: initialData?.priority_No?.toString() || (isSubTask && parentTask ? parentTask.priority_No.toString() : ''),
      type_No: initialData?.type_No?.toString() || (isSubTask && parentTask ? parentTask.type_No.toString() : ''),
      folder_No: (initialData as any)?.folder_No?.toString() || (initialData as any)?.folderNo?.toString() || (isSubTask && parentTask ? (parentTask.project_No || (parentTask as any).folder_No || (parentTask as any).folderNo)?.toString() : '') || selectedFolder?.TaskFolderNo?.toString() || '',
      category_No: initialData?.category_No?.toString() || (isSubTask && parentTask ? parentTask.category_No.toString() : ''),
      tags: initialData?.tags || [],
      company: resolveCompanyValue(initialData?.company, authCompanies) || (isSubTask && parentTask ? resolveCompanyValue(parentTask.company, authCompanies) : ''),
      location_No: initialData?.location_No?.toString() || (isSubTask && parentTask ? parentTask.location_No.toString() : ''),
      start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString() : '',
      end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString() : '',
      estimated_effort_value: initialData?.estimated_effort_value?.toString() || '',
      estimated_effort_unit: initialData?.estimated_effort_unit || 'Hours',
      is_business_benefit_applicable: initialData?.is_business_benefit_applicable || false,
      business_benefit_type_No: initialData?.business_benefit_type_No?.toString() || '',
      business_benefit_description: initialData?.business_benefit_description || '',
      estimated_benefit_amount: initialData?.estimated_benefit_amount?.toString() || '',
      actual_benefit_amount: initialData?.actual_benefit_amount?.toString() || '',
      benefit_period: initialData?.benefit_period || 'Monthly',
      originator_user_No: initialData?.originator_user_No?.toString() || '101',
      owner_user_No: initialData?.owner_user_No?.toString() || '',
      collaborators: initialData?.collaborators || [],
      informed_to: initialData?.informed_to || [],
      actual_efforts: initialData?.actual_efforts?.map(e => ({
        date: e.date,
        hours: e.hours.toString(),
        description: e.description
      })) || [],
      check_list: initialData?.check_list || [],
      executionNotes: initialData?.executionNotes || initialData?.execution_notes || '',
      status: initialData?.status || initialStatus || 'Draft',
      isPrivate: initialData?.isPrivate || false
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
              company: d.company || 'Glacier',
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

  const currentStatus = form.watch('status');
  const isBenefitApplicable = form.watch('is_business_benefit_applicable');
  const checklist = form.watch('check_list') || [];

  const [isBenefitDisabled, setIsBenefitDisabled] = useState(false);

  const handleCategoryChange = async (categoryNo: string) => {
    if (!categoryNo) {
      setIsBenefitDisabled(false);
      return;
    }

    try {
      const compNo = authCompanies?.[0]?.companyNo || authCompanies?.[0]?.CompanyNo || 2;
      let response: any = null;
      try {
        response = await apiService.get<any>(`/api/master/task-categories/load-data/${categoryNo}?companyNo=${compNo}`);
      } catch (e) {
        try {
          response = await apiService.get<any>(`/api/crm/tasks/task-category/load-data/${categoryNo}?companyNo=${compNo}`);
        } catch (e2) {
          try {
            response = await apiService.get<any>(`/api/crm/tasks/category-detail/load-data/${categoryNo}?companyNo=${compNo}`);
          } catch (e3) {
            response = await apiService.get<any>(`/api/crm/tasks/category/load-data/${categoryNo}?companyNo=${compNo}`);
          }
        }
      }

      if (response?.success && response?.data) {
        const data = response.data;

        // 1. If isBusinessBenefitApplicable is true, set the value and disable for user
        if (data.isBusinessBenefitApplicable) {
          form.setValue('is_business_benefit_applicable', true);
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
          form.setValue('check_list', mappedCheckList);
        }
      }
    } catch (error) {
      console.error('Failed to load category details:', error);
    }
  };

  const { fields: collabFields, append: appendCollab, remove: removeCollab, replace: replaceCollab } = useFieldArray({
    control: form.control,
    name: "collaborators"
  });

  const { fields: informFields, append: appendInform, remove: removeInform, replace: replaceInform } = useFieldArray({
    control: form.control,
    name: "informed_to"
  });


  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist } = useFieldArray({
    control: form.control,
    name: "check_list"
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const companyNo = authCompanies?.[0]?.companyNo || 2;
        const response = await fetchFillValues(companyNo.toString());
        if (response) {
          setFillValues(response as TaskFillValues);
        }

        // Set default values if not editing
        if (!initialData) {
          form.setValue('status', 'Draft');
          if (authUser) {
            form.setValue('originator_user_No', authUser.LoginNo?.toString() || authUser.loginNo?.toString() || '101');
          }
        }
      } catch (error) {
        console.error('Failed to fetch task options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [authCompanies, authUser, initialData, form, fetchFillValues]);

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
        estimated_effort_value: initialData.estimated_effort_value?.toString() || '',
        estimated_effort_unit: initialData.estimated_effort_unit || 'hours',
        is_business_benefit_applicable: initialData.is_business_benefit_applicable || false,
        business_benefit_type_No: initialData.business_benefit_type_No?.toString() || '',
        business_benefit_description: initialData.business_benefit_description || '',
        estimated_benefit_amount: initialData.estimated_benefit_amount?.toString() || '',
        actual_benefit_amount: initialData.actual_benefit_amount?.toString() || '',
        benefit_period: initialData.benefit_period || 'One Time',
        collaborators: initialData.collaborators?.map(c => ({ userName: c.userName || '', displayName: c.displayName || '', email: c.email || '', loginNo: c.loginNo })) || [],
        informed_to: initialData.informed_to?.map(i => ({ userName: i.userName || '', displayName: i.displayName || '', email: i.email || '', loginNo: i.loginNo })) || [],
        actual_efforts: initialData.actual_efforts?.map(e => ({ date: e.date, hours: e.hours.toString(), description: e.description })) || [],
        check_list: initialData.check_list || [],
        executionNotes: initialData.executionNotes || initialData.execution_notes || '',
      });
      if (initialData.collaboratorUserGroupNo) {
        setSelectedCollabTeam(initialData.collaboratorUserGroupNo.toString());
      }
      if (initialData.infromToUserGroupNo) {
        setSelectedInformTeam(initialData.infromToUserGroupNo.toString());
      }
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

  const handleNumericInput = (e: React.FormEvent<HTMLInputElement>, precision: number = 2) => {
    let value = e.currentTarget.value;

    if (precision === 0) {
      // For 0 precision, strip everything after and including the decimal point
      if (value.includes('.')) {
        e.currentTarget.value = value.split('.')[0];
      }
      return;
    }

    if (value.includes('.')) {
      const [intPart, decimalPart] = value.split('.');
      if (decimalPart.length > precision) {
        e.currentTarget.value = `${intPart}.${decimalPart.substring(0, precision)}`;
      }
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

  const onSubmit = async (data: any) => {
    console.log('onSubmit triggered with data:', data);
    setFormDataToSave(data);
    setShowConfirm(true);
  };

  const proceedSubmit = async (data: any) => {
    console.log('proceedSubmit triggered with data:', data);
    setShowConfirm(false); // Close confirmation immediately

    // Mapping for effort frequency (units)
    const effortFrequencyMap: Record<string, number> = {
      'minutes': 1,
      'hours': 2,
      'days': 3,
      'weeks': 4,
      'months': 5,
      'years': 6
    };

    // Mapping for benefit frequency (period)
    const benefitFrequencyMap: Record<string, number> = {
      'One Time': 1,
      'Monthly': 2,
      'Annually': 3
    };

    // Find status number from fillValues
    const statusObj = fillValues?.status.find(s => s.Status === data.status);
    const statusNo = statusObj?.StatusNo || 0;

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
      companyNo: parseInt(data.company) || authCompanies?.[0]?.companyNo || 2,
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
      estimatedEfforts: parseFloat(data.estimated_effort_value) || null,
      estimatedEffortsFequencyNo: (parseFloat(data.estimated_effort_value) || null) ? (effortFrequencyMap[data.estimated_effort_unit] || null) : null,
      isBusinessBenefitApplicable: data.is_business_benefit_applicable,
      businessBenefitTypeNo: data.is_business_benefit_applicable ? (parseInt(data.business_benefit_type_No) || null) : null,
      businessBenefitDescription: data.is_business_benefit_applicable ? (data.business_benefit_description || null) : null,
      estimatedBenefitAmount: data.is_business_benefit_applicable ? (parseFloat(data.estimated_benefit_amount) || null) : null,
      actualBenefitAmount: data.is_business_benefit_applicable ? (parseFloat(data.actual_benefit_amount) || null) : null,
      benefitFrequencyNo: data.is_business_benefit_applicable ? (benefitFrequencyMap[data.benefit_period] || null) : null,
      statusNo: statusNo || null,
      folderNo: parseInt(data.folder_No) || selectedFolder?.TaskFolderNo || null,
      createdBy: authUser?.loginNo || authUser?.LoginNo || 1,
      createdDate: new Date().toISOString(),
      checkLists: data.check_list.map((item: any, index: number) => ({
        description: item.description || null,
        sequenceNo: index + 1,
        isChecked: item.completed || false,
        checkedOn: new Date().toISOString()
      })),
      comments: [],
      effortLogs: data.actual_efforts.map((effort: any) => ({
        logDate: effort.date ? new Date(effort.date).toISOString() : null,
        efforts: parseFloat(effort.hours) || null,
        description: effort.description || null
      })),
      members: members
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
      if (onComplete) onComplete();
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
      const freqName = frequencyObj?.Frequency?.toLowerCase() || '';

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
        <p className="text-slate-500 font-bold text-sm animate-pulse uppercase tracking-widest">Synchronizing Application Data...</p>
      </div>
    );
  }

  // Status flow logic
  const allowedNextStatuses = initialData && currentStatus
    ? statusTransitions[currentStatus] || []
    : [];

  const filteredStatuses = fillValues?.status.filter(s => {
    if (!initialData) return s.Status === 'Draft';
    return s.Status === currentStatus || allowedNextStatuses.includes(s.Status);
  }) || [];

  // Company options from auth data
  const companyOptions = authCompanies?.map(c => ({
    label: c.CompanyName || c.companyName || c.name || 'Unknown Company',
    value: (c.companyNo || c.CompanyNo || '').toString()
  })) || [];

  const collabError = form.formState.errors.collaborators;
  const hasCollabError = collabError && !Array.isArray(collabError) && (collabError as any).message;

  const informError = form.formState.errors.informed_to;
  const hasInformError = informError && !Array.isArray(informError) && (informError as any).message;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <form id="task-form" onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="space-y-8 divide-y divide-slate-100">

        {/* 1. Basic Information */}
        <FormSection
          title="Basic Information"
          icon={Info}
          headerAction={
            <div className="flex items-center gap-4">
              <Controller
                name="isPrivate"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2 mr-2">
                    <Checkbox id="isPrivate" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="isPrivate" className="text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer">Private Task</label>
                  </div>
                )}
              />
              <div className="flex items-center gap-3 bg-slate-50/80 px-4 py-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</Label>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="rounded-xl h-8 border-transparent bg-transparent text-slate-900 font-bold text-xs shadow-none hover:bg-slate-100 w-[160px]">
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
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Row 1: Task ID & Task Title */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-8 gap-y-4">
              <div className="space-y-1.5" id="form-group-code">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Task Code</Label>
                <Input
                  placeholder="Auto Generate"
                  disabled
                  {...form.register('code')}
                  className={cn(
                    "rounded-xl border-slate-300 h-9 font-mono text-slate-900 font-medium text-sm shadow-sm",
                    form.formState.errors.code && "border-red-500"
                  )}
                />
                {form.formState.errors.code && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-1.5 lg:col-span-3" id="form-group-title">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">
                  Task Title {isSubTask && <span className="text-red-500 font-black">*</span>}
                </Label>
                <Input placeholder="Enter task title" {...form.register('title')} className={cn("rounded-xl border-slate-300 h-9 focus:ring-primary/20 focus:border-[#006699] text-slate-900 font-medium text-sm shadow-sm", form.formState.errors.title && "border-red-500")} />
                {form.formState.errors.title && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.title.message}</p>}
              </div>
            </div>

            {/* Row 2: Task Description */}
            <div className="space-y-1.5" id="form-group-description">
              <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Task Description</Label>
              <Textarea
                placeholder="Describe the task in detail..."
                className={cn(
                  "min-h-[100px] rounded-xl border-slate-300 focus:ring-primary/20 focus:border-[#006699] p-3 leading-relaxed text-slate-900 font-medium text-sm shadow-sm",
                  form.formState.errors.description && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                )}
                {...form.register('description')}
              />
              {form.formState.errors.description && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.description.message}</p>}
            </div>

            {/* Row 3: Category, Type, Priority */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4">
              <div className="space-y-1.5" id="form-group-category_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Category</Label>
                <Controller
                  name="category_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      disabled={isSubTask}
                      options={fillValues?.category
                        .filter(c => c.Category.toLowerCase() !== 'all' && c.Category.toLowerCase() !== '[all]')
                        .map(c => ({ label: c.Category, value: c.OperTaskCategoryNo.toString() })) || []}
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        handleCategoryChange(val);
                      }}
                      placeholder="Select category"
                      className={form.formState.errors.category_No ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.category_No && <p className="text-[10px] text-red-500 font-bold ml-1">Category is required</p>}
              </div>
              <div className="space-y-1.5" id="form-group-type_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Type</Label>
                <Controller
                  name="type_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      disabled={isSubTask}
                      options={fillValues?.type
                        .filter(t => t["Task Type"].toLowerCase() !== 'all' && t["Task Type"].toLowerCase() !== '[all]')
                        .map(t => ({ label: t["Task Type"], value: t.OperTaskTypeNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select type"
                      className={form.formState.errors.type_No ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.type_No && <p className="text-[10px] text-red-500 font-bold ml-1">Type is required</p>}
              </div>
              <div className="space-y-1.5" id="form-group-folder_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Folder</Label>
                <Controller
                  name="folder_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      disabled={isSubTask}
                      options={fillValues?.folder
                        .map(f => ({ label: f["Folder Name"], value: f.TaskFolderNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select folder"
                      className={form.formState.errors.folder_No ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.folder_No && <p className="text-[10px] text-red-500 font-bold ml-1">Folder is required</p>}
              </div>
              <div className="space-y-1.5" id="form-group-priority_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Priority</Label>
                <Controller
                  name="priority_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      disabled={isSubTask}
                      options={fillValues?.priority
                        .filter(p => p.Priority.toLowerCase() !== 'all' && p.Priority.toLowerCase() !== '[all]')
                        .map(p => ({ label: p.Priority, value: p.OperTaskPriorityNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select priority"
                      className={form.formState.errors.priority_No ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.priority_No && <p className="text-[10px] text-red-500 font-bold ml-1">Priority is required</p>}
              </div>
            </div>

            {/* Row 4: Tags */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Tags</Label>
              <Controller
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <TagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press enter or comma to add tags"
                    className="min-h-[36px] py-1 border-slate-300 shadow-sm"
                  />
                )}
              />
            </div>
          </div>
        </FormSection>

        {/* 2. Ownership & Responsibility */}
        <FormSection title="Ownership & Responsibility" icon={Users}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5" id="form-group-company">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Company</Label>
                <Controller
                  name="company"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      disabled={isSubTask}
                      options={companyOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search company..."
                      className={form.formState.errors.company ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.company && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.company.message}</p>}
              </div>
              <div className="space-y-1.5" id="form-group-location_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Location</Label>
                <Controller
                  name="location_No"
                  control={form.control}
                  render={({ field }) => (
                    <Combobox
                      disabled={isSubTask}
                      options={fillValues?.location
                        .filter(l => l.Location.toLowerCase() !== 'all' && l.Location.toLowerCase() !== '[all]')
                        .map(l => ({ label: l.Location, value: l.OperLocationNo.toString() })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select location"
                      className={form.formState.errors.location_No ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.location_No && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.location_No.message}</p>}
              </div>
              <div className="space-y-1.5" id="form-group-owner_user_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">
                  Task Owner {isSubTask && <span className="text-red-500 font-black">*</span>}
                </Label>
                <Controller
                  name="owner_user_No"
                  control={form.control}
                  render={({ field }) => (
                    <UserCombobox
                      value={field.value}
                      onChange={(user) => field.onChange(user.loginNo.toString())}
                      placeholder="Search member..."
                      initialLabel={initialData?.assignedDisplayName || undefined}
                      className={form.formState.errors.owner_user_No ? "border-red-500" : ""}
                      disabled={isPrivateTask}
                    />
                  )}
                />
                {form.formState.errors.owner_user_No && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.owner_user_No.message}</p>}
              </div>
              <div className="space-y-1.5" id="form-group-originator_user_No">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Task Originator</Label>
                <Controller
                  name="originator_user_No"
                  control={form.control}
                  render={({ field }) => (
                    <UserCombobox
                      value={field.value}
                      onChange={(user) => field.onChange(user.loginNo.toString())}
                      placeholder="Search member..."
                      initialLabel={initialData ? (initialData.originatorDisplayName || undefined) : (authUser?.PrintingName || authUser?.name || undefined)}
                      className={form.formState.errors.originator_user_No ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.originator_user_No && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.originator_user_No.message}</p>}
              </div>
            </div>

            {!isPrivateTask && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Collaborators Grid */}
                <div className="space-y-3" id="form-group-collaborators">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Collaborators</h4>
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] text-slate-700 font-extrabold">Team:</Label>
                        <Select value={selectedCollabTeam} onValueChange={(val) => handleTeamSelection(val, 'collaborator')}>
                          <SelectTrigger className="rounded-lg h-6 border-slate-300 text-[9px] w-24 bg-slate-50 shadow-none px-2"><SelectValue placeholder="Quick Add" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {fillValues?.userGroup.map(group => (
                              <SelectItem key={group.UserGroupNo} value={group.UserGroupNo.toString()} className="text-[10px]">{group.UserGroupName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="button" onClick={() => appendCollab({ userName: '', displayName: '', email: '' })} variant="ghost" size="sm" className="h-7 text-[9px] font-bold text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
                      <UserPlus size={12} /> Add
                    </Button>
                  </div>
                  <div className={cn("bg-slate-50/50 rounded-xl border overflow-hidden shadow-sm transition-all", hasCollabError ? "border-red-500 ring-2 ring-red-500/10" : "border-slate-200")}>
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">User Name</th>
                          <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">Display Name</th>
                          <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">Email</th>
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
                                  <UserCombobox
                                    value={nameField.value}
                                    onChange={(user) => {
                                      nameField.onChange(user.loginId);
                                      form.setValue(`collaborators.${index}.displayName`, user.printingName);
                                      form.setValue(`collaborators.${index}.email`, user.email || '');
                                      form.setValue(`collaborators.${index}.loginNo`, user.loginNo);
                                    }}
                                    placeholder="User Name"
                                    className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2"
                                    initialLabel={nameField.value}
                                    disabled={field.isFromTeam}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input disabled {...form.register(`collaborators.${index}.displayName`)} placeholder="Display Name" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 font-bold" />
                            </td>
                            <td className="px-2 py-1">
                              <Input disabled {...form.register(`collaborators.${index}.email`)} placeholder="Email" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 font-bold" />
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
                  {hasCollabError && <p className="text-[10px] text-red-500 font-bold ml-1">{collabError.message}</p>}
                </div>

                {/* Inform To Grid */}
                <div className="space-y-3" id="form-group-informed_to">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Inform To</h4>
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] text-slate-700 font-extrabold">Team:</Label>
                        <Select value={selectedInformTeam} onValueChange={(val) => handleTeamSelection(val, 'inform')}>
                          <SelectTrigger className="rounded-lg h-6 border-slate-300 text-[9px] w-24 bg-slate-50 shadow-none px-2"><SelectValue placeholder="Quick Add" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {fillValues?.userGroup.map(group => (
                              <SelectItem key={group.UserGroupNo} value={group.UserGroupNo.toString()} className="text-[10px]">{group.UserGroupName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="button" onClick={() => appendInform({ userName: '', displayName: '', email: '' })} variant="ghost" size="sm" className="h-7 text-[9px] font-bold text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
                      <UserPlus size={12} /> Add
                    </Button>
                  </div>
                  <div className={cn("bg-slate-50/50 rounded-xl border overflow-hidden shadow-sm transition-all", hasInformError ? "border-red-500 ring-2 ring-red-500/10" : "border-slate-200")}>
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">User Name</th>
                          <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">Display Name</th>
                          <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">Email</th>
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
                                  <UserCombobox
                                    value={nameField.value}
                                    onChange={(user) => {
                                      nameField.onChange(user.loginId);
                                      form.setValue(`informed_to.${index}.displayName`, user.printingName);
                                      form.setValue(`informed_to.${index}.email`, user.email || '');
                                      form.setValue(`informed_to.${index}.loginNo`, user.loginNo);
                                    }}
                                    placeholder="User Name"
                                    className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2"
                                    initialLabel={nameField.value}
                                    disabled={field.isFromTeam}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input disabled {...form.register(`informed_to.${index}.displayName`)} placeholder="Display Name" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 font-bold" />
                            </td>
                            <td className="px-2 py-1">
                              <Input disabled {...form.register(`informed_to.${index}.email`)} placeholder="Email" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 font-bold" />
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
                  {hasInformError && <p className="text-[10px] text-red-500 font-bold ml-1">{informError.message}</p>}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* 3. Timeline */}
        <FormSection title="Timeline & Effort" icon={Clock}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5" id="form-group-start_date">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Start Date</Label>
                <Controller
                  name="start_date"
                  control={form.control}
                  render={({ field }) => (
                    <DateTimePicker
                      date={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                      placeholder="Select start date & time"
                      className={form.formState.errors.start_date ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.start_date && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.start_date.message}</p>}
              </div>
              <div className="space-y-1.5" id="form-group-end_date">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">
                  Due Date {isSubTask && <span className="text-red-500 font-black">*</span>}
                </Label>
                <Controller
                  name="end_date"
                  control={form.control}
                  render={({ field }) => (
                    <DateTimePicker
                      date={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                      placeholder="Select due date & time"
                      className={form.formState.errors.end_date ? "border-red-500" : ""}
                    />
                  )}
                />
                {form.formState.errors.end_date && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.end_date.message}</p>}
              </div>
              <div className="space-y-1.5 lg:col-span-2" id="form-group-estimated_effort_value">
                <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Estimated Effort</Label>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      type="number"
                      step="0"
                      placeholder=""
                      {...form.register('estimated_effort_value')}
                      onInput={(e) => handleNumericInput(e, 0)}
                      className={cn(
                        "rounded-xl h-9 border-slate-300 text-slate-900 font-medium text-sm shadow-sm text-right w-full",
                        form.formState.errors.estimated_effort_value && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                    />
                  </div>
                  <Controller
                    name="estimated_effort_unit"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={cn("rounded-xl h-9 border-slate-300 text-slate-900 font-medium text-sm shadow-sm w-32", form.formState.errors.estimated_effort_unit && "border-red-500")}>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {form.formState.errors.estimated_effort_value && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.estimated_effort_value.message}</p>}
                {!form.formState.errors.estimated_effort_value && form.formState.errors.estimated_effort_unit && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.estimated_effort_unit.message}</p>}
              </div>
            </div>
          </div>
        </FormSection>

        {/* 4. Business Impact */}
        <FormSection title="Business Benefit Section" icon={TrendingUp}>
          <div className="space-y-4">
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
                <Label htmlFor="benefit-section" className="text-sm font-bold text-slate-800 cursor-pointer">Business Benefit Applicable</Label>
              </div>
            </div>

            {isBenefitApplicable && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5" id="form-group-business_benefit_type_No">
                  <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Benefit Type</Label>
                  <Controller
                    name="business_benefit_type_No"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={cn("rounded-xl h-9 border-slate-300 text-slate-900 font-medium text-sm shadow-sm", form.formState.errors.business_benefit_type_No && "border-red-500")}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {fillValues?.benefitType
                            .filter(b => {
                              const item = b as any;
                              const label = item["Business Benefit"] || item.BusinessBenefitTypeName || item.businessBenefitTypeName || item.BenefitTypeName || item.benefitTypeName || item.typeName || item.Name || item.name || item.Code || item.code || '';
                              const lower = label.toLowerCase();
                              return lower !== 'all' && lower !== '[all]';
                            })
                            .map(b => {
                              const item = b as any;
                              const val = (item.BusinessBenefitTypeNo ?? item.businessBenefitTypeNo ?? '').toString();
                              const label = item["Business Benefit"] || item.BusinessBenefitTypeName || item.businessBenefitTypeName || item.BenefitTypeName || item.benefitTypeName || item.typeName || item.Name || item.name || item.Code || item.code || `Benefit Type #${val}`;
                              return (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.business_benefit_type_No && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.business_benefit_type_No.message}</p>}
                </div>
                <div className="space-y-1.5" id="form-group-benefit_period">
                  <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Benefit Period</Label>
                  <Controller
                    name="benefit_period"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={cn("rounded-xl h-9 border-slate-300 text-slate-900 font-medium text-sm shadow-sm", form.formState.errors.benefit_period && "border-red-500")}>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="One Time">One Time</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.benefit_period && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.benefit_period.message}</p>}
                </div>
                <div className="space-y-1.5" id="form-group-estimated_benefit_amount">
                  <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Estimated Benefit Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder=""
                    {...form.register('estimated_benefit_amount')}
                    onInput={(e) => handleNumericInput(e, 2)}
                    className={cn(
                      "rounded-xl h-9 border-slate-300 text-slate-900 font-medium text-sm shadow-sm text-right",
                      form.formState.errors.estimated_benefit_amount && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                  />
                  {form.formState.errors.estimated_benefit_amount && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.estimated_benefit_amount.message}</p>}
                </div>
                <div className="space-y-1.5" id="form-group-actual_benefit_amount">
                  <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Actual Benefit Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder=""
                    {...form.register('actual_benefit_amount')}
                    onInput={(e) => handleNumericInput(e, 2)}
                    className={cn(
                      "rounded-xl h-9 border-slate-300 text-slate-900 font-medium text-sm shadow-sm text-right",
                      form.formState.errors.actual_benefit_amount && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                  />
                  {form.formState.errors.actual_benefit_amount && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.actual_benefit_amount.message}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2" id="form-group-business_benefit_description">
                  <Label className="text-slate-700 font-black text-[11px] uppercase tracking-wider ml-1">Benefit Description</Label>
                  <Textarea
                    placeholder="Describe the business benefit in detail..."
                    {...form.register('business_benefit_description')}
                    className={cn(
                      "min-h-[80px] rounded-xl border-slate-300 text-slate-900 font-medium text-sm shadow-sm",
                      form.formState.errors.business_benefit_description && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                  />
                  {form.formState.errors.business_benefit_description && <p className="text-[10px] text-red-500 font-bold ml-1">{form.formState.errors.business_benefit_description.message}</p>}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* 5. Execution Detail */}
        <FormSection title="Execution Detail" icon={CheckCircle}>
          <div className="space-y-6">
            {/* Sub-Tasks Section */}
            {!!initialData && (
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    Sub-Tasks
                    {subtasks.length > 0 && (
                      <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {subtasks.length}
                      </span>
                    )}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => navigate(`/task/new?parentTaskNo=${initialData.taskNo}`)}
                    className="rounded-xl font-bold border-slate-300 hover:bg-slate-50 h-9 px-4 text-[11px] uppercase shadow-sm gap-2 transition-all active:scale-95 text-slate-700 shrink-0"
                  >
                    <Plus size={14} className="text-[#006699]" /> Add Sub-Task
                  </Button>
                </div>

                {subtasks.length > 0 ? (
                  <div className="bg-slate-50/50 p-2 rounded-[24px] border border-slate-100">
                    <TaskListView tasks={subtasks as any} />
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No sub-tasks created yet</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col gap-1 flex-1 max-w-md">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Checklist</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    <span>Task Completion</span>
                    <span className="text-[#006699]">{progressPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full bg-[#006699] rounded-full shadow-[0_0_8px_rgba(0,102,153,0.3)]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => appendChecklist({ id: Date.now().toString(), description: '', completed: false })}
                  className="rounded-xl font-bold border-slate-300 hover:bg-slate-50 h-9 px-4 text-[11px] uppercase shadow-sm gap-2 transition-all active:scale-95 text-slate-700"
                >
                  <Plus size={14} className="text-[#006699]" /> Add Checklist Item
                </Button>
              </div>
            </div>

            <div className="space-y-2.5">
              {checklistFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
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
                    <Input
                      {...form.register(`check_list.${index}.description`)}
                      placeholder="Specify checklist requirement..."
                      className={cn(
                        "border-none bg-transparent shadow-none p-0 h-auto text-sm font-medium transition-all duration-300 focus-visible:ring-0",
                        form.watch(`check_list.${index}.completed`)
                          ? "text-slate-400 line-through decoration-2"
                          : "text-slate-800"
                      )}
                    />
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

              {checklistFields.length === 0 && (
                <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <CheckCircle size={24} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No checklist items defined</p>
                  <p className="text-slate-400 text-[10px] mt-1">Click "Add Checklist Item" to start tracking milestones</p>
                </div>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection title="Task Execution Note" icon={FileText}>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
                Execution Notes
              </label>
              <Controller
                name="executionNotes"
                control={form.control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Enter detailed execution notes, outcomes, or observations here..."
                    className="min-h-[100px] text-xs font-semibold rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#006699]/15 focus-visible:ring-offset-0 text-slate-800"
                  />
                )}
              />
            </div>
          </div>
        </FormSection>

        {initialData && (
          <FormSection title="Activity & Effort Logs" icon={History}>
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
      </form>

      {/* Save/Update Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl bg-white/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Confirm {initialData ? "Update" : "Save"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Are you sure you want to {initialData ? "update this task" : "save this new task"}? This action will apply the changes immediately.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-2 rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setFormDataToSave(null);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No, Cancel
            </Button>
            <Button
              onClick={() => {
                if (formDataToSave) {
                  setShowConfirm(false);
                  proceedSubmit(formDataToSave);
                }
              }}
              className="h-10 px-5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-black text-xs uppercase tracking-widest shadow-md shadow-[#006699]/10 gap-2 transition-transform hover:scale-[1.02] active:scale-95"
            >
              Yes, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
