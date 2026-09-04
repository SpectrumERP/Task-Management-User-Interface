import * as React from 'react';
import { Info } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text?: string;
  className?: string;
}

/**
 * Hover-triggered field help tip.
 * Portals out of overflow/whitespace ancestors and flips on collision.
 */
export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 0) {
        setContainer(dialogs[dialogs.length - 1] as HTMLElement);
      } else {
        setContainer(null);
      }
    }
  }, [open]);

  if (!text) return null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Field information"
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]',
            'bg-[#e8f3f8] text-[#006699] ring-1 ring-[#006699]/15',
            'transition-all hover:bg-[#006699] hover:text-white hover:ring-[#006699]/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006699]/35',
            className
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <Info size={13} strokeWidth={2.25} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal container={container || document.body}>
        <PopoverPrimitive.Content
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={cn(
            'z-[100] w-[min(280px,calc(100vw-24px))] whitespace-normal break-words',
            'rounded-[8px] border border-slate-200/80 bg-white p-0',
            'shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]',
            'pointer-events-auto',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex items-center gap-1.5 border-b border-slate-100 bg-[#f8fbfd] px-3 py-1.5 rounded-t-[8px]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#e8f3f8] text-[#006699]">
              <Info size={11} strokeWidth={2.25} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#006699]/80">
              Tip
            </span>
          </div>
          <p className="px-3 py-2.5 text-[11px] font-medium leading-relaxed text-slate-600">
            {text}
          </p>
          <PopoverPrimitive.Arrow className="fill-white drop-shadow-sm" width={12} height={6} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * Places help icon above the control at top-right (top: 37px, right: 7px).
 */
export function FieldInfoControl({
  info,
  children,
  className,
  id,
}: {
  info?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  if (!info) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div id={id} className={cn('relative', className)}>
      <div
        className="absolute z-20"
        style={{ top: 37, right: 7 }}
      >
        <InfoTooltip text={info} />
      </div>
      {children}
    </div>
  );
}
