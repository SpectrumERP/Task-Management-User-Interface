import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

function HoverTipBubble({
  text,
  top,
  anchorLeft,
  anchorTop,
  singleLine = false,
  align = 'center',
  side = 'top',
}: {
  text: string;
  top: number;
  /** Trigger center X — arrow stays aimed here when side=top. */
  anchorLeft: number;
  /** Trigger vertical center — used when side=right. */
  anchorTop?: number;
  singleLine?: boolean;
  /** tip alignment relative to anchor (top side only). */
  align?: 'center' | 'start' | 'end';
  side?: 'top' | 'right';
}) {
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ left: anchorLeft, top, arrowLeft: 0, arrowTop: 0 });

  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const margin = 12;

    if (side === 'right') {
      const left = Math.min(
        anchorLeft + 10,
        Math.max(margin, window.innerWidth - width - margin)
      );
      let tipTop = (anchorTop ?? top) - height / 2;
      tipTop = Math.min(Math.max(tipTop, margin), Math.max(margin, window.innerHeight - height - margin));
      const arrowTop = Math.min(
        Math.max((anchorTop ?? top) - tipTop, 12),
        Math.max(12, height - 12)
      );
      setBox({ left, top: tipTop, arrowLeft: 0, arrowTop });
      return;
    }

    let left =
      align === 'end'
        ? anchorLeft - width + 16
        : align === 'start'
          ? anchorLeft - 16
          : anchorLeft - width / 2;
    left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - width - margin));
    const arrowLeft = Math.min(Math.max(anchorLeft - left, 14), Math.max(14, width - 14));
    setBox({ left, top, arrowLeft, arrowTop: 0 });
  }, [anchorLeft, anchorTop, top, text, singleLine, align, side]);

  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      className={cn(
        'pointer-events-none fixed z-[300]',
        singleLine ? 'w-max max-w-[calc(100vw-1.5rem)]' : 'max-w-[min(22rem,calc(100vw-1.5rem))]',
        side === 'top' && '-translate-y-full',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
      style={{ top: box.top, left: box.left }}
    >
      <div className="relative filter drop-shadow-[0_10px_24px_rgba(15,23,42,0.28)]">
        <div
          className={cn(
            'rounded-xl border border-[#0EA5E9]/40',
            'bg-[var(--tm-surface)] text-slate-100',
            'px-3 py-2'
          )}
        >
          <p
            className={cn(
              'text-[11px] font-medium leading-relaxed',
              singleLine ? 'whitespace-nowrap text-center' : 'whitespace-pre-line break-words text-left'
            )}
          >
            {text}
          </p>
        </div>
        {side === 'right' ? (
          <span
            aria-hidden
            className="absolute left-0 flex items-center leading-none"
            style={{ top: box.arrowTop, transform: 'translate(-100%, -50%)' }}
          >
            <span className="relative block h-0 w-0 border-y-[7px] border-r-[7px] border-y-transparent border-r-[#0EA5E9]/45" />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 -mr-px block h-0 w-0 border-y-[6px] border-r-[6px] border-y-transparent border-r-[var(--tm-surface)]" />
          </span>
        ) : (
          <span
            aria-hidden
            className="absolute top-full -mt-px flex flex-col items-center leading-none"
            style={{ left: box.arrowLeft, transform: 'translateX(-50%)' }}
          >
            <span className="relative block h-0 w-0 border-x-[7px] border-t-[7px] border-x-transparent border-t-[#0EA5E9]/45" />
            <span className="absolute left-1/2 top-0 -translate-x-1/2 -mt-[1px] block h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-[var(--tm-surface)]" />
          </span>
        )}
      </div>
    </div>,
    document.body
  );
}

function useHoverTipPosition() {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, midY: 0, right: 0 });

  const showAt = (el: HTMLElement | null, enabled = true) => {
    if (!el || !enabled) {
      setOpen(false);
      return;
    }
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
      midY: rect.top + rect.height / 2,
      right: rect.right,
    });
    setOpen(true);
  };

  const hide = () => setOpen(false);

  return { ref, open, coords, showAt, hide, setOpen };
}

/** Always shows label tip on hover (for action icons). */
export function ActionTip({
  label,
  children,
  multiline = false,
  align = 'center',
  side = 'top',
}: {
  label: string;
  children: ReactNode;
  /** Allow wrapped / multi-line tip text (e.g. profile details). */
  multiline?: boolean;
  /** Horizontal alignment when side=top. */
  align?: 'center' | 'start' | 'end';
  /** Prefer side=right for left-edge icons (e.g. collapsed sidebar). */
  side?: 'top' | 'right';
}) {
  const { ref, open, coords, showAt, hide } = useHoverTipPosition();

  return (
    <>
      <span
        ref={ref}
        className="inline-flex"
        onMouseEnter={() => showAt(ref.current, Boolean(label))}
        onMouseLeave={hide}
        onFocus={() => showAt(ref.current, Boolean(label))}
        onBlur={hide}
      >
        {children}
      </span>
      {open && label ? (
        <HoverTipBubble
          text={label}
          top={coords.top}
          anchorLeft={side === 'right' ? coords.right : coords.left}
          anchorTop={coords.midY}
          singleLine={!multiline}
          align={align}
          side={side}
        />
      ) : null}
    </>
  );
}

let measureCtx: CanvasRenderingContext2D | null = null;

function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return 0;
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/** True when visible text is clipped with "...". */
function isContentTruncated(el: HTMLElement): boolean {
  if (el.scrollWidth > el.clientWidth + 0.5) return true;

  const text = el.textContent ?? '';
  if (!text) return false;

  // table-fixed / max-w-0 cells can report equal scroll/client widths even when CSS ellipsis shows
  const style = window.getComputedStyle(el);
  const font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ]
    .filter(Boolean)
    .join(' ');
  return measureTextWidth(text, font) > el.clientWidth + 1;
}

/** Truncated cell text — tooltip only when content overflows with "...". */
export function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { ref, open, coords, showAt, hide, setOpen } = useHoverTipPosition();

  const placeTip = () => {
    const el = ref.current;
    if (!el || !text || text === '-') {
      hide();
      return;
    }
    if (!isContentTruncated(el)) {
      hide();
      return;
    }
    showAt(el, true);
  };

  useLayoutEffect(() => {
    setOpen(false);
  }, [text, setOpen]);

  return (
    <>
      <span
        ref={ref}
        className={cn('block w-full min-w-0 max-w-full truncate whitespace-nowrap', className)}
        onMouseEnter={placeTip}
        onMouseLeave={hide}
        onFocus={placeTip}
        onBlur={hide}
      >
        {text}
      </span>
      {open && text ? <HoverTipBubble text={text} top={coords.top} anchorLeft={coords.left} singleLine /> : null}
    </>
  );
}

/** Convert simple React nodes to plain text for truncation tips. */
export function nodeToPlainText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToPlainText).join('');
  if (typeof node === 'object' && 'props' in (node as object)) {
    const el = node as { props?: { children?: ReactNode } };
    return nodeToPlainText(el.props?.children);
  }
  return '';
}
