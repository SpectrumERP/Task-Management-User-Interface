/**
 * Single source of truth for attachment / document upload file types.
 * Use these helpers in every upload UI — do not hardcode accept lists or MIME checks.
 *
 * Note: This repo is the UI client. Server-side validation must also enforce the same
 * allowlist on the document-attachments API; the client cannot be the only gate.
 */

export const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024; // existing app limit — do not change lightly

/** Canonical extensions (lowercase, no dot). `.tif` accepted as TIFF alias. */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'tiff',
  'tif',
  'pdf',
  'doc',
  'docx',
  'xlsx',
  'csv',
  'txt',
] as const;

export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

/** MIME types commonly reported by browsers for the allowed formats. */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/tif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // some browsers label CSV this way
  'text/plain',
  'text/txt',
] as const;

/** `<input accept="...">` / dropzone accept string */
export const UPLOAD_ACCEPT_ATTR = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.tiff',
  '.tif',
  '.pdf',
  '.doc',
  '.docx',
  '.xlsx',
  '.csv',
  '.txt',
  // MIME hints for pickers that prefer them
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
].join(',');

/** Short human-readable list for helper text */
export const ALLOWED_UPLOAD_TYPES_LABEL =
  'PNG, JPG, JPEG, WebP, AVIF, TIFF, PDF, DOC, DOCX, XLSX, CSV, TXT';

export const ALLOWED_UPLOAD_EXTENSIONS_LABEL =
  '.png, .jpg, .jpeg, .webp, .avif, .tiff, .pdf, .doc, .docx, .xlsx, .csv, .txt';

export const ALLOWED_UPLOAD_HELPER_TEXT = `${ALLOWED_UPLOAD_TYPES_LABEL} · Max 25MB each`;

export const UNSUPPORTED_UPLOAD_TYPE_MESSAGE =
  `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_TYPES_LABEL}.`;

const ALLOWED_EXT_SET = new Set<string>(ALLOWED_UPLOAD_EXTENSIONS);
const ALLOWED_MIME_SET = new Set<string>(
  ALLOWED_UPLOAD_MIME_TYPES.map((m) => m.toLowerCase())
);

export function getFileExtension(fileName: string): string {
  const base = fileName.trim().split(/[/\\]/).pop() || fileName;
  const dot = base.lastIndexOf('.');
  if (dot < 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

export function isAllowedUploadExtension(ext: string): boolean {
  return ALLOWED_EXT_SET.has(ext.toLowerCase());
}

export function isAllowedUploadMime(mime: string): boolean {
  const m = mime.trim().toLowerCase();
  if (!m) return false;
  return ALLOWED_MIME_SET.has(m);
}

/**
 * Validate a File before upload.
 * - Always checks size (existing 25MB limit).
 * - Requires an allowed extension.
 * - When the browser provides a MIME type, it must also be in the allowlist
 *   (empty MIME is allowed if the extension is valid — common on some OS/browsers).
 */
export function validateUploadFile(
  file: File
): { ok: true } | { ok: false; reason: string } {
  if (!file || !(file instanceof File)) {
    return { ok: false, reason: 'Invalid file.' };
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return { ok: false, reason: 'File size exceeds the 25MB limit.' };
  }

  const ext = getFileExtension(file.name);
  if (!ext || !isAllowedUploadExtension(ext)) {
    return { ok: false, reason: UNSUPPORTED_UPLOAD_TYPE_MESSAGE };
  }

  const mime = (file.type || '').trim().toLowerCase();
  if (mime && !isAllowedUploadMime(mime)) {
    return {
      ok: false,
      reason: `Unsupported file content type (${mime}). Allowed: ${ALLOWED_UPLOAD_TYPES_LABEL}.`,
    };
  }

  return { ok: true };
}

export function isAllowedUploadFile(file: File): boolean {
  return validateUploadFile(file).ok;
}

/** True for images that can be shown inline in a new tab. */
export function isInlineViewableUpload(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return (
    ext === 'pdf' ||
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'webp' ||
    ext === 'avif' ||
    ext === 'tiff' ||
    ext === 'tif'
  );
}

/** Best-effort MIME for download/preview from file name. */
export function mimeFromFileName(fileName: string): string {
  const ext = getFileExtension(fileName);
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'tiff':
    case 'tif':
      return 'image/tiff';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    default:
      return '';
  }
}
