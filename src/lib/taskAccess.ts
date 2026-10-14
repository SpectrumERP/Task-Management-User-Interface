import { UserType } from '@/types/enums';

type AuthUserLike = Record<string, unknown> | null | undefined;

type TaskOwnerLike = {
  owner_user_No?: number | string | null;
  owner?: { id?: number | string | null } | null;
  assignedTo?: { id?: number | string | null } | null;
  isEditable?: boolean | null;
  IsEditable?: boolean | null;
} | null | undefined;

type TaskOriginatorLike = {
  originator_user_No?: number | string | null;
  originatorLoginNo?: number | string | null;
  originator?: { id?: number | string | null; loginNo?: number | string | null } | null;
  createdBy?: { id?: number | string | null; loginNo?: number | string | null } | null;
} | null | undefined;

export function isAdminUser(user: AuthUserLike): boolean {
  const val =
    user?.UserType ??
    user?.userType ??
    user?.role ??
    (user as any)?.userTypeName ??
    (user as any)?.UserTypeName ??
    (user as any)?.user_type;
  if (typeof val === 'string') {
    if (val.toLowerCase().includes('admin')) return true;
    if (val.toLowerCase().includes('general')) return false;
  }
  return Number(val) === UserType.admin;
}

export function isGeneralUser(user: AuthUserLike): boolean {
  const val =
    user?.UserType ??
    user?.userType ??
    user?.role ??
    (user as any)?.userTypeName ??
    (user as any)?.UserTypeName ??
    (user as any)?.user_type;
  if (typeof val === 'string') {
    if (val.toLowerCase().includes('general')) return true;
    if (val.toLowerCase().includes('admin')) return false;
  }
  return Number(val) === UserType.General;
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

export function parseBoolean(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'false' || s === '0' || s === 'no') return false;
    if (s === 'true' || s === '1' || s === 'yes') return true;
  }
  return Boolean(val);
}

/**
 * Edit rules:
 * - If isEditable is explicitly false from the API: CANNOT edit (overrides any role)
 * - If isEditable is explicitly true from the API: CAN edit
 * - If isEditable is not provided:
 *   - Admin (+ update right): can edit any task
 *   - General (+ update right): can edit only tasks assigned to them
 */
export function canUserEditTask(
  user: AuthUserLike,
  task: TaskOwnerLike,
  hasUpdateRight: boolean
): boolean {
  if (!hasUpdateRight) return false;

  const isEditable = parseBoolean(task?.isEditable ?? (task as any)?.IsEditable);
  if (isEditable === false) {
    return false;
  }
  if (isEditable === true) {
    return true;
  }

  if (isAdminUser(user)) return true;
  if (isGeneralUser(user)) {
    return isTaskAssignedToUser(user, task);
  }
  return true;
}

export function isTaskViewOnlyForUser(user: AuthUserLike, task: TaskOwnerLike): boolean {
  if (!task) return false;

  const isEditable = parseBoolean(task?.isEditable ?? (task as any)?.IsEditable);
  if (isEditable === false) {
    return true;
  }
  if (isEditable === true) {
    return false;
  }

  if (isAdminUser(user)) return false;
  if (isGeneralUser(user)) {
    return !isTaskAssignedToUser(user, task);
  }
  return false;
}
