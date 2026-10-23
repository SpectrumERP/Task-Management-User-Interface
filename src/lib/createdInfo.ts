import { formatUtcDateTime } from '@/lib/dateTime';

/** Who created an API row and when, across the field spellings the backend uses. */
export function readCreatedInfo(row: any): { createdBy: string; createdDate: string; createdByLoginNo?: number } {
  const by = row?.createdBy ?? row?.CreatedBy;
  const createdBy =
    by?.printingName ||
    by?.displayName ||
    by?.loginId ||
    row?.createdByName ||
    row?.createdByDisplayName ||
    (typeof by === 'string' ? by : '') ||
    '';
  const createdDate = row?.createdDate || row?.CreatedDate || row?.createdDateTime || row?.createdOn || '';
  // The creator's login no, so the name can open their profile card (left out when the row has none).
  const loginNo = Number(
    (by && typeof by === 'object' ? by.loginNo ?? by.id : undefined) ?? row?.createdByLoginNo
  );
  return {
    createdBy: String(createdBy),
    createdDate: String(createdDate),
    ...(Number.isFinite(loginNo) && loginNo > 0 ? { createdByLoginNo: loginNo } : {}),
  };
}

/** The date half of the created line, '' when there is none. */
export function formatCreatedDate(createdDate?: string): string {
  return createdDate ? formatUtcDateTime(createdDate, '') : '';
}

/** "Created by Asha · 14/09/2026 09:30", or '' when the row carries neither. */
export function formatCreatedLine(createdBy?: string, createdDate?: string): string {
  const parts = [createdBy ? `Created by ${createdBy}` : '', formatCreatedDate(createdDate)].filter(Boolean);
  return parts.join(' · ');
}
