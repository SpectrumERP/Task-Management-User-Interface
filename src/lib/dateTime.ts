/**
 * Central date/time helpers — store/process as UTC instants; display consistently.
 *
 * Conventions:
 * - Timestamps (with time): serialize via toUtcIso(); sort via toUtcMs(); display via formatUtcDateTime().
 * - Calendar dates (date-only, no time-of-day): use toDateOnlyLocal() / formatDateOnly() so the
 *   picked calendar day does not shift across timezones.
 * - Pickers stay local wall-clock; callers convert to UTC ISO at API boundaries.
 */

import { format, isValid } from 'date-fns';

export type DateInput = Date | string | number | null | undefined;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function asDate(value: DateInput): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Date-only (yyyy-MM-dd): treat as UTC midnight so the calendar day is stable.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse any API/UI date into a Date, or null if invalid. */
export function parseInstant(value: DateInput): Date | null {
  return asDate(value);
}

/** UTC epoch ms for sorting. Returns null when blank/invalid. */
export function toUtcMs(value: DateInput): number | null {
  const d = asDate(value);
  if (!d) return null;
  return d.getTime();
}

/**
 * Serialize to UTC ISO-8601 with Z (e.g. 2026-09-14T09:30:00.000Z).
 */
export function toUtcIso(value: DateInput): string | null {
  if (value == null || value === '') return null;
  const d = asDate(value);
  return d ? d.toISOString() : null;
}

/** Same as toUtcIso but returns '' instead of null (form fields). */
export function toUtcIsoOrEmpty(value: DateInput): string {
  return toUtcIso(value) ?? '';
}

/**
 * Calendar day as yyyy-MM-dd in the user's local timezone.
 * Use for date-only filters / follow-up notes (not timestamps).
 */
export function toDateOnlyLocal(value: DateInput): string | null {
  const d = asDate(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

/** Calendar day as yyyy-MM-dd in UTC. */
export function toDateOnlyUtc(value: DateInput): string | null {
  const d = asDate(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** True if the string looks like a timestamp/date for chronological compare. */
export function looksLikeDateValue(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const str = value.trim();
  if (!str) return false;
  return (
    /^\d{4}-\d{2}-\d{2}/.test(str) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(str) ||
    /T\d{2}:\d{2}/.test(str) ||
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(str)
  );
}

/** Format instant using UTC components: "Sep 14, 2026 09:30" */
export function formatUtcDateTime(value: DateInput, empty = '—'): string {
  const d = asDate(value);
  if (!d) return empty;
  return `${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())}, ${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** Format instant UTC date only: "Sep 14, 2026" */
export function formatUtcDate(value: DateInput, empty = '—'): string {
  const d = asDate(value);
  if (!d) return empty;
  return `${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())}, ${d.getUTCFullYear()}`;
}

/**
 * Date-only display for calendar fields (due date, document date).
 * Prefer yyyy-MM-dd prefix when present. Full timestamps use the local
 * calendar day so DateTimePicker wall-clock days do not appear to shift.
 */
export function formatDateOnly(value: DateInput, empty = '—'): string {
  if (value == null || value === '') return empty;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && !/[T ]\d{2}:\d{2}/.test(raw)) {
    const monthIdx = Number(m[2]) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTHS[monthIdx]} ${m[3]}, ${m[1]}`;
    }
  }
  const d = asDate(value);
  if (!d) return empty;
  return `${MONTHS[d.getMonth()]} ${pad2(d.getDate())}, ${d.getFullYear()}`;
}

/** Split schedule line for tables: date + time (UTC components, no suffix). */
export function formatUtcScheduleLine(value: DateInput): { date: string; time: string } {
  const d = asDate(value);
  if (!d) return { date: '—', time: '' };
  return {
    date: `${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())}, ${d.getUTCFullYear()}`,
    time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
  };
}

/**
 * Local wall-clock display with explicit UTC offset (form readbacks).
 * Keeps picker-matched local time while exposing timezone context.
 */
export function formatLocalDateTimeWithOffset(value: DateInput, empty = '—'): string {
  const d = asDate(value);
  if (!d || !isValid(d)) return empty;
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = pad2(Math.floor(abs / 60));
  const om = pad2(abs % 60);
  return `${format(d, 'MMM dd, yyyy h:mm a')} (UTC${sign}${oh}:${om})`;
}

/** Sort helper: blank → sink; otherwise compare UTC ms. */
export function compareUtcInstants(a: DateInput, b: DateInput, desc = false): number {
  const ma = toUtcMs(a);
  const mb = toUtcMs(b);
  if (ma == null && mb == null) return 0;
  if (ma == null) return 1;
  if (mb == null) return -1;
  return desc ? mb - ma : ma - mb;
}
