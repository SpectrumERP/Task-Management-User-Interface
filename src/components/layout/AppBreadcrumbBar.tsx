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
 * Full-width page breadcrumb bar — trail on the left, guide + actions on the right.
 * Fixed height across the app (with or without actions / guide / badges).
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
  return (
    <div
      data-page-tour={dataPageTour}
      className={cn(
        'box-border w-full h-14 shrink-0 z-20 bg-[var(--tm-surface)] border-b border-[var(--tm-border)]/70 px-4 py-0 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]',
        bleed &&
          '-ml-[var(--page-pad)] -mr-[calc(var(--page-pad)+var(--tm-filters-drawer-width,0px))] -mt-[var(--page-pad)] mb-0 max-w-none w-auto',
        className
      )}
    >
      <div className="flex h-full w-full min-w-0 items-center justify-between gap-3">
        <MasterBreadcrumb items={items} className="min-w-0 flex-1 leading-none" />
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
