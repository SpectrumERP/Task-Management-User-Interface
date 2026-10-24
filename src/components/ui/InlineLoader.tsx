import { cn } from '@/lib/utils';

interface InlineLoaderProps {
  /** Diameter in px (default 14). */
  size?: number;
  className?: string;
  /** Accessible status text. */
  label?: string;
}

/**
 * A small spinning ring for an action under way — in buttons, inputs and list rows (saving, uploading, searching).
 * Content still on its way shows a skeleton instead (components/ui/skeleton.tsx). Takes the text colour (top arc)
 * with a red accent, so it reads on light and filled buttons.
 */
export function InlineLoader({ size = 14, className, label = 'Loading' }: InlineLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-spinner inline-block shrink-0 rounded-full align-[-0.125em]', className)}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 7)) }}
    />
  );
}
