/**
 * Single source of truth for attachment / document upload file types.
 * Use these helpers in every upload UI — do not hardcode accept lists or MIME checks.
 *
 * Note: This repo is the UI client. Server-side validation must also enforce the same
 * allowlist on the document-attachments API; the client cannot be the only gate.
 */

export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_LABEL = '10MB';
/** Most files one record (task, meeting, company…) may hold. */
export const MAX_ATTACHMENTS_PER_RECORD = 10;

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
  'xls',
  'xlsx',
  'pptx',
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
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // .xls, and how some browsers label CSV
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
  '.xls',
  '.xlsx',
  '.pptx',
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
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
].join(',');

/** Short human-readable list for helper text */
export const ALLOWED_UPLOAD_TYPES_LABEL =
  'PNG, JPG, JPEG, WebP, AVIF, TIFF, PDF, DOC, DOCX, XLS, XLSX, PPTX, CSV, TXT';

export const ALLOWED_UPLOAD_EXTENSIONS_LABEL =
  '.png, .jpg, .jpeg, .webp, .avif, .tiff, .pdf, .doc, .docx, .xls, .xlsx, .pptx, .csv, .txt';

export const ALLOWED_UPLOAD_HELPER_TEXT =
  `${ALLOWED_UPLOAD_TYPES_LABEL} · Max ${MAX_UPLOAD_FILE_SIZE_LABEL} each · Up to ${MAX_ATTACHMENTS_PER_RECORD} files`;

export const MAX_ATTACHMENTS_MESSAGE = `You can attach up to ${MAX_ATTACHMENTS_PER_RECORD} files.`;

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
 * - Always checks size (10MB) and rejects empty files.
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

  if (file.size === 0) {
    return { ok: false, reason: 'File is empty.' };
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return { ok: false, reason: `File size exceeds the ${MAX_UPLOAD_FILE_SIZE_LABEL} limit.` };
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

export interface RejectedUpload {
  name: string;
  size: number;
  reason: string;
}

/**
 * Picks which of the chosen files may be uploaded to a record that already holds `existing` files
 * (attached or still uploading): each must pass validateUploadFile, must not already be attached
 * (same name and size), and the record may hold at most MAX_ATTACHMENTS_PER_RECORD files.
 */
export function selectUploadBatch(
  files: File[],
  existing: ReadonlyArray<{ name?: string; size?: number }>
): { accepted: File[]; rejected: RejectedUpload[] } {
  const accepted: File[] = [];
  const rejected: RejectedUpload[] = [];
  const seen = new Set(existing.map((f) => `${(f.name || '').toLowerCase()}|${f.size ?? ''}`));
  let room = Math.max(0, MAX_ATTACHMENTS_PER_RECORD - existing.length);

  for (const file of files) {
    const reject = (reason: string) => rejected.push({ name: file.name, size: file.size, reason });
    const check = validateUploadFile(file);
    if (!check.ok) {
      reject(check.reason);
      continue;
    }
    const key = `${file.name.toLowerCase()}|${file.size}`;
    if (seen.has(key)) {
      reject('Already attached.');
      continue;
    }
    if (room === 0) {
      reject(`Limit reached — ${MAX_ATTACHMENTS_MESSAGE}`);
      continue;
    }
    seen.add(key);
    room -= 1;
    accepted.push(file);
  }
  return { accepted, rejected };
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
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    default:
      return '';
  }
}

/**
 * Images the business card analyzer can read — browser-decodable subset of the
 * upload allowlist (TIFF/AVIF are not reliably drawable on a canvas).
 */
export const ANALYZE_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

export const ANALYZE_IMAGE_ACCEPT_ATTR = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  'image/png',
  'image/jpeg',
  'image/webp',
].join(',');

export const ANALYZE_IMAGE_TYPES_LABEL = 'PNG, JPG, JPEG, WebP';

const ANALYZE_IMAGE_EXT_SET = new Set<string>(ANALYZE_IMAGE_EXTENSIONS);

/** Upload rules + image-only check for Direct Analyze. */
export function validateAnalyzeImageFile(
  file: File
): { ok: true } | { ok: false; reason: string } {
  const base = validateUploadFile(file);
  if (!base.ok) return base;

  const mime = (file.type || '').trim().toLowerCase();
  if (!ANALYZE_IMAGE_EXT_SET.has(getFileExtension(file.name)) || (mime && !mime.startsWith('image/'))) {
    return { ok: false, reason: `Only images can be analyzed. Allowed: ${ANALYZE_IMAGE_TYPES_LABEL}.` };
  }
  return { ok: true };
}
