import Cookies from 'js-cookie';
import { apiService } from './apiService';
import { getCurrentLoginNo } from '@/lib/taskAccess';
import { withBase } from '@/lib/basePath';

export type PopUpNotification = {
  notificationJobDetailNo: number;
  caption: string;
  subCaption?: string;
  formNo?: number;
  link?: string;
  generatedDate?: string;
  /**
   * Client-unique row key. The API can repeat the same notificationJobDetailNo
   * across different rows — never use that id alone for read/unread/delete.
   */
  rowKey: string;
};

export type PopUpNotificationData = {
  pagination?: {
    totalRecords?: number;
    totalUnreadCount?: number;
    pageNo?: number;
    pageSize?: number;
    totalPages?: number;
  };
  notifications?: PopUpNotification[];
};

export type PopUpNotificationResult = {
  data: PopUpNotificationData;
};

function emptyData(pageNo: number, pageSize: number): PopUpNotificationData {
  return {
    notifications: [],
    pagination: {
      totalUnreadCount: 0,
      totalRecords: 0,
      pageNo,
      pageSize,
      totalPages: 0,
    },
  };
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function pickLoginFromClaims(claims: Record<string, unknown> | null): string | number | null {
  if (!claims) return null;
  const fromToken =
    claims.loginNo ??
    claims.LoginNo ??
    claims.loginNO ??
    claims.userId ??
    claims.UserId ??
    claims.sub;
  if (fromToken != null && String(fromToken).trim() !== '') {
    const n = Number(fromToken);
    if (Number.isFinite(n) && n > 0) return n;
    return fromToken as string | number;
  }
  return null;
}

/**
 * Resolve LoginNo — same priority as the rest of Task Management:
 * 1) auth user LoginNo/loginNo
 * 2) JWT from in-memory token / auth_token cookie
 */
export function resolveLoginNo(
  user?: Record<string, unknown> | null,
  token?: string | null
): string | number | null {
  const fromUser = getCurrentLoginNo(user);
  if (fromUser != null) return fromUser;

  const tokenStr = token || Cookies.get('auth_token') || null;
  if (tokenStr) {
    const fromClaims = pickLoginFromClaims(parseJwt(tokenStr));
    if (fromClaims != null) return fromClaims;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Stable per-row key when API reuses the same notificationJobDetailNo. */
export function makeNotificationRowKey(
  n: Pick<PopUpNotification, 'notificationJobDetailNo' | 'caption' | 'subCaption'>,
  pageNo: number,
  index: number
): string {
  return `${pageNo}:${index}:${n.notificationJobDetailNo}:${n.caption}:${n.subCaption ?? ''}`;
}

function normalizeNotification(
  raw: unknown,
  pageNo: number,
  index: number
): PopUpNotification | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = Number(row.notificationJobDetailNo ?? row.NotificationJobDetailNo);
  if (!Number.isFinite(id) || id <= 0) return null;
  const caption = String(row.caption ?? row.Caption ?? '');
  const subCaption = (row.subCaption ?? row.SubCaption) as string | undefined;
  return {
    notificationJobDetailNo: id,
    caption,
    subCaption,
    formNo: (row.formNo ?? row.FormNo) as number | undefined,
    link: (row.link ?? row.Link) as string | undefined,
    generatedDate: (row.generatedDate ?? row.GeneratedDate) as string | undefined,
    rowKey: makeNotificationRowKey(
      { notificationJobDetailNo: id, caption, subCaption },
      pageNo,
      index
    ),
  };
}

function normalizePayload(raw: unknown, pageNo: number, pageSize: number): PopUpNotificationData {
  const root = asRecord(raw);
  if (!root) return emptyData(pageNo, pageSize);

  // Accept { success, data }, { Success, Data }, or bare payload
  const nested =
    asRecord(root.data) ??
    asRecord(root.Data) ??
    (Array.isArray(root.notifications) || Array.isArray(root.Notifications) || asRecord(root.pagination) || asRecord(root.Pagination)
      ? root
      : null);

  const payload = nested ?? emptyData(pageNo, pageSize);
  const payloadRec = asRecord(payload) ?? {};
  const paginationRec =
    asRecord(payloadRec.pagination) ?? asRecord(payloadRec.Pagination) ?? {};
  const listRaw = payloadRec.notifications ?? payloadRec.Notifications ?? [];
  const list = Array.isArray(listRaw)
    ? listRaw
      .map((item, index) => normalizeNotification(item, pageNo, index))
      .filter((n): n is PopUpNotification => n != null)
    : [];

  return {
    notifications: list,
    pagination: {
      totalUnreadCount: Number(paginationRec.totalUnreadCount ?? paginationRec.TotalUnreadCount ?? list.length) || 0,
      totalRecords: Number(paginationRec.totalRecords ?? paginationRec.TotalRecords ?? list.length) || 0,
      pageNo: Number(paginationRec.pageNo ?? paginationRec.PageNo ?? pageNo) || pageNo,
      pageSize: Number(paginationRec.pageSize ?? paginationRec.PageSize ?? pageSize) || pageSize,
      totalPages: Number(paginationRec.totalPages ?? paginationRec.TotalPages ?? 0) || 0,
    },
  };
}

/**
 * GET `/api/notifications/pop-up-notification?LoginNo&PageNo&PageSize`
 */
export async function fetchPopUpNotifications(params: {
  loginNo?: string | number | null;
  pageNo?: number;
  pageSize?: number;
}): Promise<PopUpNotificationResult> {
  const pageNo = params.pageNo ?? 1;
  const pageSize = params.pageSize ?? 10;

  if (params.loginNo == null || String(params.loginNo).trim() === '') {
    console.warn('[notifications] LoginNo missing — skipping API call');
    return { data: emptyData(pageNo, pageSize) };
  }

  try {
    const res = await apiService.get<unknown>('/api/notifications/pop-up-notification', {
      params: {
        LoginNo: String(params.loginNo),
        PageNo: String(pageNo),
        PageSize: String(pageSize),
      },
    });

    const root = asRecord(res);
    const successFlag = root?.success ?? root?.Success;
    if (successFlag === false) {
      console.warn('[notifications] API request failed', res);
      return { data: emptyData(pageNo, pageSize) };
    }

    return { data: normalizePayload(res, pageNo, pageSize) };
  } catch (error) {
    console.warn('[notifications] API error', error);
    return { data: emptyData(pageNo, pageSize) };
  }
}

export function openNotificationLink(link: string) {
  const href = (link || '').trim();
  if (!href) return false;
  if (/^https?:\/\//i.test(href)) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  }
  // In-app relative path (e.g. /task/74) — under the app's base when hosted inside the CRM.
  if (href.startsWith('/')) {
    window.location.assign(withBase(href));
    return true;
  }
  return false;
}
