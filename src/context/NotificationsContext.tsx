import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface NotificationsContextType {
  /** Row keys marked read in this session (shared by header + page). */
  readKeys: ReadonlySet<string>;
  /** Badge — unread only; moves ±1 on mark read / unread. */
  unreadCount: number;
  /**
   * Seed unread from API once per session (login).
   * Does not wipe local read/unread adjustments on later list refreshes.
   */
  syncUnreadFromApi: (totalUnread: number) => void;
  /** Clear local read marks + badge (call on user/login change). */
  resetSession: () => void;
  /** Mark one row read → unreadCount - 1 */
  markRead: (rowKey: string) => void;
  /** Mark one row unread → unreadCount + 1 */
  markUnread: (rowKey: string) => void;
  /** Remove one row after delete (adjusts badge if it was unread). */
  removeKey: (rowKey: string) => void;
  setUnreadCount: (count: number) => void;
  isRead: (rowKey: string) => boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function toRowKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  const [unreadCount, setUnreadCountState] = useState(0);
  const readKeysRef = useRef(readKeys);
  readKeysRef.current = readKeys;
  /** Only seed badge from API once until provider remounts or resetSession(). */
  const seededRef = useRef(false);

  const setUnreadCount = useCallback((count: number) => {
    setUnreadCountState(Math.max(0, Number.isFinite(count) ? count : 0));
  }, []);

  const resetSession = useCallback(() => {
    seededRef.current = false;
    const empty = new Set<string>();
    readKeysRef.current = empty;
    setReadKeys(empty);
    setUnreadCountState(0);
  }, []);

  const syncUnreadFromApi = useCallback((totalUnread: number) => {
    const nextCount = Math.max(0, Number.isFinite(totalUnread) ? totalUnread : 0);
    // First seed: take API total and clear local marks
    if (!seededRef.current) {
      seededRef.current = true;
      const empty = new Set<string>();
      readKeysRef.current = empty;
      setReadKeys(empty);
      setUnreadCountState(nextCount);
      return;
    }
    // Later list refreshes: keep local read/unread and the adjusted counter
  }, []);

  const markRead = useCallback((rawKey: string) => {
    const key = toRowKey(rawKey);
    if (key == null) return;
    if (readKeysRef.current.has(key)) return;
    const next = new Set(readKeysRef.current);
    next.add(key);
    readKeysRef.current = next;
    setReadKeys(next);
    setUnreadCountState((n) => Math.max(0, n - 1));
  }, []);

  const markUnread = useCallback((rawKey: string) => {
    const key = toRowKey(rawKey);
    if (key == null) return;
    if (!readKeysRef.current.has(key)) return;
    const next = new Set(readKeysRef.current);
    next.delete(key);
    readKeysRef.current = next;
    setReadKeys(next);
    setUnreadCountState((n) => n + 1);
  }, []);

  const removeKey = useCallback((rawKey: string) => {
    const key = toRowKey(rawKey);
    if (key == null) return;
    // Already marked read → only drop from set (badge already excluded it)
    if (readKeysRef.current.has(key)) {
      const next = new Set(readKeysRef.current);
      next.delete(key);
      readKeysRef.current = next;
      setReadKeys(next);
      return;
    }
    // Still unread → badge - 1
    setUnreadCountState((n) => Math.max(0, n - 1));
  }, []);

  const isRead = useCallback(
    (rawKey: string) => {
      const key = toRowKey(rawKey);
      return key != null && (readKeysRef.current.has(key) || readKeys.has(key));
    },
    [readKeys]
  );

  const value = useMemo(
    () => ({
      readKeys,
      unreadCount,
      syncUnreadFromApi,
      resetSession,
      markRead,
      markUnread,
      removeKey,
      setUnreadCount,
      isRead,
    }),
    [readKeys, unreadCount, syncUnreadFromApi, resetSession, markRead, markUnread, removeKey, setUnreadCount, isRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}

/** Badge text — show real count so ±1 on read/unread is visible (cap 99+). */
export function formatUnreadBadge(count: number): string {
  const n = Math.max(0, Number.isFinite(count) ? count : 0);
  if (n <= 0) return '0';
  if (n > 99) return '99+';
  return String(n);
}
