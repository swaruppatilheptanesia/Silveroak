import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiNotification,
  NotificationPreference,
  NotificationPreferencesResponse,
  NotificationQueryParams,
  PaginatedNotifications,
} from '@/types/notification';

class NotificationApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'NotificationApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  total_pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  has_next?: boolean;
  has_prev?: boolean;
}

interface RawNotificationsResponse {
  data: ApiNotification[];
  pagination: RawPagination;
  unread_count: number;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new NotificationApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function toQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function normalizePagination(raw: RawPagination): PaginatedNotifications['pagination'] {
  const totalPages = raw.totalPages ?? raw.total_pages ?? Math.ceil(raw.total / raw.limit) ?? 1;

  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages: totalPages || 1,
    hasNext: raw.hasNext ?? raw.has_next ?? raw.page < totalPages,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? raw.page > 1,
  };
}

const notificationApi = {
  getMyNotifications: async (params: NotificationQueryParams = {}): Promise<PaginatedNotifications> => {
    const res = await apiClient.get<RawNotificationsResponse>(`/notifications/me${toQueryString(params as Record<string, unknown>)}`);
    const payload = throwIfError(res);

    return {
      data: payload.data,
      pagination: normalizePagination(payload.pagination),
      unread_count: payload.unread_count ?? 0,
    };
  },

  markAsRead: async (notificationId: string): Promise<ApiNotification> => {
    const res = await apiClient.put<ApiNotification>(`/notifications/${notificationId}/read`, {});
    return throwIfError(res);
  },

  markAllAsRead: async (): Promise<{ message: string; updated_count: number }> => {
    const res = await apiClient.put<{ message: string; updated_count: number }>('/notifications/read-all', {});
    return throwIfError(res);
  },

  dismissNotification: async (notificationId: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/notifications/${notificationId}`);
    return throwIfError(res);
  },

  getMyPreferences: async (): Promise<NotificationPreferencesResponse> => {
    const res = await apiClient.get<NotificationPreferencesResponse>('/notifications/preferences/me');
    return throwIfError(res);
  },

  updateMyPreferences: async (preferences: NotificationPreference[]): Promise<NotificationPreferencesResponse> => {
    const res = await apiClient.put<NotificationPreferencesResponse>('/notifications/preferences/me', { preferences });
    return throwIfError(res);
  },
};

export const notificationService = {
  ...notificationApi,
};

export { NotificationApiError };
