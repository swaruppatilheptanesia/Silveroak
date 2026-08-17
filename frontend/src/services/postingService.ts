/**
 * Posting Service — job/internship postings.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient, tokenManager } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiPostingListItem,
  ApiPostingDetail,
  PaginatedPostings,
  PostingQueryParams,
  CreatePostingInput,
  UpdatePostingInput,
  PublishPostingInput,
  RepublishPostingInput,
} from '@/types/posting';

// ── Re-export mock data for gradual migration ──────────
import {
  mockPostings,
  getPostingById as mockGetPostingById,
  getPostingsByStatus,
  getPostingsByCompany,
  getPostingsByType,
  getPostingStats,
  getEligiblePostingsForStudent,
  getPostingTypeLabel,
  getWorkModeLabel,
  branches,
  batches,
  type JobPosting,
  type PostingType,
  type PostingStatus,
  type WorkMode,
} from '@/data/mockPostingsData';

export {
  mockPostings,
  getPostingById,
  getPostingsByStatus,
  getPostingsByCompany,
  getPostingsByType,
  getPostingStats,
  getEligiblePostingsForStudent,
  getPostingTypeLabel,
  getWorkModeLabel,
  branches,
  batches,
};
export type { JobPosting, PostingType, PostingStatus, WorkMode };

// Keep legacy getPostingById export pointing to mock
function getPostingById(id: string) {
  return mockGetPostingById(id);
}

// ── Helper ─────────────────────────────────────────────

class PostingApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'PostingApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface PostingJobDescriptionUpload {
  job_description_pdf_url: string;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new PostingApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

function toQueryString(params: any): string {
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

const postingApi = {
  getPostings: async (params: PostingQueryParams = {}): Promise<PaginatedPostings> => {
    const res = await apiClient.get<PaginatedPostings>(`/postings${toQueryString(params)}`);
    return throwIfError(res);
  },

  getPostingById: async (postingId: string): Promise<ApiPostingDetail> => {
    const res = await apiClient.get<ApiPostingDetail>(`/postings/${postingId}`);
    return throwIfError(res);
  },

  createPosting: async (data: CreatePostingInput): Promise<ApiPostingDetail> => {
    const res = await apiClient.post<ApiPostingDetail>('/postings', data);
    return throwIfError(res, 201);
  },

  updatePosting: async (postingId: string, data: UpdatePostingInput): Promise<ApiPostingDetail> => {
    const res = await apiClient.put<ApiPostingDetail>(`/postings/${postingId}`, data);
    return throwIfError(res);
  },

  publishPosting: async (postingId: string, data: PublishPostingInput = {}): Promise<ApiPostingDetail> => {
    const res = await apiClient.put<ApiPostingDetail>(`/postings/${postingId}/publish`, data);
    return throwIfError(res);
  },

  republishPosting: async (postingId: string, data: RepublishPostingInput): Promise<ApiPostingDetail> => {
    const res = await apiClient.put<ApiPostingDetail>(`/postings/${postingId}/republish`, data);
    return throwIfError(res);
  },

  closePosting: async (postingId: string): Promise<ApiPostingDetail> => {
    const res = await apiClient.put<ApiPostingDetail>(`/postings/${postingId}/close`, {});
    return throwIfError(res);
  },

  uploadJobDescription: async (file: File): Promise<PostingJobDescriptionUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = tokenManager.getAccessToken();
    const response = await fetch(`${baseUrl}/postings/job-description`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new PostingApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },
};

// ── Combined export ────────────────────────────────────

export const postingService = {
  // Real API methods
  ...postingApi,

  // Legacy mock methods
  getPostingsLegacy: async (): Promise<JobPosting[]> => mockPostings,
  getPostingByIdLegacy: async (id: string) => mockGetPostingById(id),
  getPostingsByStatusLegacy: async (status: PostingStatus) => getPostingsByStatus(status),
  getPostingsByCompanyLegacy: async (companyId: string) => getPostingsByCompany(companyId),
  getPostingsByTypeLegacy: async (type: PostingType) => getPostingsByType(type),
  getPostingStatsLegacy: async () => getPostingStats(),
  getEligiblePostingsForStudentLegacy: async (branch: string, batch: string, cgpa: number, backlogs: number) =>
    getEligiblePostingsForStudent(branch, batch, cgpa, backlogs),

  getPostingTypeLabel,
  getWorkModeLabel,
  getBranches: () => branches,
  getBatches: () => batches,
};

export { PostingApiError };
