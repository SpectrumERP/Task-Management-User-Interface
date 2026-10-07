/**
 * Single sign-on with the CRM. When this app is served inside the CRM (under /task), it has no
 * login of its own: it reuses the token the CRM stored at sign-in, and every "please sign in"
 * goes to the CRM login page, which brings the user back here afterwards.
 *
 * The CRM keeps its session in the AES-GCM encrypted cookie `fi-crm-auth` (same origin, Path=/),
 * so the reader below mirrors the CRM's `src/api/cookieVault.ts` — keep the two in step.
 */
import { ROUTER_BASENAME, withBase } from '@/lib/basePath';

const AUTH_COOKIE = 'fi-crm-auth';
const SESSION_COOKIE = 'fi-crm-session';
const CHANNEL_NAME = 'fi-crm-session';
const DEFAULT_SECRET = 'fi-crm-cookie-v1';
const KEY_SALT = 'fi-crm-cookie-salt';
const MAX_CHUNKS = 10;
const REDIRECT_MARK = 'fi-task-sso-redirect';
/** Back here without a session this soon after sending the user to sign in → a loop, not a sign-in. */
const LOOP_WINDOW_MS = 10_000;

/** On whenever the app runs under a sub-path (inside the CRM); `VITE_CRM_SSO` can force it either way. */
export const CRM_SSO_ENABLED: boolean = (() => {
  const flag = String(import.meta.env.VITE_CRM_SSO ?? '').trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return ROUTER_BASENAME !== '/';
})();

/** The CRM's root path: this app's base without its trailing `/task`. */
const CRM_ROOT = ROUTER_BASENAME.replace(/\/task$/, '');

/** The CRM home page (its dashboard), opened with a full page load: it is a separate app. */
export const crmHomeUrl = `${CRM_ROOT}/`;

type Row = Record<string, unknown>;

/** `user` and `company` are the CRM's copies of the login response (`LoginNo`, `CompanyNo`, …). */
export interface CrmSession {
  token: string;
  user: Row;
  company: Row[];
}

interface CrmAuthData {
  token: string;
  expiresAt: number;
  companies: Row[];
  user: Row;
}

let keyPromise: Promise<CryptoKey> | null = null;

function cryptoKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = String(import.meta.env.VITE_CRM_COOKIE_SECRET ?? '') || DEFAULT_SECRET;
    const encoder = new TextEncoder();
    keyPromise = crypto.subtle
      .importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey'])
      .then((base) =>
        crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: encoder.encode(KEY_SALT), iterations: 100_000, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt'],
        ),
      );
  }
  return keyPromise;
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return null;
}

function expireCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict`;
}

async function readVault<T>(name: string): Promise<T | null> {
  const count = Number(readCookie(name));
  if (!Number.isInteger(count) || count < 1 || count > MAX_CHUNKS) return null;
  let encoded = '';
  for (let i = 0; i < count; i += 1) {
    const chunk = readCookie(`${name}.${i}`);
    if (chunk === null) return null;
    encoded += chunk;
  }
  try {
    const packed = fromBase64Url(encoded);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(0, 12) }, await cryptoKey(), packed.slice(12));
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

function jwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/** The CRM's signed-in session, or null when signed out / expired. */
export async function readCrmSession(): Promise<CrmSession | null> {
  const data = await readVault<CrmAuthData>(AUTH_COOKIE);
  if (!data?.token || !data.user) return null;
  if ((typeof data.expiresAt === 'number' && data.expiresAt <= Date.now()) || jwtExpired(data.token)) return null;
  return { token: data.token, user: data.user, company: Array.isArray(data.companies) ? data.companies : [] };
}

function clearVault(name: string) {
  for (let i = 0; i < MAX_CHUNKS; i += 1) {
    if (readCookie(`${name}.${i}`) === null) break;
    expireCookie(`${name}.${i}`);
  }
  expireCookie(name);
}

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

/** Sign out of the CRM too (one session for both apps); open CRM tabs show their "signed out" alert. */
export function endCrmSession() {
  clearVault(AUTH_COOKIE);
  clearVault(SESSION_COOKIE);
  channel?.postMessage({ type: 'logout' });
}

/** Runs when the CRM signs out or its session expires in another tab. */
export function onCrmSessionEnd(listener: () => void): () => void {
  const handler = (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === 'logout' || event.data?.type === 'expired') listener();
  };
  channel?.addEventListener('message', handler);
  return () => channel?.removeEventListener('message', handler);
}

/** `returnTo` is a path inside this app (e.g. `/task/12`); the CRM login sends the user back to it. */
export function crmLoginUrl(returnTo?: string): string {
  const login = `${CRM_ROOT}/login`;
  return returnTo ? `${login}?next=${encodeURIComponent(withBase(returnTo))}` : login;
}

/**
 * Send the user to the CRM login. Returns false (and does nothing) when we were just there and came
 * back still signed out — the CRM session exists but cannot be read here, so redirecting would loop.
 */
let redirecting = false;

export function redirectToCrmLogin(returnTo?: string): boolean {
  // Already on the way (StrictMode runs effects twice; the page keeps running until it unloads).
  if (redirecting) return true;
  try {
    const last = Number(sessionStorage.getItem(REDIRECT_MARK));
    if (last && Date.now() - last < LOOP_WINDOW_MS) {
      sessionStorage.removeItem(REDIRECT_MARK);
      return false;
    }
    sessionStorage.setItem(REDIRECT_MARK, String(Date.now()));
  } catch {
    /* storage blocked: redirect without loop protection */
  }
  redirecting = true;
  window.location.replace(crmLoginUrl(returnTo));
  return true;
}

/** A session was found: the next redirect is a fresh one, not part of a loop. */
export function clearCrmRedirectMark() {
  try {
    sessionStorage.removeItem(REDIRECT_MARK);
  } catch {
    /* ignore */
  }
}
