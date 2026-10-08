import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotifications, formatUnreadBadge } from '@/context/NotificationsContext';
import {
  fetchPopUpNotifications,
  resolveLoginNo,
  openNotificationLink,
  type PopUpNotification,
} from '@/services/notificationService';
import { formatUtcDateTime } from '@/lib/dateTime';
import { cn } from '@/lib/utils';

const ICON_TONES = [
  { box: 'bg-sky-500/15 text-sky-300' },
  { box: 'bg-emerald-500/15 text-emerald-300' },
] as const;

const PAGE_SIZE = 10;

/**
 * Header notification bell — popover + navigate to full Notifications page.
 */
export function NotificationNav() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const {
    unreadCount,
    readKeys,
    syncUnreadFromApi,
    resetSession,
    markRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PopUpNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [didInitialSync, setDidInitialSync] = useState(false);

  const refreshNotifications = useCallback(
    async (opts?: { syncCount?: boolean }) => {
      setLoading(true);
      try {
        const loginNo = resolveLoginNo(user as Record<string, unknown> | null, token);
        const result = await fetchPopUpNotifications({
          loginNo,
          pageNo: 1,
          pageSize: PAGE_SIZE,
        });
        const list = Array.isArray(result.data.notifications) ? result.data.notifications : [];
        const unread = Number(result.data.pagination?.totalUnreadCount);
        setItems(list);
        // Seed badge once — later opens must not reset ±1 counter
        if (opts?.syncCount !== false && !didInitialSync) {
          syncUnreadFromApi(Number.isFinite(unread) ? unread : list.length);
          setDidInitialSync(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [user, token, didInitialSync, syncUnreadFromApi]
  );

  const prevLoginRef = useRef<string | null>(null);

  useEffect(() => {
    const loginNo = String(
      resolveLoginNo(user as Record<string, unknown> | null, token) ?? ''
    );
    if (prevLoginRef.current !== loginNo) {
      prevLoginRef.current = loginNo;
      resetSession();
      setDidInitialSync(false);
    }
    void refreshNotifications({ syncCount: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  useEffect(() => {
    if (open) void refreshNotifications({ syncCount: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const badgeTotal = unreadCount;
  const badgeLabel = formatUnreadBadge(badgeTotal);

  const goToNotificationsPage = (focusKey?: string) => {
    setOpen(false);
    navigate(
      focusKey
        ? `/notifications?key=${encodeURIComponent(focusKey)}`
        : '/notifications'
    );
  };

  const handleItemClick = (item: PopUpNotification) => {
    if (item.rowKey) markRead(item.rowKey);
    if (item.link && openNotificationLink(item.link)) {
      setOpen(false);
      return;
    }
    goToNotificationsPage(item.rowKey || undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ActionTip label="Notifications">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-tour="notifications"
            aria-label={badgeTotal > 0 ? `Notifications, ${badgeTotal}` : 'Notifications'}
            className="relative h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200"
          >
            <Bell size={15} />
            {badgeTotal > 0 ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--tm-chrome)]"
              >
                {badgeLabel}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
      </ActionTip>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="flex w-[300px] max-h-[min(22rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-lg border-[var(--tm-border)] bg-[var(--tm-surface)] p-0 text-slate-100 shadow-[0_10px_28px_rgba(15,23,42,0.3)]"
      >
        <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--tm-border)] px-3 py-2">
          <h3 className="text-[13px] font-bold tracking-tight text-slate-100">Notifications</h3>
          {badgeTotal > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[9px] font-bold tabular-nums text-white">
              {badgeLabel}
            </span>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading && items.length === 0 ? (
            <div className="px-3 py-5 text-center text-[12px] text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-5 text-center text-[12px] text-slate-400">No notifications</div>
          ) : (
            <ul className="divide-y divide-[var(--tm-border)]">
              {items.map((item, index) => {
                const title = item.caption || 'Notification';
                const subtitle = item.subCaption || '';
                const unread = item.rowKey ? !readKeys.has(item.rowKey) : true;
                const tone = ICON_TONES[index % ICON_TONES.length];

                return (
                  <li key={item.rowKey || `notif-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left transition hover:bg-[var(--tm-muted)]"
                    >
                      <span className="flex w-1.5 shrink-0 justify-center">
                        {unread ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" aria-hidden />
                        ) : (
                          <span className="h-1.5 w-1.5" aria-hidden />
                        )}
                      </span>

                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                          tone.box
                        )}
                      >
                        <Bell size={13} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate text-[12px] leading-tight',
                            unread ? 'font-semibold text-slate-100' : 'font-normal text-slate-500'
                          )}
                        >
                          {title}
                        </span>
                        {(subtitle || item.generatedDate) ? (
                          <span
                            className={cn(
                              'mt-0.5 block truncate text-[10px] leading-tight',
                              unread ? 'text-slate-400' : 'text-slate-600'
                            )}
                          >
                            {subtitle}
                            {subtitle && item.generatedDate ? ' - ' : ''}
                            {item.generatedDate ? formatUtcDateTime(item.generatedDate) : ''}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-center border-t border-[var(--tm-border)] px-3 py-2.5">
          <button
            type="button"
            onClick={() => goToNotificationsPage()}
            className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-[#0EA5E9] transition hover:text-[#38BDF8]"
          >
            View All Notifications
            <span aria-hidden>→</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
