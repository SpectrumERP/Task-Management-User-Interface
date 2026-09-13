/**
 * Status pills on the task list support multi-select (OR by statusName).
 * Each pill counts/filters its own aliases — do not overlap Assigned/In-Progress into Pending.
 * (API StatusNo can disagree with statusName, so pills filter client-side by name.)
 */

/** True "pending queue" statuses — not Assigned / In-Progress (those have their own pills). */
export const PENDING_STATUS_NAMES = [
  'Pending',
  'Open',
  'Draft',
  'Reopen',
] as const;

/** Canonical pill label → statusName values that belong to that pill */
export const STATUS_PILL_ALIASES: Record<string, readonly string[]> = {
  Pending: PENDING_STATUS_NAMES,
  Assigned: ['Assigned'],
  'In-Progress': ['In-Progress', 'In Progress', 'In-Progess'],
  Hold: ['Hold', 'On Hold'],
  Completed: ['Completed', 'Complete', 'Done'],
  Close: ['Close', 'Closed'],
};

export const STATUS_PILL_PREFIX = 'StatusPill:';

/** Same order as the task-list status chips. */
export const STATUS_PILL_ORDER = [
  'Pending',
  'Assigned',
  'In-Progress',
  'Hold',
  'Completed',
  'Close',
] as const;

export function getStatusPillAliases(pillName: string): readonly string[] {
  return STATUS_PILL_ALIASES[pillName] ?? [pillName];
}

export function statusMatchesPill(status: string | null | undefined, pillName: string): boolean {
  if (!status) return false;
  const needle = status.trim().toLowerCase();
  return getStatusPillAliases(pillName).some((alias) => alias.toLowerCase() === needle);
}

export function isPendingGroupStatus(status?: string | null): boolean {
  return statusMatchesPill(status, 'Pending');
}

/** Form/API token for a status pill (not a numeric StatusNo). */
export function toStatusPillToken(pillName: string): string {
  // Keep PendingGroup for older applied filters / chips
  if (pillName === 'Pending') return 'PendingGroup';
  return `${STATUS_PILL_PREFIX}${pillName}`;
}

export function parseStatusPillToken(token: string): string | null {
  if (token === 'PendingGroup') return 'Pending';
  if (token.startsWith(STATUS_PILL_PREFIX)) return token.slice(STATUS_PILL_PREFIX.length);
  return null;
}

export function resolveStatusPillLabel(token: string): string {
  return parseStatusPillToken(token) ?? token;
}

/** Text-only status color — no background / pill chrome. */
export function getStatusTextClass(status?: string | null): string {
  const s = (status || '').trim();
  if (!s) return 'text-slate-400 font-medium';

  if (statusMatchesPill(s, 'Completed') || statusMatchesPill(s, 'Close')) {
    return 'text-emerald-500 font-medium';
  }
  if (statusMatchesPill(s, 'In-Progress')) {
    return 'text-blue-500 font-medium';
  }
  if (statusMatchesPill(s, 'Hold')) {
    return 'text-[#F59E0B] font-medium';
  }
  if (statusMatchesPill(s, 'Pending')) {
    return 'text-[#F59E0B] font-medium';
  }
  if (statusMatchesPill(s, 'Assigned')) {
    return 'text-[#0EA5E9] font-medium';
  }

  const lower = s.toLowerCase();
  if (lower === 'in review' || lower === 'in-review') {
    return 'text-violet-500 font-medium';
  }
  if (lower === 'todo') {
    return 'text-slate-400 font-medium';
  }

  return 'text-slate-300 font-medium';
}

/** Sum counts for every alias of a pill (case-insensitive keys). */
export function sumStatusPillCounts(
  statusCounts: Record<string, number>,
  pillName: string
): number {
  const aliases = getStatusPillAliases(pillName).map((a) => a.toLowerCase());
  return Object.entries(statusCounts).reduce((sum, [key, n]) => {
    if (aliases.includes(key.toLowerCase())) return sum + n;
    return sum;
  }, 0);
}

type FillStatus = { StatusNo: number | string; Status: string };

/** Backend fill-values often include a sentinel row meaning "no filter". */
export function isAllFilterSentinel(name: string): boolean {
  const n = name.trim();
  return !n || n === '[All]' || n.toLowerCase() === 'all';
}

function isAllStatusSentinel(name: string): boolean {
  return isAllFilterSentinel(name);
}

/**
 * Status dropdown options = same set as the top status chips.
 * Prefer API StatusNo when a fill-values row matches a pill alias; otherwise pill token.
 * Extra API-only statuses (e.g. Cancelled) are omitted so the drawer matches the chips.
 */
export function buildStatusFilterOptions(
  fillStatuses: FillStatus[] = []
): { value: string; label: string }[] {
  const realStatuses = fillStatuses.filter((s) => !isAllStatusSentinel(String(s.Status || '')));
  const options: { value: string; label: string }[] = [];

  for (const pill of STATUS_PILL_ORDER) {
    const aliases = getStatusPillAliases(pill).map((a) => a.toLowerCase());
    const match = realStatuses.find((s) =>
      aliases.includes(String(s.Status || '').trim().toLowerCase())
    );
    if (match) {
      options.push({ value: String(match.StatusNo), label: pill });
    } else {
      options.push({ value: toStatusPillToken(pill), label: pill });
    }
  }

  return options;
}

/**
 * Drawer MultiSelect Status filter: match by StatusNo and/or statusName
 * (plus known aliases), because API StatusNo and task.statusName often disagree.
 */
export function taskMatchesStatusIds(
  task: { status?: string | null; status_No?: number | null },
  selectedIds: number[],
  fillStatuses: FillStatus[] = []
): boolean {
  if (selectedIds.length === 0) return true;

  if (task.status_No != null && selectedIds.includes(Number(task.status_No))) {
    return true;
  }

  const taskStatus = (task.status || '').trim().toLowerCase();
  if (!taskStatus) return false;

  for (const id of selectedIds) {
    const meta = fillStatuses.find((s) => Number(s.StatusNo) === id);
    const label = (meta?.Status || '').trim();
    if (!label) continue;
    if (label.toLowerCase() === taskStatus) return true;

    for (const pillName of Object.keys(STATUS_PILL_ALIASES)) {
      const aliases = getStatusPillAliases(pillName);
      const labelInGroup =
        pillName.toLowerCase() === label.toLowerCase()
        || aliases.some((a) => a.toLowerCase() === label.toLowerCase());
      if (labelInGroup && statusMatchesPill(task.status, pillName)) return true;
    }
  }

  return false;
}

/** Parse drawer operTaskStatusNo into numeric StatusNo list (ignores pill tokens). */
export function parseNumericStatusIds(raw: string | undefined | null): number[] {
  if (!raw || typeof raw !== 'string') return [];
  if (parseStatusPillToken(raw.trim())) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

