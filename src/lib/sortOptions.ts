/**
 * Shared A–Z sorting for dropdown / combobox option lists.
 * Use for names, categories, locations, entities, etc.
 * Skip (pass sortAlphabetically={false}) for workflow, rank, frequency, chronology, or fixed UX order.
 */

const DEFAULT_PIN_VALUES = new Set(['', 'none', 'null', '__none__']);

export function compareAlphaLabels(a: string | null | undefined, b: string | null | undefined): number {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

export type SortByLabelOptions<T> = {
  /** Values kept at the top in given order (e.g. "none" for No Parent). */
  pinValues?: string[];
  getLabel?: (item: T) => string;
  getValue?: (item: T) => string;
  /** When false, return a shallow copy in original order. Default true. */
  enabled?: boolean;
};

/**
 * Sort items A–Z by label. Optional pinValues stay first (useful for sentinel options).
 */
export function sortByLabel<T>(items: readonly T[], opts?: SortByLabelOptions<T>): T[] {
  const list = [...items];
  if (opts?.enabled === false) return list;

  const getLabel = opts?.getLabel ?? ((item: T) => String((item as { label?: unknown }).label ?? ''));
  const getValue = opts?.getValue ?? ((item: T) => String((item as { value?: unknown }).value ?? ''));
  const pinOrder = opts?.pinValues ?? [];
  const pinSet = new Set(
    pinOrder.length > 0 ? pinOrder : [...DEFAULT_PIN_VALUES]
  );

  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of list) {
    if (pinSet.has(getValue(item))) pinned.push(item);
    else rest.push(item);
  }

  if (pinOrder.length > 0) {
    pinned.sort((a, b) => pinOrder.indexOf(getValue(a)) - pinOrder.indexOf(getValue(b)));
  }

  rest.sort((a, b) => compareAlphaLabels(getLabel(a), getLabel(b)));
  return [...pinned, ...rest];
}
