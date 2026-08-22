import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronRight, X, Loader2, Save, CheckCircle } from 'lucide-react';
import { toMasterListPath, MasterType } from './masterRoutes';

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      {/* Breadcrumb Header */}
      <div className="flex items-start shrink-0 mb-0 px-1 justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button onClick={goToList} className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded">Masters</button>
          <ChevronRight size={16} className="text-slate-400" />
          <button onClick={goToList} className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded">{title}</button>
          <ChevronRight size={16} className="text-slate-400" />
          <span className="text-slate-900 font-bold tracking-tight">{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={goToList}
            className="rounded-xl h-9 px-3 sm:px-5 font-medium text-slate-600 hover:bg-slate-100 transition-colors gap-0.5 text-xs flex items-center"
          >
            <X size={16} />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-xl h-9 px-3 sm:px-6 bg-[#006699] hover:bg-[#005580] font-medium text-white shadow-lg shadow-[#006699]/20 gap-0.5 transition-all hover:scale-105 active:scale-95 text-xs disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {editingId ? 'Update' : 'Save'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Master Form Card */}
      <Card className="flex-1 rounded-[28px] border-none shadow-xl shadow-slate-200/40 bg-white flex flex-col p-0 outline-none overflow-hidden max-w-6xl w-full mx-auto">

        {/* Form Content Area */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          {children}
        </form>

        {serverError && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-0.5 shadow-sm animate-pulse shrink-0">
            <span className="font-medium select-none">⚠️ Error:</span>
            <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
          </div>
        )}

      </Card>

      {/* Save/Update Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={(open) => { if (!open) onCancelConfirm(); }}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
              Confirm Save
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Are you sure you want to save these changes?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button variant="ghost" onClick={onCancelConfirm} className="rounded-xl h-9 text-xs font-medium text-slate-500 hover:bg-slate-100">
              No, Cancel
            </Button>
            <Button onClick={onConfirmSave} className="rounded-xl h-9 text-xs font-medium bg-[#006699] hover:bg-[#005580] text-white shadow-md">
              Yes, Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Alert Dialog */}
      <Dialog open={showSuccessAlert} onOpenChange={() => {}}>
        <DialogContent className="rounded-3xl max-w-xs p-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full border border-emerald-100/80 flex items-center justify-center mb-4 shadow-sm relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
              <CheckCircle className="w-7 h-7 text-emerald-600 relative z-10" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 tracking-tight mb-1">Success</h3>
            <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">Data saved successfully.</p>
          </div>
          <div className="p-4 bg-slate-50/80 border-t border-slate-100/50 flex justify-center">
            <Button
              type="button"
              onClick={onSuccessOk}
              className="w-full h-10 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs normal-case shadow-md shadow-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
