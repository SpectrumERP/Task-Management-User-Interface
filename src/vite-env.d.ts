/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Same as the CRM's VITE_COOKIE_SECRET — decrypts the shared CRM sign-in cookie. */
  readonly VITE_CRM_COOKIE_SECRET?: string;
  /** 'true' / 'false' forces CRM single sign-on; by default it is on when served under /task. */
  readonly VITE_CRM_SSO?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BRAND_NAME?: string;
  readonly VITE_BRAND_PRODUCT_NAME?: string;
  readonly VITE_BRAND_LOGO_URL?: string;
  readonly VITE_BRAND_MASK_LOGO_URL?: string;
  readonly VITE_BRAND_FAVICON_URL?: string;
  readonly VITE_BRAND_DOCUMENT_TITLE?: string;
  readonly VITE_BRAND_PRIMARY_COLOR?: string;
  readonly VITE_BRAND_INVERT_MASK?: string;
  readonly VITE_BRAND_PLATFORM_LABEL?: string;
  readonly VITE_BRAND_SECURE_NOTE?: string;
  readonly VITE_BRAND_COPYRIGHT_SUFFIX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
