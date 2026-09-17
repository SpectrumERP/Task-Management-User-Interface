import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface MasterDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Optional display name — UX only; does not affect delete API */
  recordName?: string | null;
  /** e.g. "meeting note" — used in title/copy */
  entityLabel?: string;
  /** Disables actions while delete request is in flight */
  confirming?: boolean;
}

/**
 * Shared destructive confirmation — Cancel / Delete.
 * Escape and overlay dismiss when not confirming.
 */
export function MasterDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  recordName,
  entityLabel = 'record',
  confirming = false,
}: MasterDeleteDialogProps) {
  const label = (recordName || '').trim();
  const entity = (entityLabel || 'record').trim() || 'record';

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
      >
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
              <AlertCircle size={16} strokeWidth={2.5} />
            </span>
            Delete {entity}?
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 mt-2 leading-relaxed break-words">
            {label ? (
              <>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-slate-200">“{label}”</span>? This action cannot be
                undone.
              </>
            ) : (
              <>
                Are you sure you want to delete this {entity}? This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-4 pt-2 bg-[var(--tm-elevated)] flex justify-end gap-2 rounded-b-[12px] border-t border-[var(--tm-border)]">
          <Button
            type="button"
            variant="outline"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-[8px] text-xs font-semibold border-[var(--tm-border)] shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="h-9 px-4 rounded-[8px] bg-red-500 hover:bg-red-600 text-white font-semibold text-xs shadow-sm"
          >
            {confirming ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
