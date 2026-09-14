import React, { useEffect, useRef } from 'react';
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
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { toMasterListPath, MasterType } from './masterRoutes';
import { MasterBreadcrumb } from './MasterBreadcrumb';
import { PageGuideButton } from '@/components/layout/PageGuideButton';

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
  /** Edit-load only — does not change create flow. */
  isLoadingRecord?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
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
  isLoadingRecord = false,
  loadError = false,
  onRetryLoad,
}: MasterFormShellProps) {
  const navigate = useNavigate();
  const goToList = () => navigate(toMasterListPath(type));
  const listPath = toMasterListPath(type);
  const handledSuccessRef = useRef(false);
  const blockSave = isSaving || isLoadingRecord || loadError;

  // Success policy: toast + navigate (same as MeetingForm). Keep showSuccessAlert prop
  // so existing master forms do not need API changes.
  useEffect(() => {
    if (!showSuccessAlert) {
      handledSuccessRef.current = false;
      return;
    }
    if (handledSuccessRef.current) return;
    handledSuccessRef.current = true;
    toast.success('Data saved successfully.');
    onSuccessOk();
  }, [showSuccessAlert, onSuccessOk]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--tm-page)]">
      <div
        className="shrink-0 z-20 bg-[var(--tm-surface)] border-b border-[var(--tm-border)]/70 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]"
        data-page-tour="master-form-breadcrumb"
      >
        <MasterBreadcrumb
          items={[
            { label: 'Masters', href: listPath },
            { label: title, href: listPath },
            { label: editingId ? 'Edit' : 'New', current: true },
          ]}
        />

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto" data-page-tour="master-form-actions">
          <PageGuideButton guideKey={type === 'company' ? 'company-form' : 'master-form'} />
          <Button
            type="button"
            variant="outline"
            onClick={goToList}
            disabled={isSaving}
            className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none gap-1.5 disabled:opacity-40"
          >
            <X size={14} />
            <span className="hidden sm:inline">Cancel</span>
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={blockSave}
            className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm shadow-[#0EA5E9]/20 gap-1.5 disabled:opacity-50"
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
        data-page-tour="master-form-fields"
      >
        {isLoadingRecord ? (
          <div className="flex items-center justify-center py-16 min-h-[220px]">
            <BrandLoader size="sm" message="Loading record" />
          </div>
        ) : loadError ? (
          <LoadErrorState
            title="Failed to load record"
            description="Could not load this record for editing. Retry uses the same request. Cancel returns to the list."
            onRetry={onRetryLoad}
          />
        ) : (
          children
        )}

        {serverError && !isLoadingRecord && !loadError ? (
          <div className="rounded-[8px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400 flex items-start gap-2">
            <span className="font-semibold shrink-0">Error:</span>
            <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
          </div>
        ) : null}
      </form>

      <Dialog open={showConfirm} onOpenChange={(open) => { if (!open) onCancelConfirm(); }}>
        <DialogContent className="rounded-[12px] max-w-sm p-0 border border-[var(--tm-border)]/80 shadow-xl">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight">
              Confirm Save
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1.5">
              Are you sure you want to save these changes?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-[var(--tm-elevated)] flex justify-end gap-2 rounded-b-[12px] border-t border-[var(--tm-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={onCancelConfirm}
              className="h-9 rounded-[8px] text-xs font-medium border-[var(--tm-border)] shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              autoFocus
              onClick={onConfirmSave}
              className="h-9 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
