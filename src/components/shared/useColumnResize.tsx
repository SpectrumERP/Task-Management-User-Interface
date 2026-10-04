import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/lib/utils';

const MIN_COLUMN_WIDTH_PX = 60;

/**
 * Drag-to-resize column widths (px), keyed by column id.
 * Widths start from the header cell's rendered width, so the first drag never jumps.
 */
export function useColumnResize(minWidth = MIN_COLUMN_WIDTH_PX) {
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const startResize = useCallback(
    (e: ReactMouseEvent, colKey: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.pageX;
      const startWidth =
        (e.currentTarget as HTMLElement).closest('th')?.getBoundingClientRect().width ?? 120;
      let moved = false;

      const { cursor, userSelect } = document.body.style;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMove = (ev: MouseEvent) => {
        moved = true;
        const width = Math.max(minWidth, Math.round(startWidth + ev.pageX - startX));
        setColWidths((prev) => (prev[colKey] === width ? prev : { ...prev, [colKey]: width }));
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.body.style.cursor = cursor;
        document.body.style.userSelect = userSelect;
        if (!moved) return;
        // Releasing over the header fires a click that would otherwise re-sort the column.
        const swallowClick = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', swallowClick, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [minWidth]
  );

  const resetColumn = useCallback((colKey: string) => {
    setColWidths((prev) => {
      if (!(colKey in prev)) return prev;
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
  }, []);

  const widthOf = useCallback(
    (colKey: string, fallback: number) => colWidths[colKey] ?? fallback,
    [colWidths]
  );

  /** Handle for a positioned `<th>` — drag resizes, double-click resets. */
  const resizeHandle = (colKey: string) => (
    <ColumnResizeHandle onResizeStart={(e) => startResize(e, colKey)} onReset={() => resetColumn(colKey)} />
  );

  return { colWidths, widthOf, startResize, resetColumn, resizeHandle };
}

/**
 * Drag handle on a header cell's right edge (the `<th>` must be positioned).
 * Double-click restores the column's default width.
 */
export function ColumnResizeHandle({
  onResizeStart,
  onReset,
  className,
}: {
  onResizeStart: (e: ReactMouseEvent) => void;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <span
      data-col-resize
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      title="Drag to resize · double-click to reset"
      onMouseDown={onResizeStart}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onReset?.();
      }}
      className={cn(
        'absolute right-0 top-0 z-[2] h-full w-1.5 cursor-col-resize select-none transition-colors',
        'hover:bg-[#0EA5E9]/40 active:bg-[#0EA5E9]/60',
        className
      )}
    />
  );
}
