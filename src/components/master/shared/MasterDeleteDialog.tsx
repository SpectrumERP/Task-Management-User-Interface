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
}

export function MasterDeleteDialog({ open, onOpenChange, onConfirm }: MasterDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[12px] max-w-sm p-0 border border-slate-200/80 shadow-xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1.5">
            Do you want to delete this record?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-4 pt-2 bg-[#f8fbfd] flex justify-end gap-2 rounded-b-[12px] border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-[8px] text-xs font-medium border-slate-200 shadow-none"
          >
            No
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="h-9 px-4 rounded-[8px] bg-red-500 hover:bg-red-600 text-white font-semibold text-xs shadow-sm"
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
