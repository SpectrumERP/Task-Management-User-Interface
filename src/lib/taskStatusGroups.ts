/**
 * Canonical task statuses (UI allowlist) — these five only:
 * Assigned → In-Progress → Hold → Complete → Cancelled
 *
 * Extra strings in aliases are API spelling variants of the same status
 * (not separate status types).
 */

/** Canonical pill label → API statusName spellings for that same status */
export const STATUS_PILL_ALIASES: Record<string, readonly string[]> = {
  Assigned: ['Assigned'],
  'In-Progress': ['In-Progress', 'In Progress', 'In-Progess'],
  Hold: ['Hold', 'On Hold'],
  Complete: ['Complete', 'Completed', 'Done'],
  Cancelled: ['Cancelled', 'Canceled'],
};

export const STATUS_PILL_PREFIX = 'StatusPill:';

/** Same order as the task-list status chips (Cancelled last). */
export const STATUS_PILL_ORDER = [
  'Assigned',
  'In-Progress',
  'Hold',
  'Complete',
  'Cancelled',
] as const;

export type CanonicalStatusPill = (typeof STATUS_PILL_ORDER)[number];

/**
 * Single source of truth for task-status colours (Tailwind classes).
 * Every list / card / chip / pill / board column must use these helpers —
 * do not hardcode status colours in components.
 */
export type StatusColorTokens = {
  /** Text-only (tables, labels) */
  text: string;
  /** Soft bordered chip / select trigger */
  chip: string;
  /** Small indicator dot */
  dot: string;
  /** Filter pill — idle */
  pillIdle: string;
  /** Filter pill — selected */
  pillActive: string;
  /** Kanban column top border */
  columnTop: string;
  /** Kanban column accent bar */
  columnBar: string;
  /** Kanban count badge */
  columnBadge: string;
};

const STATUS_COLOR_DEFAULT: StatusColorTokens = {
  text: 'text-slate-300 font-medium',
  chip: 'border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-200 hover:bg-[var(--tm-muted)]',
  dot: 'bg-slate-400',
  pillIdle: 'border-slate-500/40 text-slate-400 hover:bg-slate-500/10',
  pillActive: 'border-slate-500 bg-slate-500 text-white shadow-[0_4px_12px_-4px_rgba(100,116,139,0.45)]',
  columnTop: 'border-t-[3px] border-t-slate-400',
  columnBar: 'bg-slate-400',
  columnBadge: 'bg-slate-400 text-white',
};

/** Colour map keyed by canonical status. Unknown → STATUS_COLOR_DEFAULT. */
export const STATUS_COLORS: Record<CanonicalStatusPill, StatusColorTokens> = {
  // Sky / brand blue
  Assigned: {
    text: 'text-[#0EA5E9] font-medium',
    chip: '!border-[#0EA5E9]/40 !bg-[#0EA5E9]/10 !text-[#0EA5E9] hover:!bg-[#0EA5E9]/15',
    dot: 'bg-[#0EA5E9]',
    pillIdle: 'border-[#0EA5E9]/40 text-[#0EA5E9] hover:bg-[#0EA5E9]/10',
    pillActive:
      'border-[#0EA5E9] bg-[#0EA5E9] text-white shadow-[0_4px_12px_-4px_rgba(14,165,233,0.45)]',
    columnTop: 'border-t-[3px] border-t-[#0EA5E9]',
    columnBar: 'bg-[#0EA5E9]',
    columnBadge: 'bg-[#0EA5E9] text-white',
  },
  // Violet — distinct from Assigned blue
  'In-Progress': {
    text: 'text-violet-400 font-medium',
    chip: '!border-violet-500/40 !bg-violet-500/10 !text-violet-400 hover:!bg-violet-500/15',
    dot: 'bg-violet-400',
    pillIdle: 'border-violet-500/40 text-violet-400 hover:bg-violet-500/10',
    pillActive:
      'border-violet-500 bg-violet-500 text-white shadow-[0_4px_12px_-4px_rgba(139,92,246,0.45)]',
    columnTop: 'border-t-[3px] border-t-violet-500',
    columnBar: 'bg-violet-500',
    columnBadge: 'bg-violet-500 text-white',
  },
  // Amber / hold
  Hold: {
    text: 'text-[#F59E0B] font-medium',
    chip: '!border-[#F59E0B]/40 !bg-[#F59E0B]/10 !text-[#F59E0B] hover:!bg-[#F59E0B]/15',
    dot: 'bg-[#F59E0B]',
    pillIdle: 'border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10',
    pillActive:
      'border-[#F59E0B] bg-[#F59E0B] text-[#0B1220] shadow-[0_4px_12px_-4px_rgba(245,158,11,0.45)]',
    columnTop: 'border-t-[3px] border-t-[#F59E0B]',
    columnBar: 'bg-[#F59E0B]',
    columnBadge: 'bg-[#F59E0B] text-[#0B1220]',
  },
  // Emerald / complete
  Complete: {
    text: 'text-emerald-500 font-medium',
    chip: '!border-emerald-500/35 !bg-emerald-500/10 !text-emerald-400 hover:!bg-emerald-500/15',
    dot: 'bg-emerald-400',
    pillIdle: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
    pillActive:
      'border-emerald-500 bg-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.45)]',
    columnTop: 'border-t-[3px] border-t-emerald-500',
    columnBar: 'bg-emerald-500',
    columnBadge: 'bg-emerald-500 text-white',
  },
  // Neutral slate / cancelled
  Cancelled: {
    text: 'text-slate-400 font-medium',
    chip: '!border-slate-500/40 !bg-slate-500/10 !text-slate-400 hover:!bg-slate-500/15',
    dot: 'bg-slate-400',
    pillIdle: 'border-slate-500/40 text-slate-400 hover:bg-slate-500/10',
    pillActive:
      'border-slate-500 bg-slate-500 text-white shadow-[0_4px_12px_-4px_rgba(100,116,139,0.45)]',
    columnTop: 'border-t-[3px] border-t-slate-500',
    columnBar: 'bg-slate-500',
    columnBadge: 'bg-slate-500 text-white',
  },
};

/** Resolve colour tokens for any status label (API aliases included). Unknown → default. */
export function getStatusColorTokens(status?: string | null): StatusColorTokens {
  const pill = resolveCanonicalStatus(status);
  if (!pill) return STATUS_COLOR_DEFAULT;
  return STATUS_COLORS[pill];
}

/** Allowed next canonical statuses from the current one (form transitions). */
export const STATUS_TRANSITIONS: Record<CanonicalStatusPill, CanonicalStatusPill[]> = {
  Assigned: ['In-Progress', 'Hold', 'Cancelled'],
  'In-Progress': ['Complete', 'Hold', 'Cancelled'],
  Hold: ['In-Progress', 'Cancelled'],
  Complete: ['Cancelled'],
  Cancelled: [],
};

export function getStatusPillAliases(pillName: string): readonly string[] {
  return STATUS_PILL_ALIASES[pillName] ?? [pillName];
}

export function statusMatchesPill(status: string | null | undefined, pillName: string): boolean {
  if (!status) return false;
  const needle = status.trim().toLowerCase();
  return getStatusPillAliases(pillName).some((alias) => alias.toLowerCase() === needle);
}

/** Map any API/status label to a canonical pill, or null if not allowed. */
export function resolveCanonicalStatus(status?: string | null): CanonicalStatusPill | null {
  if (!status) return null;
  for (const pill of STATUS_PILL_ORDER) {
    if (statusMatchesPill(status, pill)) return pill;
  }
  return null;
}

export function isAllowedTaskStatus(status?: string | null): boolean {
  return resolveCanonicalStatus(status) != null;
}

/** Keep only the five canonical statuses from fill-value lists (All-sentinels dropped). */
export function filterSelectableStatuses<T extends { Status: string }>(
  statuses: T[] | undefined | null
): T[] {
  if (!statuses?.length) return [];
  const seen = new Set<string>();
  const out: T[] = [];

  for (const pill of STATUS_PILL_ORDER) {
    const match = statuses.find(
      (s) =>
        !isAllFilterSentinel(String(s.Status || '')) &&
        statusMatchesPill(s.Status, pill) &&
        !seen.has(pill)
    );
    if (match) {
      seen.add(pill);
      out.push(match);
    }
  }

  return out;
}

/** Form/API token for a status pill (not a numeric StatusNo). */
export function toStatusPillToken(pillName: string): string {
  return `${STATUS_PILL_PREFIX}${pillName}`;
}

export function parseStatusPillToken(token: string): string | null {
  if (token === 'PendingGroup') return null;
  if (token.startsWith(STATUS_PILL_PREFIX)) {
    const name = token.slice(STATUS_PILL_PREFIX.length);
    if (!STATUS_PILL_ORDER.includes(name as CanonicalStatusPill)) return null;
    return name;
  }
  return null;
}

export function resolveStatusPillLabel(token: string): string {
  return parseStatusPillToken(token) ?? token;
}

/** Text-only status color — no background / pill chrome. */
export function getStatusTextClass(status?: string | null): string {
  if (!(status || '').trim()) return 'text-slate-400 font-medium';
  return getStatusColorTokens(status).text;
}

/** Soft tinted surface for status chip / select trigger. */
export function getStatusChipClass(status?: string | null): string {
  return getStatusColorTokens(status).chip;
}

export function getStatusDotClass(status?: string | null): string {
  return getStatusColorTokens(status).dot;
}

/** Dashboard / filter status pill classes (idle vs active). */
export function getStatusPillClass(status?: string | null, isActive = false): string {
  const tokens = getStatusColorTokens(status);
  return isActive ? tokens.pillActive : tokens.pillIdle;
}

/** Kanban column accent classes from the same colour map. */
export function getStatusColumnAccent(status?: string | null): {
  top: string;
  bar: string;
  badge: string;
} {
  const tokens = getStatusColorTokens(status);
  return {
    top: tokens.columnTop,
    bar: tokens.columnBar,
    badge: tokens.columnBadge,
  };
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

/**
 * Status dropdown options = same set as the top status chips.
 * Prefer API StatusNo when a fill-values row matches a pill alias; otherwise pill token.
 */
export function buildStatusFilterOptions(
  fillStatuses: FillStatus[] = []
): { value: string; label: string }[] {
  const realStatuses = filterSelectableStatuses(fillStatuses);
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

    for (const pill of STATUS_PILL_ORDER) {
      const aliases = getStatusPillAliases(pill);
      const labelInGroup =
        pill.toLowerCase() === label.toLowerCase()
        || aliases.some((a) => a.toLowerCase() === label.toLowerCase());
      if (labelInGroup && statusMatchesPill(task.status, pill)) return true;
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
