/**
 * Recruiter Portal Service — read-only endpoints with PII protection.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  RecruiterDashboard,
  RecruiterCompanyOverview,
  RecruiterPosting,
  RecruiterApplication,
  RecruiterProfileUpdateInput,
} from '@/types/recruiter';

// ── Helper ─────────────────────────────────────────────

class RecruiterApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'RecruiterApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }): T {
  if (res.status !== 200 || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new RecruiterApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

// ── Real API ───────────────────────────────────────────

export const recruiterService = {
  getDashboard: async (): Promise<RecruiterDashboard> => {
    const res = await apiClient.get<RecruiterDashboard>('/recruiter/dashboard');
    return throwIfError(res);
  },

  getCompany: async (): Promise<RecruiterCompanyOverview> => {
    const res = await apiClient.get<RecruiterCompanyOverview>('/recruiter/company');
    return throwIfError(res);
  },

  updateProfile: async (data: RecruiterProfileUpdateInput) => {
    const res = await apiClient.put('/recruiter/profile', data);
    return throwIfError(res);
  },

  getCompanyPostings: async (companyId: string): Promise<RecruiterPosting[]> => {
    const res = await apiClient.get<{ postings: RecruiterPosting[] }>(`/recruiter/companies/${companyId}/postings`);
    return throwIfError(res).postings;
  },

  getPostingApplications: async (postingId: string): Promise<RecruiterApplication[]> => {
    const res = await apiClient.get<{ applications: RecruiterApplication[] }>(`/recruiter/postings/${postingId}/applications`);
    return throwIfError(res).applications;
  },
};

export { RecruiterApiError };
