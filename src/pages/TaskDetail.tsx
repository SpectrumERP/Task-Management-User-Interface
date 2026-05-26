import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { TaskForm } from '@/components/task/TaskForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, X, Loader2, Trash2, MoreVertical } from 'lucide-react';
import { Task, TaskStatus } from '@/types/task';
import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
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

  // Get status from query params if new task
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') as TaskStatus | undefined;

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
        navigate('/');
      } else {
        alert(response.message || "Failed to delete task. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("An error occurred while deleting the task.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isEdit) {
      setTask(undefined);
      setIsFetching(false);
      return;
    }

    const fetchTaskDetails = async () => {
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
            timestamp: c.createdDate || new Date().toISOString()
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
            isPrivate: d.isPrivate || false,
            priority_No: d.priority?.operTaskPriorityNo || 1,
            category_No: d.category?.operTaskCategoryNo || null,
            type_No: d.type?.operTaskTypeNo || null,
            project_No: d.project?.operTaskProjectNo || d.project?.projectNo || d.project?.project_No || d.project?.operTaskFolderNo || d.project?.folderNo || d.folder?.operTaskFolderNo || d.folder?.folderNo || d.folder?.TaskFolderNo || d.folder?.taskFolderNo || d.folder?.operTaskFolderDetailNo || d.project?.operTaskProjectDetailNo || d.project_No || d.projectNo || d.folder_No || d.folderNo || null,
            tags: d.tags ? (typeof d.tags === 'string' ? d.tags.split(',') : d.tags) : [],
            originator_user_No: d.originator?.id || 1,
            owner_user_No: d.owner?.id || null,
            location_No: d.location?.operTaskLocationNo || null,
            company: d.company || 'Glacier',
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
            subTasks: d.subTasks || [],
            collaboratorUserGroupNo: d.collaboratorUserGroupNo || null,
            infromToUserGroupNo: d.infromToUserGroupNo || null
          };

          // Call attachments list API after successful task load-data
          try {
            const attachmentList = await attachmentService.getAttachments(mappedTask.taskNo);
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
    };

    fetchTaskDetails();
  }, [id, isEdit]);

  return (
    <MainLayout
      activeTab="board"
      onTabChange={(tabId) => {
        if (tabId.startsWith('master-')) {
          const type = tabId.replace('master-', '');
          navigate(`/master/${type}`);
        } else {
          navigate(`/?tab=${tabId}`);
        }
      }}
    >
      <div className="flex-1 w-full flex flex-col bg-[#f1f5f9] overflow-hidden">
        {/* Fixed Header Section */}
        <div className="w-full px-4 sm:px-8 py-3.5 sm:py-5 bg-white border-b border-slate-200 shadow-sm z-20">
          <div className="flex flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <ChevronLeft size={20} className="text-[#006699]" />
              </Button>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {isEdit ? 'Update Task' : 'Create Task'}
                </h2>
                {/* <p className="text-slate-500 text-[11px] font-bold">
                  {isEdit ? `Modifying task reference CP-${100 + (task?.taskNo || 0)}` : 'Initiate a new execution item in the Glacier environment.'}
                </p> */}
              </div>
            </div>

            <div className="flex items-center gap-3">

              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate('/')}
                disabled={isSaving}
                className="rounded-xl h-9 px-3 sm:px-5 font-bold text-slate-600 hover:bg-slate-100 transition-colors gap-2 text-xs disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <X size={16} />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button
                type="submit"
                form="task-form"
                disabled={isSaving}
                className="rounded-xl h-9 px-3 sm:px-6 bg-[#006699] hover:bg-[#005580] font-bold shadow-lg shadow-[#006699]/20 gap-2 transition-all hover:scale-105 active:scale-95 text-xs text-white disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="hidden sm:inline">{isEdit ? 'Updating...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span className="hidden sm:inline">{isEdit ? 'Update' : 'Save'}</span>
                  </>
                )}
              </Button>
              {isEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm flex items-center justify-center transition-all"
                    >
                      <MoreVertical size={18} className="text-slate-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl w-36 shadow-md border-slate-200">
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-red-600 focus:text-red-700 focus:bg-red-50 font-bold text-xs cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg"
                    >
                      <Trash2 size={14} />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 pt-4 sm:pt-6 pb-6 sm:pb-8 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-[16px] sm:rounded-[24px] p-4 sm:p-8 shadow-xl shadow-slate-200/40 border border-slate-100 h-fit min-h-[400px] flex flex-col justify-center">
              {isFetching ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <Loader2 className="h-10 w-10 text-[#006699] animate-spin" />
                  <p className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Syncing Task Schema...</p>
                </div>
              ) : (
                <TaskForm
                  key={location.pathname + location.search}
                  initialData={isEdit ? task : undefined}
                  parentTask={!isEdit ? task : undefined}
                  initialStatus={initialStatus}
                  onComplete={() => navigate('/')}
                  onSaveStateChange={setIsSaving}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Alert Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border-slate-100 shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900 leading-tight">
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 font-medium text-xs leading-normal">
              Do you want to delete?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:space-x-3 flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs px-5 h-9"
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
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-slate-100 shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-100">
              <X className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900 leading-tight">
              {/* Task Not Found */}
              {notFoundMessage}
            </DialogTitle>
            {/* <DialogDescription className="text-center text-slate-600 font-medium text-xs leading-normal">
              {notFoundMessage}
            </DialogDescription> */}
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-center">
            <Button
              type="button"
              onClick={() => {
                setIsNotFoundDialogOpen(false);
                navigate('/');
              }}
              className="w-full rounded-xl bg-[#006699] hover:bg-[#005580] font-bold text-white shadow-lg shadow-[#006699]/20 text-xs h-9 transition-all"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
