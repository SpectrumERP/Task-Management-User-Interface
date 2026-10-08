import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  MasterBreadcrumb,
  type MasterBreadcrumbItem,
} from '@/components/master/shared/MasterBreadcrumb';
import { PageGuideButton } from '@/components/layout/PageGuideButton';

export type AppBreadcrumbItem = MasterBreadcrumbItem;

interface AppBreadcrumbBarProps {
  items: AppBreadcrumbItem[];
  /** Optional page-guide key — renders the ? button on the right */
  guideKey?: string;
  /** Extra controls on the right (Cancel/Save, etc.) */
  actions?: ReactNode;
  /**
   * When true, cancels `.page-shell` / `.page-shell-scroll` padding so the bar
   * spans 100% of the main content column edge-to-edge.
   */
  bleed?: boolean;
  className?: string;
  /** Tour target attribute */
  'data-page-tour'?: string;
}

/**
 * Full-width page breadcrumb bar — trail on the left (nested pages only, as in the CRM), guide + actions on the right.
 * Edge-to-edge surface strip with bottom border (use `bleed` inside page-shell).
 */
export function AppBreadcrumbBar({
  items,
  guideKey,
  actions,
  bleed = false,
  className,
  'data-page-tour': dataPageTour,
}: AppBreadcrumbBarProps) {
  // Same rule as the CRM: a trail only on nested pages (create / edit / detail — a crumb links back to a
  // section), as "Task › Section › Page". Top-level pages (no link back, or just "Home") show none, and
  // the strip itself only stays for its buttons.
  const nested = items.some((item) => item.href && item.label !== 'Home');
  if (!nested && !actions) return null;
  const trail: AppBreadcrumbItem[] = nested ? [{ label: 'Task', href: '/' }, ...items] : [];

  return (
    <div
      data-page-tour={dataPageTour}
      className={cn(
        // CRM breadcrumb row: compact white strip, faint top line, header line below — no shadow
        'box-border w-full shrink-0 z-20 bg-[var(--tm-surface)] border-t border-t-[#EEF2F6] border-b border-b-[#E2E8F0] dark:border-t-[var(--tm-border)] dark:border-b-[var(--tm-border)] px-5 py-2',
        bleed &&
          '-ml-[var(--page-pad-x)] -mr-[calc(var(--page-pad-x)+var(--tm-filters-drawer-width,0px))] -mt-[var(--page-pad)] mb-0 max-w-none w-auto',
        className
      )}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        {trail.length ? (
          <MasterBreadcrumb items={trail} className="min-w-0 flex-1 leading-none" />
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}
        {(guideKey || actions) ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
            {guideKey ? <PageGuideButton guideKey={guideKey} /> : null}
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
