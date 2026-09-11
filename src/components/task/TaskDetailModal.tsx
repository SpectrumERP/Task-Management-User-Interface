import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { Task } from '@/types/task';
import { TaskActivity } from './TaskActivity';
import { Button } from '@/components/ui/button';
import { useFormRights } from '@/hooks/useFormRights';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Edit,
  Calendar,
  MapPin,
  Building2,
  FolderClosed,
  Layers,
  AlertCircle,
  Coins,
  CheckSquare,
  FileText,
  Paperclip,
  Image,
  User,
  UserPlus,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { taskUrl } from '@/lib/dealMonitor';
import { format } from 'date-fns';
import { useTaskStore } from '@/store/useTaskStore';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import type { ReactNode } from 'react';

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
  1: 'hours',
  2: 'days',
  3: 'minutes',
  4: 'weeks',
  5: 'months',
  6: 'years',
};

const reverseBenefitFrequencyMap: Record<number, string> = {
  1: 'One Time',
  2: 'Monthly',
  3: 'Annually',
};

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  children,
  className,
  action,
  tourId,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  tourId?: string;
}) {
  return (
    <section
      data-page-tour={tourId}
      className={cn(
        'rounded-2xl border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] shadow-[var(--tm-shadow-sm)] overflow-hidden',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-elevated)_55%,var(--tm-surface))]">
          <div className="flex items-start gap-2.5 min-w-0">
            {Icon && (
              <div
                className={cn(
                  'mt-0.5 h-8 w-8 shrink-0 rounded-xl border flex items-center justify-center',
                  iconClassName || 'bg-[var(--tm-tint)]/40 border-[#0EA5E9]/20 text-[#0EA5E9]'
                )}
              >
                <Icon size={15} />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h4 className="text-[12px] font-semibold text-slate-100 tracking-tight">{title}</h4>
              )}
              {subtitle && (
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-snug">{subtitle}</p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function SpecRow({
  index,
  icon: Icon,
  label,
  children,
}: {
  index: number;
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2.5 text-xs',
        index % 2 === 0 ? 'bg-[var(--tm-row-odd)]' : 'bg-[var(--tm-row-even)]'
      )}
    >
      <span className="font-medium text-slate-400 flex items-center gap-2 shrink-0">
        <Icon size={13} className="text-slate-500" />
        {label}
      </span>
      <div className="min-w-0 text-right font-semibold text-slate-100">{children}</div>
    </div>
  );
}

function PersonRow({
  loginNo,
  displayName,
  email,
  zebra,
}: {
  loginNo?: number | null;
  displayName?: string;
  email?: string;
  zebra?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5',
        zebra ? 'bg-[var(--tm-row-even)]' : 'bg-[var(--tm-row-odd)]'
      )}
    >
      <UserAvatar loginNo={loginNo} displayName={displayName} size="sm" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
          {displayName || 'Unknown'}
        </p>
        {email && (
          <span className="text-[9px] font-medium text-slate-400 truncate block mt-0.5">
            {email}
          </span>
        )}
      </div>
    </div>
  );
}

export function TaskDetailModal({ taskNo, isOpen, onClose, onRefreshTasks }: TaskDetailModalProps) {
  const navigate = useNavigate();
  const { isUpdate } = useFormRights(1547);
  const { fillValues } = useTaskStore();
  const [task, setTask] = useState<Task | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const getContrastColor = (hexColor?: string) => {
    if (!hexColor) return 'var(--tm-input-fg)';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6 && hex.length !== 3) return 'var(--tm-input-fg)';

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
            email: c.user?.email || "",
            loginNo: c.user?.id
          }));

        // Map informed to (isCollaborator === false)
        const mappedInformTo = (d.collaborators || [])
          .filter((c: any) => c.isCollaborator === false)
          .map((c: any) => ({
            userName: c.user?.userName || '',
            displayName: c.user?.displayName || '',
            email: c.user?.email || "",
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

        // Map subtasks
        const mappedSubTasks = (d.subTasks || d.subtasks || []).map((st: any) => ({
          taskNo: st.operTaskNo || st.taskNo,
          title: st.title || st.taskName || st.subTaskTitle || '',
          status: st.status?.statusName || st.status || 'Draft',
          ownerDisplayName: st.assignedTo?.displayName || st.assignedTo?.userName || st.ownerLoginNo || '',
          endDate: st.endDate || st.end_date || '',
          typeName: st.type?.typeName || st.typeName || ''
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
          locationName: d.location?.locationName || '',
          company: d.taskCompany?.taskCompanyNo || '',
          companyName: d.taskCompany?.taskCompanyAlias || '',
          createdDate: d.createdDate || d.created_date || null,
          createdBy: { displayName: d.createdBy?.displayName || d.createdBy?.printingName || d.createdBy?.loginId || '' },
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
          subTasks: mappedSubTasks,
          executionNotes: d.executionNotes || d.execution_notes || '',
          execution_notes: d.executionNotes || d.execution_notes || '',
          executionChallenges: d.executionChallenges || [],
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
      <DialogContent
        data-page-guide="task-detail-modal"
        className="w-full h-full sm:h-[90vh] sm:w-[96vw] sm:max-w-6xl p-0 rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-[var(--tm-border)] shadow-2xl flex flex-col gap-0 bg-[var(--tm-page)] [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:right-4 [&>button]:top-4 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-lg [&>button]:bg-transparent [&>button]:opacity-100 [&>button]:text-slate-500 [&>button]:hover:text-slate-900 [&>button]:hover:bg-slate-100 [&>button]:ring-offset-0"
      >
        <DialogTitle className="sr-only">
          {task?.title || 'Task Details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detailed view and activity history for selected task.
        </DialogDescription>

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-[var(--tm-surface)] border-b border-[var(--tm-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap" data-page-tour="tdm-header">
            <span className="inline-flex items-center text-[11px] font-semibold tabular-nums text-[#0EA5E9] bg-[var(--tm-tint)]/50 border border-[#0EA5E9]/20 px-2.5 py-1 rounded-lg">
              {task?.code || (task ? `CP-${100 + task.taskNo}` : '…')}
            </span>
            {task && (
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold border',
                  task.status === 'Done'
                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                    : task.status === 'In Progress'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : task.status === 'In Review'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-[var(--tm-muted)] text-slate-300 border-[var(--tm-border)]'
                )}
              >
                {task.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pr-10 shrink-0">
            <PageGuideButton guideKey="task-detail-modal" />
            {task && isUpdate && (
              <Button
                type="button"
                data-page-tour="tdm-edit"
                onClick={() => {
                  navigate(taskUrl(task.taskNo, task.categoryName));
                  onClose();
                }}
                className="h-8 text-xs font-semibold gap-1.5 px-3.5 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm"
              >
                <Edit size={13} strokeWidth={2.5} />
                Edit Task
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading && !task ? (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center py-20">
              <BrandLoader size="sm" message="Loading task details" />
            </div>
          ) : task ? (
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
                {/* Main column */}
                <div className="lg:col-span-8 space-y-4 order-1">
                  {/* Title + description */}
                  <section data-page-tour="tdm-summary" className="rounded-2xl border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] shadow-[var(--tm-shadow-sm)] overflow-hidden">
                    <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-50 tracking-tight leading-snug">
                        {task.title}
                      </h3>
                    </div>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                      {task.description ? (
                        <div className="text-[12px] font-medium text-slate-300 leading-relaxed whitespace-pre-wrap rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_70%,var(--tm-tint))] px-3.5 py-3">
                          {task.description}
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-slate-500 italic">
                          No description provided for this task.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Checklist */}
                  {task.check_list && task.check_list.length > 0 && (
                    <SectionCard
                      title="Checklist"
                      subtitle={`${task.check_list.filter((i) => i.completed).length}/${task.check_list.length} completed`}
                      icon={CheckSquare}
                      iconClassName="bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                    >
                      <div className="rounded-xl overflow-hidden border border-[var(--tm-border)]/70">
                        {task.check_list.map((item, idx) => (
                          <div
                            key={item.id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5',
                              idx % 2 === 0
                                ? 'bg-[var(--tm-row-odd)]'
                                : 'bg-[var(--tm-row-even)]'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              disabled
                              className="h-4 w-4 rounded border-[#3D4F66] text-[#0EA5E9] focus:ring-[#0EA5E9] disabled:opacity-80 cursor-not-allowed"
                            />
                            <span
                              className={cn(
                                'text-xs font-medium',
                                item.completed
                                  ? 'text-slate-500 line-through'
                                  : 'text-slate-100'
                              )}
                            >
                              {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Sub-tasks */}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <SectionCard
                      title="Sub-Tasks"
                      subtitle={`${task.subTasks.length} linked`}
                      icon={Layers}
                      iconClassName="bg-teal-500/15 border-teal-500/30 text-teal-400"
                    >
                      <div className="space-y-2">
                        {task.subTasks.map((st: any, idx: number) => (
                          <div
                            key={st.taskNo || idx}
                            className="rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_65%,var(--tm-surface))] px-3 py-2.5 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-50 truncate block leading-tight">
                                {st.title}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 truncate block mt-1">
                                {st.typeName || 'Task'} · {st.ownerDisplayName || 'Unassigned'}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[9px] font-semibold shrink-0 border',
                                st.status === 'Done'
                                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                  : st.status === 'In Progress'
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                    : 'bg-[var(--tm-muted)] text-slate-300 border-[var(--tm-border)]'
                              )}
                            >
                              {st.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Execution log */}
                  {(task.executionChallenges || []).filter((c: any) => c.typeNo === 1).length > 0 && (
                    <SectionCard
                      title="Task Execution Log"
                      icon={FileText}
                    >
                      <div className="space-y-2">
                        {task.executionChallenges!
                          .filter((c: any) => c.typeNo === 1)
                          .map((entry: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_65%,var(--tm-surface))] px-3 py-2.5 flex flex-col gap-1"
                            >
                              <span className="text-[10px] font-medium text-slate-400">
                                {entry.logDate
                                  ? format(new Date(entry.logDate), 'MMM dd, yyyy')
                                  : '-'}
                              </span>
                              <span className="text-xs font-medium text-slate-100 whitespace-pre-wrap">
                                {entry.remarks}
                              </span>
                            </div>
                          ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Challenges */}
                  {(task.executionChallenges || []).filter((c: any) => c.typeNo === 2).length > 0 && (
                    <SectionCard
                      title="Challenges"
                      icon={AlertCircle}
                      iconClassName="bg-amber-500/15 border-amber-500/30 text-amber-400"
                    >
                      <div className="space-y-2">
                        {task.executionChallenges!
                          .filter((c: any) => c.typeNo === 2)
                          .map((entry: any, idx: number) => {
                            const statusLabel = fillValues?.status?.find(
                              (s) => s.StatusNo === entry.statusNo
                            )?.Status;
                            return (
                              <div
                                key={idx}
                                className="rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_65%,var(--tm-surface))] px-3 py-2.5 flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {entry.logDate
                                      ? format(new Date(entry.logDate), 'MMM dd, yyyy')
                                      : '-'}
                                  </span>
                                  {statusLabel && (
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-md text-[9px] font-semibold shrink-0',
                                        statusLabel === 'Close'
                                          ? 'bg-emerald-500/15 text-emerald-400'
                                          : statusLabel === 'In Progress'
                                            ? 'bg-sky-500/15 text-sky-400'
                                            : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                                      )}
                                    >
                                      {statusLabel}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-slate-100 whitespace-pre-wrap">
                                  {entry.remarks}
                                </span>
                                {entry.proposedSolution && (
                                  <span className="text-[11px] text-slate-300 font-medium">
                                    <span className="text-slate-400">Proposed Solution: </span>
                                    {entry.proposedSolution}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </SectionCard>
                  )}

                  {/* Activity */}
                  <SectionCard
                    title="Activity & Effort"
                    subtitle="Comments, updates, and logged hours for this task."
                    tourId="tdm-activity"
                    icon={Clock}
                    className="order-3 lg:order-none"
                  >
                    <TaskActivity
                      taskNo={task.taskNo}
                      comments={task.task_comments}
                      efforts={task.actual_efforts}
                      onRefresh={fetchTaskDetails}
                    />
                  </SectionCard>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-4 order-2 lg:sticky lg:top-0">
                  <SectionCard title="Details" icon={Layers} tourId="tdm-details">
                    {/* Assignee */}
                    <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-tint)_35%,var(--tm-muted))] px-3 py-2.5">
                      <UserAvatar
                        loginNo={task.owner_user_No}
                        displayName={task.assignedDisplayName}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 block">
                          Assign To
                        </span>
                        <h4 className="text-[13px] font-semibold text-slate-50 leading-tight truncate">
                          {task.assignedDisplayName || 'Unassigned'}
                        </h4>
                      </div>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-[var(--tm-border)]/70">
                      {(() => {
                        let row = 0;
                        const next = () => row++;
                        const companyLabel =
                          typeof task.company === 'object' && task.company
                            ? (task.company as any).companyName ||
                            (task.company as any).CompanyName ||
                            (task.company as any).name ||
                            ''
                            : task.companyName || '';

                        const catObj = task.categoryName
                          ? fillValues?.category?.find(
                            (c) =>
                              c.OperTaskCategoryNo === task.category_No ||
                              c.Category === task.categoryName
                          )
                          : undefined;
                        const bgColor =
                          catObj?.ColorCoding ||
                          catObj?.colorCoding ||
                          (catObj as any)?.color ||
                          'var(--tm-muted)';
                        const textColor = getContrastColor(bgColor);

                        const priorityObj = task.priority
                          ? fillValues?.priority?.find(
                            (p) =>
                              p.OperTaskPriorityNo === task.priority_No ||
                              p.Priority === task.priority
                          )
                          : undefined;
                        const priorityBgColor =
                          priorityObj?.ColorCoding && priorityObj.ColorCoding !== 'none'
                            ? priorityObj.ColorCoding
                            : undefined;
                        const priorityTextColor = priorityBgColor ? getContrastColor(priorityBgColor) : undefined;

                        return (
                          <>
                            <SpecRow index={next()} icon={AlertCircle} label="Priority">
                              {priorityBgColor ? (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium shadow-sm"
                                  style={{ backgroundColor: priorityBgColor, color: priorityTextColor }}
                                >
                                  {task.priority}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium text-slate-300 bg-[var(--tm-muted)]">
                                  {task.priority}
                                </span>
                              )}
                            </SpecRow>

                            {task.categoryName && (
                              <SpecRow index={next()} icon={Layers} label="Category">
                                <span
                                  style={{ backgroundColor: bgColor, color: textColor }}
                                  className="inline-flex font-semibold px-2 py-0.5 rounded-md text-[10px]"
                                >
                                  {task.categoryName}
                                </span>
                              </SpecRow>
                            )}

                            {task.typeName && (
                              <SpecRow index={next()} icon={FolderClosed} label="Type">
                                <span className="text-[11px]">{task.typeName}</span>
                              </SpecRow>
                            )}

                            <SpecRow index={next()} icon={Building2} label="Company">
                              <span className="text-[11px] truncate max-w-[160px] inline-block">
                                {companyLabel || '—'}
                              </span>
                            </SpecRow>

                            {task.location_No > 0 && (
                              <SpecRow index={next()} icon={MapPin} label="Location">
                                <span className="text-[11px]">{task.locationName}</span>
                              </SpecRow>
                            )}

                            <SpecRow index={next()} icon={Calendar} label="Start Date">
                              <span className="text-[11px] tabular-nums">
                                {task.start_date
                                  ? format(
                                    new Date(task.start_date),
                                    task.isAllDay ? 'MMM dd, yyyy' : 'MMM dd, yyyy h:mm a'
                                  )
                                  : 'No date'}
                              </span>
                            </SpecRow>

                            <SpecRow index={next()} icon={Calendar} label="Due Date">
                              <span className="text-[11px] tabular-nums">
                                {task.end_date
                                  ? format(
                                    new Date(task.end_date),
                                    task.isAllDay ? 'MMM dd, yyyy' : 'MMM dd, yyyy h:mm a'
                                  )
                                  : 'No date'}
                              </span>
                            </SpecRow>

                            <SpecRow index={next()} icon={User} label="Assign By">
                              <span className="text-[11px]">
                                {task.originatorDisplayName || 'Unknown'}
                              </span>
                            </SpecRow>

                            {task.createdBy?.displayName && (
                              <SpecRow index={next()} icon={UserPlus} label="Created By">
                                <span className="text-[11px]">{task.createdBy.displayName}</span>
                              </SpecRow>
                            )}

                            {task.createdDate && (
                              <SpecRow index={next()} icon={Clock} label="Created Date">
                                <span className="text-[11px] tabular-nums">
                                  {format(new Date(task.createdDate), 'MMM dd, yyyy h:mm a')}
                                </span>
                              </SpecRow>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {task.is_business_benefit_applicable && (
                      <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 space-y-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-400 flex items-center gap-1.5">
                          <Coins size={11} /> Business Benefit
                        </span>
                        <div className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-400">Period</span>
                          <span className="font-semibold text-slate-100">{task.benefit_period}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-400">Estimated</span>
                          <span className="font-semibold text-emerald-400">
                            ₹{task.estimated_benefit_amount}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-400">Actual</span>
                          <span className="font-semibold text-emerald-400">
                            ₹{task.actual_benefit_amount}
                          </span>
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  {(task.collaborators?.length > 0 || task.informed_to?.length > 0) && (
                    <div className="space-y-4">
                      {task.collaborators && task.collaborators.length > 0 && (
                        <SectionCard
                          title="Collaborators"
                          subtitle={`${task.collaborators.length} supporter${task.collaborators.length > 1 ? 's' : ''}`}
                          icon={UserPlus}
                        >
                          <div className="rounded-xl overflow-hidden border border-[var(--tm-border)]/70">
                            {task.collaborators.map((c, i) => (
                              <PersonRow
                                key={i}
                                loginNo={c.loginNo}
                                displayName={c.displayName}
                                email={c.email}
                                zebra={i % 2 === 1}
                              />
                            ))}
                          </div>
                        </SectionCard>
                      )}

                      {task.informed_to && task.informed_to.length > 0 && (
                        <SectionCard
                          title="Report To"
                          subtitle={`${task.informed_to.length} recipient${task.informed_to.length > 1 ? 's' : ''}`}
                          icon={User}
                        >
                          <div className="rounded-xl overflow-hidden border border-[var(--tm-border)]/70">
                            {task.informed_to.map((inf, i) => (
                              <PersonRow
                                key={i}
                                loginNo={inf.loginNo}
                                displayName={inf.displayName}
                                email={inf.email}
                                zebra={i % 2 === 1}
                              />
                            ))}
                          </div>
                        </SectionCard>
                      )}
                    </div>
                  )}

                  {task.attachments && task.attachments.length > 0 && (
                    <SectionCard
                      title="Attachments"
                      subtitle={`${task.attachments.length} file${task.attachments.length > 1 ? 's' : ''}`}
                      icon={Paperclip}
                    >
                      <div className="space-y-2">
                        {task.attachments.map((file: any) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2.5 rounded-xl border border-[var(--tm-border)]/70 bg-[color-mix(in_srgb,var(--tm-muted)_65%,var(--tm-surface))] px-2.5 py-2"
                          >
                            <div className="h-8 w-8 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                              {file.name?.toLowerCase?.().endsWith('.pdf') ? (
                                <FileText size={15} />
                              ) : (
                                <Image size={15} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-slate-100 truncate">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {file.size ? (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {formatFileSize(file.size)}
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    attachmentService.downloadAttachment(file.id, file.name)
                                  }
                                  className="text-[9px] font-semibold text-[#0EA5E9] hover:underline"
                                >
                                  Open
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center py-20">
              <p className="text-slate-400 font-medium text-sm">Failed to load task details</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
