import { ApiError } from '@/services/apiService';
import { toErrorMessage } from '@/lib/toErrorMessage';

export { toErrorMessage };

/** User-facing message helper. Does not change API behavior. */
export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return toErrorMessage(error.message, toErrorMessage(error.data, fallback));
  }
  if (error instanceof Error) return toErrorMessage(error.message, fallback);
  if (typeof error === 'string' && error.trim()) return error;
  return toErrorMessage(error, fallback);
}

/**
 * apiService already toasts HTTP ApiErrors. Use this for catch blocks so we
 * don't double-toast, but still cover network/unexpected errors.
 */
export function shouldToastCaughtError(error: unknown): boolean {
  return !(error instanceof ApiError);
}
