import type { ReactNode } from 'react';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';

/** File type tag, as in the Spectrum CRM's attachment list (PDF red, DOC blue, sheets green, images amber). */
function kindOf(name: string): { label: string; className: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return { label: 'PDF', className: 'bg-[#fdecec] text-[#c41e1e] dark:bg-[#c41e1e]/15 dark:text-[#f87171]' };
  if (['doc', 'docx'].includes(ext)) return { label: 'DOC', className: 'bg-[#eef3fc] text-[#1E56A0] dark:bg-[#1E56A0]/20 dark:text-[#7fb0ef]' };
  if (['xlsx', 'csv'].includes(ext)) return { label: ext.toUpperCase(), className: 'bg-[#e9f7ef] text-[#1a8040] dark:bg-[#1a8040]/20 dark:text-[#4ade80]' };
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'tif'].includes(ext)) {
    return { label: 'IMG', className: 'bg-[#fff7e6] text-[#b45309] dark:bg-[#b45309]/20 dark:text-[#fbbf24]' };
  }
  return { label: (ext || 'FILE').slice(0, 4).toUpperCase(), className: 'bg-[#F1F5F9] text-[#4a5d82] dark:bg-[var(--tm-muted)] dark:text-slate-300' };
}

const ICON_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E56A0] disabled:opacity-40 dark:hover:bg-[var(--tm-muted)] focus-visible:outline-2 focus-visible:outline-[#1E56A0]';

interface AttachedFileRowProps {
  name: string;
  /** Size label (e.g. "3.4 KB"); "Uploaded" when unknown. */
  sizeLabel?: string;
  onView: () => void;
  onRename: () => void;
  onDelete: () => void;
  renameDisabled?: boolean;
  /** The inline rename editor, shown in place of the name while renaming. */
  renaming?: ReactNode;
}

/**
 * One uploaded file, laid out as in the Spectrum CRM (lead / opportunity attachments): type tag, name
 * (opens the file) with its size under it, then View, Rename and Delete.
 */
export function AttachedFileRow({ name, sizeLabel, onView, onRename, onDelete, renameDisabled, renaming }: AttachedFileRowProps) {
  const kind = kindOf(name);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[var(--tm-surface)] px-3 py-2.5 dark:border-[var(--tm-border)]">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${kind.className}`}>{kind.label}</span>
      {renaming ? (
        <div className="min-w-0 flex-1">{renaming}</div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onView}
              className="block max-w-full truncate text-left text-xs font-semibold text-[#0c1a3a] hover:text-[#1E56A0] dark:text-slate-100"
            >
              {name}
            </button>
            <p className="text-xs text-[#94a3b8]">{sizeLabel || 'Uploaded'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ActionTip label="View / download">
              <button type="button" className={ICON_BUTTON} aria-label={`View ${name}`} onClick={onView}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </ActionTip>
            <ActionTip label="Rename">
              <button type="button" className={ICON_BUTTON} aria-label={`Rename ${name}`} onClick={onRename} disabled={renameDisabled}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </ActionTip>
            <ActionTip label="Delete">
              <button type="button" className={`${ICON_BUTTON} hover:!text-[#c41e1e]`} aria-label={`Delete ${name}`} onClick={onDelete}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </ActionTip>
          </div>
        </>
      )}
    </div>
  );
}
