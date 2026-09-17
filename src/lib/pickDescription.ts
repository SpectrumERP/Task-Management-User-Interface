/** Pull a human-readable description from loosely shaped master API rows. */
const PREFERRED_KEYS = [
  'description',
  'Description',
  'DESCRIPTION',
  'operCRMBusinessEntityTypeDescription',
  'OperCRMBusinessEntityTypeDescription',
  'businessEntityTypeDescription',
  'BusinessEntityTypeDescription',
  'taskFolderDescription',
  'TaskFolderDescription',
  'folderDescription',
  'FolderDescription',
  'groupDescription',
  'GroupDescription',
  'userGroupDescription',
  'UserGroupDescription',
  'remarks',
  'Remarks',
  'remark',
  'Remark',
  'notes',
  'Notes',
  'note',
  'Note',
  'narration',
  'Narration',
  'details',
  'Details',
  'desc',
  'Desc',
] as const;

function asTrimmedText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
}

export function pickDescription(...sources: unknown[]): string {
  for (const src of sources) {
    if (src == null) continue;

    const direct = asTrimmedText(src);
    if (direct) return direct;

    if (typeof src !== 'object' || Array.isArray(src)) continue;
    const row = src as Record<string, unknown>;

    for (const key of PREFERRED_KEYS) {
      const text = asTrimmedText(row[key]);
      if (text) return text;
    }

    for (const [key, value] of Object.entries(row)) {
      if (!/(desc|remark|narrat|note)/i.test(key)) continue;
      // Skip nested objects / creator blobs
      if (value != null && typeof value === 'object') continue;
      const text = asTrimmedText(value);
      if (text) return text;
    }
  }
  return '';
}

/** True when the DTO looks like it includes any description-like property (even if empty). */
export function rowHasDescriptionField(row: unknown): boolean {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  return Object.keys(row as object).some((key) =>
    /^(description|remarks?|notes?|narration|details|desc)$/i.test(key) ||
    /Description|Remarks?|Notes?|Narration|Details/.test(key) ||
    /desc/i.test(key)
  );
}
