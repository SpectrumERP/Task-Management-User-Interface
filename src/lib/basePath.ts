/**
 * Where the app is served from: '/' when deployed on its own, '/task/' when hosted inside the CRM
 * (built / served with `vite --base /task/`). Everything that builds a URL goes through here so the
 * app works under either.
 */
export const BASE_URL: string = import.meta.env.BASE_URL || '/';

/**
 * Router basename: the base without its trailing slash ('/' stays '/'). Inside the Spectrum ERP shell
 * the base is this server's own origin (for assets), so the route prefix comes from VITE_TASK_ROUTE_BASE.
 */
export const ROUTER_BASENAME: string =
  (import.meta.env.VITE_TASK_ROUTE_BASE || BASE_URL).replace(/\/+$/, '') || '/';

/** An in-app route ('/task/74') → its URL under the base ('/task/task/74' inside the CRM). */
export function withBase(path: string): string {
  if (ROUTER_BASENAME === '/') return path;
  return `${ROUTER_BASENAME}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The browser's current URL as an in-app route ('/task/employees?x=1' → '/employees?x=1'), for `withBase` callers. */
export function currentAppPath(): string {
  const { pathname, search } = window.location;
  const inApp =
    ROUTER_BASENAME !== '/' && (pathname === ROUTER_BASENAME || pathname.startsWith(`${ROUTER_BASENAME}/`))
      ? pathname.slice(ROUTER_BASENAME.length) || '/'
      : pathname;
  return `${inApp}${search}`;
}

/** A file from /public ('version.json') → its URL under the base. */
export function publicUrl(file: string): string {
  return `${BASE_URL}${file.replace(/^\/+/, '')}`;
}
