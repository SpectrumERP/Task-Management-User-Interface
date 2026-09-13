/** Task list / deal monitor page-size options */
export const TASK_PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * Only show Per Page sizes that make sense for `total` records:
 * - every size <= total
 * - plus the smallest size that already covers all rows (so user can "show all")
 * Example: total=20 → [10, 25] (hide 50, 100)
 */
export function pageSizesForTotal(
  all: readonly number[],
  total: number
): number[] {
  if (total <= 0) return [...all];

  return all.filter((size, index) => {
    if (size <= total) return true;
    const prev = index > 0 ? all[index - 1]! : 0;
    return prev < total && size > total;
  });
}

/** Pick best page size when current is larger than needed for total. */
export function clampPageSize(
  all: readonly number[],
  total: number,
  current: number
): number {
  const allowed = pageSizesForTotal(all, total);
  if (allowed.length === 0) return current;
  if (allowed.includes(current)) return current;
  // Prefer smallest option that still fits paging (usually 10), else last allowed
  return allowed[0] ?? current;
}
