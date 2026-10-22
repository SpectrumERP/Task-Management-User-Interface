import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { getMeetingDiscussionTaskSchema, type MeetingNotesDiscussionTask } from '@/types/meeting';
import type { TaskFillValues } from '@/store/useTaskStore';
import { toUtcIsoOrEmpty } from '@/lib/dateTime';
import { taskUrl } from '@/lib/dealMonitor';
import { buildTaskOptions, newTaskKey } from '@/lib/meetingDiscussions';
import { cn } from '@/lib/utils';
import { userService } from '@/services/userService';
import { UserAvatar } from '@/components/ui/UserAvatar';

const toOptionalInt = (val: string) => {
  if (val === '' || val == null) return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
};
const numToValue = (v: unknown) => (v != null && !Number.isNaN(Number(v)) ? String(v) : '');

/** A user's display name by loginNo (looked up once per session). */
function useUserName(loginNo: number) {
  const [resolved, setResolved] = useState<{ loginNo: number; name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void userService.getUserBrief(loginNo).then((user) => {
      if (!cancelled && user?.name) setResolved({ loginNo, name: user.name });
    });
    return () => {
      cancelled = true;
    };
  }, [loginNo]);
  return resolved?.loginNo === loginNo ? resolved.name : '';
}

/** Assignee avatar + name for a task. */
export function AssigneeLabel({ loginNo }: { loginNo: number }) {
  const name = useUserName(loginNo);
  return <UserAvatar loginNo={loginNo} displayName={name || undefined} size="sm" showName nameClassName="text-[11px] text-slate-200 max-w-[10rem]" />;
}

/** Assignee avatar only (name on hover), for compact summaries. */
export function AssigneeAvatar({ loginNo, className }: { loginNo: number; className?: string }) {
  const name = useUserName(loginNo);
  return <UserAvatar loginNo={loginNo} displayName={name || undefined} size="sm" className={className} />;
}

const EMPTY_TASK: MeetingNotesDiscussionTask = {
  mnDiscussionTaskDetailNo: null,
  operTaskNo: null,
  title: '',
  operTaskCompanyNo: null,
  operTaskCategoryNo: null,
  operTaskTypeNo: null,
  operTaskPriorityNo: null,
  taskFolderNo: null,
  actionTaskOriginatorNo: null,
  actionTaskOwnerNo: null,
  actionDueDate: null,
};

export interface CompanyOption {
  value: string;
  label: string;
}

/** Mount with a new `key` for each opening: the task is read on mount. */
interface DiscussionTasksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The task to edit, or null to add a new one. */
  task: MeetingNotesDiscussionTask | null;
  /** 1-based number of the task within its discussion point (edit / view). */
  taskNo?: number;
  /** The point's topic: shown in the header and used as a new task's title. */
  topic: string;
  /** 1-based line number of the discussion point. */
  lineNo: number;
  onSave: (task: MeetingNotesDiscussionTask) => void;
  taskFillValues: TaskFillValues | null | undefined;
  companyOptions: CompanyOption[];
  /** Company a new task starts with (the meeting's company). */
  defaultCompanyNo?: number | null;
  isHideType: boolean;
  isHideFolder: boolean;
  /** Logged-in user, used as the default "Assign By". */
  currentLoginNo?: number | null;
  /** Finalized meeting notes: show the task without editing. */
  readOnly?: boolean;
}

/**
 * Add / edit one task of a Discussions & Outcomes line. The line's tasks are listed (and edited or
 * deleted) on the meeting form's discussion table; this drawer is only the task form.
 */
export function DiscussionTasksDrawer({
  open,
  onOpenChange,
  task,
  taskNo,
  topic,
  lineNo,
  onSave,
  taskFillValues,
  companyOptions,
  defaultCompanyNo,
  isHideType,
  isHideFolder,
  currentLoginNo,
  readOnly = false,
}: DiscussionTasksDrawerProps) {
  const isNew = task == null;
  const taskSchema = useMemo(() => getMeetingDiscussionTaskSchema(isHideType), [isHideType]);
  const options = useMemo(() => buildTaskOptions(taskFillValues), [taskFillValues]);

  // Mounted once per opening (keyed by the caller), so the starting values are read once.
  const [initial] = useState<MeetingNotesDiscussionTask>(() =>
    task
      ? { ...EMPTY_TASK, ...task }
      : {
          ...EMPTY_TASK,
          // Starts as the agenda topic; each task can have its own title.
          title: topic.trim(),
          operTaskCompanyNo:
            defaultCompanyNo && companyOptions.some((c) => c.value === String(defaultCompanyNo))
              ? defaultCompanyNo
              : toOptionalInt(companyOptions[0]?.value ?? ''),
          actionTaskOriginatorNo: currentLoginNo ?? null,
        }
  );

  const taskForm = useForm<MeetingNotesDiscussionTask>({
    resolver: zodResolver(taskSchema as never),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: initial,
  });
  const taskErrors = taskForm.formState.errors;

  // Opened on a task that is missing details (e.g. saved before Company existed): show its errors.
  useEffect(() => {
    if (!isNew && !readOnly && !taskSchema.safeParse(initial).success) void taskForm.trigger();
  }, [isNew, readOnly, initial, taskSchema, taskForm]);

  const submit = () =>
    taskForm.handleSubmit((values) => {
      onSave({ ...values, key: values.key || newTaskKey() });
    })();

  const title = readOnly
    ? `Task ${taskNo ?? ''} — discussion point ${lineNo}`
    : isNew
      ? `Add task — discussion point ${lineNo}`
      : `Edit task ${taskNo ?? ''} — discussion point ${lineNo}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-[var(--tm-border)] bg-[var(--tm-surface)] p-0 sm:max-w-xl"
        onInteractOutside={(e) => {
          // Combobox / date panels portal outside the sheet; clicking them must not close it.
          const target = e.target as HTMLElement | null;
          if (target?.closest('[data-radix-popper-content-wrapper], [data-datetime-picker-panel], [role="listbox"], [role="dialog"]')) e.preventDefault();
        }}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)] px-5 py-4 text-left">
          <SheetTitle className="text-sm font-semibold text-slate-100">{title}</SheetTitle>
          <SheetDescription className="text-xs text-slate-400">
            {topic.trim() ? <span className="font-medium text-slate-300">{topic.trim()}</span> : null}
            {topic.trim() ? ' — ' : null}
            {readOnly
              ? 'The meeting notes are finalized, so this task can no longer be changed.'
              : 'Tasks are created when the meeting notes are finalized.'}
          </SheetDescription>
        </SheetHeader>

        <form
          id="discussion-task-form"
          className="flex-1 overflow-y-auto px-5 py-4"
          onSubmit={(e) => {
            // Rendered inside the meeting form (via a portal): don't let the submit reach it.
            e.preventDefault();
            e.stopPropagation();
            if (!readOnly) void submit();
          }}
        >
          <fieldset disabled={readOnly} className="m-0 grid min-w-0 grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-2">
            {initial.operTaskNo ? (
              <Link
                to={taskUrl(Number(initial.operTaskNo))}
                target="_blank"
                className="sm:col-span-2 inline-flex w-fit items-center gap-1.5 rounded-[8px] border border-[#0EA5E9]/30 bg-[var(--tm-tint)] px-2.5 py-1 text-[11px] font-semibold text-[#0EA5E9] hover:underline"
              >
                <ExternalLink size={12} /> Open created task
              </Link>
            ) : null}

            <div className="space-y-1.5 sm:col-span-2">
              <FieldLabel required>Task Title</FieldLabel>
              <FieldControl error={taskErrors.title?.message}>
                <Input
                  {...taskForm.register('title')}
                  autoFocus={!readOnly}
                  maxLength={200}
                  placeholder="What needs to be done?"
                  className={cn('h-9 rounded-[8px] text-xs', taskErrors.title && 'border-red-400')}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <FieldLabel required>Company</FieldLabel>
              <FieldControl error={taskErrors.operTaskCompanyNo?.message}>
                <Controller
                  control={taskForm.control}
                  name="operTaskCompanyNo"
                  render={({ field }) => (
                    <Combobox
                      modal
                      disabled={readOnly}
                      className={cn('h-9 rounded-[8px] text-xs', taskErrors.operTaskCompanyNo && 'border-red-400')}
                      options={companyOptions}
                      value={numToValue(field.value)}
                      onChange={(val) => field.onChange(toOptionalInt(val))}
                      placeholder="Select company"
                    />
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5">
              <FieldLabel required>Category</FieldLabel>
              <FieldControl error={taskErrors.operTaskCategoryNo?.message}>
                <Controller
                  control={taskForm.control}
                  name="operTaskCategoryNo"
                  render={({ field }) => (
                    <Combobox
                      modal
                      disabled={readOnly}
                      className={cn('h-9 rounded-[8px] text-xs', taskErrors.operTaskCategoryNo && 'border-red-400')}
                      options={options.category}
                      value={numToValue(field.value)}
                      onChange={(val) => field.onChange(toOptionalInt(val))}
                      placeholder="Select category"
                    />
                  )}
                />
              </FieldControl>
            </div>

            {!isHideType && (
              <div className="space-y-1.5">
                <FieldLabel required>Task Type</FieldLabel>
                <FieldControl error={taskErrors.operTaskTypeNo?.message}>
                  <Controller
                    control={taskForm.control}
                    name="operTaskTypeNo"
                    render={({ field }) => (
                      <Combobox
                        modal
                        disabled={readOnly}
                        className={cn('h-9 rounded-[8px] text-xs', taskErrors.operTaskTypeNo && 'border-red-400')}
                        options={options.type}
                        value={numToValue(field.value)}
                        onChange={(val) => field.onChange(toOptionalInt(val))}
                        placeholder="Select type"
                      />
                    )}
                  />
                </FieldControl>
              </div>
            )}

            <div className="space-y-1.5">
              <FieldLabel required>Priority</FieldLabel>
              <FieldControl error={taskErrors.operTaskPriorityNo?.message}>
                <Controller
                  control={taskForm.control}
                  name="operTaskPriorityNo"
                  render={({ field }) => (
                    <Combobox
                      modal
                      disabled={readOnly}
                      sortAlphabetically={false}
                      className={cn('h-9 rounded-[8px] text-xs', taskErrors.operTaskPriorityNo && 'border-red-400')}
                      options={options.priority}
                      value={numToValue(field.value)}
                      onChange={(val) => field.onChange(toOptionalInt(val))}
                      placeholder="Select priority"
                    />
                  )}
                />
              </FieldControl>
            </div>

            {!isHideFolder && (
              <div className="space-y-1.5">
                <FieldLabel>Folder</FieldLabel>
                <Controller
                  control={taskForm.control}
                  name="taskFolderNo"
                  render={({ field }) => (
                    <Combobox
                      modal
                      disabled={readOnly}
                      className="h-9 rounded-[8px] text-xs"
                      options={options.folder}
                      value={numToValue(field.value)}
                      onChange={(val) => field.onChange(toOptionalInt(val))}
                      placeholder="Select folder"
                    />
                  )}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <FieldLabel required>Assign By</FieldLabel>
              <FieldControl error={taskErrors.actionTaskOriginatorNo?.message}>
                <Controller
                  control={taskForm.control}
                  name="actionTaskOriginatorNo"
                  render={({ field }) => (
                    <UserCombobox
                      modal
                      disabled={readOnly}
                      className={cn('h-9 rounded-[8px] text-xs', taskErrors.actionTaskOriginatorNo && 'border-red-400')}
                      value={field.value?.toString() || ''}
                      onChange={(user: { loginNo?: number | string } | null) => field.onChange(user?.loginNo ? Number(user.loginNo) : null)}
                      placeholder="Assign By"
                    />
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5">
              <FieldLabel required>Assign To</FieldLabel>
              <FieldControl error={taskErrors.actionTaskOwnerNo?.message}>
                <Controller
                  control={taskForm.control}
                  name="actionTaskOwnerNo"
                  render={({ field }) => (
                    <UserCombobox
                      modal
                      disabled={readOnly}
                      className={cn('h-9 rounded-[8px] text-xs', taskErrors.actionTaskOwnerNo && 'border-red-400')}
                      value={field.value?.toString() || ''}
                      onChange={(user: { loginNo?: number | string } | null) => field.onChange(user?.loginNo ? Number(user.loginNo) : null)}
                      placeholder="Assign To"
                    />
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <FieldLabel required>Due Date & Time</FieldLabel>
              <FieldControl error={taskErrors.actionDueDate?.message}>
                <Controller
                  control={taskForm.control}
                  name="actionDueDate"
                  render={({ field }) => (
                    <DateTimePicker
                      hour24
                      disabled={readOnly}
                      className={cn('w-full h-9 rounded-[8px] text-xs', taskErrors.actionDueDate && 'border-red-400')}
                      date={field.value ? new Date(field.value) : undefined}
                      onChange={(d) => field.onChange(toUtcIsoOrEmpty(d) || null)}
                      placeholder="Due Date & Time"
                    />
                  )}
                />
              </FieldControl>
            </div>
          </fieldset>
        </form>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-[8px] text-xs border-[var(--tm-border)]"
            onClick={() => onOpenChange(false)}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              type="submit"
              form="discussion-task-form"
              size="sm"
              className="h-9 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold px-4"
            >
              {isNew ? 'Add Task' : 'Update Task'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
