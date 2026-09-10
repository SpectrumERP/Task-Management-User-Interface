import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface MasterDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Optional display name — UX only; does not affect delete API */
  recordName?: string | null;
}

export function MasterDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  recordName,
}: MasterDeleteDialogProps) {
  const label = (recordName || '').trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[12px] max-w-sm p-0 border border-[var(--tm-border)]/80 shadow-xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
              <AlertCircle size={16} strokeWidth={2.5} />
            </span>
            Delete record?
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 mt-2 leading-relaxed">
            {label ? (
              <>
                You are about to delete <span className="font-semibold text-slate-200">“{label}”</span>. This cannot be undone.
              </>
            ) : (
              <>You are about to delete this record. This cannot be undone.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-4 pt-2 bg-[var(--tm-elevated)] flex justify-end gap-2 rounded-b-[12px] border-t border-[var(--tm-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-[8px] text-xs font-semibold border-[var(--tm-border)] shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="h-9 px-4 rounded-[8px] bg-red-500 hover:bg-red-600 text-white font-semibold text-xs shadow-sm"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
