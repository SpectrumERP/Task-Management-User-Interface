import { masterItems, menuMasterItems } from '@/components/layout/Sidebar';
import type { MasterType } from './masterRoutes';

/** The master's sidebar label ('location' → 'Task Locations'), so breadcrumbs match the menu. */
export function masterNavLabel(type: MasterType | string, fallback: string): string {
  return [...masterItems, ...menuMasterItems].find((item) => item.id === `master-${type}`)?.label ?? fallback;
}

/** The master type from a `/master/<type>[/...]` route, or null outside the masters. */
export function masterTypeFromPath(pathname: string): string | null {
  return /^\/master\/([^/]+)/.exec(pathname)?.[1] ?? null;
}
