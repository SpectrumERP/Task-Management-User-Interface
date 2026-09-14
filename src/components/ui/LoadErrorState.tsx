import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LoadErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/** Empty ≠ error: show a clear load failure with optional retry (same fetch again). */
export function LoadErrorState({
  title = 'Failed to load',
  description = 'Something went wrong while loading data. You can retry without losing your place.',
  onRetry,
  className,
  compact = false,
}: LoadErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8 min-h-[160px]' : 'px-6 py-12 min-h-[220px]',
        className
      )}
    >
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
        <AlertTriangle size={20} strokeWidth={2.25} />
      </span>
      <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-[11px] font-medium text-slate-400 leading-relaxed">{description}</p>
      {onRetry ? (
        <Button
          type="button"
          onClick={onRetry}
          className="mt-4 h-9 px-4 rounded-lg bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-semibold gap-1.5"
        >
          <RefreshCw size={14} strokeWidth={2.25} />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
