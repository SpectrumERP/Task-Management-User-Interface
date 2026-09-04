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
  /** App / sidebar / login logo */
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
 * SteelMont Spectrum — active client brand (temporary: used everywhere).
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

/**
 * Temporary: always use SteelMont client branding.
 * Host-based multi-brand can be re-enabled later via an optional hostname arg.
 */
export function getBrandConfig(): BrandConfig {
  return STEELMONT_SPECTRUM;
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
