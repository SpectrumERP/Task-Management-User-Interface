/**
 * Task list freshness signals: "Last Update" relative time, overdue days, stale rows.
 */

import type { Task } from '@/types/task';
import { formatDateOnly, toUtcMs, type DateInput } from '@/lib/dateTime';
import { resolveCanonicalStatus } from '@/lib/taskStatusGroups';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** In-Progress tasks with no update for this long are flagged as stale. */
export const STALE_AFTER_DAYS = 3;

/** "just now" / "12 mins ago" / "5 hrs ago" / "3 days ago"; falls back to the date after 30 days. */
export function formatTimeAgo(value: DateInput, now: number = Date.now()): string {
  const ms = toUtcMs(value);
  if (ms == null) return '';
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) {
    const mins = Math.floor(diff / MINUTE_MS);
    return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  }
  if (diff < DAY_MS) {
    const hrs = Math.floor(diff / HOUR_MS);
    return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ago`;
  }
  const days = Math.floor(diff / DAY_MS);
  if (days <= 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return formatDateOnly(value, '');
}

function isClosedStatus(status?: string | null): boolean {
  const canonical = resolveCanonicalStatus(status);
  return canonical === 'Complete' || canonical === 'Cancelled';
}

/** Days late per the API; 0 when not overdue or the task is already closed. */
export function getOverdueDays(task: Pick<Task, 'overdueDays' | 'status'>): number {
  if (isClosedStatus(task.status)) return 0;
  const days = Number(task.overdueDays);
  return Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
}

/** In-Progress with no comment for STALE_AFTER_DAYS+ (never commented → measured from creation). */
export function isStaleTask(
  task: Pick<Task, 'status' | 'lastCommentDate' | 'createdDate' | 'start_date'>,
  now: number = Date.now()
): boolean {
  if (resolveCanonicalStatus(task.status) !== 'In-Progress') return false;
  const ms = toUtcMs(task.lastCommentDate || task.createdDate || task.start_date);
  if (ms == null) return false;
  return now - ms >= STALE_AFTER_DAYS * DAY_MS;
}
