import { UserType } from '@/types/enums';

type AuthUserLike = Record<string, unknown> | null | undefined;

type TaskOwnerLike = {
  owner_user_No?: number | string | null;
  owner?: { id?: number | string | null } | null;
  assignedTo?: { id?: number | string | null } | null;
} | null | undefined;

type TaskOriginatorLike = {
  originator_user_No?: number | string | null;
  originatorLoginNo?: number | string | null;
  originator?: { id?: number | string | null; loginNo?: number | string | null } | null;
  createdBy?: { id?: number | string | null; loginNo?: number | string | null } | null;
} | null | undefined;

export function isAdminUser(user: AuthUserLike): boolean {
  return Number(user?.UserType ?? user?.userType) === UserType.admin;
}

export function isGeneralUser(user: AuthUserLike): boolean {
  return Number(user?.UserType ?? user?.userType) === UserType.General;
}

export function getCurrentLoginNo(user: AuthUserLike): number | null {
  const raw = user?.LoginNo ?? user?.loginNo ?? user?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getTaskOwnerLoginNo(task: TaskOwnerLike): number | null {
  const raw = task?.owner_user_No ?? task?.owner?.id ?? task?.assignedTo?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * LoginNo of the user who assigned the task ("Assign By" / originator).
 * Prefer originator fields — never confuse with current Assign To (owner).
 */
export function getTaskOriginatorLoginNo(task: TaskOriginatorLike): number | null {
  const raw =
    task?.originator_user_No ??
    task?.originatorLoginNo ??
    task?.originator?.id ??
    task?.originator?.loginNo ??
    task?.createdBy?.id ??
    task?.createdBy?.loginNo;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** True when the logged-in user is the assignee of this task. */
export function isTaskAssignedToUser(user: AuthUserLike, task: TaskOwnerLike): boolean {
  const loginNo = getCurrentLoginNo(user);
  const ownerNo = getTaskOwnerLoginNo(task);
  return loginNo != null && ownerNo != null && loginNo === ownerNo;
}

/**
 * Only the original task assigner (originator) may change Assign To.
 * - New task (no persisted assigner): allowed.
 * - Legacy / missing originator: denied (do not grant unrestricted access).
 * Compare by LoginNo only — not display name / email.
 */
export function canUserChangeTaskAssignee(
  user: AuthUserLike,
  task: TaskOriginatorLike,
  opts?: { isNewTask?: boolean }
): boolean {
  if (opts?.isNewTask) return true;
  const loginNo = getCurrentLoginNo(user);
  const originatorNo = getTaskOriginatorLoginNo(task);
  if (loginNo == null || originatorNo == null) return false;
  return loginNo === originatorNo;
}

/**
 * Edit rules:
 * - Admin (+ update right): can edit any task
 * - General (+ update right): can edit only tasks assigned to them
 * - Parent / other tasks for General: view only
 */
export function canUserEditTask(
  user: AuthUserLike,
  task: TaskOwnerLike,
  hasUpdateRight: boolean
): boolean {
  if (!hasUpdateRight) return false;
  if (isAdminUser(user)) return true;
  if (isGeneralUser(user)) return isTaskAssignedToUser(user, task);
  // Unknown role: fall back to form right only
  return true;
}

export function isTaskViewOnlyForUser(user: AuthUserLike, task: TaskOwnerLike): boolean {
  if (!task) return false;
  if (isAdminUser(user)) return false;
  if (isGeneralUser(user)) return !isTaskAssignedToUser(user, task);
  return false;
}
