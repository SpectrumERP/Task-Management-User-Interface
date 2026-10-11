/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Same as the CRM's VITE_COOKIE_SECRET — decrypts the shared CRM sign-in cookie. */
  readonly VITE_CRM_COOKIE_SECRET?: string;
  /** 'true' / 'false' forces CRM single sign-on; by default it is on when served under /task. */
  readonly VITE_CRM_SSO?: string;
  readonly VITE_API_BASE_URL?: string;
  /** Route prefix inside the Spectrum ERP shell ('/task'); set by `vite --mode spectrum`. */
  readonly VITE_TASK_ROUTE_BASE?: string;
  /** Spectrum ERP shell, whose login is used when this app runs on its own. */
  readonly VITE_SPECTRUM_URL?: string;
  /** CRM sign-in URL for standalone or cross-origin Task deployments; defaults to this origin's /login. */
  readonly VITE_CRM_LOGIN_URL?: string;
  /** Public base URL of this Task app, used as the post-login return URL when hosted separately. */
  readonly VITE_TASK_PUBLIC_URL?: string;
  /** Must match CRM VITE_COOKIE_DOMAIN when sharing session cookies across same-site subdomains. */
  readonly VITE_CRM_COOKIE_DOMAIN?: string;
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
