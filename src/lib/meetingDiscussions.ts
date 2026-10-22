/**
 * Meeting "Discussions & Outcomes" lines ↔ meeting-notes API.
 *
 * Each line (agenda) can raise several tasks: `discussions[].taskDetails[]`
 * (`MeetingNotesDiscussionTaskSaveModel` / `…TaskLoadModel`). Load sends the masters as objects
 * (`category: { operTaskCategoryNo, … }`); plain ids are read too.
 * `title` is requested from the backend (docs/meeting-discussion-tasks-api.md).
 */
import type { MeetingNotesDiscussion, MeetingNotesDiscussionTask } from '@/types/meeting';

type ApiTaskSave = {
  title: string;
  operTaskCompanyNo: number | null;
  actionTaskOwnerNo: number | null;
  actionDueDate: string | null;
  operTaskCategoryNo: number | null;
  operTaskTypeNo: number | null;
  operTaskPriorityNo: number | null;
  actionTaskOriginatorNo: number | null;
  taskFolderNo: number | null;
};

type ApiTaskLoad = Partial<ApiTaskSave> & {
  mnDiscussionTaskDetailNo?: number | null;
  operTaskNo?: number | null;
  operTaskCompany?: { operTaskCompanyNo?: number | null } | null;
  category?: { operTaskCategoryNo?: number | null } | null;
  taskType?: { operTaskTypeNo?: number | null } | null;
  priority?: { operTaskPriorityNo?: number | null } | null;
  folder?: { taskFolderNo?: number | null } | null;
  originator?: { loginNo?: number | null } | null;
  owner?: { loginNo?: number | null } | null;
};

type ApiDiscussionLoad = {
  mnDiscussionDetailNo?: number;
  topic?: string | null;
  discussionSummary?: string | null;
  decisionRemarks?: string | null;
  remarks?: string | null;
  isActionRequired?: boolean | null;
  taskDetails?: ApiTaskLoad[] | null;
};

let keySeq = 0;
export const newTaskKey = () => `t${Date.now().toString(36)}${(keySeq++).toString(36)}`;

/** load-data `discussions` → form lines. `defaultCompanyNo` fills tasks saved without a company. */
export function discussionsFromApi(rows: ApiDiscussionLoad[] | null | undefined, defaultCompanyNo: number | null): MeetingNotesDiscussion[] {
  return (rows ?? []).map((row) => ({
    mnDiscussionDetailNo: row.mnDiscussionDetailNo,
    topic: row.topic ?? '',
    discussionSummary: row.discussionSummary ?? '',
    decisionRemarks: row.decisionRemarks ?? '',
    remarks: row.remarks ?? '',
    tasks: (row.taskDetails ?? []).map((t) => ({
      key: newTaskKey(),
      mnDiscussionTaskDetailNo: t.mnDiscussionTaskDetailNo ?? null,
      operTaskNo: t.operTaskNo ?? null,
      // Saved before tasks had their own title: the agenda topic.
      title: t.title?.trim() || row.topic || '',
      operTaskCompanyNo: t.operTaskCompany?.operTaskCompanyNo ?? t.operTaskCompanyNo ?? defaultCompanyNo,
      operTaskCategoryNo: t.category?.operTaskCategoryNo ?? t.operTaskCategoryNo ?? null,
      operTaskTypeNo: t.taskType?.operTaskTypeNo ?? t.operTaskTypeNo ?? null,
      operTaskPriorityNo: t.priority?.operTaskPriorityNo ?? t.operTaskPriorityNo ?? null,
      taskFolderNo: t.folder?.taskFolderNo ?? t.taskFolderNo ?? null,
      actionTaskOriginatorNo: t.originator?.loginNo ?? t.actionTaskOriginatorNo ?? null,
      actionTaskOwnerNo: t.owner?.loginNo ?? t.actionTaskOwnerNo ?? null,
      actionDueDate: t.actionDueDate ?? null,
    })),
  }));
}

function taskToApi(t: MeetingNotesDiscussionTask): ApiTaskSave {
  return {
    title: t.title.trim(),
    operTaskCompanyNo: t.operTaskCompanyNo ?? null,
    actionTaskOwnerNo: t.actionTaskOwnerNo ?? null,
    actionDueDate: t.actionDueDate ?? null,
    operTaskCategoryNo: t.operTaskCategoryNo ?? null,
    operTaskTypeNo: t.operTaskTypeNo ?? null,
    operTaskPriorityNo: t.operTaskPriorityNo ?? null,
    actionTaskOriginatorNo: t.actionTaskOriginatorNo ?? null,
    taskFolderNo: t.taskFolderNo ?? null,
  };
}

/** Form lines → save payload `discussions` (`MeetingNotesDiscussionSaveModel`). */
export function discussionsToApi(lines: MeetingNotesDiscussion[]) {
  return lines.map((line) => {
    const taskDetails = (line.tasks ?? []).map(taskToApi);
    return {
      topic: line.topic,
      discussionSummary: line.discussionSummary ?? null,
      decisionRemarks: line.decisionRemarks ?? null,
      remarks: line.remarks ?? null,
      isActionRequired: taskDetails.length > 0,
      taskDetails,
    };
  });
}

type FillValuesLike = {
  category?: { OperTaskCategoryNo: number; Category: string; colorCoding?: string; ColorCoding?: string }[];
  type?: { OperTaskTypeNo: number; 'Task Type': string }[];
  priority?: { OperTaskPriorityNo: number; Priority: string; ColorCoding?: string }[];
  folder?: { TaskFolderNo: number; 'Folder Name': string }[];
} | null | undefined;

const isAllLabel = (label?: string | null) => ['all', '[all]'].includes((label || '').trim().toLowerCase());
const cleanMasterLabel = (label?: string | null) => (label || '').replace(/^\[(.+)\]$/, '$1').trim() || label || '';

/** Task master options for a meeting task (task fill-values, without the "All" entries). */
export function buildTaskOptions(fillValues: FillValuesLike) {
  return {
    category: (fillValues?.category ?? [])
      .filter((c) => !isAllLabel(c.Category))
      .map((c) => ({ value: String(c.OperTaskCategoryNo), label: c.Category, colorCoding: c.colorCoding || c.ColorCoding })),
    type: (fillValues?.type ?? [])
      .filter((t) => !isAllLabel(t['Task Type']))
      .map((t) => ({ value: String(t.OperTaskTypeNo), label: t['Task Type'] })),
    priority: (fillValues?.priority ?? [])
      .filter((p) => !isAllLabel(p.Priority))
      .map((p) => ({ value: String(p.OperTaskPriorityNo), label: p.Priority, colorCoding: p.ColorCoding })),
    folder: (fillValues?.folder ?? []).map((f) => ({ value: String(f.TaskFolderNo), label: cleanMasterLabel(f['Folder Name']) })),
  };
}

/** Label of option `v` in `list`, if any. */
export const optionLabel = (list: { value: string; label: string }[], v: unknown) =>
  v != null && !Number.isNaN(Number(v)) ? list.find((o) => o.value === String(v))?.label : undefined;
