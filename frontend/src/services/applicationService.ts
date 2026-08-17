/**
 * Application Service — applications + pipeline.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiApplicationCreated,
  ApiApplicationListItem,
  ApiMyApplication,
  ApiApplicationDetail,
  PaginatedApplications,
  BulkMoveResult,
  ApplicationQueryParams,
  ApplyInput,
  MoveStageInput,
  BulkMoveStageInput,
  MockRoundResultInput,
} from '@/types/application';

// ── Re-export mock data for gradual migration ──────────
import {
  mockApplications,
  mockStageHistory,
  mockRecruiterFeedback,
  getApplicationsByPosting,
  getApplicationsByStudent,
  getApplicationStats,
  getStageHistoryByApplication,
  getShortlistedForCompany,
} from '@/data/mockApplicationData';
import type { Application, ApplicationStageHistory, RecruiterFeedback } from '@/types/application';

export {
  mockApplications,
  mockStageHistory,
  mockRecruiterFeedback,
  getApplicationsByPosting,
  getApplicationsByStudent,
  getApplicationStats,
  getStageHistoryByApplication,
  getShortlistedForCompany,
};

// ── Helper ─────────────────────────────────────────────

class ApplicationApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApplicationApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new ApplicationApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

const MAX_APPLICATION_LIMIT = 100;

function normalizeApplicationQuery(params: ApplicationQueryParams = {}) {
  const { page, limit, ...rest } = params;

  return {
    ...rest,
    page: page !== undefined ? Math.max(1, page) : undefined,
    limit: limit !== undefined ? Math.min(Math.max(1, limit), MAX_APPLICATION_LIMIT) : undefined,
  };
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

// ── Real API ───────────────────────────────────────────

const applicationApi = {
  // ── Student endpoints ──
  apply: async (data: ApplyInput): Promise<ApiApplicationCreated> => {
    const res = await apiClient.post<ApiApplicationCreated>('/applications/apply', data);
    return throwIfError(res, 201);
  },

  getMyApplications: async (): Promise<ApiMyApplication[]> => {
    const res = await apiClient.get<{ applications: ApiMyApplication[] }>('/applications/my');
    return throwIfError(res).applications;
  },

  withdraw: async (applicationId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/applications/${applicationId}/withdraw`);
    throwIfError(res);
  },

  // ── Admin endpoints ──
  getApplications: async (params: ApplicationQueryParams = {}): Promise<PaginatedApplications> => {
    const normalized = normalizeApplicationQuery(params);
    const res = await apiClient.get<PaginatedApplications>(`/applications${toQueryString(normalized)}`);
    return throwIfError(res);
  },

  getAllApplications: async (params: ApplicationQueryParams = {}): Promise<ApiApplicationListItem[]> => {
    const { page: _page, limit: _limit, ...filters } = params;
    void _page;
    void _limit;
    const applications: ApiApplicationListItem[] = [];
    let page = 1;

    // The API caps application pagination at 100 items per request, so we stitch
    // together every page for selection screens that need the full candidate list.
    while (true) {
      const res = await apiClient.get<PaginatedApplications>(
        `/applications${toQueryString({ ...filters, page, limit: MAX_APPLICATION_LIMIT })}`
      );
      const result = throwIfError(res);
      applications.push(...result.data);

      if (result.pagination.totalPages <= page || result.data.length === 0) {
        break;
      }

      page += 1;
    }

    return applications;
  },

  getApplicationDetail: async (applicationId: string): Promise<ApiApplicationDetail> => {
    const res = await apiClient.get<ApiApplicationDetail>(`/applications/${applicationId}`);
    return throwIfError(res);
  },

  moveStage: async (applicationId: string, data: MoveStageInput): Promise<ApiApplicationDetail> => {
    const res = await apiClient.put<ApiApplicationDetail>(`/applications/${applicationId}/stage`, data);
    return throwIfError(res);
  },

  bulkMoveStage: async (data: BulkMoveStageInput): Promise<BulkMoveResult> => {
    const res = await apiClient.put<BulkMoveResult>('/applications/bulk/stage', data);
    return throwIfError(res);
  },

  setMockRoundResult: async (applicationId: string, data: MockRoundResultInput): Promise<ApiApplicationDetail> => {
    const res = await apiClient.put<ApiApplicationDetail>(`/applications/${applicationId}/mock-result`, data);
    return throwIfError(res);
  },
};

// ── Combined export ────────────────────────────────────

export const applicationService = {
  // Real API methods
  ...applicationApi,

  // Legacy mock methods
  getApplicationsLegacy: async (): Promise<Application[]> => mockApplications,
  getApplicationsByPostingLegacy: async (postingId: string) => getApplicationsByPosting(postingId),
  getApplicationsByStudentLegacy: async (studentId: string) => getApplicationsByStudent(studentId),
  getApplicationStatsLegacy: async (postingId?: string) => getApplicationStats(postingId),
  getStageHistoryLegacy: async (applicationId: string): Promise<ApplicationStageHistory[]> =>
    mockStageHistory.filter(h => h.application_id === applicationId),
  getStageHistoryByApplicationLegacy: async (applicationId: string) => getStageHistoryByApplication(applicationId),
  getRecruiterFeedbackLegacy: async (applicationId: string): Promise<RecruiterFeedback[]> =>
    (mockRecruiterFeedback || []).filter((f: RecruiterFeedback) => f.application_id === applicationId),
  getShortlistedForCompanyLegacy: async (companyId: string) => getShortlistedForCompany(companyId),
};

export { ApplicationApiError };
