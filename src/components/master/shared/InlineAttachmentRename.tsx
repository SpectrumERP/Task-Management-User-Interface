import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ActionTip } from './TruncatedCellTip';

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
          className="h-8 flex-1 min-w-0 text-xs bg-[var(--tm-surface)] border-[var(--tm-border)]"
        />
        {extension ? (
          <span className="h-8 px-2 flex items-center shrink-0 rounded-md border border-[var(--tm-border)] bg-[var(--tm-elevated)] text-xs font-medium text-slate-400">
            {extension}
          </span>
        ) : null}
        <ActionTip label="Save name">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            aria-label="Save name"
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[6px] bg-[#0EA5E9] text-white hover:bg-[#0284C7] disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
          </button>
        </ActionTip>
        <ActionTip label="Cancel">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Cancel rename"
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[6px] border border-[var(--tm-border)] text-slate-400 hover:text-slate-200 hover:bg-[var(--tm-muted)] disabled:opacity-60 transition-colors"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </ActionTip>
      </div>
      {error ? <p className="text-[10px] text-red-400 font-medium mt-1">{error}</p> : null}
    </div>
  );
}
