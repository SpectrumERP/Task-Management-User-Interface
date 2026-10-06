import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
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
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { formatUtcDateTime } from '@/lib/dateTime';
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
  openNotificationLink,
  type PopUpNotification,
} from '@/services/notificationService';
import { cn } from '@/lib/utils';

type NotificationRow = PopUpNotification & {
  id: number;
  srNo: number;
  status: 'Unread' | 'Read';
};

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
    removeKey,
  } = useNotifications();

  const [items, setItems] = useState<PopUpNotification[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const scrolledForKeyRef = useRef<string | null>(null);

  const loadPage = useCallback(
    async (requestedPage: number, size: number) => {
      setLoading(true);
      setLoadError(false);

      try {
        const loginNo = resolveLoginNo(user as Record<string, unknown> | null, token);
        if (loginNo == null) {
          setItems([]);
          setLoadError(true);
          setTotalRecords(0);
          setTotalPages(0);
          return;
        }

        const result = await fetchPopUpNotifications({
          loginNo,
          pageNo: requestedPage,
          pageSize: size,
        });

        const list = Array.isArray(result.data.notifications) ? result.data.notifications : [];
        const apiTotal = Number(result.data.pagination?.totalRecords) || list.length;
        const apiPages = Number(result.data.pagination?.totalPages) || 0;

        setItems(list);
        setTotalRecords(apiTotal);
        setTotalPages(apiPages > 0 ? apiPages : Math.ceil(apiTotal / size));
        setPageNo(requestedPage);
        setItemsPerPage(size);

        const apiUnread = Number(result.data.pagination?.totalUnreadCount);
        syncUnreadFromApi(Number.isFinite(apiUnread) ? apiUnread : list.length);
      } catch {
        setLoadError(true);
        setItems([]);
        setTotalRecords(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [user, token, syncUnreadFromApi]
  );

  const load = useCallback(async () => {
    await loadPage(1, itemsPerPage);
  }, [loadPage, itemsPerPage]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

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
  }, [loading, focusKey, items, setSearchParams]);

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
              onNearEnd={undefined}
              nearEndOffsetPx={undefined}
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

                        return (
                          <tr
                            key={row.rowKey}
                            id={rowDomId}
                            className={cn(
                              'transition-colors',
                              row.link ? 'cursor-pointer hover:bg-[var(--tm-muted)]' : undefined,
                              isFocused
                                ? 'bg-[#0EA5E9]/15 ring-1 ring-inset ring-[#0EA5E9]/40'
                                : undefined
                            )}
                            onClick={() => {
                              if (row.link) openNotificationLink(row.link);
                            }}
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
                                {(row.subCaption || row.generatedDate) ? (
                                  <span
                                    className={cn(
                                      'break-words leading-snug',
                                      isUnread
                                        ? 'tm-text-semibold text-slate-600 dark:text-slate-300'
                                        : 'text-slate-400 dark:text-slate-600'
                                    )}
                                  >
                                    {row.subCaption}
                                    {row.subCaption && row.generatedDate ? ' - ' : ''}
                                    {row.generatedDate ? formatUtcDateTime(row.generatedDate) : ''}
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
                                {row.link ? (
                                  <ActionTip label="View link">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label="View link"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                      onClick={() => openNotificationLink(row.link!)}
                                    >
                                      <ExternalLink size={14} />
                                    </Button>
                                  </ActionTip>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination footer */}
                  <MasterPaginationBar
                    totalItems={totalRecords}
                    startIndex={(pageNo - 1) * itemsPerPage}
                    endIndex={Math.min(pageNo * itemsPerPage, totalRecords)}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => loadPage(1, size)}
                    currentPage={pageNo}
                    totalPages={totalPages}
                    onPageChange={(page) => loadPage(page, itemsPerPage)}
                    hideBelow={0}
                  />
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
