/**
 * Meeting participants: types, display label, and the user / employee lookups the
 * participant field uses.
 */
import { apiService } from '@/services/apiService';
import { userService } from '@/services/userService';
import type { EmployeeResponse } from '@/components/meetings/EmployeeCombobox';

/** Meeting participant types (fill-values `participantTypes`). */
export const PARTICIPANT_TYPE = {
  user: 1,
  employee: 2,
  external: 3,
  businessEntity: 4,
} as const;

/** A participant row as held in the form (load-data adds the display names). */
export interface ParticipantValue {
  participantType: number;
  userNo?: number | null;
  empNo?: number | null;
  businessEntityNo?: number | null;
  businessEntityContactPersonDetailNo?: number | null;
  participantName?: string | null;
  companyName?: string | null;
  designation?: string | null;
  email?: string | null;
  contactNo?: string | null;
  printingName?: string | null;
  empName?: string | null;
  businessEntityContactPersonName?: string | null;
}

export type EmployeeOption = EmployeeResponse & { email?: string | null };

export function participantLabel(p: ParticipantValue): string {
  return (
    p.participantName?.trim() ||
    p.printingName?.trim() ||
    p.empName?.trim() ||
    p.businessEntityContactPersonName?.trim() ||
    p.email?.trim() ||
    'Participant'
  );
}

/** External participant still missing details the API requires (name, email, company, designation, contact). */
export function isExternalIncomplete(p: ParticipantValue): boolean {
  if (p.participantType !== PARTICIPANT_TYPE.external) return false;
  const name = p.participantName?.trim() || '';
  const email = p.email?.trim() || '';
  // A name equal to the email is only the chip's placeholder label.
  const hasName = Boolean(name) && name.toLowerCase() !== email.toLowerCase();
  return !hasName || !email || !p.companyName?.trim() || !p.designation?.trim() || !p.contactNo?.trim();
}

export async function searchEmployees(keyword: string): Promise<EmployeeOption[]> {
  const response = await apiService.get<{ data?: EmployeeOption[] } | EmployeeOption[]>('/api/payroll/employees', {
    params: { keywordSearch: keyword },
    silent: true,
  });
  return Array.isArray(response) ? response : response?.data ?? [];
}

/**
 * Fill in name / email for user and employee rows that load-data sent without them
 * (the Send Minutes dialog needs the email). Rows that need nothing are returned as-is.
 */
export async function resolveParticipantContacts(rows: ParticipantValue[]): Promise<ParticipantValue[]> {
  return Promise.all(
    rows.map(async (p) => {
      if (p.email && p.participantName) return p;
      try {
        if (p.participantType === PARTICIPANT_TYPE.user && p.userNo) {
          const user = await userService.getUserBrief(Number(p.userNo));
          if (user) return { ...p, participantName: p.participantName || user.name, email: p.email || user.email };
        } else if (p.participantType === PARTICIPANT_TYPE.employee && p.empNo) {
          const res = await apiService.get<{ data?: EmployeeOption[] }>('/api/payroll/employees', {
            params: { empNo: String(p.empNo) },
            silent: true,
          });
          const emp = res?.data?.find((e) => Number(e.empNo) === Number(p.empNo));
          if (emp) return { ...p, participantName: p.participantName || emp.empName, email: p.email || emp.email };
        }
      } catch {
        // Keep the row as loaded; only the email shortcut is lost.
      }
      return p;
    })
  );
}

