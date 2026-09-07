import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getBrand, getBrandInitials } from '@/config/brandConfig';

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
  sm: {
    wrap: 'h-10 w-10',
    mark: 'h-5 w-5 text-[8px]',
    mid: 'inset-[3px]',
    inner: 'inset-[5px]',
    gap: 'gap-2',
    msg: 'text-[10px] tracking-[0.12em]',
  },
  md: {
    wrap: 'h-14 w-14',
    mark: 'h-7 w-7 text-[10px]',
    mid: 'inset-[4px]',
    inner: 'inset-2',
    gap: 'gap-2.5',
    msg: 'text-[10px] tracking-[0.14em]',
  },
  lg: {
    wrap: 'h-24 w-24',
    mark: 'h-14 w-14 text-lg',
    mid: 'inset-[6px]',
    inner: 'inset-3',
    gap: 'gap-3',
    msg: 'text-[11px] tracking-[0.16em]',
  },
} as const;

/**
 * E-procurement style loader: brand initials + 3 orbiting rings.
 * Surfaces follow active theme (dark / light).
 */
export function BrandLoader({
  fullScreen = false,
  message,
  className,
  size,
}: BrandLoaderProps) {
  const brand = useMemo(() => getBrand(), []);
  const initials = useMemo(() => getBrandInitials(brand.brandName), [brand.brandName]);
  const resolvedSize = size ?? (fullScreen ? 'lg' : 'sm');
  const dims = SIZE[resolvedSize];

  const content = (
    <div className={cn('relative flex flex-col items-center', dims.gap, className)}>
      <div className={cn('relative flex items-center justify-center', dims.wrap)}>
        <span
          aria-hidden
          className="brand-loader-orbit-cw absolute inset-0 rounded-full border-2 border-transparent border-t-[#0EA5E9] border-r-[#0EA5E9]/40"
        />
        <span
          aria-hidden
          className={cn(
            'brand-loader-orbit-ccw absolute rounded-full border-2 border-transparent border-b-[#F59E0B] border-l-[#F59E0B]/50',
            dims.mid
          )}
        />
        <span
          aria-hidden
          className={cn(
            'brand-loader-orbit-cw-slow absolute rounded-full border-2 border-transparent border-t-[#38BDF8]/90 border-r-emerald-400/50',
            dims.inner
          )}
        />

        <div
          className={cn(
            'brand-loader-mark relative z-10 flex items-center justify-center rounded-full font-bold tracking-tight',
            'bg-[var(--tm-surface)] text-[var(--tm-input-fg)]',
            'shadow-[var(--tm-shadow-sm)] ring-1 ring-[var(--tm-border)]',
            dims.mark
          )}
        >
          {initials}
        </div>
      </div>

      {message ? (
        <p className={cn('brand-loader-msg font-semibold uppercase animate-pulse', dims.msg)}>
          {message}
        </p>
      ) : (
        <p className="sr-only">Loading</p>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="brand-loader-screen fixed inset-0 z-[200] flex items-center justify-center bg-[var(--tm-page)]">
      <div
        aria-hidden
        className="brand-loader-glow pointer-events-none absolute inset-0"
      />
      {content}
    </div>
  );
}
