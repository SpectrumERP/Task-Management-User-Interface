import { useEffect, useLayoutEffect } from 'react';
import './index.css';
import App, { router } from './App';
import { applyBrandTokens } from '@/config/brandConfig';
import { initTheme } from '@/store/useThemeStore';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ROUTER_BASENAME } from '@/lib/basePath';

/** The shell fires this on window after each of its own navigations (history.pushState sends no event). */
const SHELL_NAVIGATE_EVENT = 'spectrum:navigate';
/** tailwind.config.js scopes every utility under this class in the embedded build. */
const SCOPE_CLASS = 'task-app';

/**
 * This router is its own React Router copy, so it only sees its own navigations and back/forward.
 * When the shell changes the URL (its sidebar, or while this app was unmounted), catch up with it.
 */
function syncRouterWithUrl() {
  const { pathname, search, hash } = window.location;
  if (pathname !== ROUTER_BASENAME && !pathname.startsWith(`${ROUTER_BASENAME}/`)) return;
  // state.location is the full URL path; navigate() takes a path below the basename and adds it.
  const current = router.state.location;
  if (current.pathname === pathname && current.search === search && current.hash === hash) return;
  const inApp = pathname.slice(ROUTER_BASENAME.length) || '/';
  void router.navigate(`${inApp}${search}${hash}`, { replace: true });
}

/**
 * Task Management as a Spectrum ERP module (Module Federation remote `task/App`, see vite.config.ts),
 * mounted by the shell under /task. Sign-in comes from the shell through the CRM auth cookie.
 */
export default function SpectrumApp() {
  // Before paint: without the scope class none of this app's utilities apply. On <body>, not a wrapper,
  // so dialogs and menus that Radix portals into <body> are styled too.
  useLayoutEffect(() => {
    document.body.classList.add(SCOPE_CLASS);
    return () => document.body.classList.remove(SCOPE_CLASS);
  }, []);

  useEffect(() => {
    // The host owns the page title and favicon; only the theme and brand tokens are this app's.
    initTheme();
    applyBrandTokens();
    syncRouterWithUrl();
    window.addEventListener(SHELL_NAVIGATE_EVENT, syncRouterWithUrl);
    return () => window.removeEventListener(SHELL_NAVIGATE_EVENT, syncRouterWithUrl);
  }, []);

  return (
    <ErrorBoundary label="root">
      <App />
    </ErrorBoundary>
  );
}
