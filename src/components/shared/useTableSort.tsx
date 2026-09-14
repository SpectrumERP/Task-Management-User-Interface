import { useMemo, useState, type MouseEvent } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { looksLikeDateValue, toUtcIso, toUtcMs } from '@/lib/dateTime';

export type TableSortState = {
  sortCol: string | null;
  sortDesc: boolean;
};

function toComparable(value: unknown): { blank: boolean; num: number | null; str: string } {
  if (value == null || value === '') {
    return { blank: true, num: null, str: '' };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { blank: false, num: value, str: String(value) };
  }
  if (value instanceof Date) {
    const t = toUtcMs(value);
    if (t != null) return { blank: false, num: t, str: toUtcIso(value) || '' };
    return { blank: true, num: null, str: '' };
  }

  const str = String(value).trim();
  if (!str) return { blank: true, num: null, str: '' };

  // Prefer UTC epoch for date-like values so chronological sort is timezone-safe
  if (looksLikeDateValue(str)) {
    const parsed = toUtcMs(str);
    if (parsed != null) {
      return { blank: false, num: parsed, str: toUtcIso(str) || str };
    }
  }

  const asNum = Number(str);
  if (str !== '' && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(str)) {
    return { blank: false, num: asNum, str };
  }

  return { blank: false, num: null, str };
}

export function compareSortValues(a: unknown, b: unknown, desc: boolean): number {
  const valA = toComparable(a);
  const valB = toComparable(b);

  // Blank values always sink to the bottom
  if (valA.blank && valB.blank) return 0;
  if (valA.blank) return 1;
  if (valB.blank) return -1;

  if (valA.num != null && valB.num != null) {
    return desc ? valB.num - valA.num : valA.num - valB.num;
  }

  const cmp = valA.str.localeCompare(valB.str, undefined, { numeric: true, sensitivity: 'base' });
  return desc ? -cmp : cmp;
}

export function useTableSort<T>(
  rows: T[],
  getValue: (row: T, key: string) => unknown,
  options?: { defaultKey?: string | null; defaultDesc?: boolean }
) {
  const [sortCol, setSortCol] = useState<string | null>(
    options?.defaultKey === undefined ? 'name' : options.defaultKey
  );
  const [sortDesc, setSortDesc] = useState(Boolean(options?.defaultDesc));

  const handleSort = (colKey: string) => {
    // Toggle asc ↔ desc on the active column. Never clear on click —
    // clearing broke UX when defaultDesc was already true (first click
    // looked like a no-op because API order often matched desc).
    if (sortCol === colKey) {
      setSortDesc((d) => !d);
      return;
    }
    setSortCol(colKey);
    // Timestamp / audit columns: first click = newest first.
    // Due / start schedule targets stay ascending (soonest first).
    const newestFirst =
      /(created|updated|completion|logDate|meetingStart|schedule|timestamp|sentAt)/i.test(colKey) &&
      !/(dueDate|end_date|start_date|^due$)/i.test(colKey);
    setSortDesc(newestFirst);
  };

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) =>
      compareSortValues(getValue(a, sortCol), getValue(b, sortCol), sortDesc)
    );
  }, [rows, sortCol, sortDesc, getValue]);

  return { sortCol, sortDesc, handleSort, sortedRows };
}

/** Paginate first (stable source order), then sort only the current page's rows. */
export function usePagedTableSort<T>(
  rows: T[],
  getValue: (row: T, key: string) => unknown,
  options: {
    defaultKey?: string | null;
    defaultDesc?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / options.pageSize) || 1);
  const safePage = Math.min(Math.max(1, options.page), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * options.pageSize;
  const endIndex = Math.min(startIndex + options.pageSize, totalItems);

  const pageSlice = useMemo(
    () => rows.slice(startIndex, endIndex),
    [rows, startIndex, endIndex]
  );

  const { sortCol, sortDesc, handleSort, sortedRows } = useTableSort(pageSlice, getValue, {
    defaultKey: options.defaultKey,
    defaultDesc: options.defaultDesc,
  });

  return {
    sortCol,
    sortDesc,
    handleSort,
    pageRows: sortedRows,
    totalItems,
    totalPages,
    safePage,
    startIndex,
    endIndex,
  };
}

export function SortableHeader({
  label,
  sortKey,
  sortCol,
  sortDesc,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  sortCol: string | null;
  sortDesc: boolean;
  onSort: (k: string) => void;
  className?: string;
}) {
  const isActive = sortCol === sortKey;
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-[1.75rem] w-full max-w-full items-center gap-1 cursor-pointer select-none text-inherit',
        'hover:text-[#0EA5E9] transition-colors group/header bg-transparent border-0 p-0 font-inherit',
        'focus-visible:outline-none focus-visible:text-[#0EA5E9]',
        // Above zebra cells; below resize handle (z-[2]) so drag still works on the edge.
        'relative z-[1] pointer-events-auto',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSort(sortKey);
      }}
      onMouseDown={(e) => {
        // Keep header clicks from starting accidental column-resize drags.
        e.stopPropagation();
      }}
      aria-label={`Sort by ${label}`}
      aria-sort={isActive ? (sortDesc ? 'descending' : 'ascending') : 'none'}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={cn(
          'flex flex-col shrink-0 text-current transition-opacity',
          isActive ? 'opacity-100 text-[#0EA5E9]' : 'opacity-40 group-hover/header:opacity-100'
        )}
      >
        <ChevronUp
          size={10}
          className={cn('-mb-1', isActive && !sortDesc && 'text-[#0EA5E9]')}
        />
        <ChevronDown
          size={10}
          className={cn(isActive && sortDesc && 'text-[#0EA5E9]')}
        />
      </span>
    </button>
  );
}

/** Use on `<th>` so padding clicks sort too; skips resize handle. Button already stopPropagates. */
export function sortHeaderCellProps(
  sortKey: string,
  onSort: (k: string) => void
): { onClick: (e: MouseEvent) => void } {
  return {
    onClick: (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-col-resize]')) return;
      onSort(sortKey);
    },
  };
}
