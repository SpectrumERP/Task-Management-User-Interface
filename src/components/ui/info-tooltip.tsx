import * as React from 'react';
import { Info } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text?: string;
  className?: string;
}

// Hover-triggered info popup, e.g. next to a field label/input. Renders nothing if no text is configured.
// Built on Radix Popover (not a plain CSS box) so it portals out of any ancestor `whitespace-nowrap`
// (e.g. a button trigger) and gets real viewport-collision handling (auto flip/shift to stay on-screen).
export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setContainer(document.querySelector('[role="dialog"]') as HTMLElement);
    }
  }, [open]);

  if (!text) return null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <span
          className={cn('inline-flex shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-[#006699]', className)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-4.5 w-4.5" />
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal container={container || document.body}>
        <PopoverPrimitive.Content
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-[100] w-64 whitespace-normal break-words rounded-lg border border-slate-200 bg-popover p-3 text-[11px] font-normal normal-case leading-relaxed text-popover-foreground pointer-events-none shadow-lg shadow-slate-900/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {text}
          <PopoverPrimitive.Arrow className="fill-popover" width={14} height={7} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
