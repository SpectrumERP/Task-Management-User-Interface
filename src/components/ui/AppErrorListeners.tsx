import { useEffect } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/services/apiService';

const TOAST_ID = 'app-unhandled-error';

function messageFromReason(reason: unknown): string {
  if (reason instanceof ApiError) return reason.message || 'Request failed';
  if (reason instanceof Error) return reason.message || 'Unexpected error';
  if (typeof reason === 'string' && reason.trim()) return reason;
  return 'An unexpected error occurred';
}

/**
 * App-level listeners for uncaught errors / promise rejections.
 * UX only — does not alter API contracts or retry business flows.
 * Skips ApiError (apiService already toasts those).
 */
export function AppErrorListeners() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      // apiService already surfaced HTTP/network errors to the user
      if (reason instanceof ApiError) return;
      if (reason?.name === 'AbortError') return;

      console.error('Unhandled promise rejection:', reason);
      toast.error(messageFromReason(reason), {
        id: TOAST_ID,
        description: 'The app caught an unexpected error. You can continue working or reload if things look wrong.',
      });
    };

    const onWindowError = (event: ErrorEvent) => {
      // Resource load errors (script/img) — avoid noisy toasts for missing assets
      if (event.target && event.target !== window) return;

      const err = event.error;
      if (err instanceof ApiError) return;

      console.error('Unhandled window error:', event.error || event.message);
      toast.error(event.message || 'An unexpected error occurred', {
        id: TOAST_ID,
        description: 'The app caught an unexpected error. You can continue working or reload if things look wrong.',
      });
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, []);

  return null;
}
