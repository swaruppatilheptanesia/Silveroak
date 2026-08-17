/**
 * Internship Service — internship tracking, issues.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiInternshipBase,
  ApiInternshipDetail,
  ApiInternshipIssue,
  ApiInternshipListItem,
  ApiInternshipStudentSummary,
  ApiMyInternship,
  CreateInternshipInput,
  CreateIssueInput,
  InternshipQueryParams,
  InternshipDocumentUpload,
  PaginatedInternships,
  UpdateInternshipInput,
} from '@/types/internship';

// ── Re-export mock data for gradual migration ──────────
import {
  mockInternships,
  mockInternshipIssues,
  getInternshipsByStudent,
  getInternshipsByCompany,
  getInternshipsByDepartment,
  getIssuesByInternship,
  getOpenIssuesCount,
  getInternshipStats,
  getCertificateDueAlerts,
} from '@/data/mockInternshipData';
import type { InternshipIssue, InternshipRecord } from '@/types/internship';

export {
  mockInternships,
  mockInternshipIssues,
  getInternshipsByStudent,
  getInternshipsByCompany,
  getInternshipsByDepartment,
  getIssuesByInternship,
  getOpenIssuesCount,
  getInternshipStats,
  getCertificateDueAlerts,
};

// ── Helper ─────────────────────────────────────────────

class InternshipApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'InternshipApiError';
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
  hasPrev?: boolean;
  has_next?: boolean;
  has_prev?: boolean;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new InternshipApiError(parsed.message, res.status, parsed.code, parsed.details);
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

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
}

function normalizeStudent(raw: any): ApiInternshipStudentSummary {
  return {
    id: raw.id,
    full_name: raw.full_name,
    enrollment_number: raw.enrollment_number,
    department: raw.department,
    batch: raw.batch,
    email: raw.email,
    mobile: raw.mobile,
  };
}

function normalizeIssue(raw: any): ApiInternshipIssue {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    status: raw.status,
    created_at: raw.created_at,
    resolved_at: raw.resolved_at ?? null,
    reported_by_user: raw.reported_by_user
      ? {
          id: raw.reported_by_user.id,
          name: raw.reported_by_user.name,
        }
      : null,
  };
}

function normalizeBase(raw: any): ApiInternshipBase {
  return {
    id: raw.id,
    company_id: raw.company_id ?? null,
    company_name: raw.company_name,
    role: raw.role,
    department: raw.department ?? null,
    posting_type: raw.posting_type ?? raw.offer?.posting?.type ?? null,
    internship_type: raw.internship_type,
    status: raw.status,
    start_date: raw.start_date,
    end_date: raw.end_date ?? null,
    stipend_amount: normalizeNullableNumber(raw.stipend_amount),
    stipend_frequency: raw.stipend_frequency ?? null,
    is_receiving_stipend: Boolean(raw.is_receiving_stipend),
    certificate_uploaded: Boolean(raw.certificate_uploaded),
    certificate_url: raw.certificate_url ?? null,
    offer_id: raw.offer_id ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function normalizeMyInternship(raw: any): ApiMyInternship {
  return {
    ...normalizeBase(raw),
    issues: Array.isArray(raw.issues) ? raw.issues.map(normalizeIssue) : [],
  };
}

function normalizeInternshipListItem(raw: any): ApiInternshipListItem {
  return {
    ...normalizeBase(raw),
    student: normalizeStudent(raw.student),
    issue_count: typeof raw.issue_count === 'number' ? raw.issue_count : 0,
    open_issue_count: typeof raw.open_issue_count === 'number' ? raw.open_issue_count : 0,
  };
}

function normalizeInternshipDetail(raw: any): ApiInternshipDetail {
  return {
    ...normalizeBase(raw),
    student: normalizeStudent(raw.student),
    issues: Array.isArray(raw.issues) ? raw.issues.map(normalizeIssue) : [],
  };
}

function normalizePagination(raw: RawPaginationMeta): PaginatedInternships['pagination'] {
  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages: raw.totalPages ?? raw.total_pages ?? 1,
    hasNext: raw.hasNext ?? raw.has_next ?? false,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? false,
  };
}

// ── Real API ───────────────────────────────────────────

const internshipApi = {
  getMyInternships: async (): Promise<ApiMyInternship[]> => {
    const res = await apiClient.get<{ internships: any[] }>('/internships/my');
    return throwIfError(res).internships.map(normalizeMyInternship);
  },

  createInternship: async (data: CreateInternshipInput): Promise<ApiInternshipDetail> => {
    const res = await apiClient.post<any>('/internships', data);
    return normalizeInternshipDetail(throwIfError(res, 201));
  },

  uploadInternshipDocument: async (file: File): Promise<InternshipDocumentUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/internships/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new InternshipApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  getInternships: async (params: InternshipQueryParams = {}): Promise<PaginatedInternships> => {
    const res = await apiClient.get<{ data: any[]; pagination: RawPaginationMeta }>(
      `/internships${toQueryString(params)}`
    );
    const payload = throwIfError(res);
    return {
      data: payload.data.map(normalizeInternshipListItem),
      pagination: normalizePagination(payload.pagination),
    };
  },

  getInternshipDetail: async (internshipId: string): Promise<ApiInternshipDetail> => {
    const res = await apiClient.get<any>(`/internships/${internshipId}`);
    return normalizeInternshipDetail(throwIfError(res));
  },

  updateInternship: async (internshipId: string, data: UpdateInternshipInput): Promise<ApiInternshipDetail> => {
    const res = await apiClient.put<any>(`/internships/${internshipId}`, data);
    return normalizeInternshipDetail(throwIfError(res));
  },

  createIssue: async (internshipId: string, data: CreateIssueInput): Promise<ApiInternshipIssue> => {
    const res = await apiClient.post<any>(`/internships/${internshipId}/issues`, data);
    return normalizeIssue(throwIfError(res, 201));
  },

  resolveIssue: async (issueId: string): Promise<ApiInternshipIssue> => {
    const res = await apiClient.put<any>(`/internships/issues/${issueId}/resolve`, { status: 'resolved' });
    return normalizeIssue(throwIfError(res));
  },
};

// ── Combined export ────────────────────────────────────

export const internshipService = {
  ...internshipApi,

  // Legacy mock methods
  getInternshipsLegacy: async (): Promise<InternshipRecord[]> => mockInternships,
  getInternshipsByStudentLegacy: async (studentId: string) => getInternshipsByStudent(studentId),
  getInternshipsByCompanyLegacy: async (companyId: string) => getInternshipsByCompany(companyId),
  getInternshipsByDepartmentLegacy: async (dept: string) => getInternshipsByDepartment(dept),
  getIssuesLegacy: async (): Promise<InternshipIssue[]> => mockInternshipIssues,
  getIssuesByInternshipLegacy: async (id: string) => getIssuesByInternship(id),
  getOpenIssuesCountLegacy: async () => getOpenIssuesCount(),
  getStatsLegacy: async () => getInternshipStats(),
  getCertificateDueAlertsLegacy: async () => getCertificateDueAlerts(),
};

export { InternshipApiError };
