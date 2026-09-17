import { useCallback, useRef, useState } from 'react';

type ConfirmDeleteState = {
  open: boolean;
  recordName: string | null;
  entityLabel: string;
  confirming: boolean;
};

/**
 * Shared confirm-before-delete flow for MasterDeleteDialog.
 * Call requestConfirm(...) from trash handlers; wire dialog to returned props.
 */
export function useConfirmDelete(defaultEntityLabel = 'record') {
  const [state, setState] = useState<ConfirmDeleteState>({
    open: false,
    recordName: null,
    entityLabel: defaultEntityLabel,
    confirming: false,
  });
  const actionRef = useRef<(() => void | Promise<void>) | null>(null);
  const busyRef = useRef(false);

  const onOpenChange = useCallback((open: boolean) => {
    if (busyRef.current) return;
    if (!open) {
      actionRef.current = null;
      setState((prev) => ({ ...prev, open: false, confirming: false }));
      return;
    }
    setState((prev) => ({ ...prev, open }));
  }, []);

  const requestConfirm = useCallback(
    (opts: {
      onConfirm: () => void | Promise<void>;
      recordName?: string | null;
      entityLabel?: string;
    }) => {
      actionRef.current = opts.onConfirm;
      setState({
        open: true,
        recordName: (opts.recordName || '').trim() || null,
        entityLabel: (opts.entityLabel || defaultEntityLabel).trim() || 'record',
        confirming: false,
      });
    },
    [defaultEntityLabel]
  );

  const handleConfirm = useCallback(async () => {
    if (busyRef.current) return;
    const fn = actionRef.current;
    if (!fn) {
      setState((prev) => ({ ...prev, open: false, confirming: false }));
      return;
    }
    busyRef.current = true;
    setState((prev) => ({ ...prev, confirming: true }));
    try {
      await fn();
      actionRef.current = null;
      setState((prev) => ({ ...prev, open: false, confirming: false }));
    } catch {
      // Keep dialog open so the user can retry or cancel after an API failure.
      setState((prev) => ({ ...prev, confirming: false }));
    } finally {
      busyRef.current = false;
    }
  }, []);

  return {
    open: state.open,
    recordName: state.recordName,
    entityLabel: state.entityLabel,
    confirming: state.confirming,
    onOpenChange,
    requestConfirm,
    handleConfirm,
  };
}
