/**
 * Announcement Service — announcements, read receipts, consent.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  Announcement,
  AnnouncementReceipt,
  ApiAnnouncementDetail,
  ApiAnnouncementListItem,
  PaginatedAnnouncements,
  AnnouncementQueryParams,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementAttachmentUpload,
  AnnouncementAudienceScopeParams,
  AnnouncementAudienceSemesterOptions,
} from '@/types/announcement';

import {
  mockAnnouncements,
  mockAnnouncementReceipts,
  getAnnouncementStats,
  getStudentAnnouncements,
  getReceiptsForAnnouncement,
} from '@/data/mockAnnouncementData';

export {
  mockAnnouncements,
  mockAnnouncementReceipts,
  getAnnouncementStats,
  getStudentAnnouncements,
  getReceiptsForAnnouncement,
};

class AnnouncementApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'AnnouncementApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  total_pages?: number;
  hasNext?: boolean;
  has_next?: boolean;
  hasPrev?: boolean;
  has_prev?: boolean;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new AnnouncementApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function toQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function normalizePagination(raw: RawPaginationMeta): PaginatedAnnouncements['pagination'] {
  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages: raw.totalPages ?? raw.total_pages ?? 1,
    hasNext: raw.hasNext ?? raw.has_next ?? false,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? false,
  };
}

function normalizeAnnouncementListItem(item: ApiAnnouncementListItem): ApiAnnouncementListItem {
  return {
    ...item,
    target_institutes: item.target_institutes ?? [],
    target_courses: item.target_courses ?? [],
    target_branches: item.target_branches ?? [],
    target_batches: item.target_batches ?? [],
    target_departments: item.target_departments ?? [],
    target_semesters: item.target_semesters ?? [],
    created_by_user: item.created_by_user ?? null,
    my_receipt: item.my_receipt ?? null,
  };
}

function normalizeAnnouncementDetail(item: ApiAnnouncementDetail): ApiAnnouncementDetail {
  return {
    ...normalizeAnnouncementListItem(item),
    linked_circular: item.linked_circular ?? null,
    receipts: item.receipts ?? [],
  };
}

const announcementApi = {
  getAnnouncements: async (params: AnnouncementQueryParams = {}): Promise<PaginatedAnnouncements> => {
    const res = await apiClient.get<{ data: ApiAnnouncementListItem[]; pagination: RawPaginationMeta }>(
      `/announcements${toQueryString(params)}`
    );
    const payload = throwIfError(res);

    return {
      data: payload.data.map(normalizeAnnouncementListItem),
      pagination: normalizePagination(payload.pagination),
    };
  },

  getAudienceSemesterOptions: async (
    scope: AnnouncementAudienceScopeParams = {},
  ): Promise<AnnouncementAudienceSemesterOptions> => {
    // Arrays are sent comma-separated; the backend query schema accepts that form.
    const res = await apiClient.get<AnnouncementAudienceSemesterOptions>(
      `/announcements/audience/semesters${toQueryString({
        institutes: scope.institutes?.length ? scope.institutes.join(',') : undefined,
        courses: scope.courses?.length ? scope.courses.join(',') : undefined,
        branches: scope.branches?.length ? scope.branches.join(',') : undefined,
      })}`,
    );
    const payload = throwIfError(res);

    return {
      semesters: payload.semesters ?? [],
      total_students: payload.total_students ?? 0,
    };
  },

  getAnnouncementDetail: async (announcementId: string): Promise<ApiAnnouncementDetail> => {
    const res = await apiClient.get<ApiAnnouncementDetail>(`/announcements/${announcementId}`);
    return normalizeAnnouncementDetail(throwIfError(res));
  },

  createAnnouncement: async (data: CreateAnnouncementInput): Promise<ApiAnnouncementDetail> => {
    const res = await apiClient.post<ApiAnnouncementDetail>('/announcements', data);
    return normalizeAnnouncementDetail(throwIfError(res, 201));
  },

  uploadAttachment: async (file: File): Promise<AnnouncementAttachmentUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/announcements/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new AnnouncementApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  updateAnnouncement: async (announcementId: string, data: UpdateAnnouncementInput): Promise<ApiAnnouncementDetail> => {
    const res = await apiClient.put<ApiAnnouncementDetail>(`/announcements/${announcementId}`, data);
    return normalizeAnnouncementDetail(throwIfError(res));
  },

  publishAnnouncement: async (announcementId: string): Promise<ApiAnnouncementDetail> => {
    const res = await apiClient.put<ApiAnnouncementDetail>(`/announcements/${announcementId}/publish`, {});
    return normalizeAnnouncementDetail(throwIfError(res));
  },

  archiveAnnouncement: async (announcementId: string): Promise<ApiAnnouncementDetail> => {
    const res = await apiClient.put<ApiAnnouncementDetail>(`/announcements/${announcementId}/archive`, {});
    return normalizeAnnouncementDetail(throwIfError(res));
  },

  markAsRead: async (announcementId: string): Promise<unknown> => {
    const res = await apiClient.put<unknown>(`/announcements/${announcementId}/read`, {});
    return throwIfError(res);
  },

  giveConsent: async (announcementId: string): Promise<unknown> => {
    const res = await apiClient.put<unknown>(`/announcements/${announcementId}/consent`, {});
    return throwIfError(res);
  },
};

export const announcementService = {
  ...announcementApi,

  getAnnouncementsLegacy: async (): Promise<Announcement[]> => mockAnnouncements,
  getAnnouncementStatsLegacy: async () => getAnnouncementStats(),
  getStudentAnnouncementsLegacy: async (dept: string, batch: string) => getStudentAnnouncements(dept, batch),
  getReceiptsLegacy: async (announcementId: string): Promise<AnnouncementReceipt[]> =>
    getReceiptsForAnnouncement(announcementId),
};

export { AnnouncementApiError };
