import { cn } from '@/lib/utils';

interface BrandLoaderProps {
  /** Full-screen overlay (auth / app boot) */
  fullScreen?: boolean;
  /** Optional status text under the mark */
  message?: string;
  className?: string;
  /** Compact size for inline panels */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { wrap: 'h-10 w-10', core: 'h-5 w-5 text-[8px]', ring: 'inset-[0.15rem] border-[2.5px]', gap: 'gap-1.5' },
  md: { wrap: 'h-12 w-12', core: 'h-6 w-6 text-[9px]', ring: 'inset-[0.2rem] border-[3px]', gap: 'gap-2' },
  lg: { wrap: 'h-14 w-14', core: 'h-7 w-7 text-[10px]', ring: 'inset-[0.2rem] border-[3px]', gap: 'gap-2' },
} as const;

/**
 * CRM (Spectrum CRM) page loader: pulsing halo, blue / red ring, "FI" core — and, full screen,
 * a gradient bar running along the top.
 */
export function BrandLoader({
  fullScreen = false,
  message,
  className,
  size,
}: BrandLoaderProps) {
  const resolvedSize = size ?? (fullScreen ? 'lg' : 'sm');
  const dims = SIZE[resolvedSize];

  const content = (
    <div className={cn('relative flex flex-col items-center justify-center p-4', dims.gap, className)}>
      <div className={cn('relative grid place-items-center', dims.wrap)} aria-hidden>
        <span className="crm-loader-halo absolute inset-0 rounded-full" />
        <span className={cn('crm-loader-ring absolute rounded-full', dims.ring)} />
        <span className={cn('crm-loader-core relative z-[1] grid place-items-center rounded-full font-bold', dims.core)}>
          FI
        </span>
      </div>

      {message ? (
        <p className="crm-loader-msg text-xs font-semibold">{message}</p>
      ) : (
        <p className="sr-only">Loading</p>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div
      className="brand-loader-screen fixed inset-0 z-[200] grid place-items-center bg-[var(--tm-page)]"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="crm-loader-track absolute inset-x-0 top-0 h-1 overflow-hidden">
        <div className="crm-loader-bar h-full" />
      </div>
      {content}
    </div>
  );
}

interface InlineLoaderProps {
  /** Diameter in px (default 14). */
  size?: number;
  className?: string;
  /** Accessible status text. */
  label?: string;
}

/**
 * The CRM loader ring, small enough for buttons, inputs and list rows — the one inline spinner in the app.
 * Takes the text colour (top arc) with the CRM red accent, so it reads on light and filled buttons.
 */
export function InlineLoader({ size = 14, className, label = 'Loading' }: InlineLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('crm-loader-inline inline-block shrink-0 rounded-full align-[-0.125em]', className)}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 7)) }}
    />
  );
}
