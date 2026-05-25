import { dbService } from './dbService';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

const getErrorMessage = (data: any, status: number): string => {
  if (data?.errors?.[0]?.errorMessage) return data.errors[0].errorMessage;
  if (data?.errorMessage) return data.errorMessage;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (data?.title) return data.title;
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

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

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
        import('@/store/useAuthStore').then(({ useAuthStore }) => {
          useAuthStore.setState({ isSessionTimeoutOpen: true });
        });
      } else {
        const errorMessage = getErrorMessage(data, response.status);
        toast.error(errorMessage);
      }
      throw new ApiError(response.status, data);
    }

    if (data && typeof data === 'object' && data.success === false) {
      const errorMessage = data.message || data.error || 'Operation failed';
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

export const apiService = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

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
