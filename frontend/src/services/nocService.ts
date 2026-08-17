/**
 * NOC Service — NOC requests, approvals, issuance.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiNocMyItem,
  ApiNocDetail,
  ApiNocRecord,
  PaginatedNocs,
  NocQueryParams,
  CreateNocInput,
  ApproveNocInput,
  RejectNocInput,
  NocOfferLetterUpload,
  NocSupportingDocumentUpload,
  NocFieldSuggestions,
} from '@/types/noc';

// ── Re-export mock data for gradual migration ──────────
import {
  mockNOCRequests,
  getStudentNOCRequests,
  getPendingFacultyApprovals,
  getPendingTPOApprovals,
  getPendingCompanyVerifications,
  getIssuedNOCs,
  getNOCStats,
  mockUniversityDrives,
  mockVerifiedCompanies,
} from '@/data/mockNOCData';
import type { NOCRequest } from '@/types/noc';

export {
  mockNOCRequests,
  getStudentNOCRequests,
  getPendingFacultyApprovals,
  getPendingTPOApprovals,
  getPendingCompanyVerifications,
  getIssuedNOCs,
  getNOCStats,
  mockUniversityDrives,
  mockVerifiedCompanies,
};

// ── Helper ─────────────────────────────────────────────

class NocApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'NocApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new NocApiError(parsed.message, res.status, parsed.code, parsed.details);
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

const nocApi = {
  // Student: get my NOCs
  getMyNocs: async (): Promise<ApiNocMyItem[]> => {
    const res = await apiClient.get<{ nocs: ApiNocMyItem[] }>('/noc/my');
    return throwIfError(res).nocs;
  },

  // Student: create NOC request
  createNoc: async (data: CreateNocInput): Promise<ApiNocDetail> => {
    const res = await apiClient.post<ApiNocDetail>('/noc', data);
    return throwIfError(res, 201);
  },

  uploadOfferLetter: async (file: File): Promise<NocOfferLetterUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/noc/offer-letter`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new NocApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  uploadSupportingDocument: async (file: File): Promise<NocSupportingDocumentUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/noc/supporting-document`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new NocApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  // Student: company / city / designation suggestions for the create form
  getFieldSuggestions: async (): Promise<NocFieldSuggestions> => {
    const res = await apiClient.get<NocFieldSuggestions>('/noc/field-suggestions');
    return throwIfError(res);
  },

  // Admin: list all NOCs (paginated)
  getNocs: async (params: NocQueryParams = {}): Promise<PaginatedNocs> => {
    const res = await apiClient.get<PaginatedNocs>(`/noc${toQueryString(params)}`);
    return throwIfError(res);
  },

  // Admin/Faculty: get NOC detail
  getNocDetail: async (nocId: string): Promise<ApiNocDetail> => {
    const res = await apiClient.get<ApiNocDetail>(`/noc/${nocId}`);
    return throwIfError(res);
  },

  // Faculty: approve NOC
  facultyApprove: async (nocId: string, data: ApproveNocInput): Promise<ApiNocDetail> => {
    const res = await apiClient.put<ApiNocDetail>(`/noc/${nocId}/faculty-approve`, data);
    return throwIfError(res);
  },

  // TPO: approve NOC
  tpoApprove: async (nocId: string, data: ApproveNocInput): Promise<ApiNocDetail> => {
    const res = await apiClient.put<ApiNocDetail>(`/noc/${nocId}/tpo-approve`, data);
    return throwIfError(res);
  },

  // Faculty/TPO: reject NOC
  rejectNoc: async (nocId: string, data: RejectNocInput): Promise<ApiNocDetail> => {
    const res = await apiClient.put<ApiNocDetail>(`/noc/${nocId}/reject`, data);
    return throwIfError(res);
  },

  // TPO Admin: issue NOC
  issueNoc: async (nocId: string): Promise<ApiNocDetail> => {
    const res = await apiClient.put<ApiNocDetail>(`/noc/${nocId}/issue`, {});
    return throwIfError(res);
  },

  // Student: upload / re-upload the internship completion certificate for an issued NOC
  uploadCompletionCertificate: async (nocId: string, file: File): Promise<ApiNocRecord> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/noc/${nocId}/completion-certificate`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new NocApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  // TPO: approve the completion certificate
  approveCompletionCertificate: async (nocId: string): Promise<ApiNocDetail> => {
    const res = await apiClient.put<ApiNocDetail>(`/noc/${nocId}/completion-certificate/approve`, {});
    return throwIfError(res);
  },

  // TPO: reject the completion certificate (mandatory remarks)
  rejectCompletionCertificate: async (nocId: string, remarks: string): Promise<ApiNocDetail> => {
    const res = await apiClient.put<ApiNocDetail>(`/noc/${nocId}/completion-certificate/reject`, { remarks });
    return throwIfError(res);
  },
};

// ── Combined export ────────────────────────────────────

export const nocService = {
  // Real API methods
  ...nocApi,

  // Legacy mock methods
  getNOCRequestsLegacy: async (): Promise<NOCRequest[]> => mockNOCRequests,
  getStudentNOCRequestsLegacy: async (studentId: string) => getStudentNOCRequests(studentId),
  getPendingFacultyApprovalsLegacy: async (dept: string) => getPendingFacultyApprovals(dept),
  getPendingTPOApprovalsLegacy: async () => getPendingTPOApprovals(),
  getPendingCompanyVerificationsLegacy: async () => getPendingCompanyVerifications(),
  getIssuedNOCsLegacy: async () => getIssuedNOCs(),
  getNOCStatsLegacy: async () => getNOCStats(),
  getUniversityDrivesLegacy: async () => mockUniversityDrives,
  getVerifiedCompaniesLegacy: async () => mockVerifiedCompanies,
};

export { NocApiError };
