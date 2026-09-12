/**
 * Coerce any API / thrown value into a safe string for toast / JSX.
 * Prevents React #31 when backends return `message` as an object
 * (e.g. `{ code, message, status }`).
 */
export function toErrorMessage(value: unknown, fallback = 'Something went wrong'): string {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') return value.trim() ? value : fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;

    for (const key of ['errorMessage', 'message', 'title', 'detail', 'error'] as const) {
      const nested = o[key];
      if (typeof nested === 'string' && nested.trim()) return nested;
      // Nested object message: { message: { code, message } }
      if (nested && typeof nested === 'object') {
        const inner = toErrorMessage(nested, '');
        if (inner) return inner;
      }
    }

    if (Array.isArray(o.errors) && o.errors.length > 0) {
      const first = o.errors[0] as Record<string, unknown> | string;
      if (typeof first === 'string' && first.trim()) return first;
      if (first && typeof first === 'object') {
        const fromErr =
          (typeof first.errorMessage === 'string' && first.errorMessage) ||
          (typeof first.message === 'string' && first.message);
        if (fromErr) return fromErr;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}
