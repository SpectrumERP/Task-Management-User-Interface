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
      <DialogContent className="rounded-2xl max-w-sm p-0 border-none shadow-xl">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-lg font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
            <AlertCircle size={20} className="text-red-500" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-2">
            Do you want to delete?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
          >
            No
          </Button>
          <Button
            onClick={onConfirm}
            className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-xs normal-case shadow-md shadow-red-500/20 gap-0.5 transition-transform hover:scale-[1.02] active:scale-95"
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
