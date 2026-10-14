import { dbService } from './dbService';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { toErrorMessage } from '@/lib/toErrorMessage';

// In local development route API calls through Vite so the browser does not need
// cross-origin permission from the UAT API. Production keeps the configured API URL. Inside the Spectrum
// ERP shell the page is on the shell's origin, whose /api is SpectrumERP-API, so call this API directly.
const BASE_URL =
  import.meta.env.DEV && !import.meta.env.VITE_TASK_ROUTE_BASE ? '' : import.meta.env.VITE_API_BASE_URL;

/** API origin for callers that fetch outside apiService (files, images): '' in dev, where Vite proxies /api. */
export const API_BASE_URL: string = BASE_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  /** Skip error toasts — for callers that handle failure themselves (e.g. fall back to sample data). 401 still signs out. */
  silent?: boolean;
}

const getErrorMessage = (data: any, status: number): string => {
  if (data?.errors?.[0]?.errorMessage) return toErrorMessage(data.errors[0].errorMessage, `HTTP Error ${status}`);
  if (data?.errorMessage) return toErrorMessage(data.errorMessage, `HTTP Error ${status}`);
  if (data?.message) return toErrorMessage(data.message, `HTTP Error ${status}`);
  if (data?.error) return toErrorMessage(data.error, `HTTP Error ${status}`);
  if (data?.title) return toErrorMessage(data.title, `HTTP Error ${status}`);
  return `HTTP Error ${status}`;
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    const errorMsg = getErrorMessage(data, status);
    super(errorMsg);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `${endpoint.includes('?') ? '&' : '?'}${searchParams.toString()}`;
  }
  return url;
}

/** Collapse concurrent identical GETs (StrictMode remount, parent+child) into one network call. */
const pendingGets = new Map<string, Promise<unknown>>();

function getDedupeKey(endpoint: string, params?: Record<string, string>): string {
  if (!params) return endpoint;
  const searchParams = new URLSearchParams(params);
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${searchParams.toString()}`;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, silent = false, ...rest } = options;
  const notifyError: typeof toast.error = (...args) => (silent ? '' : toast.error(...args));

  const url = buildUrl(endpoint, params);

  const defaultHeaders: Record<string, string> = {};
  if (!(rest.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Get token from encrypted IndexedDB storage
  const token = await dbService.getItem<string>('auth_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    // An HTML page (e.g. a dev server's index.html fallback when /api is not proxied) is never API data;
    // fail loudly instead of handing callers `null` as if the call succeeded.
    if (response.ok && (response.headers.get('content-type') ?? '').includes('text/html')) {
      const message = `API returned a web page instead of data (${endpoint}). Check the API URL / dev proxy.`;
      console.error(message, url);
      notifyError('API returned a web page instead of data. Check the API URL / dev proxy.', { id: 'api-html-response' });
      throw new ApiError(response.status, { message });
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        void useAuthStore.getState().logout({ returnTo: `${window.location.pathname}${window.location.search}` });
      } else {
        const errorMessage = getErrorMessage(data, response.status);
        notifyError(errorMessage);
      }
      throw new ApiError(response.status, data);
    }

    if (data && typeof data === 'object' && data.success === false) {
      const errorMessage = toErrorMessage(
        data.message ?? data.error,
        'Operation failed'
      );
      if (errorMessage) {
        notifyError(errorMessage);
      }
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    // Check if it's a network error (TypeError usually implies network/cors issues)
    if (error instanceof TypeError) {
      notifyError('Network error or server unreachable. Please check your connection.');
    }
    
    throw new Error('Network error or server unreachable');
  }
}

/** Dev only: flag a GET that reaches the network again within a few seconds (a likely double load). */
const lastGetAt = new Map<string, number>();
function warnIfRepeated(key: string) {
  if (!import.meta.env.DEV) return;
  const now = Date.now();
  const before = lastGetAt.get(key);
  lastGetAt.set(key, now);
  if (before !== undefined && now - before < 3000) {
    console.warn(`[duplicate API] GET ${key} again after ${now - before} ms`, new Error('called from').stack);
  }
}

export const apiService = {
  get: <T>(endpoint: string, options?: RequestOptions) => {
    const key = getDedupeKey(endpoint, options?.params);
    const existing = pendingGets.get(key);
    if (existing) return existing as Promise<T>;

    warnIfRepeated(key);
    const promise = request<T>(endpoint, { ...options, method: 'GET' }).finally(() => {
      if (pendingGets.get(key) === promise) pendingGets.delete(key);
    });
    pendingGets.set(key, promise);
    return promise;
  },

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  postMultipart: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: formData }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  putMultipart: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: formData }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
