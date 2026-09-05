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
  sm: { wrap: 'h-16 w-16', mark: 'h-9 w-9 text-xs', ring: 'inset-0' },
  md: { wrap: 'h-24 w-24', mark: 'h-14 w-14 text-lg', ring: 'inset-0' },
  lg: { wrap: 'h-28 w-28', mark: 'h-16 w-16 text-xl', ring: 'inset-0' },
} as const;

/**
 * E-procurement style loader: brand initials + 3 orbiting rings.
 * Surfaces follow active theme (dark / light).
 */
export function BrandLoader({
  fullScreen = false,
  message,
  className,
  size = 'md',
}: BrandLoaderProps) {
  const brand = useMemo(() => getBrand(), []);
  const initials = useMemo(() => getBrandInitials(brand.brandName), [brand.brandName]);
  const dims = SIZE[size];

  const content = (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <div className={cn('relative flex items-center justify-center', dims.wrap)}>
        <span
          aria-hidden
          className="brand-loader-orbit-cw absolute inset-0 rounded-full border-2 border-transparent border-t-[#0EA5E9] border-r-[#0EA5E9]/40"
        />
        <span
          aria-hidden
          className="brand-loader-orbit-ccw absolute inset-[6px] rounded-full border-2 border-transparent border-b-[#F59E0B] border-l-[#F59E0B]/50"
        />
        <span
          aria-hidden
          className="brand-loader-orbit-cw-slow absolute inset-3 rounded-full border-2 border-transparent border-t-[#38BDF8]/90 border-r-emerald-400/50"
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
        <p className="brand-loader-msg text-[11px] font-semibold uppercase tracking-[0.16em] animate-pulse">
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
