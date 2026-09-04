import SteelMontLogo from '@/assets/SteelMountLogo01.png';
import SteelMontFavicon from '@/assets/favicon-SteelMontLogo01-32x32.png';

export interface BrandFeature {
  key: 'boards' | 'planner' | 'teams';
  label: string;
}

export interface BrandConfig {
  /** Shown in logo alt / copyright */
  brandName: string;
  /** Product line under brand */
  productName: string;
  /** Small eyebrow, e.g. SteelMont Platform */
  platformLabel: string;
  /** Live badge text */
  liveBadge: string;
  headline: string;
  headlineAccent: string;
  description: string;
  features: BrandFeature[];
  statusTitle: string;
  statusValue: string;
  statusBadge: string;
  secureNote: string;
  copyrightSuffix: string;
  /** App / sidebar / login logo (any client asset URL or bundled import) */
  logoSrc: string;
  /**
   * Watermark / mask logo (login left panel, etc.).
   * Defaults to logoSrc; set a white/mono asset if the brand needs one.
   */
  maskLogoSrc: string;
  /** Browser tab favicon */
  faviconSrc: string;
  documentTitle: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /**
   * When true, mask logo uses brightness/invert (works for dark logos on teal).
   */
  invertMaskLogo: boolean;
}

/**
 * SteelMont Spectrum — default client brand when env overrides are not set.
 */
const STEELMONT_SPECTRUM: BrandConfig = {
  brandName: 'SteelMont',
  productName: 'Spectrum Task & Planner',
  platformLabel: 'SteelMont Platform',
  liveBadge: 'Live workspace',
  headline: 'Plan. Track.',
  headlineAccent: 'Deliver together.',
  description: 'Tasks, meetings, and follow-ups — one clear view for your team.',
  features: [
    { key: 'boards', label: 'Boards' },
    { key: 'planner', label: 'Planner' },
    { key: 'teams', label: 'Teams' },
  ],
  statusTitle: 'Today',
  statusValue: '12 tasks in progress',
  statusBadge: 'On track',
  secureNote: 'Secure access for SteelMont teams',
  copyrightSuffix: 'Spectrum Task & Planner',
  logoSrc: SteelMontLogo,
  maskLogoSrc: SteelMontLogo,
  faviconSrc: SteelMontFavicon,
  documentTitle: 'Steelmont | Spectrum Task & Planner',
  primaryColor: '#006699',
  invertMaskLogo: true,
};

function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Resolve brand for this deployment.
 * Any client can override via Vite env (no code change):
 * - VITE_BRAND_NAME
 * - VITE_BRAND_PRODUCT_NAME
 * - VITE_BRAND_LOGO_URL        (absolute URL or /public path e.g. /brand/logo.png)
 * - VITE_BRAND_MASK_LOGO_URL
 * - VITE_BRAND_FAVICON_URL
 * - VITE_BRAND_DOCUMENT_TITLE
 * - VITE_BRAND_PRIMARY_COLOR
 * - VITE_BRAND_INVERT_MASK     ("true" | "false")
 */
export function getBrandConfig(): BrandConfig {
  const base = STEELMONT_SPECTRUM;
  const logoSrc = env('VITE_BRAND_LOGO_URL') ?? base.logoSrc;
  const invertMask = env('VITE_BRAND_INVERT_MASK');

  return {
    ...base,
    brandName: env('VITE_BRAND_NAME') ?? base.brandName,
    productName: env('VITE_BRAND_PRODUCT_NAME') ?? base.productName,
    logoSrc,
    maskLogoSrc: env('VITE_BRAND_MASK_LOGO_URL') ?? logoSrc,
    faviconSrc: env('VITE_BRAND_FAVICON_URL') ?? base.faviconSrc,
    documentTitle: env('VITE_BRAND_DOCUMENT_TITLE') ?? base.documentTitle,
    primaryColor: env('VITE_BRAND_PRIMARY_COLOR') ?? base.primaryColor,
    invertMaskLogo:
      invertMask === undefined ? base.invertMaskLogo : invertMask.toLowerCase() === 'true',
    platformLabel: env('VITE_BRAND_PLATFORM_LABEL') ?? base.platformLabel,
    secureNote: env('VITE_BRAND_SECURE_NOTE') ?? base.secureNote,
    copyrightSuffix: env('VITE_BRAND_COPYRIGHT_SUFFIX') ?? base.copyrightSuffix,
  };
}

/** Cached brand for the current page load (use everywhere). */
let cachedBrand: BrandConfig | null = null;

export function getBrand(): BrandConfig {
  if (!cachedBrand) {
    cachedBrand = getBrandConfig();
  }
  return cachedBrand;
}

/** Apply document title + favicon from brand (call once at app start). */
export function applyBrandToDocument(brand: BrandConfig = getBrand()): void {
  if (typeof document === 'undefined') return;

  document.title = brand.documentTitle;

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    document.head.appendChild(link);
  }
  link.href = brand.faviconSrc;

  const apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (apple) {
    apple.href = brand.logoSrc;
  }

  const theme = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (theme) {
    theme.content = brand.primaryColor;
  }

  const appTitle = document.querySelector<HTMLMetaElement>("meta[name='apple-mobile-web-app-title']");
  if (appTitle) {
    appTitle.content = brand.productName;
  }

  const description = document.querySelector<HTMLMetaElement>("meta[name='description']");
  if (description) {
    description.content = `${brand.brandName} — ${brand.productName}`;
  }
}
