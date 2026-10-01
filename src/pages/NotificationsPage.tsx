import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, MailOpen, Trash2 } from 'lucide-react';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { Button } from '@/components/ui/button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { DataTableScroll } from '@/components/shared/DataTableScroll';
import {
  SortableHeader,
  sortHeaderCellProps,
  useTableSort,
} from '@/components/shared/useTableSort';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotifications, formatUnreadBadge } from '@/context/NotificationsContext';
import {
  fetchPopUpNotifications,
  resolveLoginNo,
  type PopUpNotification,
} from '@/services/notificationService';
import { cn } from '@/lib/utils';

type NotificationRow = PopUpNotification & {
  id: number;
  srNo: number;
  status: 'Unread' | 'Read';
};

/** Lazy pages — 10 rows per request (default + each scroll) */
const PAGE_SIZE = 10;
/** Keep “Loading more” visible long enough to notice (API is often instant). */
const LOAD_MORE_MIN_MS = 750;

function mergeNotifications(
  prev: PopUpNotification[],
  next: PopUpNotification[]
): PopUpNotification[] {
  if (next.length === 0) return prev;
  // Dedupe by rowKey — API may repeat the same notificationJobDetailNo
  const seen = new Set(prev.map((n) => n.rowKey));
  const appended = next.filter((n) => !seen.has(n.rowKey));
  return appended.length === 0 ? prev : [...prev, ...appended];
}

/**
 * Notifications page — self (client) read/unread + delete.
 * Supports `?id=` to scroll/highlight a row opened from the bell popover.
 * Loads 10 rows at a time with infinite scroll + bottom loader.
 */
export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusKeyParam = searchParams.get('key');
  const focusKey = focusKeyParam && focusKeyParam.trim() ? focusKeyParam.trim() : null;

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const {
    unreadCount,
    readKeys,
    syncUnreadFromApi,
    markRead,
    markUnread,
    removeKey,
  } = useNotifications();

  const [items, setItems] = useState<PopUpNotification[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const toggleLockRef = useRef(false);

  const scrolledForKeyRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
  const pageNoRef = useRef(1);
  const totalRecordsRef = useRef(0);
  const focusFetchRef = useRef(false);
  const scrollPortRef = useRef<HTMLDivElement | null>(null);
  /** scrollTop after each page — next 10 only after user scrolls past this */
  const lastLoadScrollTopRef = useRef(0);

  hasMoreRef.current = hasMore;
  pageNoRef.current = pageNo;
  totalRecordsRef.current = totalRecords;

  /** Lazy-load while pageNo < totalPages (pageSize 10 → 10 rows per scroll). */
  const computeHasMore = (
    list: PopUpNotification[],
    pagination: { totalPages?: number; pageNo?: number; totalRecords?: number } | undefined,
    requestedPage: number,
    knownTotal: number
  ) => {
    const totalPages = Number(pagination?.totalPages) || 0;
    const totalRec =
      Number(pagination?.totalRecords) > 0
        ? Number(pagination?.totalRecords)
        : knownTotal;

    // Empty page → stop
    if (list.length === 0) return false;
    // Prefer API totalPages (e.g. 21 records / 10 → 3 pages)
    if (totalPages > 0) return requestedPage < totalPages;
    if (totalRec > 0) return requestedPage * PAGE_SIZE < totalRec;
    // No totals: continue only while API keeps returning a full page
    return list.length >= PAGE_SIZE;
  };

  const loadPage = useCallback(
    async (requestedPage: number, mode: 'replace' | 'append') => {
      let loadMoreStartedAt = 0;

      if (mode === 'append') {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        if (totalRecordsRef.current > 0 && totalRecordsRef.current <= PAGE_SIZE) {
          hasMoreRef.current = false;
          setHasMore(false);
          return;
        }
        loadingMoreRef.current = true;
        setLoadingMore(true);
        loadMoreStartedAt = Date.now();
      } else {
        setLoading(true);
        setLoadError(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }

      try {
        const loginNo = resolveLoginNo(user as Record<string, unknown> | null, token);
        if (loginNo == null) {
          if (mode === 'replace') {
            setItems([]);
            setLoadError(true);
            setHasMore(false);
            setTotalRecords(0);
            hasMoreRef.current = false;
            totalRecordsRef.current = 0;
          }
          return;
        }

        const result = await fetchPopUpNotifications({
          loginNo,
          pageNo: requestedPage,
          pageSize: PAGE_SIZE,
        });

        // Lazy-load: keep loader on screen briefly so it is noticeable
        if (mode === 'append') {
          const elapsed = Date.now() - loadMoreStartedAt;
          const wait = Math.max(0, LOAD_MORE_MIN_MS - elapsed);
          if (wait > 0) {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, wait);
            });
          }
        }

        const list = Array.isArray(result.data.notifications) ? result.data.notifications : [];
        const apiTotal = Number(result.data.pagination?.totalRecords);
        const apiPages = Number(result.data.pagination?.totalPages);
        const nextTotal =
          Number.isFinite(apiTotal) && apiTotal > 0
            ? apiTotal
            : mode === 'replace'
              ? list.length
              : Math.max(totalRecordsRef.current, requestedPage * PAGE_SIZE);

        if (mode === 'replace') {
          setItems(list);
        } else {
          setItems((prev) => mergeNotifications(prev, list));
        }

        setTotalRecords(nextTotal);
        totalRecordsRef.current = nextTotal;

        // hasMore from API pagination — do not stop early on a short last page
        let finalMore = computeHasMore(list, result.data.pagination, requestedPage, nextTotal);
        if (Number.isFinite(apiPages) && apiPages > 0) {
          finalMore = requestedPage < apiPages && list.length > 0;
        }
        if (nextTotal > 0 && nextTotal <= PAGE_SIZE) {
          finalMore = false;
        }

        setPageNo(requestedPage);
        setHasMore(finalMore);
        hasMoreRef.current = finalMore;
        pageNoRef.current = requestedPage;

        if (mode === 'replace') {
          const apiUnread = Number(result.data.pagination?.totalUnreadCount);
          // Seeds once per session; later refreshes keep ±1 read/unread counter
          syncUnreadFromApi(Number.isFinite(apiUnread) ? apiUnread : list.length);
        }
      } catch {
        if (mode === 'replace') {
          setLoadError(true);
          setItems([]);
          setHasMore(false);
          setTotalRecords(0);
          hasMoreRef.current = false;
          totalRecordsRef.current = 0;
        }
      } finally {
        if (mode === 'append') {
          if (scrollPortRef.current) {
            lastLoadScrollTopRef.current = scrollPortRef.current.scrollTop;
          }
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          lastLoadScrollTopRef.current = 0;
          setLoading(false);
        }
      }
    },
    [user, token, syncUnreadFromApi]
  );

  const load = useCallback(async () => {
    // Do not clear session read/unread — only refresh the list
    hasMoreRef.current = false;
    pageNoRef.current = 1;
    totalRecordsRef.current = 0;
    lastLoadScrollTopRef.current = 0;
    setHasMore(false);
    setTotalRecords(0);
    setPageNo(1);
    await loadPage(1, 'replace');
  }, [loadPage]);

  /**
   * Load exactly one more page (10 rows) per user scroll-to-bottom.
   * Blocks layout/auto triggers so the first paint stays at 10 rows.
   */
  const loadMore = useCallback((opts?: { force?: boolean }) => {
    if (loadingMoreRef.current || !hasMoreRef.current || loading) return;
    if (totalRecordsRef.current > 0 && totalRecordsRef.current <= PAGE_SIZE) return;

    if (!opts?.force) {
      const el = scrollPortRef.current;
      if (!el) return;
      // User must have scrolled down since the last page load
      if (el.scrollTop <= lastLoadScrollTopRef.current + 12) return;
      lastLoadScrollTopRef.current = el.scrollTop;
    }

    void loadPage(pageNoRef.current + 1, 'append');
  }, [loadPage, loading]);

  /** Show bottom lazy-load UI only when there are truly more than PAGE_SIZE records */
  const showLazyFooter = totalRecords > PAGE_SIZE || (totalRecords === 0 && hasMore);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Deep-link `?key=`: keep paging until the row is present (only if more than PAGE_SIZE exist)
  useEffect(() => {
    if (loading || focusKey == null || focusFetchRef.current) return;
    const found = items.some((i) => i.rowKey === focusKey);
    if (found) {
      focusFetchRef.current = true;
      return;
    }
    if (!showLazyFooter || !hasMore || loadingMore) return;
    void loadMore();
  }, [loading, focusKey, items, hasMore, loadingMore, loadMore, showLazyFooter]);

  useEffect(() => {
    focusFetchRef.current = false;
    scrolledForKeyRef.current = null;
  }, [focusKey]);

  // Scroll to focused notification from bell popover (`?key=`)
  useEffect(() => {
    if (loading || focusKey == null) return;
    if (scrolledForKeyRef.current === focusKey) return;

    const target = document.getElementById(
      `notification-row-${encodeURIComponent(focusKey)}`
    );
    if (!target) return;

    scrolledForKeyRef.current = focusKey;
    setHighlightKey(focusKey);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const clearHighlight = window.setTimeout(() => setHighlightKey(null), 2200);
    const clearQuery = window.setTimeout(() => {
      setSearchParams({}, { replace: true });
    }, 400);

    return () => {
      window.clearTimeout(clearHighlight);
      window.clearTimeout(clearQuery);
    };
  }, [loading, loadingMore, focusKey, items, setSearchParams]);

  const rows: NotificationRow[] = useMemo(
    () =>
      items.map((item, index) => {
        const id = Number(item.notificationJobDetailNo);
        return {
          ...item,
          id,
          srNo: index + 1,
          // Per-rowKey only — API may reuse the same notificationJobDetailNo
          status: readKeys.has(item.rowKey) ? 'Read' : 'Unread',
        };
      }),
    [items, readKeys]
  );

  const { sortCol, sortDesc, handleSort, sortedRows } = useTableSort(
    rows,
    (row, key) => {
      if (key === 'srNo') return row.srNo;
      // Unread first when ascending — clearer than alpha "Read" < "Unread"
      if (key === 'status') return row.status === 'Unread' ? 0 : 1;
      return '';
    },
    { defaultKey: null, defaultDesc: false }
  );

  const handleToggleRead = (
    e: MouseEvent,
    rowKey: string,
    currentlyUnread: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteKey != null || toggleLockRef.current) return;
    if (!rowKey) return;
    toggleLockRef.current = true;
    if (currentlyUnread) markRead(rowKey);
    else markUnread(rowKey);
    window.setTimeout(() => {
      toggleLockRef.current = false;
    }, 0);
  };

  const requestDelete = (e: MouseEvent, rowKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteKey != null) return;
    setDeleteKey(rowKey);
  };

  const confirmDelete = () => {
    if (deleteKey == null) return;
    const key = deleteKey;
    setItems((prev) => prev.filter((i) => i.rowKey !== key));
    removeKey(key);
    setDeleteKey(null);
  };

  const badgeLabel = formatUnreadBadge(unreadCount);

  return (
    <div className="page-shell bg-[var(--tm-page)]">
      <AppBreadcrumbBar
        items={[
          { label: 'Home', href: '/' },
          {
            label: 'Notifications',
            current: true,
            endAdornment:
              unreadCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[11px] font-bold tabular-nums text-white">
                  {badgeLabel}
                </span>
              ) : null,
          },
        ]}
        bleed
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {loadError && !loading ? (
          <LoadErrorState title="Failed to load notifications" onRetry={load} className="flex-1" />
        ) : loading && items.length === 0 ? (
          <BrandLoader message="Loading notifications" />
        ) : rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            No notifications
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)]">
            <DataTableScroll
              minWidth={640}
              bodyScrollRef={scrollPortRef}
              onNearEnd={showLazyFooter && hasMore ? () => loadMore() : undefined}
              nearEndOffsetPx={180}
              header={
                <table className="tm-data-table w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: '5.5rem' }} />
                    <col style={{ width: '6.5rem' }} />
                    <col />
                    <col style={{ width: '7rem' }} />
                  </colgroup>
                  <thead className="bg-[var(--tm-elevated)]">
                    <tr className="border-b border-[var(--tm-border)]">
                      <th
                        className="tm-col-sr cursor-pointer"
                        {...sortHeaderCellProps('srNo', handleSort)}
                      >
                        <SortableHeader
                          label="Sr. No."
                          sortKey="srNo"
                          sortCol={sortCol}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                        />
                      </th>
                      <th
                        className="cursor-pointer"
                        {...sortHeaderCellProps('status', handleSort)}
                      >
                        <SortableHeader
                          label="Status"
                          sortKey="status"
                          sortCol={sortCol}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                        />
                      </th>
                      <th>Notification</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                </table>
              }
              body={
                <>
                  <table className="tm-data-table w-full table-fixed border-collapse text-left">
                    <colgroup>
                      <col style={{ width: '5.5rem' }} />
                      <col style={{ width: '6.5rem' }} />
                      <col />
                      <col style={{ width: '7rem' }} />
                    </colgroup>
                    <tbody>
                      {sortedRows.map((row) => {
                        const isUnread = row.status === 'Unread';
                        const rowDomId = `notification-row-${encodeURIComponent(row.rowKey)}`;
                        const isFocused = highlightKey === row.rowKey;
                        const actionsDisabled = deleteKey != null;

                        return (
                          <tr
                            key={row.rowKey}
                            id={rowDomId}
                            className={cn(
                              'transition-colors',
                              isFocused
                                ? 'bg-[#0EA5E9]/15 ring-1 ring-inset ring-[#0EA5E9]/40'
                                : undefined
                            )}
                          >
                            <td className="tm-col-sr text-center tabular-nums">
                              {row.srNo}
                            </td>
                            <td className="text-center">
                              <span
                                className={cn(
                                  isUnread
                                    ? 'tm-text-semibold text-slate-800 dark:text-slate-100'
                                    : 'text-slate-400 dark:text-slate-500'
                                )}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="tm-col-primary whitespace-normal! max-w-none!">
                              <div className="flex min-w-0 flex-col gap-0.5 whitespace-normal">
                                <span
                                  className={cn(
                                    'break-words leading-snug',
                                    isUnread
                                      ? 'tm-text-semibold text-slate-800 dark:text-slate-100'
                                      : 'text-slate-400 dark:text-slate-500'
                                  )}
                                >
                                  {row.caption || '—'}
                                </span>
                                {row.subCaption ? (
                                  <span
                                    className={cn(
                                      'break-words leading-snug',
                                      isUnread
                                        ? 'tm-text-semibold text-slate-600 dark:text-slate-300'
                                        : 'text-slate-400 dark:text-slate-600'
                                    )}
                                  >
                                    {row.subCaption}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td
                              className="px-3 py-3"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-0.5">
                                {isUnread ? (
                                  <ActionTip label="Mark read">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label="Mark read"
                                      disabled={actionsDisabled}
                                      className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                                      onClick={(e) => handleToggleRead(e, row.rowKey, true)}
                                    >
                                      <Mail size={14} />
                                    </Button>
                                  </ActionTip>
                                ) : (
                                  <ActionTip label="Mark unread">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label="Mark unread"
                                      disabled={actionsDisabled}
                                      className="h-7 w-7 p-0 text-sky-400 hover:text-sky-300 disabled:opacity-40"
                                      onClick={(e) => handleToggleRead(e, row.rowKey, false)}
                                    >
                                      <MailOpen size={14} />
                                    </Button>
                                  </ActionTip>
                                )}
                                <ActionTip label="Delete">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Delete"
                                    disabled={actionsDisabled}
                                    className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 disabled:opacity-40"
                                    onClick={(e) => requestDelete(e, row.rowKey)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </ActionTip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Lazy-load footer — first 10, then +10 per scroll (or Load more) */}
                  {showLazyFooter ? (
                    <div className="flex flex-col items-center justify-center py-4 min-h-12 gap-1">
                      {loadingMore ? (
                        <BrandLoader size="sm" message="Loading more" />
                      ) : hasMore ? (
                        <button
                          type="button"
                          onClick={() => loadMore({ force: true })}
                          className="text-[11px] font-medium text-[#0EA5E9] hover:text-[#38BDF8] transition"
                        >
                          Load more
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          You&apos;re all caught up
                        </span>
                      )}
                    </div>
                  ) : null}
                </>
              }
            />
          </div>
        )}
      </div>

      <Dialog open={deleteKey != null} onOpenChange={(open) => !open && setDeleteKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete notification?</DialogTitle>
            <DialogDescription>
              This removes one notification from your list. Only one can be deleted at a time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteKey(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
