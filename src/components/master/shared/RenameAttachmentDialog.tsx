import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileEdit } from 'lucide-react';

interface RenameAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newName: string) => void;
  originalName: string;
  confirming?: boolean;
}

export function RenameAttachmentDialog({
  open,
  onOpenChange,
  onConfirm,
  originalName,
  confirming = false,
}: RenameAttachmentDialogProps) {
  const [name, setName] = useState('');
  const [extension, setExtension] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const lastDotIdx = originalName.lastIndexOf('.');
      if (lastDotIdx > 0) {
        setName(originalName.substring(0, lastDotIdx));
        setExtension(originalName.substring(lastDotIdx));
      } else {
        setName(originalName);
        setExtension('');
      }
      setError(null);
    }
  }, [open, originalName]);

  const handleConfirm = () => {
    if (!name.trim()) {
      setError('File name cannot be empty.');
      return;
    }

    setError(null);
    onConfirm(`${name.trim()}${extension}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!confirming) onOpenChange(next);
      }}
    >
      <DialogContent
        className="rounded-[12px] max-w-sm p-0 border border-[var(--tm-border)]/80 shadow-xl"
        onEscapeKeyDown={(e) => {
          if (confirming) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (confirming) e.preventDefault();
        }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            <span className="h-8 w-8 rounded-[8px] bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              <FileEdit size={16} />
            </span>
            Rename Document
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-2">
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">File Name</label>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              disabled={confirming}
              className="h-9 flex-1 text-sm text-slate-100 placeholder:text-slate-500/50 bg-[var(--tm-surface)] border-[var(--tm-border)]"
              placeholder="Enter file name"
            />
            {extension && (
              <span className="text-sm font-medium text-slate-400 shrink-0 px-2 h-9 flex items-center bg-[var(--tm-surface)] border border-[var(--tm-border)] rounded-md">
                {extension}
              </span>
            )}
          </div>
          {error && <p className="text-[11px] text-red-400 mt-1.5 font-medium">{error}</p>}
        </div>

        <DialogFooter className="p-4 pt-3 border-t border-[var(--tm-border)]/40 bg-[var(--tm-surface)]/50 sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs bg-[var(--tm-surface)] border-[var(--tm-border)] text-slate-300 hover:text-slate-100 transition-colors rounded-[8px] shadow-sm"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-8 text-xs bg-sky-500 hover:bg-sky-400 text-white shadow shadow-sky-500/20 rounded-[8px] transition-all"
            onClick={handleConfirm}
            disabled={confirming || `${name.trim()}${extension}` === originalName}
          >
            {confirming ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
