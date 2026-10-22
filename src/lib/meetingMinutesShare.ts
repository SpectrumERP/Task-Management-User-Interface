import { apiService } from '@/services/apiService';
import { toast } from 'sonner';
import { formatUtcDateTime, toUtcIso } from '@/lib/dateTime';

export type MeetingParticipantLike = {
  participantType?: number | string | null;
  participantName?: string | null;
  email?: string | null;
  companyName?: string | null;
  designation?: string | null;
  userNo?: number | null;
  empNo?: number | null;
};

export type MinutesRecipient = {
  key: string;
  name: string;
  email: string;
  typeLabel: string;
  companyName?: string;
  hasEmail: boolean;
};

export type SendMinutesPayload = {
  meetingNotesNo: number;
  companyNo: number;
  recipientEmails: string[];
  recipients: Array<{ name: string; email: string; participantType?: string }>;
  message?: string;
  includeAttachments?: boolean;
};

const LAST_SENT_KEY = 'tm-meeting-minutes-last-sent';

function cleanEmail(email?: string | null): string {
  return String(email || '').trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function participantTypeLabel(type?: number | string | null): string {
  const t = Number(type);
  if (t === 1) return 'Internal user';
  if (t === 2) return 'Employee';
  if (t === 3) return 'External';
  if (t === 4) return 'Business entity contact';
  return 'Participant';
}

/**
 * Finalized meeting notes: the tasks from the discussion points are created at finalize, and the
 * notes can no longer be changed.
 */
export function isMeetingFinalized(statusName?: string | null): boolean {
  return String(statusName || '').trim().toLowerCase().includes('final');
}

/** Release / Authorized (and similar) can send; Initial/Draft cannot. */
export function isMinutesSendStatusAllowed(statusName?: string | null): boolean {
  const n = String(statusName || '').trim().toLowerCase();
  if (!n) return false;
  if (n.includes('initial') || n.includes('draft')) return false;
  return (
    n.includes('release') ||
    n.includes('authori') ||
    n.includes('final') ||
    n.includes('sent') ||
    n.includes('complete')
  );
}

/**
 * Who may delete a meeting note (UI policy):
 * 1) User must have Meeting Notes form right `isDelete` (formNo 1559).
 * 2) Document status must still be draft-like (Initial / Draft / empty).
 *    Release / Authorized notes are treated as official — delete disabled in UI.
 */
export function isMeetingDeleteStatusAllowed(statusName?: string | null): boolean {
  const n = String(statusName || '').trim().toLowerCase();
  if (!n) return true;
  if (n.includes('release') || n.includes('authori') || n.includes('final') || n.includes('complete')) {
    return false;
  }
  return n.includes('initial') || n.includes('draft') || n.includes('open') || n.includes('pending') || n.includes('prepared');
}

export function canDeleteMeetingNote(
  hasDeleteRight: boolean,
  statusName?: string | null
): { allowed: boolean; reason?: string } {
  if (!hasDeleteRight) {
    return {
      allowed: false,
      reason: 'Your role does not have Delete permission for Meeting Notes.',
    };
  }
  if (!isMeetingDeleteStatusAllowed(statusName)) {
    return {
      allowed: false,
      reason: 'Only Initial / Draft meeting notes can be deleted. Release or Authorized notes stay as record.',
    };
  }
  return { allowed: true };
}

export function buildMinutesRecipients(
  participants: MeetingParticipantLike[] | undefined | null
): MinutesRecipient[] {
  const rows = Array.isArray(participants) ? participants : [];
  const seen = new Set<string>();
  const out: MinutesRecipient[] = [];

  rows.forEach((p, index) => {
    const emailRaw = cleanEmail(p.email);
    const email = emailRaw.toLowerCase();
    const hasEmail = Boolean(email && isValidEmail(emailRaw));
    const key = hasEmail ? `e:${email}` : `i:${index}:${p.userNo || p.empNo || p.participantName || ''}`;
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      key,
      name: String(p.participantName || '').trim() || (hasEmail ? emailRaw : 'Unnamed participant'),
      email: hasEmail ? emailRaw : '',
      typeLabel: participantTypeLabel(p.participantType),
      companyName: String(p.companyName || '').trim() || undefined,
      hasEmail,
    });
  });

  return out;
}

export function formatMinutesEmailSubject(meetingTitle?: string, startDateTime?: string | null): string {
  const title = String(meetingTitle || 'Meeting').trim() || 'Meeting';
  let dateBit = '';
  if (startDateTime) {
    const formatted = formatUtcDateTime(startDateTime, '');
    if (formatted) {
      dateBit = ` — ${formatted}`;
    }
  }
  return `Minutes of Meeting: ${title}${dateBit}`;
}

export function formatMinutesEmailBody(opts: {
  meetingTitle?: string;
  startDateTime?: string | null;
  endDateTime?: string | null;
  statusName?: string | null;
  recipients: MinutesRecipient[];
  note?: string;
}): string {
  const lines: string[] = [
    'Please find the Minutes of Meeting.',
    '',
    `Meeting: ${opts.meetingTitle || '—'}`,
  ];
  if (opts.startDateTime) {
    const formatted = formatUtcDateTime(opts.startDateTime, '');
    if (formatted) lines.push(`Start: ${formatted}`);
  }
  if (opts.endDateTime) {
    const formatted = formatUtcDateTime(opts.endDateTime, '');
    if (formatted) lines.push(`End: ${formatted}`);
  }
  if (opts.statusName) lines.push(`Status: ${opts.statusName}`);

  const withEmail = opts.recipients.filter((r) => r.hasEmail);
  if (withEmail.length) {
    lines.push('', 'Attendees:');
    withEmail.forEach((r) => {
      lines.push(`- ${r.name}${r.email ? ` <${r.email}>` : ''} (${r.typeLabel})`);
    });
  }

  if (opts.note?.trim()) {
    lines.push('', 'Note:', opts.note.trim());
  }

  lines.push('', '—', 'Sent from Task Management');
  return lines.join('\n');
}

export function readLastMinutesSentAt(meetingNotesNo: number): string | null {
  try {
    const raw = localStorage.getItem(LAST_SENT_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(meetingNotesNo)] || null;
  } catch {
    return null;
  }
}

export function writeLastMinutesSentAt(meetingNotesNo: number, iso: string = toUtcIso(new Date()) || '') {
  try {
    const raw = localStorage.getItem(LAST_SENT_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[String(meetingNotesNo)] = iso;
    localStorage.setItem(LAST_SENT_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

/**
 * Prefer backend send API. If not available, open mailto with BCC (desktop fallback)
 * so UX still works until the notification service is live.
 */
export async function sendMinutesOfMeeting(opts: {
  payload: SendMinutesPayload;
  subject: string;
  body: string;
}): Promise<{ mode: 'api' | 'mailto' }> {
  const { payload, subject, body } = opts;
  if (!payload.recipientEmails.length) {
    throw new Error('No attendees with a valid email address.');
  }

  try {
    await apiService.post('/api/crm/meeting-notes/send-minutes', payload);
    writeLastMinutesSentAt(payload.meetingNotesNo);
    return { mode: 'api' };
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status;
    const msg = String(err?.message || err?.response?.data?.message || '');
    const notReady =
      status === 404 ||
      status === 405 ||
      status === 501 ||
      /not found|not implemented|unknown|does not exist|404/i.test(msg);

    if (!notReady) {
      throw err;
    }

    // Fallback: client mail composer (BCC attendees)
    const bcc = payload.recipientEmails.map((e) => encodeURIComponent(e)).join(',');
    const href = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    writeLastMinutesSentAt(payload.meetingNotesNo);
    toast.message('Opened email draft', {
      description: 'Backend send API is not live yet — review recipients in your mail app and send.',
    });
    return { mode: 'mailto' };
  }
}
