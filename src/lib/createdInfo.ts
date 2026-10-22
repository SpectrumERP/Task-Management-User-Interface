import { formatUtcDateTime } from '@/lib/dateTime';

/** Who created an API row and when, across the field spellings the backend uses. */
export function readCreatedInfo(row: any): { createdBy: string; createdDate: string } {
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
  return { createdBy: String(createdBy), createdDate: String(createdDate) };
}

/** "Created by Asha · 14/09/2026 09:30", or '' when the row carries neither. */
export function formatCreatedLine(createdBy?: string, createdDate?: string): string {
  const parts = [
    createdBy ? `Created by ${createdBy}` : '',
    createdDate ? formatUtcDateTime(createdDate, '') : '',
  ].filter(Boolean);
  return parts.join(' · ');
}
