/**
 * Report Service — dashboard stats and analytics.
 * All endpoints return aggregated data (no pagination).
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApplicationPipelineStats,
  CompanyWiseStats,
  DashboardStats,
  DepartmentWiseStats,
  PlacementStats,
  PlacementCellReport,
  ProfileCompletionStats,
} from '@/types/report';

class ReportApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ReportApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPlacementStats {
  placed: number;
  unplaced: number;
  offers_by_type: Array<{
    type: string;
    count?: number;
    _count?: number | { _all?: number };
  }>;
}

interface RawApplicationPipelineStats {
  pipeline: Array<{
    stage?: string;
    current_stage?: string;
    count?: number;
    _count?: number | { _all?: number };
  }>;
}

interface RawCompanyWiseStats {
  companies: Array<{
    id: string;
    name: string;
    classification: string | null;
    _count?: {
      postings?: number;
      offers?: number;
      engagements?: number;
    };
  }>;
}

export type ReportQueryParams = Record<string, string | string[] | number | boolean | Date | undefined | null>;

function throwIfError<T>(res: { data: T; error: string | null; status: number }): T {
  if (res.status !== 200 || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new ReportApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

function getRawCount(value: number | { _all?: number } | undefined) {
  if (typeof value === 'number') return value;
  return value?._all ?? 0;
}

function toQueryString(params: ReportQueryParams = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          searchParams.append(key, String(entry));
        }
      });
      return;
    }

    searchParams.append(key, value instanceof Date ? value.toISOString() : String(value));
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function requestReport<T>(path: string, params: ReportQueryParams = {}) {
  const res = await apiClient.get<T>(`${path}${toQueryString(params)}`);
  return throwIfError(res);
}

export const reportService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/reports/dashboard');
    return throwIfError(res);
  },

  getPlacementStats: async (): Promise<PlacementStats> => {
    const res = await apiClient.get<RawPlacementStats>('/reports/placement-stats');
    const payload = throwIfError(res);
    return {
      placed: payload.placed,
      unplaced: payload.unplaced,
      offers_by_type: payload.offers_by_type.map((entry) => ({
        type: entry.type,
        count: entry.count ?? getRawCount(entry._count),
      })),
    };
  },

  getPlacementCellReport: async (params: ReportQueryParams = {}): Promise<PlacementCellReport> =>
    requestReport<PlacementCellReport>('/reports/placement-cell', params),

  getApplicationPipeline: async (): Promise<ApplicationPipelineStats> => {
    const res = await apiClient.get<RawApplicationPipelineStats>('/reports/application-pipeline');
    const payload = throwIfError(res);
    return {
      pipeline: payload.pipeline.map((entry) => ({
        stage: entry.stage ?? entry.current_stage ?? 'unknown',
        count: entry.count ?? getRawCount(entry._count),
      })),
    };
  },

  getCompanyWiseStats: async (): Promise<CompanyWiseStats> => {
    const res = await apiClient.get<RawCompanyWiseStats>('/reports/company-wise');
    const payload = throwIfError(res);
    return {
      companies: payload.companies.map((company) => ({
        id: company.id,
        name: company.name,
        classification: company.classification,
        postings_count: company._count?.postings ?? 0,
        offers_count: company._count?.offers ?? 0,
        engagements_count: company._count?.engagements ?? 0,
      })),
    };
  },

  getDepartmentWiseStats: async (): Promise<DepartmentWiseStats> => {
    const res = await apiClient.get<DepartmentWiseStats>('/reports/department-wise');
    return throwIfError(res);
  },

  getProfileCompletionStats: async (): Promise<ProfileCompletionStats> => {
    const res = await apiClient.get<ProfileCompletionStats>('/reports/profile-completion-stats');
    return throwIfError(res);
  },

  getInterestedStudentsReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/interested-students', params),

  getEligibilityReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/eligibility', params),

  getRegistrationSummaryReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/registration-summary', params),

  getProfileCompletionReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/profile-completion', params),

  getCompanyMasterReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/company-master', params),

  getRecruiterListReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/recruiter-list', params),

  getEngagementHistoryReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/engagement-history', params),

  getCompanyClassificationReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/company-classification', params),

  getActivePostingsReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/active-postings', params),

  getPostingHistoryReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/posting-history', params),

  getPostingSummaryReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/posting-summary', params),

  getEventAttendanceReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/event-attendance', params),

  getDriveCompletionReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/drive-completion', params),

  getStudentParticipationReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/student-participation', params),

  getPendingNocReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/pending-noc', params),

  getIssuedNocRegisterReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/issued-noc-register', params),

  getNocByDepartmentReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/noc-by-department', params),

  getApplicantListReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/applicant-list', params),

  getStageWiseReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/stage-wise', params),

  getShortlistRejectionReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/shortlist-rejection', params),

  getOfferAcceptanceReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/offer-acceptance', params),

  getJoiningStatusReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/joining-status', params),

  getComplianceReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/compliance', params),

  getInternshipStatusReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/internship-status', params),

  getCertificatePendingReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/certificate-pending', params),

  getCompanyInternshipReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/company-internship', params),

  getPortfolioCompletionReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/portfolio-completion', params),

  getPublishedPortfoliosReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/published-portfolios', params),

  getAnnouncementHistoryReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/announcement-history', params),

  getConsentTrackingReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/consent-tracking', params),

  getPlacementSummaryReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/placement-summary', params),

  getCompanyPerformanceReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/company-performance', params),

  getOfferToJoinFunnelReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/offer-to-join-funnel', params),

  getUnplacedStudentsReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/unplaced-students', params),

  getPlacementCountReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/placement-count', params),

  getPlacementListingReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/placement-listing', params),

  getInternshipNocCountReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/internship-noc-count', params),

  getInternshipNocListingReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/internship-noc-listing', params),

  getNoDuesCountReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/no-dues-count', params),

  getNoDuesListingReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/no-dues-listing', params),

  getCompanyCountReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/company-count', params),

  getCompanyStageReport: async (params: ReportQueryParams = {}): Promise<any> =>
    requestReport<any>('/reports/company-stage', params),
};

export { ReportApiError };
