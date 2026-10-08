import { dbService } from './dbService';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { toErrorMessage } from '@/lib/toErrorMessage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
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
  const { params, headers, ...rest } = options;

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

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.setState({ isSessionTimeoutOpen: true });
      } else {
        const errorMessage = getErrorMessage(data, response.status);
        toast.error(errorMessage);
      }
      throw new ApiError(response.status, data);
    }

    if (data && typeof data === 'object' && data.success === false) {
      const errorMessage = toErrorMessage(
        data.message ?? data.error,
        'Operation failed'
      );
      if (errorMessage) {
        toast.error(errorMessage);
      }
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    // Check if it's a network error (TypeError usually implies network/cors issues)
    if (error instanceof TypeError) {
      toast.error('Network error or server unreachable. Please check your connection.');
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
