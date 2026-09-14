import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared form field primitives — visual match to existing master/task/meeting forms.
 * Do not restyle without checking all usages.
 */

export function FieldErrorTip({
  message,
  className,
  id,
}: {
  message?: string;
  /** Override position/size when a screen has a documented exception (e.g. ReportFilter top offset). */
  className?: string;
  id?: string;
}) {
  if (!message) return null;
  return (
    <span
      id={id}
      role="alert"
      className={cn(
        'pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right',
        className
      )}
    >
      {message}
    </span>
  );
}

export function FieldControl({
  children,
  error,
  className,
  tipClassName,
  errorId,
}: {
  children: ReactNode;
  error?: string;
  className?: string;
  /** Forwarded to FieldErrorTip for positioning exceptions */
  tipClassName?: string;
  /** Stable id for aria-describedby on the control */
  errorId?: string;
}) {
  const autoId = useId();
  const tipId = errorId ?? autoId;

  return (
    <div className={cn('relative min-w-0', className)}>
      {children}
      <FieldErrorTip message={error} className={tipClassName} id={error ? tipId : undefined} />
    </div>
  );
}

export function FieldLabel({
  children,
  required,
  className,
  htmlFor,
  disabled,
}: {
  children: ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-300',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}
