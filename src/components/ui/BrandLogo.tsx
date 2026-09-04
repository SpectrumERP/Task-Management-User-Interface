import { cn } from '@/lib/utils';
import { getBrand } from '@/config/brandConfig';

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  /** Max height in px — width grows with the asset aspect ratio */
  maxHeight?: number;
  /** Max width in px — keeps wide client logos from overflowing */
  maxWidth?: number;
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
}: BrandLogoProps) {
  const brand = getBrand();

  return (
    <div
      className={cn('flex shrink-0 items-center justify-start overflow-hidden', className)}
      style={{ height: maxHeight, maxWidth }}
    >
      <img
        src={brand.logoSrc}
        alt={`${brand.brandName} Logo`}
        className={cn('h-full w-auto max-w-full object-contain object-left', imgClassName)}
      />
    </div>
  );
}
