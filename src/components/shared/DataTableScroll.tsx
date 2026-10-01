import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type UIEvent,
} from 'react';
import { cn } from '@/lib/utils';

interface DataTableScrollProps {
  /** Header table (thead only) — fixed above data; no vertical scrollbar beside it */
  header: ReactNode;
  /** Body table (tbody only) — vertical scrollbar lives only here */
  body: ReactNode;
  /** Optional mobile / non-table content shown instead on small screens */
  mobile?: ReactNode;
  className?: string;
  /** Min width applied so header + body columns stay aligned */
  minWidth?: number | string;
  'data-page-tour'?: string;
  /** Ref to the body scroll viewport (vertical + horizontal) */
  bodyScrollRef?: Ref<HTMLDivElement | null>;
  /** Fired when the body scroll is near the bottom */
  onNearEnd?: () => void;
  /** Distance from bottom (px) that counts as “near end”. Default 160 */
  nearEndOffsetPx?: number;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
}

/**
 * Header stays fixed (no vertical scrollbar beside columns).
 * Body scrolls vertically + horizontally; header scrollLeft mirrors body (one-way).
 * A scrollbar-width spacer keeps header columns aligned with the body.
 */
export function DataTableScroll({
  header,
  body,
  mobile,
  className,
  minWidth,
  'data-page-tour': dataPageTour,
  bodyScrollRef,
  onNearEnd,
  nearEndOffsetPx = 160,
}: DataTableScrollProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerPortRef = useRef<HTMLDivElement>(null);
  const bodyPortRef = useRef<HTMLDivElement>(null);
  const [scrollbarW, setScrollbarW] = useState(0);

  const syncHorizontalEdges = useCallback((el: HTMLDivElement) => {
    const root = rootRef.current;
    if (!root) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft > 1 ? '1' : '0';
    const right = maxScroll > 1 && el.scrollLeft < maxScroll - 1 ? '1' : '0';
    if (root.getAttribute('data-tm-scroll-left') !== left) {
      root.setAttribute('data-tm-scroll-left', left);
    }
    if (root.getAttribute('data-tm-scroll-right') !== right) {
      root.setAttribute('data-tm-scroll-right', right);
    }
  }, []);

  const maybeNearEnd = useCallback(
    (el: HTMLDivElement) => {
      if (!onNearEnd) return;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining <= nearEndOffsetPx) onNearEnd();
    },
    [onNearEnd, nearEndOffsetPx]
  );

  const measureScrollbar = useCallback(() => {
    const el = bodyPortRef.current;
    if (!el) return;
    const w = Math.max(0, el.offsetWidth - el.clientWidth);
    setScrollbarW((prev) => (prev === w ? prev : w));
  }, []);

  const handleBodyScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const headerPort = headerPortRef.current;
      if (headerPort && headerPort.scrollLeft !== el.scrollLeft) {
        headerPort.scrollLeft = el.scrollLeft;
      }
      syncHorizontalEdges(el);
      maybeNearEnd(el);
    },
    [syncHorizontalEdges, maybeNearEnd]
  );

  useLayoutEffect(() => {
    const el = bodyPortRef.current;
    if (!el) return;
    const run = () => {
      measureScrollbar();
      syncHorizontalEdges(el);
      const headerPort = headerPortRef.current;
      if (headerPort && headerPort.scrollLeft !== el.scrollLeft) {
        headerPort.scrollLeft = el.scrollLeft;
      }
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener('resize', run);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [measureScrollbar, syncHorizontalEdges, header, body, minWidth]);

  const setBodyNode = useCallback(
    (el: HTMLDivElement | null) => {
      bodyPortRef.current = el;
      assignRef(bodyScrollRef, el);
    },
    [bodyScrollRef]
  );

  const widthStyle = minWidth != null ? { minWidth } : undefined;

  return (
    <div
      ref={rootRef}
      data-page-tour={dataPageTour}
      data-tm-scroll-left="0"
      data-tm-scroll-right="0"
      className={cn('tm-data-table-scroll flex flex-1 flex-col min-h-0 overflow-hidden', className)}
    >
      {mobile ? <div className="md:hidden flex-1 min-h-0 overflow-auto">{mobile}</div> : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          mobile ? 'hidden md:flex' : undefined
        )}
      >
        {/* Header — no vertical scrollbar; spacer matches body scrollbar width */}
        <div className="tm-data-table-scroll-header flex shrink-0 bg-[var(--tm-elevated)]">
          <div
            ref={headerPortRef}
            className="min-w-0 flex-1 overflow-x-hidden overflow-y-hidden"
          >
            <div style={widthStyle} className="w-full">
              {header}
            </div>
          </div>
          {scrollbarW > 0 ? (
            <div
              aria-hidden
              className="shrink-0 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]"
              style={{ width: scrollbarW }}
            />
          ) : null}
        </div>

        {/* Body — vertical (+ horizontal) scrollbar only here */}
        <div
          ref={setBodyNode}
          className="min-h-0 flex-1 overflow-auto box-border"
          onScroll={handleBodyScroll}
        >
          <div style={widthStyle} className="w-full">
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}
