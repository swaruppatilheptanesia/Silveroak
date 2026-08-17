/**
 * Employer Service — companies, recruiters, engagements.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient, tokenManager } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiCompany,
  ApiCompanyDetail,
  ApiRecruiter,
  ApiRecruiterListItem,
  ApiEngagement,
  PaginatedResponse,
  CompanyQueryParams,
  RecruiterQueryParams,
  CreateCompanyInput,
  UpdateCompanyInput,
  ClassifyCompanyInput,
  CreateRecruiterInput,
  CreateRecruiterResponse,
  UpdateRecruiterInput,
  VerifyRecruiterInput,
  CreateEngagementInput,
  ImportCompaniesResult,
} from '@/types/employer';

// ── Re-export mock data for gradual migration ──────────
import {
  mockCompanies,
  mockRecruiters,
  mockEngagements,
  getCompanyById as mockGetCompanyById,
  getRecruitersByCompany as mockGetRecruitersByCompany,
  getEngagementsByCompany as mockGetEngagementsByCompany,
  getCompanyStats,
  getRecruiterStats,
  type Company,
  type Recruiter,
  type EngagementRecord,
} from '@/data/mockEmployerData';

export {
  mockCompanies,
  mockRecruiters,
  mockEngagements,
  mockGetCompanyById as getCompanyById,
  mockGetRecruitersByCompany as getRecruitersByCompany,
  mockGetEngagementsByCompany as getEngagementsByCompany,
  getCompanyStats,
  getRecruiterStats,
};
export type { Company, Recruiter, EngagementRecord };

// ── Helper ─────────────────────────────────────────────

class EmployerApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'EmployerApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new EmployerApiError(parsed.message, res.status, parsed.code, parsed.details);
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

// ── Real API ───────────────────────────────────────────

const employerApi = {
  // ── Companies ──
  getCompanies: async (params: CompanyQueryParams = {}): Promise<PaginatedResponse<ApiCompany>> => {
    const res = await apiClient.get<PaginatedResponse<ApiCompany>>(`/companies${toQueryString(params)}`);
    return throwIfError(res);
  },

  getCompanyById: async (companyId: string): Promise<ApiCompanyDetail> => {
    const res = await apiClient.get<ApiCompanyDetail>(`/companies/${companyId}`);
    return throwIfError(res);
  },

  createCompany: async (data: CreateCompanyInput): Promise<ApiCompany> => {
    const res = await apiClient.post<ApiCompany>('/companies', data);
    return throwIfError(res, 201);
  },

  importCompanies: async (file: File): Promise<ImportCompaniesResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = tokenManager.getAccessToken();
    const response = await fetch(`${baseUrl}/companies/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new EmployerApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  updateCompany: async (companyId: string, data: UpdateCompanyInput): Promise<ApiCompany> => {
    const res = await apiClient.put<ApiCompany>(`/companies/${companyId}`, data);
    return throwIfError(res);
  },

  classifyCompany: async (companyId: string, data: ClassifyCompanyInput): Promise<ApiCompany> => {
    const res = await apiClient.put<ApiCompany>(`/companies/${companyId}/classification`, data);
    return throwIfError(res);
  },

  // ── Recruiters ──
  getRecruiters: async (params: RecruiterQueryParams = {}): Promise<PaginatedResponse<ApiRecruiterListItem>> => {
    const res = await apiClient.get<PaginatedResponse<ApiRecruiterListItem>>(`/recruiters${toQueryString(params)}`);
    return throwIfError(res);
  },

  getRecruitersByCompany: async (companyId: string): Promise<ApiRecruiter[]> => {
    const res = await apiClient.get<{ recruiters: ApiRecruiter[] }>(`/companies/${companyId}/recruiters`);
    return throwIfError(res).recruiters;
  },

  createRecruiter: async (companyId: string, data: CreateRecruiterInput): Promise<CreateRecruiterResponse> => {
    const res = await apiClient.post<CreateRecruiterResponse>(`/companies/${companyId}/recruiters`, data);
    return throwIfError(res, 201);
  },

  updateRecruiter: async (recruiterId: string, data: UpdateRecruiterInput): Promise<ApiRecruiter> => {
    const res = await apiClient.put<ApiRecruiter>(`/recruiters/${recruiterId}`, data);
    return throwIfError(res);
  },

  verifyRecruiter: async (recruiterId: string, data: VerifyRecruiterInput): Promise<ApiRecruiter> => {
    const res = await apiClient.put<ApiRecruiter>(`/recruiters/${recruiterId}/verify`, data);
    return throwIfError(res);
  },

  deleteRecruiter: async (recruiterId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/recruiters/${recruiterId}`);
    throwIfError(res);
  },

  // ── Engagements ──
  getEngagementsByCompany: async (companyId: string): Promise<ApiEngagement[]> => {
    const res = await apiClient.get<{ engagements: ApiEngagement[] }>(`/companies/${companyId}/engagements`);
    return throwIfError(res).engagements;
  },

  createEngagement: async (companyId: string, data: CreateEngagementInput): Promise<ApiEngagement> => {
    const res = await apiClient.post<ApiEngagement>(`/companies/${companyId}/engagements`, data);
    return throwIfError(res, 201);
  },
};

// ── Combined export ────────────────────────────────────

export const employerService = {
  // Real API methods
  ...employerApi,

  // Legacy mock methods (for components not yet migrated)
  getCompaniesLegacy: async (): Promise<Company[]> => mockCompanies,
  getCompanyByIdLegacy: async (id: string) => mockGetCompanyById(id),
  getCompanyStatsLegacy: async () => getCompanyStats(),
  getRecruitersLegacy: async (): Promise<Recruiter[]> => mockRecruiters,
  getRecruitersByCompanyLegacy: async (companyId: string) => mockGetRecruitersByCompany(companyId),
  getRecruiterStatsLegacy: async () => getRecruiterStats(),
  getEngagementsLegacy: async (): Promise<EngagementRecord[]> => mockEngagements,
  getEngagementsByCompanyLegacy: async (companyId: string) => mockGetEngagementsByCompany(companyId),
};

export { EmployerApiError };
