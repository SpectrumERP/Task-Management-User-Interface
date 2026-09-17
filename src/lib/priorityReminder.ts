/**
 * Priority-based reminder rules — UI contract for backend.
 *
 * Expected API fields (camelCase on save/load; PascalCase also accepted on read):
 * - isReminderEnabled: boolean
 * - reminderLeadDays: number   // days before due date to start reminding (0 = due day)
 * - reminderFrequencyNo: number // Frequency master id (Daily / Weekly / …)
 * - isOverdueReminderEnabled: boolean
 *
 * Fill-values priority rows may include the same keys (any casing).
 * Until backend ships these fields, UI falls back to name-based defaults
 * so Task Form still shows a useful preview.
 */

import { getPriorityRank } from '@/lib/priorityStyles';

export type PriorityReminderRule = {
  enabled: boolean;
  leadDays: number;
  frequencyNo: string;
  overdueEnabled: boolean;
};

export type PriorityReminderApiPayload = {
  isReminderEnabled: boolean;
  reminderLeadDays: number | null;
  reminderFrequencyNo: number | null;
  isOverdueReminderEnabled: boolean;
};

function pick(raw: Record<string, unknown> | null | undefined, keys: string[]): unknown {
  if (!raw) return undefined;
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key];
    const found = Object.keys(raw).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && raw[found] !== undefined && raw[found] !== null && raw[found] !== '') {
      return raw[found];
    }
  }
  return undefined;
}

function toBool(value: unknown, fallback = false): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'True') return true;
  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'False') return false;
  return fallback;
}

function toNum(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Defaults by priority intensity when API has not stored reminder fields yet. */
export function defaultReminderForPriorityName(name?: string | null): PriorityReminderRule {
  const rank = getPriorityRank(name || '');
  if (rank >= 4) {
    // HOT / Urgent
    return { enabled: true, leadDays: 1, frequencyNo: '', overdueEnabled: true };
  }
  if (rank === 3) {
    // WARM / High
    return { enabled: true, leadDays: 3, frequencyNo: '', overdueEnabled: true };
  }
  if (rank === 2) {
    // Medium
    return { enabled: true, leadDays: 5, frequencyNo: '', overdueEnabled: false };
  }
  // Low / Cold
  return { enabled: true, leadDays: 0, frequencyNo: '', overdueEnabled: false };
}

/** True when raw payload actually contains reminder configuration from API. */
export function hasApiReminderFields(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw) return false;
  return (
    pick(raw, ['isReminderEnabled', 'IsReminderEnabled', 'reminderEnabled']) !== undefined ||
    pick(raw, ['reminderLeadDays', 'ReminderLeadDays', 'remindBeforeDueDays']) !== undefined ||
    pick(raw, ['reminderFrequencyNo', 'ReminderFrequencyNo']) !== undefined ||
    pick(raw, ['isOverdueReminderEnabled', 'IsOverdueReminderEnabled', 'reminderOverdueEnabled']) !==
      undefined
  );
}

export function parseReminderFromApi(
  raw: Record<string, unknown> | null | undefined,
  fallbackName?: string
): PriorityReminderRule {
  if (hasApiReminderFields(raw)) {
    const lead = toNum(pick(raw, ['reminderLeadDays', 'ReminderLeadDays', 'remindBeforeDueDays']));
    const freq = pick(raw, ['reminderFrequencyNo', 'ReminderFrequencyNo']);
    return {
      enabled: toBool(pick(raw, ['isReminderEnabled', 'IsReminderEnabled', 'reminderEnabled']), true),
      leadDays: lead ?? 0,
      frequencyNo: freq !== undefined && freq !== null ? String(freq) : '',
      overdueEnabled: toBool(
        pick(raw, ['isOverdueReminderEnabled', 'IsOverdueReminderEnabled', 'reminderOverdueEnabled']),
        false
      ),
    };
  }
  return defaultReminderForPriorityName(fallbackName);
}

export function toReminderApiPayload(rule: PriorityReminderRule): PriorityReminderApiPayload {
  if (!rule.enabled) {
    return {
      isReminderEnabled: false,
      reminderLeadDays: null,
      reminderFrequencyNo: null,
      isOverdueReminderEnabled: false,
    };
  }
  const freq = rule.frequencyNo ? Number(rule.frequencyNo) : NaN;
  return {
    isReminderEnabled: true,
    reminderLeadDays: Number.isFinite(rule.leadDays) ? rule.leadDays : 0,
    reminderFrequencyNo: Number.isFinite(freq) ? freq : null,
    isOverdueReminderEnabled: Boolean(rule.overdueEnabled),
  };
}

export function resolveFrequencyLabel(
  frequencyNo: string | number | null | undefined,
  frequencyRows?: Array<Record<string, unknown>> | null
): string {
  if (frequencyNo === undefined || frequencyNo === null || frequencyNo === '') return '';
  const row = (frequencyRows || []).find((f) => {
    const no = f.FrequencyNo ?? f.frequencyNo ?? f.id;
    return String(no) === String(frequencyNo);
  });
  if (row) {
    return String(row.FrequencyName || row.Frequency || row.name || '');
  }
  return '';
}

/** Prefer Daily / Days from fill-values when defaulting empty frequencyNo. */
export function guessDailyFrequencyNo(
  frequencyRows?: Array<Record<string, unknown>> | null
): string {
  const rows = frequencyRows || [];
  const daily = rows.find((f) => {
    const label = String(f.FrequencyName || f.Frequency || f.name || '').toLowerCase();
    return label === 'day' || label === 'days' || label === 'daily';
  });
  if (daily) return String(daily.FrequencyNo ?? daily.frequencyNo ?? daily.id ?? '');
  const week = rows.find((f) => {
    const label = String(f.FrequencyName || f.Frequency || f.name || '').toLowerCase();
    return label.includes('week');
  });
  if (week) return String(week.FrequencyNo ?? week.frequencyNo ?? week.id ?? '');
  return rows[0] ? String(rows[0].FrequencyNo ?? rows[0].frequencyNo ?? rows[0].id ?? '') : '';
}

export function formatReminderSummary(
  rule: PriorityReminderRule,
  frequencyLabel?: string
): string {
  if (!rule.enabled) return 'Reminders off for this priority';

  let cadence = 'on schedule';
  if (frequencyLabel) {
    const fl = frequencyLabel.toLowerCase();
    if (fl.includes('day') || fl.includes('daily')) cadence = 'daily';
    else if (fl.includes('hour')) cadence = 'hourly';
    else if (fl.includes('week')) cadence = 'weekly';
    else if (fl.includes('month')) cadence = 'monthly';
    else cadence = `every ${frequencyLabel}`;
  }

  const lead =
    rule.leadDays <= 0
      ? 'on the due date'
      : rule.leadDays === 1
        ? 'from 1 day before due'
        : `from ${rule.leadDays} days before due`;

  const overdue = rule.overdueEnabled ? ' Continues if overdue.' : '';
  return `Reminders: ${cadence}, ${lead}.${overdue}`;
}
