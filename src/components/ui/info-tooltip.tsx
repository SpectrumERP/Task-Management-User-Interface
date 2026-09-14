import * as React from 'react';
import { Info, Lightbulb } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text?: string;
  className?: string;
}

/**
 * Theme-aware field help tip (hover / focus / click).
 * Portals out of overflow ancestors and flips on collision.
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
            'tm-info-tip-trigger inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
            'bg-[color-mix(in_srgb,var(--tm-tint)_55%,var(--tm-surface))] text-brand',
            'border border-[color-mix(in_srgb,var(--brand)_22%,var(--tm-border))]',
            'shadow-tm-sm',
            'transition-all duration-150',
            'hover:bg-brand hover:text-brand-foreground hover:border-brand',
            'hover:shadow-[0_0_0_3px_var(--tm-glow)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-1 focus-visible:ring-offset-tm-surface',
            'active:scale-95',
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
          sideOffset={10}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={cn(
            'tm-info-tip z-[100] w-[min(300px,calc(100vw-24px))] whitespace-normal break-words',
            'rounded-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] p-0',
            'shadow-[var(--tm-shadow),0_16px_40px_-18px_rgba(15,23,42,0.35)]',
            'pointer-events-auto overflow-visible',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1'
          )}
        >
          <div className="overflow-hidden rounded-xl">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2',
                'border-b border-[var(--tm-border)]',
                'bg-[color-mix(in_srgb,var(--tm-tint)_42%,var(--tm-elevated))]'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-lg',
                  'bg-[color-mix(in_srgb,var(--tm-tint)_70%,var(--tm-surface))]',
                  'border border-[color-mix(in_srgb,var(--brand)_20%,var(--tm-border))]',
                  'text-brand'
                )}
              >
                <Lightbulb size={12} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
                  Tip
                </span>
                <span className="block text-[9px] font-medium text-slate-500 dark:text-slate-400">
                  Field help
                </span>
              </div>
            </div>

            <p className="px-3.5 py-3 text-[12px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {text}
            </p>
          </div>

          {/* Arrow matches panel surface — not hard-coded white */}
          <PopoverPrimitive.Arrow
            width={14}
            height={7}
            className="tm-info-tip-arrow fill-[var(--tm-surface)] drop-shadow-[0_1px_0_var(--tm-border)]"
          />
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
      <div className="absolute z-20" style={{ top: 37, right: 7 }}>
        <InfoTooltip text={info} />
      </div>
      {children}
    </div>
  );
}
