import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { cn } from '@/lib/utils';

interface AttachmentDropZoneProps {
  /** The hidden file input (the form keeps the ref to reset it after a pick). */
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  helperText: string;
  disabled?: boolean;
}

/**
 * Upload area for documents / attachments, the same as the Spectrum CRM's (lead and opportunity forms):
 * a dashed box with "Drag & drop files here", the allowed types and sizes, and Browse Files.
 */
export function AttachmentDropZone({ inputRef, onFiles, onInputChange, accept, helperText, disabled = false }: AttachmentDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  // dragenter / dragleave fire for every child: count them so the highlight does not flicker.
  const depth = useRef(0);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label="Add attachments: drag and drop files or browse"
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        if (!disabled && e.dataTransfer.types.includes('Files')) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        depth.current = 0;
        setDragging(false);
        const files = e.dataTransfer?.files;
        if (!disabled && files?.length) onFiles(Array.from(files));
      }}
      className={cn(
        'flex select-none flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        dragging
          ? 'border-[#1E56A0] bg-[#eef3fc] dark:bg-[#1E56A0]/15'
          : 'border-[#CBD5E1] bg-[var(--tm-page)] hover:border-[#1E56A0]/50 dark:border-[var(--tm-border)]'
      )}
    >
      <input ref={inputRef} type="file" multiple accept={accept} onChange={onInputChange} className="hidden" disabled={disabled} />
      <p className="text-sm font-semibold text-[#0c1a3a] dark:text-slate-100">{dragging ? 'Drop to upload' : 'Drag & drop files here'}</p>
      <p className="mt-1 text-xs text-[#94a3b8]">{helperText}</p>
      <span className="mt-3 inline-flex h-8 items-center rounded-lg border border-[#E2E8F0] bg-[var(--tm-surface)] px-4 text-xs font-semibold text-[#4a5d82] dark:border-[var(--tm-border)] dark:text-slate-300">
        Browse Files
      </span>
    </div>
  );
}
