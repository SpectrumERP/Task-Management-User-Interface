/**
 * Shared form-control chrome — single source for inputs, selects, comboboxes.
 * Prefer semantic tokens (tm / brand) over hardcoded hex.
 */

/** Body text inside controls */
export const FIELD_TEXT_STYLE =
  'text-sm text-tm-input-fg placeholder:text-tm-placeholder placeholder:font-medium';

/** Dense master-form text (optional size) */
export const FIELD_TEXT_STYLE_SM =
  'text-xs text-tm-input-fg placeholder:text-tm-placeholder placeholder:font-medium';

export const CONTROL_BORDER = 'border-tm-border';
export const CONTROL_RADIUS = 'rounded-md';

/** Default control height = md (40px / h-10). Use FIELD_CONTROL_CLASS_SM for denser forms. */
export const FIELD_CONTROL_CLASS =
  'h-10 w-full rounded-md border border-tm-border bg-tm-surface text-xs font-medium text-tm-input-fg shadow-tm-control focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand';

export const FIELD_CONTROL_CLASS_SM =
  'h-9 w-full rounded-md border border-tm-border bg-tm-surface text-xs font-medium text-tm-input-fg shadow-tm-control focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand';
