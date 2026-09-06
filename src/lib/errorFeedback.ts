import { ApiError } from '@/services/apiService';

/** User-facing message helper. Does not change API behavior. */
export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

/**
 * apiService already toasts HTTP ApiErrors. Use this for catch blocks so we
 * don't double-toast, but still cover network/unexpected errors.
 */
export function shouldToastCaughtError(error: unknown): boolean {
  return !(error instanceof ApiError);
}
