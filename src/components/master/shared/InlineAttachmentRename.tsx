import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { InlineLoader } from '@/components/ui/BrandLoader';

interface InlineAttachmentRenameProps {
  originalName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
  saving?: boolean;
}

/** In-row attachment rename: name input + fixed extension, Enter saves, Esc cancels. */
export function InlineAttachmentRename({ originalName, onSave, onCancel, saving = false }: InlineAttachmentRenameProps) {
  const dot = originalName.lastIndexOf('.');
  const extension = dot > 0 ? originalName.substring(dot) : '';
  const [name, setName] = useState(dot > 0 ? originalName.substring(0, dot) : originalName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const unchanged = `${name.trim()}${extension}` === originalName;

  const save = () => {
    if (saving) return;
    if (!name.trim()) {
      setError('File name cannot be empty.');
      return;
    }
    if (unchanged) {
      onCancel();
      return;
    }
    onSave(`${name.trim()}${extension}`);
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={name}
          disabled={saving}
          maxLength={200}
          aria-label="File name"
          placeholder="Enter file name"
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              if (!saving) onCancel();
            }
          }}
          className="h-8 flex-1 min-w-0 text-xs bg-[var(--tm-surface)] border-[var(--tm-border)] focus-visible:border-[#1E56A0] focus-visible:ring-2 focus-visible:ring-[#1E56A0]/20"
        />
        {/* As in the Spectrum CRM: the extension as plain text, then Save and Cancel buttons. */}
        {extension ? <span className="shrink-0 text-xs text-[#94a3b8]">{extension}</span> : null}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#1E56A0] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#17457F] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0]"
        >
          {saving ? <InlineLoader size={12} /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#E2E8F0] bg-[var(--tm-surface)] px-3 text-xs font-semibold text-[#4a5d82] transition-colors hover:bg-[#F1F5F9] disabled:opacity-60 dark:border-[var(--tm-border)] dark:text-slate-300 dark:hover:bg-[var(--tm-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0]"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="text-[10px] text-red-400 font-medium mt-1">{error}</p> : null}
    </div>
  );
}
