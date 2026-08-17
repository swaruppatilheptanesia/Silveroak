/**
 * Offer Service — offers, joining, compliance.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiMyOffer,
  ApiOfferDetail,
  PaginatedOffers,
  OfferQueryParams,
  CreateOfferInput,
  RejectOfferInput,
  JoiningStatusInput,
  ComplianceInput,
} from '@/types/offer';

// ── Re-export mock data for gradual migration ──────────
import {
  mockOffers,
  mockOfferAudit,
  getOffersByStudent,
  getOffersByCompany,
  getOffersByPosting,
  getOfferAudit,
  getActiveOffer,
  isStudentBlocked,
  getOfferStats,
} from '@/data/mockOfferData';
import type { Offer, OfferAuditEntry } from '@/types/offer';

export {
  mockOffers,
  mockOfferAudit,
  getOffersByStudent,
  getOffersByCompany,
  getOffersByPosting,
  getOfferAudit,
  getActiveOffer,
  isStudentBlocked,
  getOfferStats,
};

// ── Helper ─────────────────────────────────────────────

class OfferApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'OfferApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new OfferApiError(parsed.message, res.status, parsed.code, parsed.details);
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

/**
 * The API sends pagination in snake_case (`paginate()` in the backend's shared/utils/pagination.ts),
 * while `PaginatedOffers` is camelCase. Without this mapping `pagination.totalPages` is `undefined`
 * at runtime and every `totalPages > 1` pager guard silently evaluates false — which is exactly why
 * the Offer Records pager never appeared. Both spellings are accepted so a future camelCase API
 * response keeps working.
 */
interface RawOfferPagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  total_pages?: number;
  hasNext?: boolean;
  has_next?: boolean;
  hasPrev?: boolean;
  has_prev?: boolean;
}

function normalizePagination(raw: RawOfferPagination | undefined): PaginatedOffers['pagination'] {
  const page = raw?.page ?? 1;
  const totalPages = raw?.totalPages ?? raw?.total_pages ?? 1;

  return {
    page,
    limit: raw?.limit ?? 0,
    total: raw?.total ?? 0,
    totalPages,
    hasNext: raw?.hasNext ?? raw?.has_next ?? page < totalPages,
    hasPrev: raw?.hasPrev ?? raw?.has_prev ?? page > 1,
  };
}

// ── Real API ───────────────────────────────────────────

const offerApi = {
  // ── Student endpoints ──
  getMyOffers: async (): Promise<ApiMyOffer[]> => {
    const res = await apiClient.get<{ offers: ApiMyOffer[] }>('/offers/my');
    return throwIfError(res).offers;
  },

  acceptOffer: async (offerId: string): Promise<ApiOfferDetail> => {
    const res = await apiClient.put<ApiOfferDetail>(`/offers/${offerId}/accept`, {});
    return throwIfError(res);
  },

  rejectOfferByStudent: async (
    offerId: string,
    payload: { reason?: string } = {},
  ): Promise<ApiOfferDetail> => {
    const res = await apiClient.put<ApiOfferDetail>(`/offers/${offerId}/student-reject`, payload);
    return throwIfError(res);
  },

  // ── Admin endpoints ──
  getOffers: async (params: OfferQueryParams = {}): Promise<PaginatedOffers> => {
    const res = await apiClient.get<{ data: PaginatedOffers['data']; pagination: RawOfferPagination }>(
      `/offers${toQueryString(params as Record<string, unknown>)}`,
    );
    const payload = throwIfError(res);

    return {
      data: payload.data ?? [],
      pagination: normalizePagination(payload.pagination),
    };
  },

  getOfferDetail: async (offerId: string): Promise<ApiOfferDetail> => {
    const res = await apiClient.get<ApiOfferDetail>(`/offers/${offerId}`);
    return throwIfError(res);
  },

  createOffer: async (data: CreateOfferInput): Promise<ApiOfferDetail> => {
    const res = await apiClient.post<ApiOfferDetail>('/offers', data);
    return throwIfError(res, 201);
  },

  rejectOffer: async (offerId: string, data: RejectOfferInput): Promise<ApiOfferDetail> => {
    const res = await apiClient.put<ApiOfferDetail>(`/offers/${offerId}/reject`, data);
    return throwIfError(res);
  },

  updateJoiningStatus: async (offerId: string, data: JoiningStatusInput): Promise<ApiOfferDetail> => {
    const res = await apiClient.put<ApiOfferDetail>(`/offers/${offerId}/joining`, data);
    return throwIfError(res);
  },

  updateCompliance: async (offerId: string, data: ComplianceInput): Promise<ApiOfferDetail> => {
    const res = await apiClient.put<ApiOfferDetail>(`/offers/${offerId}/compliance`, data);
    return throwIfError(res);
  },
};

// ── Combined export ────────────────────────────────────

export const offerService = {
  // Real API methods
  ...offerApi,

  // Legacy mock methods
  getOffersLegacy: async (): Promise<Offer[]> => mockOffers,
  getOffersByStudentLegacy: async (studentId: string) => getOffersByStudent(studentId),
  getOffersByCompanyLegacy: async (companyId: string) => getOffersByCompany(companyId),
  getOffersByPostingLegacy: async (postingId: string) => getOffersByPosting(postingId),
  getOfferAuditLegacy: async (offerId: string) => getOfferAudit(offerId),
  getActiveOfferLegacy: async (studentId: string) => getActiveOffer(studentId),
  isStudentBlockedLegacy: async (studentId: string) => isStudentBlocked(studentId),
  getOfferStatsLegacy: async () => getOfferStats(),
};

export { OfferApiError };
