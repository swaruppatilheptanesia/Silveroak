/**
 * No-Dues Service — NDC requests, review, issuance.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient, tokenManager } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiNoDuesDetail,
  ApiNoDuesListItem,
  ApiNoDuesMyItem,
  CreateNoDuesInput,
  EnableNoDuesEligibilityResult,
  ImportNoDuesEligibilityResult,
  NoDuesEligibility,
  NoDuesProofUpload,
  NoDuesQueryParams,
  PaginatedNoDues,
  ReviewNoDuesInput,
} from '@/types/noDues';

import { mockNoDuesRequests } from '@/data/mockNoDuesData';
import type { NoDuesRequest } from '@/types/noDues';

export { mockNoDuesRequests };

class NoDuesApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'NoDuesApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawNoDuesPagination {
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

interface RawPaginatedNoDues {
  data: ApiNoDuesListItem[];
  pagination: RawNoDuesPagination;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new NoDuesApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function toQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function normalizePagination(pagination: RawNoDuesPagination): PaginatedNoDues['pagination'] {
  const totalPages = (
    pagination.totalPages
    ?? pagination.total_pages
    ?? Math.ceil(pagination.total / pagination.limit)
    ?? 1
  ) || 1;

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages,
    hasNext: pagination.hasNext ?? pagination.has_next ?? pagination.page < totalPages,
    hasPrev: pagination.hasPrev ?? pagination.has_prev ?? pagination.page > 1,
  };
}

const noDuesApi = {
  getMyRequests: async (): Promise<ApiNoDuesMyItem[]> => {
    const res = await apiClient.get<{ requests: ApiNoDuesMyItem[] }>('/no-dues/my');
    return throwIfError(res).requests;
  },

  getMyEligibility: async (): Promise<NoDuesEligibility> => {
    const res = await apiClient.get<NoDuesEligibility>('/no-dues/eligibility/my');
    return throwIfError(res);
  },

  createRequest: async (data: CreateNoDuesInput): Promise<ApiNoDuesDetail> => {
    const res = await apiClient.post<ApiNoDuesDetail>('/no-dues', data);
    return throwIfError(res, 201);
  },

  uploadProof: async (file: File): Promise<NoDuesProofUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = tokenManager.getAccessToken();
    const response = await fetch(`${baseUrl}/no-dues/proof`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new NoDuesApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  resubmitRequest: async (id: string, data: CreateNoDuesInput): Promise<ApiNoDuesDetail> => {
    const res = await apiClient.put<ApiNoDuesDetail>(`/no-dues/${id}/resubmit`, data);
    return throwIfError(res);
  },

  getRequests: async (params: NoDuesQueryParams = {}): Promise<PaginatedNoDues> => {
    const res = await apiClient.get<RawPaginatedNoDues>(`/no-dues${toQueryString(params)}`);
    const data = throwIfError(res);

    return {
      data: data.data,
      pagination: normalizePagination(data.pagination),
    };
  },

  getRequestDetail: async (id: string): Promise<ApiNoDuesDetail> => {
    const res = await apiClient.get<ApiNoDuesDetail>(`/no-dues/${id}`);
    return throwIfError(res);
  },

  reviewRequest: async (id: string, data: ReviewNoDuesInput): Promise<ApiNoDuesDetail> => {
    const res = await apiClient.put<ApiNoDuesDetail>(`/no-dues/${id}/review`, data);
    return throwIfError(res);
  },

  updateRequest: async (id: string, data: CreateNoDuesInput): Promise<ApiNoDuesDetail> => {
    const res = await apiClient.put<ApiNoDuesDetail>(`/no-dues/${id}`, data);
    return throwIfError(res);
  },

  importEligibility: async (file: File): Promise<ImportNoDuesEligibilityResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = tokenManager.getAccessToken();
    const response = await fetch(`${baseUrl}/no-dues/eligibility/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new NoDuesApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  enableEligibility: async (enrollmentNumber: string): Promise<EnableNoDuesEligibilityResult> => {
    const res = await apiClient.post<EnableNoDuesEligibilityResult>('/no-dues/eligibility/enable', {
      enrollment_number: enrollmentNumber,
    });
    return throwIfError(res);
  },

  issueNdc: async (id: string): Promise<ApiNoDuesDetail> => {
    const res = await apiClient.put<ApiNoDuesDetail>(`/no-dues/${id}/issue`, {});
    return throwIfError(res);
  },
};

export const noDuesService = {
  ...noDuesApi,

  getStudentRequestsLegacy: async (studentId: string): Promise<NoDuesRequest[]> =>
    mockNoDuesRequests.filter((request) => request.student_id === studentId),
  getAllRequestsLegacy: async (): Promise<NoDuesRequest[]> => mockNoDuesRequests,
};

export { NoDuesApiError };
