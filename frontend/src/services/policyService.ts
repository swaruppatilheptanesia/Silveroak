/**
 * Policy Service — CRUD for placement policies.
 * Real API calls only (no mock data for this module).
 */
import { apiClient, tokenManager } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiPolicyDetail,
  PaginatedPolicies,
  PolicyQueryParams,
  CreatePolicyInput,
  UpdatePolicyInput,
  PolicyAudienceOption,
  PolicyDocumentUpload,
} from '@/types/policy';

class PolicyApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'PolicyApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPolicyPagination {
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

interface RawPaginatedPolicies {
  data: PaginatedPolicies['data'];
  pagination: RawPolicyPagination;
}

interface RawAudienceOptions {
  data: PolicyAudienceOption[];
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new PolicyApiError(parsed.message, res.status, parsed.code, parsed.details);
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

function normalizePagination(raw: RawPolicyPagination): PaginatedPolicies['pagination'] {
  const totalPages = (
    raw.totalPages
    ?? raw.total_pages
    ?? Math.ceil(raw.total / raw.limit)
    ?? 1
  ) || 1;

  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages,
    hasNext: raw.hasNext ?? raw.has_next ?? raw.page < totalPages,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? raw.page > 1,
  };
}

export const policyService = {
  getPolicies: async (params: PolicyQueryParams = {}): Promise<PaginatedPolicies> => {
    const res = await apiClient.get<RawPaginatedPolicies>(`/policies${toQueryString(params)}`);
    const payload = throwIfError(res);
    return {
      data: payload.data,
      pagination: normalizePagination(payload.pagination),
    };
  },

  getPolicyDetail: async (id: string): Promise<ApiPolicyDetail> => {
    const res = await apiClient.get<ApiPolicyDetail>(`/policies/${id}`);
    return throwIfError(res);
  },

  createPolicy: async (data: CreatePolicyInput): Promise<ApiPolicyDetail> => {
    const res = await apiClient.post<ApiPolicyDetail>('/policies', data);
    return throwIfError(res, 201);
  },

  updatePolicy: async (id: string, data: UpdatePolicyInput): Promise<ApiPolicyDetail> => {
    const res = await apiClient.put<ApiPolicyDetail>(`/policies/${id}`, data);
    return throwIfError(res);
  },

  uploadPolicyDocument: async (file: File): Promise<PolicyDocumentUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = tokenManager.getAccessToken();
    const response = await fetch(`${BASE_URL}/policies/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = parseApiErrorEnvelope(body, 'Upload failed');
      throw new PolicyApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return body as PolicyDocumentUpload;
  },

  getInstituteOptions: async (): Promise<PolicyAudienceOption[]> => {
    const res = await apiClient.get<RawAudienceOptions>('/policies/audience/institutes');
    return throwIfError(res).data;
  },

  getCourseOptions: async (instituteId: number): Promise<PolicyAudienceOption[]> => {
    const res = await apiClient.get<RawAudienceOptions>(`/policies/audience/courses?InstituteId=${instituteId}`);
    return throwIfError(res).data;
  },

  getBranchOptions: async (courseId: number): Promise<PolicyAudienceOption[]> => {
    const res = await apiClient.get<RawAudienceOptions>(`/policies/audience/branches?CourseId=${courseId}`);
    return throwIfError(res).data;
  },

  deletePolicy: async (id: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/policies/${id}`);
    throwIfError(res);
  },
};

export { PolicyApiError };
