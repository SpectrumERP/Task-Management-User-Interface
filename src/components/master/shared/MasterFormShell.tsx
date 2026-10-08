import React, { useEffect, useId, useRef } from 'react';
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
import { toast } from 'sonner';
import { BrandLoader, InlineLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { toMasterListPath, MasterType } from './masterRoutes';
import { masterNavLabel } from './masterLabels';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';

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
  const handledSuccessRef = useRef(false);
  const blockSave = isSaving || isLoadingRecord || loadError;
  const formId = useId();

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

  // Cancel / Save sit in the breadcrumb bar (as on the Meeting form); Save submits the form below by id.
  const actions = (
    <div className="flex items-center gap-2" data-page-tour="master-form-actions">
      <Button
        type="button"
        variant="outline"
        onClick={goToList}
        disabled={isSaving}
        className="h-9 px-4 rounded-[7px] text-[13px] font-semibold border-[#E2E8F0] bg-white text-[#7a8494] hover:bg-[#F1F5F9] shadow-none disabled:opacity-40 dark:border-[var(--tm-border)] dark:bg-[var(--tm-surface)] dark:text-slate-300"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        disabled={blockSave}
        className="h-9 px-4 rounded-[7px] text-[13px] font-semibold bg-[#1E56A0] hover:bg-[#17457F] text-white gap-1.5 disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <InlineLoader size={14} />
            Saving…
          </>
        ) : editingId ? (
          'Save Changes'
        ) : (
          `Save ${title.replace(/ Master$/, '')}`
        )}
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--tm-page)]">
      {/* Breadcrumb bar with Cancel / Save on top (stays in view); title and sections scroll below. */}
      <AppBreadcrumbBar
        className="sticky top-0 z-30"
        items={[
          { label: masterNavLabel(type, title), href: toMasterListPath(type) },
          { label: editingId ? 'Edit' : 'New', current: true },
        ]}
        guideKey={type === 'company' ? 'company-form' : 'master-form'}
        actions={actions}
      />
      <form
        id={formId}
        onSubmit={onSubmit}
        className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
        data-page-tour="master-form-fields"
      >
        <div className="mb-5 flex items-start justify-between gap-3" data-page-tour="master-form-breadcrumb">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#0c1a3a] dark:text-slate-50">
              {editingId ? `Edit ${title}` : `New ${title}`}
            </h1>
            <p className="mt-0.5 text-xs text-[#7a8494]">
              {editingId ? `Editing record ${editingId}` : `Add a new record to ${title}`}
            </p>
          </div>
        </div>

        <div className="space-y-5">
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
            <div className="rounded-[7px] border border-[#c41e1e]/25 bg-[#fff0f0] px-4 py-3 text-xs font-medium text-[#c41e1e] flex items-start gap-2 dark:bg-red-500/10 dark:text-red-400">
              <span className="font-bold shrink-0">Error:</span>
              <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
            </div>
          ) : null}

        </div>
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
