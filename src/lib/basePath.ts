/**
 * Where the app is served from: '/' when deployed on its own, '/task/' when hosted inside the CRM
 * (built / served with `vite --base /task/`). Everything that builds a URL goes through here so the
 * app works under either.
 */
export const BASE_URL: string = import.meta.env.BASE_URL || '/';

/** Router basename: the base without its trailing slash ('/' stays '/'). */
export const ROUTER_BASENAME: string = BASE_URL.replace(/\/+$/, '') || '/';

/** An in-app route ('/task/74') → its URL under the base ('/task/task/74' inside the CRM). */
export function withBase(path: string): string {
  if (ROUTER_BASENAME === '/') return path;
  return `${ROUTER_BASENAME}${path.startsWith('/') ? path : `/${path}`}`;
}

/** A file from /public ('version.json') → its URL under the base. */
export function publicUrl(file: string): string {
  return `${BASE_URL}${file.replace(/^\/+/, '')}`;
}
