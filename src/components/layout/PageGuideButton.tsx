import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { forceStartPageGuide } from '@/components/layout/InternalPageGuideTour';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';

type PageGuideButtonProps = {
  /** Force a specific guide; otherwise active modal / route is resolved */
  guideKey?: string;
  className?: string;
  /** Icon-only compact control (toolbars) */
  compact?: boolean;
  title?: string;
};

/** Starts the inner Page Guide for the current screen or forced key */
export function PageGuideButton({
  guideKey,
  className,
  compact = true,
  title = 'Page Guide',
}: PageGuideButtonProps) {
  return (
    <ActionTip label={title}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        aria-label={title}
        data-page-tour="page-guide-btn"
        onClick={() => {
          window.setTimeout(() => forceStartPageGuide(guideKey), 60);
        }}
        className={cn(
          compact
            ? 'h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]'
            : 'h-8 gap-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)] px-2.5',
          className
        )}
      >
        <CircleHelp size={compact ? 15 : 14} strokeWidth={2} />
        {!compact && <span>Guide</span>}
      </Button>
    </ActionTip>
  );
}
