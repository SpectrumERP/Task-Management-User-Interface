import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { Task } from '@/types/task';
import { TaskActivity } from './TaskActivity';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Edit,
  Calendar,
  MapPin,
  Building2,
  FolderClosed,
  Layers,
  AlertCircle,
  Coins,
  Loader2,
  CheckSquare,
  FileText,
  Paperclip,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useTaskStore } from '@/store/useTaskStore';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface TaskDetailModalProps {
  taskNo: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshTasks?: () => void;
}

const formatFileSize = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const reverseEffortFrequencyMap: Record<number, string> = {
  1: 'minutes',
  2: 'hours',
  3: 'days',
  4: 'weeks',
  5: 'months',
  6: 'years'
};

const reverseBenefitFrequencyMap: Record<number, string> = {
  1: 'One Time',
  2: 'Monthly',
  3: 'Annually'
};

export function TaskDetailModal({ taskNo, isOpen, onClose, onRefreshTasks }: TaskDetailModalProps) {
  const navigate = useNavigate();
  const { fillValues } = useTaskStore();
  const [task, setTask] = useState<Task | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const getContrastColor = (hexColor?: string) => {
    if (!hexColor) return '#1e293b';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6 && hex.length !== 3) return '#1e293b';

    let r = 0, g = 0, b = 0;
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 3) {
      r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
      g = parseInt(hex.substring(1, 1) + hex.substring(1, 1), 16);
      b = parseInt(hex.substring(2, 2) + hex.substring(2, 2), 16);
    }

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 140 ? '#0f172a' : '#ffffff';
  };

  const fetchTaskDetails = async () => {
    if (!taskNo) return;
    try {
      setIsLoading(true);
      const response = await apiService.get<{ success: boolean; data: any }>(`/api/crm/tasks/load-data/${taskNo}`);
      if (response.success && response.data) {
        const d = response.data;

        // Map collaborators (isCollaborator === true)
        const mappedCollabs = (d.collaborators || [])
          .filter((c: any) => c.isCollaborator === true)
          .map((c: any) => ({
            userName: c.user?.userName || '',
            displayName: c.user?.displayName || '',
            email: c.user?.email || `${c.user?.userName || 'user'}@glacier.com`,
            loginNo: c.user?.id
          }));

        // Map informed to (isCollaborator === false)
        const mappedInformTo = (d.collaborators || [])
          .filter((c: any) => c.isCollaborator === false)
          .map((c: any) => ({
            userName: c.user?.userName || '',
            displayName: c.user?.displayName || '',
            email: c.user?.email || `${c.user?.userName || 'user'}@glacier.com`,
            loginNo: c.user?.id
          }));

        // Map checklist
        const mappedCheckList = (d.checkList || []).map((c: any) => ({
          id: (c.operTaskCheckListDetailNo || Math.floor(Math.random() * 10000)).toString(),
          description: c.description || '',
          completed: c.isChecked || false
        }));

        // Map comments
        const mappedComments = (d.comments || []).map((c: any) => ({
          id: (c.operTaskCommentDetailNo || Math.floor(Math.random() * 10000)).toString(),
          author: c.createdBy?.printingName || c.createdBy?.displayName || c.createdBy?.loginId || 'Unknown',
          text: c.description || c.comment || '',
          timestamp: c.createdDate || new Date().toISOString(),
          loginNo: c.createdBy?.id || c.loginNo || null
        }));

        // Map actual efforts
        const mappedEfforts = (d.effortLogs || []).map((e: any) => ({
          date: e.effortDate || e.logDate || '',
          hours: e.effortHours || e.efforts || null,
          description: e.effortDescription || e.description || ''
        }));

        const mappedTask: Task = {
          taskNo: d.operTaskNo,
          code: d.code || '',
          title: d.title || '',
          description: d.description || '',
          priority_No: d.priority?.operTaskPriorityNo || null,
          category_No: d.category?.operTaskCategoryNo || null,
          type_No: d.type?.operTaskTypeNo || null,
          tags: d.tags ? (typeof d.tags === 'string' ? d.tags.split(',') : d.tags) : [],
          originator_user_No: d.originator?.id || null,
          owner_user_No: d.owner?.id || null,
          location_No: d.location?.operTaskLocationNo || null,
          company: d.taskCompany?.taskCompanyNo || '',
          start_date: d.startDate,
          end_date: d.endDate,
          isAllDay: d.isAllday ?? d.isAllDay ?? false,
          calendarColor: d.colorCoding || '',
          estimated_effort_value: d.estimatedEfforts?.hours ?? null,
          estimated_effort_unit: reverseEffortFrequencyMap[d.estimatedEfforts?.frequency?.frequencyNo || 2] || 'hours',
          is_business_benefit_applicable: d.isBusinessBenefitApplicable || false,
          business_benefit_type_No: d.businessBenefit?.businessBenefitType?.businessBenefitTypeNo || d.businessBenefit?.businessBenefitTypeNo || null,
          business_benefit_description: d.businessBenefit?.businessBenefitDescription || '',
          estimated_benefit_amount: d.businessBenefit?.estimatedBenefitAmount ?? null,
          actual_benefit_amount: d.businessBenefit?.actualBenefitAmount ?? null,
          benefit_period: reverseBenefitFrequencyMap[d.businessBenefit?.benefitFrequency?.frequencyNo || 1] || 'One Time',
          status_No: d.status?.operTaskStatusNo || 1,
          status: d.status?.statusName || 'Draft',
          priority: d.priority?.priorityName || 'Low Priority',
          categoryName: d.category?.categoryName || '',
          typeName: d.type?.typeName || '',
          assignedDisplayName: d.owner?.displayName || '',
          originatorDisplayName: d.originator?.displayName || '',
          collaborators: mappedCollabs,
          informed_to: mappedInformTo,
          check_list: mappedCheckList,
          task_comments: mappedComments,
          actual_efforts: mappedEfforts,
          executionNotes: d.executionNotes || d.execution_notes || '',
          execution_notes: d.executionNotes || d.execution_notes || '',
          collaboratorUserGroupNo: d.collaboratorUserGroupNo || null,
          infromToUserGroupNo: d.infromToUserGroupNo || null,
          attachments: (d.attachment || d.attachments || d.documentAttachments || []).map((a: any) => ({
            id: a.id || a.docNo || a.operTaskAttachmentDetailNo || 0,
            name: a.name || a.fileName || a.storedFileName || 'attachment',
            storedFileName: a.storedFileName || '',
            storedFilePath: a.storedFilePath || '',
            relativePath: a.relativePath || a.storedFilePath || ''
          }))
        };

        // Fetch dedicated attachments list from the new attachments API after successfully loading the task data
        try {
          const attachmentList = await attachmentService.getAttachments(mappedTask.taskNo, 1547); // Note: 1547 task form number hardcoded, need to update with dynamic value
          if (attachmentList && attachmentList.length > 0) {
            mappedTask.attachments = attachmentList;
          }
        } catch (attError) {
          console.error('Failed to load attachments in modal load-data:', attError);
        }

        setTask(mappedTask);
        if (onRefreshTasks) {
          onRefreshTasks();
        }
      }
    } catch (error) {
      console.error('Failed to load task details in modal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskNo) {
      fetchTaskDetails();
    } else {
      setTask(undefined);
    }
  }, [isOpen, taskNo]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full sm:h-[92vh] sm:w-[96vw] sm:max-w-7xl p-0 rounded-none sm:rounded-[28px] overflow-hidden border-none sm:border border-slate-200 shadow-2xl flex flex-col bg-white">
        <DialogTitle className="sr-only">
          {task?.title || 'Task Details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detailed view and activity history for selected task.
        </DialogDescription>

        {/* 1. Modal Sticky Top Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg shadow-sm">
              {task?.code || (task ? `CP-${100 + task.taskNo}` : 'LOADING')}
            </span>
            {task && (
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                task.status === 'Done' ? "bg-green-50 text-green-700 border border-green-200" :
                  task.status === 'In Progress' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                    task.status === 'In Review' ? "bg-purple-50 text-purple-700 border border-purple-200" :
                      "bg-slate-100 text-slate-700 border border-slate-200"
              )}>
                {task.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pr-8">
            {task && (
              <Button
                type="button"
                onClick={() => {
                  navigate(`/task/${task.taskNo}`);
                  onClose();
                }}
                className="h-8 text-xs font-black uppercase tracking-widest gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#006699] to-[#00b4d8] hover:from-[#005580] hover:to-[#0096c7] text-white shadow-md shadow-[#006699]/10 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Edit size={13} strokeWidth={2.5} />
                Edit Task
              </Button>
            )}
          </div>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/40">
          {isLoading && !task ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-10 w-10 text-[#006699] animate-spin" />
              <p className="text-slate-800 font-black text-xs uppercase tracking-widest animate-pulse">Syncing Task Schema...</p>
            </div>
          ) : task ? (
            <div className="p-6 space-y-6">
              {/* TOP ROW: Title, desc, checklist vs specs sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2/3 width) - Title, Description, Checklist, Collaborators */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Title & Description Block */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                        {task.title}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-600 mt-1">
                        Originator: <span className="text-slate-900 font-extrabold">{task.originatorDisplayName || 'Unknown'}</span>
                      </p>
                    </div>

                    {task.description ? (
                      <div className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200/60 p-4 rounded-xl shadow-inner">
                        {task.description}
                      </div>
                    ) : (
                      <p className="text-slate-500 font-black text-[11px] italic">No description provided for this task.</p>
                    )}
                  </div>

                  {/* Checklist Block */}
                  {task.check_list && task.check_list.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm">
                          <CheckSquare size={15} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Checklist</h4>
                      </div>

                      <div className="space-y-2">
                        {task.check_list.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              disabled
                              className="h-4 w-4 rounded border-slate-300 text-[#006699] focus:ring-[#006699] disabled:opacity-80 cursor-not-allowed"
                            />
                            <span className={cn(
                              "text-xs font-bold",
                              item.completed ? "text-slate-500 line-through font-medium" : "text-slate-900"
                            )}>
                              {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collaborators & Informed Lists (Desktop/Tablet View) */}
                  <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Collaborators */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-3">Collaborators</h5>
                      {task.collaborators && task.collaborators.length > 0 ? (
                        <div className="space-y-2">
                          {task.collaborators.map((c, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              <UserAvatar
                                loginNo={c.loginNo}
                                displayName={c.displayName}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-900 truncate leading-none">{c.displayName}</p>
                                <span className="text-[8px] font-extrabold text-slate-600 truncate">{c.email}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-extrabold italic py-1">No collaborators assigned</p>
                      )}
                    </div>

                    {/* Informed To */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-3">Informed To</h5>
                      {task.informed_to && task.informed_to.length > 0 ? (
                        <div className="space-y-2">
                          {task.informed_to.map((inf, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              <UserAvatar
                                loginNo={inf.loginNo}
                                displayName={inf.displayName}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-900 truncate leading-none">{inf.displayName}</p>
                                <span className="text-[8px] font-extrabold text-slate-600 truncate">{inf.email}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-extrabold italic py-1">No informed users assigned</p>
                      )}
                    </div>
                  </div>

                  {/* Attached Documents Block */}
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-7 w-7 rounded-lg bg-[#006699]/5 border border-[#006699]/15 flex items-center justify-center text-[#006699] shadow-sm">
                          <Paperclip size={15} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Attached Documents</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {task.attachments.map((file: any) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-slate-50/40 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={16} /> : <Image size={16} />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <p className="text-xs font-bold text-slate-900 truncate max-w-[180px] leading-tight">{file.name}</p>
                                  {file.size ? (
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">({formatFileSize(file.size)})</span>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => attachmentService.downloadAttachment(file.id, file.name)}
                                  className="text-[9px] font-black text-[#006699] uppercase tracking-wider hover:underline block text-left"
                                >
                                  Open Document
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column (1/3 width) - Specifications Sidebar */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Task Specifications</h4>

                    {/* Owner Block */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                      <UserAvatar
                        loginNo={task.owner_user_No}
                        displayName={task.assignedDisplayName}
                        size="lg"
                      />
                      <div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-wider block">Owner</span>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">{task.assignedDisplayName || 'Unassigned'}</h4>
                      </div>
                    </div>

                    {/* Dynamic Info Key-Value Rows */}
                    <div className="space-y-3 pt-2">
                      {/* Priority */}
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-600 flex items-center gap-1.5"><AlertCircle size={13} className="text-slate-500" /> Priority</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                          task.priority_No >= 3 ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-800 border border-slate-200"
                        )}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Category */}
                      {task.categoryName && (() => {
                        const catObj = fillValues?.category?.find(
                          c => c.OperTaskCategoryNo === task.category_No || c.Category === task.categoryName
                        );
                        const bgColor = catObj?.ColorCoding || catObj?.colorCoding || (catObj as any)?.color || '#f1f5f9';
                        const textColor = getContrastColor(bgColor);
                        return (
                          <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600 flex items-center gap-1.5"><Layers size={13} className="text-slate-500" /> Category</span>
                            <span
                              style={{ backgroundColor: bgColor, color: textColor }}
                              className="font-black px-2 py-0.5 border border-black/5 rounded-md text-[10px] shadow-sm/50 uppercase tracking-wider"
                            >
                              {task.categoryName}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Type */}
                      {task.typeName && (
                        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-600 flex items-center gap-1.5"><FolderClosed size={13} className="text-slate-500" /> Type</span>
                          <span className="font-black text-slate-955 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-md text-[10px]">{task.typeName}</span>
                        </div>
                      )}

                      {/* Company */}
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-600 flex items-center gap-1.5"><Building2 size={13} className="text-slate-500" /> Company</span>
                        <span className="font-black text-slate-900">
                          {typeof task.company === 'object' && task.company
                            ? ((task.company as any).companyName || (task.company as any).CompanyName || (task.company as any).name || '')
                            : (task.company || '')}
                        </span>
                      </div>

                      {/* Location */}
                      {task.location_No > 0 && (
                        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-600 flex items-center gap-1.5"><MapPin size={13} className="text-slate-500" /> Location</span>
                          <span className="font-black text-slate-900">Ref ID: {task.location_No}</span>
                        </div>
                      )}

                      {/* Start Date */}
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-600 flex items-center gap-1.5"><Calendar size={13} className="text-slate-500" /> Start Date</span>
                        <span className="font-black text-slate-900">{task.start_date ? format(new Date(task.start_date), task.isAllDay ? 'MMM dd, yyyy' : 'MMM dd, yyyy h:mm a') : 'No date'}</span>
                      </div>

                      {/* Due Date */}
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-600 flex items-center gap-1.5"><Calendar size={13} className="text-slate-500" /> Due Date</span>
                        <span className="font-black text-slate-900">{task.end_date ? format(new Date(task.end_date), task.isAllDay ? 'MMM dd, yyyy' : 'MMM dd, yyyy h:mm a') : 'No date'}</span>
                      </div>

                      {/* Business Benefit Details */}
                      {task.is_business_benefit_applicable && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 mt-2">
                          <span className="text-[8px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1"><Coins size={11} /> Business Benefit</span>
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-700">Period:</span>
                            <span className="font-black text-slate-900">{task.benefit_period}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-700">Estimated:</span>
                            <span className="font-black text-emerald-800">₹{task.estimated_benefit_amount}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-700">Actual:</span>
                            <span className="font-black text-emerald-800">₹{task.actual_benefit_amount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collaborators & Informed Lists (Mobile View) */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {/* Collaborators */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-3">Collaborators</h5>
                      {task.collaborators && task.collaborators.length > 0 ? (
                        <div className="space-y-2">
                          {task.collaborators.map((c, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              <UserAvatar
                                loginNo={c.loginNo}
                                displayName={c.displayName}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-900 truncate leading-none">{c.displayName}</p>
                                <span className="text-[8px] font-extrabold text-slate-600 truncate">{c.email}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-extrabold italic py-1">No collaborators assigned</p>
                      )}
                    </div>

                    {/* Informed To */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-3">Informed To</h5>
                      {task.informed_to && task.informed_to.length > 0 ? (
                        <div className="space-y-2">
                          {task.informed_to.map((inf, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              <UserAvatar
                                loginNo={inf.loginNo}
                                displayName={inf.displayName}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-900 truncate leading-none">{inf.displayName}</p>
                                <span className="text-[8px] font-extrabold text-slate-600 truncate">{inf.email}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-extrabold italic py-1">No informed users assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Execution Note */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <FileText className="text-[#006699]" size={16} />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Task Execution Note</h4>
                </div>
                {task.executionNotes || task.execution_notes ? (
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    {task.executionNotes || task.execution_notes}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No execution notes provided yet.
                  </p>
                )}
              </div>

              {/* BOTTOM ROW: Full-width Task Activity & Audit Logs */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 mb-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Activity & Effort Tracking</h4>
                  <p className="text-[10px] font-bold text-slate-600">Post dynamic updates, ask questions, and record task timeline audits.</p>
                </div>
                <TaskActivity
                  taskNo={task.taskNo}
                  comments={task.task_comments}
                  efforts={task.actual_efforts}
                  onRefresh={fetchTaskDetails}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20">
              <p className="text-slate-600 font-bold text-sm">Failed to load task details</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
