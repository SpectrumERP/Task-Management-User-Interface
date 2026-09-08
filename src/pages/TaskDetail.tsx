import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { TaskForm } from '@/components/task/TaskForm';
import { Button } from '@/components/ui/button';
import { ChevronRight, Save, X, Loader2, Trash2, MoreVertical } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Task, TaskStatus } from '@/types/task';
import { useState, useEffect, useCallback } from 'react';
import { useFormRights } from '@/hooks/useFormRights';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const reverseEffortFrequencyMap: Record<number, string> = {
  1: 'hours',
  2: 'days',
  3: 'minutes',
  4: 'weeks',
  5: 'months',
  6: 'years'
};

const reverseBenefitFrequencyMap: Record<number, string> = {
  1: 'One Time',
  2: 'Monthly',
  3: 'Annually'
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isEdit = id !== 'new';
  const [task, setTask] = useState<Task | undefined>(undefined);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNotFoundDialogOpen, setIsNotFoundDialogOpen] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState("Task not found.");

  const { isSave, isUpdate, isDelete } = useFormRights(1547);

  // Get status from query params if new task
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') as TaskStatus | undefined;

  const handleGoBack = () => {
    if (task?.parent_task_No) {
      navigate(`/task/${task.parent_task_No}`);
    } else if (queryParams.get('parentTaskNo')) {
      navigate(`/task/${queryParams.get('parentTaskNo')}`);
    } else {
      navigate('/');
    }
  };

  const handleDelete = async () => {
    if (!task?.taskNo) return;

    try {
      setIsDeleting(true);
      const response = await apiService.delete<{ success: boolean; message?: string }>(
        `/api/crm/tasks/delete?operTaskNo=${task.taskNo}`,
        {}
      );
      if (response.success) {
        setIsDeleteDialogOpen(false);
        toast.success('Task deleted');
        handleGoBack();
      } else {
        toast.error(response.message || 'Failed to delete task. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('An error occurred while deleting the task.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchTaskDetails = useCallback(async () => {
    if (!isEdit) {
      setTask(undefined);
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true);
      const response = await apiService.get<{ success: boolean; data: any; message?: string }>(`/api/crm/tasks/load-data/${id}`);
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
          operTaskEffortLogDetailNo: e.operTaskEffortLogDetailNo || null,
          date: e.effortDate || e.logDate || '',
          hours: e.effortHours || e.efforts || null,
          description: e.effortDescription || e.description || '',
          createdBy: e.createdBy || null
        }));

        const mappedTask: Task = {
          taskNo: d.operTaskNo,
          code: d.code || '',
          title: d.title || '',
          description: d.description || '',
          isPrivate: d.isPrivate || false,
          priority_No: d.priority?.operTaskPriorityNo || 1,
          category_No: d.category?.operTaskCategoryNo || null,
          type_No: d.type?.operTaskTypeNo || null,
          project_No: d.project?.operTaskProjectNo || d.project?.projectNo || d.project?.project_No || d.project?.operTaskFolderNo || d.project?.folderNo || d.folder?.operTaskFolderNo || d.folder?.folderNo || d.folder?.TaskFolderNo || d.folder?.taskFolderNo || d.folder?.operTaskFolderDetailNo || d.project?.operTaskProjectDetailNo || d.project_No || d.projectNo || d.folder_No || d.folderNo || null,
          parent_task_No: d.parentTask?.operTaskNo || d.parentTaskNo || null,
          parentTask: d.parentTask ? { operTaskNo: d.parentTask.operTaskNo, title: d.parentTask.title, code: d.parentTask.code || '' } : undefined,
          tags: d.tags ? (typeof d.tags === 'string' ? d.tags.split(',') : d.tags) : [],
          originator_user_No: d.originator?.id || 1,
          owner_user_No: d.owner?.id || null,
          location_No: d.location?.operTaskLocationNo || null,
          locationName: d.location?.locationName || '',
          company: d?.taskCompany?.taskCompanyNo || '',
          companyName: d?.taskCompany?.taskCompanyAlias || '',
          start_date: d.startDate,
          end_date: d.endDate,
          completionDate: d.completionDate,
          completionRemark: d.completionRemark,
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
          executionChallenges: d.executionChallenges || [],
          subTasks: d.subTasks || [],
          collaboratorUserGroupNo: d.collaboratorUserGroupNo || null,
          infromToUserGroupNo: d.infromToUserGroupNo || null,
          customFields: d.customFields || [],
          roadBlock: d.roadBlock || '',
        };

        // Call attachments list API after successful task load-data
        try {
          const attachmentList = await attachmentService.getAttachments(mappedTask.taskNo, 1547); // Note: 1547 task form number hardcoded, need to update with dynamic value
          mappedTask.attachments = attachmentList;
        } catch (attError) {
          console.error('Failed to load attachments during task load-data:', attError);
        }

        setTask(mappedTask);
      } else {
        setNotFoundMessage(response.message || "Task not found.");
        setIsNotFoundDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Failed to load task details:', error);
      setNotFoundMessage(error?.message || "The requested task could not be found.");
      setIsNotFoundDialogOpen(true);
    } finally {
      setIsFetching(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  return (
    <MainLayout
      activeTab="board"
      onTabChange={(tabId) => {
        if (tabId.startsWith('master-')) {
          const type = tabId.replace('master-', '');
          navigate(`/master/${type}`);
        } else if (tabId === 'sales-deals') {
          navigate('/sales/deals');
        } else if (tabId === 'deal-monitor') {
          navigate('/deal-monitor');
        } else if (tabId === 'meeting-notes') {
          navigate('/meetings');
        } else {
          navigate(`/?tab=${tabId}`);
        }
      }}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--tm-page)]">
        <div className="shrink-0 z-20 bg-[var(--tm-surface)] border-b border-[var(--tm-border)]/70 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-[#0EA5E9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] rounded"
            >
              Tasks List
            </button>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <span className="text-slate-50 font-bold tracking-tight">
              {isEdit ? 'Update Task' : 'Create Task'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto" data-page-tour="task-form-actions">
            <PageGuideButton guideKey="task-form" />
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSaving}
              className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none gap-1.5 disabled:opacity-40"
            >
              <X size={14} />
              <span className="hidden sm:inline">Cancel</span>
            </Button>

            {(isEdit ? isUpdate : isSave) && (
              <Button
                type="submit"
                form="task-form"
                disabled={isSaving}
                className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20 gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="hidden sm:inline">{isEdit ? 'Updating...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span className="hidden sm:inline">{isEdit ? 'Update' : 'Save'}</span>
                  </>
                )}
              </Button>
            )}
            {isEdit && isDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none"
                  >
                    <MoreVertical size={16} className="text-slate-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-[8px] w-36 shadow-md border-[var(--tm-border)]">
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 font-semibold text-xs cursor-pointer flex items-center gap-2 px-3 py-2 rounded-[6px]"
                  >
                    <Trash2 size={14} />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[var(--tm-page)]">
          <div className="w-full max-w-none px-3 py-3 sm:px-4 lg:px-5">
            {isFetching ? (
              <div className="flex flex-col items-center justify-center rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] py-16 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)]">
                <BrandLoader size="sm" message="Loading task" />
              </div>
            ) : (
              <TaskForm
                key={location.pathname + location.search}
                initialData={isEdit ? task : undefined}
                parentTask={!isEdit ? task : undefined}
                initialStatus={initialStatus}
                onComplete={handleGoBack}
                onSaveStateChange={setIsSaving}
                onRefreshData={fetchTaskDetails}
              />
            )}
          </div>
        </div>
      </div>

      {/* Premium Alert Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border-[var(--tm-border)] shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-50 leading-tight">
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300 font-medium text-xs leading-normal">
              Do you want to delete?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:space-x-3 flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl font-bold text-slate-300 hover:bg-[var(--tm-muted)] text-xs px-5 h-9"
            >
              No
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white shadow-lg shadow-red-600/20 text-xs px-6 h-9 gap-2 transition-all"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Trash2 size={14} />
              )}
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Task Not Found Alert Dialog */}
      <Dialog open={isNotFoundDialogOpen} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-[var(--tm-border)] shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
              <X className="h-6 w-6 text-amber-400" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-50 leading-tight">
              {/* Task Not Found */}
              {notFoundMessage}
            </DialogTitle>
            {/* <DialogDescription className="text-center text-slate-300 font-medium text-xs leading-normal">
              {notFoundMessage}
            </DialogDescription> */}
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-center">
            <Button
              type="button"
              onClick={() => {
                setIsNotFoundDialogOpen(false);
                handleGoBack();
              }}
              className="w-full rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] font-bold text-white shadow-lg shadow-[#0EA5E9]/20 text-xs h-9 transition-all"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
