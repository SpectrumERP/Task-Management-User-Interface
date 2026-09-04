import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { X, Loader2, Save, CheckCircle } from 'lucide-react';
import { toMasterListPath, MasterType } from './masterRoutes';
import { MasterBreadcrumb } from './MasterBreadcrumb';

interface MasterFormShellProps {
  type: MasterType | string;
  title: string;
  editingId: string | null;
  isSaving: boolean;
  serverError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  showConfirm: boolean;
  onCancelConfirm: () => void;
  onConfirmSave: () => void;
  showSuccessAlert: boolean;
  onSuccessOk: () => void;
  children: React.ReactNode;
}

export function MasterFormShell({
  type,
  title,
  editingId,
  isSaving,
  serverError,
  onSubmit,
  showConfirm,
  onCancelConfirm,
  onConfirmSave,
  showSuccessAlert,
  onSuccessOk,
  children,
}: MasterFormShellProps) {
  const navigate = useNavigate();
  const goToList = () => navigate(toMasterListPath(type));
  const listPath = toMasterListPath(type);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#eef4f8]">
      <div className="shrink-0 z-20 bg-white border-b border-slate-200/70 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]">
        <MasterBreadcrumb
          items={[
            { label: 'Masters', href: listPath },
            { label: title, href: listPath },
            { label: editingId ? 'Edit' : 'New', current: true },
          ]}
        />

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={goToList}
            disabled={isSaving}
            className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-none gap-1.5 disabled:opacity-40"
          >
            <X size={14} />
            <span className="hidden sm:inline">Cancel</span>
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#006699] hover:bg-[#005580] text-white shadow-sm shadow-[#006699]/20 gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span className="hidden sm:inline">{editingId ? 'Update' : 'Save'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Page-level scroll (matches TaskDetail / Create Task) */}
      <form
        onSubmit={onSubmit}
        className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-4 py-3 space-y-3"
      >
        {children}

        {serverError ? (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 flex items-start gap-2">
            <span className="font-semibold shrink-0">Error:</span>
            <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
          </div>
        ) : null}
      </form>

      <Dialog open={showConfirm} onOpenChange={(open) => { if (!open) onCancelConfirm(); }}>
        <DialogContent className="rounded-[12px] max-w-sm p-0 border border-slate-200/80 shadow-xl">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-base font-semibold text-slate-800 tracking-tight">
              Confirm Save
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1.5">
              Are you sure you want to save these changes?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-[#f8fbfd] flex justify-end gap-2 rounded-b-[12px] border-t border-slate-100">
            <Button
              variant="outline"
              onClick={onCancelConfirm}
              className="h-9 rounded-[8px] text-xs font-medium border-slate-200 shadow-none"
            >
              No, Cancel
            </Button>
            <Button
              onClick={onConfirmSave}
              className="h-9 rounded-[8px] text-xs font-semibold bg-[#006699] hover:bg-[#005580] text-white shadow-sm"
            >
              Yes, Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessAlert} onOpenChange={() => {}}>
        <DialogContent className="rounded-[12px] max-w-xs p-0 border border-slate-200/80 shadow-xl bg-white [&>button]:hidden overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-1">Success</h3>
            <p className="text-xs font-medium text-slate-500 max-w-[200px] leading-relaxed">
              Data saved successfully.
            </p>
          </div>
          <div className="p-4 bg-[#f8fbfd] border-t border-slate-100 flex justify-center">
            <Button
              type="button"
              onClick={onSuccessOk}
              className="w-full h-9 rounded-[8px] bg-[#006699] hover:bg-[#005580] text-white font-semibold text-xs shadow-sm"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
