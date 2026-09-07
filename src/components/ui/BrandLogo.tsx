import { cn } from '@/lib/utils';
import { getBrand } from '@/config/brandConfig';

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  /** Max height in px — width grows with the asset aspect ratio */
  maxHeight?: number;
  /** Max width in px — keeps wide client logos from overflowing */
  maxWidth?: number;
  /** Compact mark for collapsed sidebar rail (uses favicon / square asset) */
  compact?: boolean;
};

/**
 * Shared brand logo slot — any client PNG/SVG/URL fits via object-contain.
 * Override asset with VITE_BRAND_LOGO_URL (see brandConfig).
 */
export function BrandLogo({
  className,
  imgClassName,
  maxHeight = 44,
  maxWidth = 280,
  compact = false,
}: BrandLogoProps) {
  const brand = getBrand();
  const src = compact ? brand.faviconSrc || brand.logoSrc : brand.logoSrc;
  const size = compact ? Math.min(maxHeight, maxWidth, 32) : maxHeight;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center overflow-hidden',
        compact ? 'justify-center' : 'justify-start',
        className
      )}
      style={
        compact
          ? { height: size, width: size }
          : { height: maxHeight, maxWidth }
      }
    >
      <img
        src={src}
        alt={`${brand.brandName} Logo`}
        className={cn(
          compact
            ? 'h-full w-full object-contain'
            : 'h-full w-auto max-w-full object-contain object-left',
          imgClassName
        )}
      />
    </div>
  );
}
