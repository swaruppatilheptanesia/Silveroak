/**
 * React Query hooks for the detailed Reports Analytics module.
 * These map to the full TPO reports catalog exposed by the backend.
 */
import { useQuery } from '@tanstack/react-query';
import { reportService, type ReportQueryParams } from '@/services/reportService';

const DEFAULT_STALE_TIME = 2 * 60 * 1000;

export const reportAnalyticsKeys = {
  all: ['report-analytics'] as const,
  report: (name: string, params: ReportQueryParams = {}) => [...reportAnalyticsKeys.all, name, params] as const,
};

function createReportQueryHook<T>(name: string, fetcher: (params?: ReportQueryParams) => Promise<T>, staleTime = DEFAULT_STALE_TIME) {
  return (params: ReportQueryParams = {}, enabled = true) =>
    useQuery({
      queryKey: reportAnalyticsKeys.report(name, params),
      queryFn: () => fetcher(params),
      enabled,
      staleTime,
    });
}

export const useInterestedStudentsReport = createReportQueryHook('interested-students', reportService.getInterestedStudentsReport);
export const useEligibilityReport = createReportQueryHook('eligibility', reportService.getEligibilityReport);
export const useProfileCompletionReport = createReportQueryHook('profile-completion', reportService.getProfileCompletionReport);
export const useRegistrationSummaryReport = createReportQueryHook('registration-summary', reportService.getRegistrationSummaryReport);
export const useCompanyMasterReport = createReportQueryHook('company-master', reportService.getCompanyMasterReport);
export const useRecruiterListReport = createReportQueryHook('recruiter-list', reportService.getRecruiterListReport);
export const useEngagementHistoryReport = createReportQueryHook('engagement-history', reportService.getEngagementHistoryReport);
export const useCompanyClassificationReport = createReportQueryHook('company-classification', reportService.getCompanyClassificationReport);
export const useActivePostingsReport = createReportQueryHook('active-postings', reportService.getActivePostingsReport);
export const usePostingHistoryReport = createReportQueryHook('posting-history', reportService.getPostingHistoryReport);
export const usePostingSummaryReport = createReportQueryHook('posting-summary', reportService.getPostingSummaryReport);
export const useEventAttendanceReport = createReportQueryHook('event-attendance', reportService.getEventAttendanceReport);
export const useDriveCompletionReport = createReportQueryHook('drive-completion', reportService.getDriveCompletionReport);
export const useStudentParticipationReport = createReportQueryHook('student-participation', reportService.getStudentParticipationReport);
export const usePendingNocReport = createReportQueryHook('pending-noc', reportService.getPendingNocReport);
export const useIssuedNocRegisterReport = createReportQueryHook('issued-noc-register', reportService.getIssuedNocRegisterReport);
export const useNocByDepartmentReport = createReportQueryHook('noc-by-department', reportService.getNocByDepartmentReport);
export const useApplicantListReport = createReportQueryHook('applicant-list', reportService.getApplicantListReport);
export const useStageWiseReport = createReportQueryHook('stage-wise', reportService.getStageWiseReport);
export const useShortlistRejectionReport = createReportQueryHook('shortlist-rejection', reportService.getShortlistRejectionReport);
export const useOfferAcceptanceReport = createReportQueryHook('offer-acceptance', reportService.getOfferAcceptanceReport);
export const useJoiningStatusReport = createReportQueryHook('joining-status', reportService.getJoiningStatusReport);
export const useComplianceReport = createReportQueryHook('compliance', reportService.getComplianceReport);
export const useInternshipStatusReport = createReportQueryHook('internship-status', reportService.getInternshipStatusReport);
export const useCertificatePendingReport = createReportQueryHook('certificate-pending', reportService.getCertificatePendingReport);
export const useCompanyInternshipReport = createReportQueryHook('company-internship', reportService.getCompanyInternshipReport);
export const usePortfolioCompletionReport = createReportQueryHook('portfolio-completion', reportService.getPortfolioCompletionReport);
export const usePublishedPortfoliosReport = createReportQueryHook('published-portfolios', reportService.getPublishedPortfoliosReport);
export const useAnnouncementHistoryReport = createReportQueryHook('announcement-history', reportService.getAnnouncementHistoryReport);
export const useConsentTrackingReport = createReportQueryHook('consent-tracking', reportService.getConsentTrackingReport);
export const usePlacementSummaryReport = createReportQueryHook('placement-summary', reportService.getPlacementSummaryReport);
export const usePlacementCellReport = createReportQueryHook('placement-cell', reportService.getPlacementCellReport);
export const useCompanyPerformanceReport = createReportQueryHook('company-performance', reportService.getCompanyPerformanceReport);
export const useOfferToJoinFunnelReport = createReportQueryHook('offer-to-join-funnel', reportService.getOfferToJoinFunnelReport);
export const useUnplacedStudentsReport = createReportQueryHook('unplaced-students', reportService.getUnplacedStudentsReport);

// New Reports (meeting sheet)
export const usePlacementCountReport = createReportQueryHook('placement-count', reportService.getPlacementCountReport);
export const usePlacementListingReport = createReportQueryHook('placement-listing', reportService.getPlacementListingReport);
export const useInternshipNocCountReport = createReportQueryHook('internship-noc-count', reportService.getInternshipNocCountReport);
export const useInternshipNocListingReport = createReportQueryHook('internship-noc-listing', reportService.getInternshipNocListingReport);
export const useNoDuesCountReport = createReportQueryHook('no-dues-count', reportService.getNoDuesCountReport);
export const useNoDuesListingReport = createReportQueryHook('no-dues-listing', reportService.getNoDuesListingReport);
export const useCompanyCountReport = createReportQueryHook('company-count', reportService.getCompanyCountReport);
export const useCompanyStageReport = createReportQueryHook('company-stage', reportService.getCompanyStageReport);
