import { Request, Response, NextFunction } from 'express';
import * as service from './report.service';

type ReportQuery = Record<string, string | string[] | undefined>;

type ReportServiceFn = (tenantId: string, query?: ReportQuery) => Promise<unknown>;

function createReportHandler(method: keyof typeof service) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handler = service[method] as ReportServiceFn;
      const data = await handler(req.user!.tenant_id, req.query as ReportQuery);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}

const reportHandlers = {
  getDashboardStats: createReportHandler('getDashboardStats'),
  getPlacementStats: createReportHandler('getPlacementStats'),
  getPlacementCellReport: createReportHandler('getPlacementCellReport'),
  getApplicationPipeline: createReportHandler('getApplicationPipeline'),
  getCompanyWiseStats: createReportHandler('getCompanyWiseStats'),
  getDepartmentWiseStats: createReportHandler('getDepartmentWiseStats'),
  getProfileCompletionStats: createReportHandler('getProfileCompletionStats'),
  getInterestedStudentsReport: createReportHandler('getInterestedStudentsReport'),
  getEligibilityReport: createReportHandler('getEligibilityReport'),
  getRegistrationSummaryReport: createReportHandler('getRegistrationSummaryReport'),
  getProfileCompletionReport: createReportHandler('getProfileCompletionReport'),
  getCompanyMasterReport: createReportHandler('getCompanyMasterReport'),
  getRecruiterListReport: createReportHandler('getRecruiterListReport'),
  getEngagementHistoryReport: createReportHandler('getEngagementHistoryReport'),
  getCompanyClassificationReport: createReportHandler('getCompanyClassificationReport'),
  getActivePostingsReport: createReportHandler('getActivePostingsReport'),
  getPostingHistoryReport: createReportHandler('getPostingHistoryReport'),
  getPostingSummaryReport: createReportHandler('getPostingSummaryReport'),
  getEventAttendanceReport: createReportHandler('getEventAttendanceReport'),
  getDriveCompletionReport: createReportHandler('getDriveCompletionReport'),
  getStudentParticipationReport: createReportHandler('getStudentParticipationReport'),
  getPendingNocReport: createReportHandler('getPendingNocReport'),
  getIssuedNocRegisterReport: createReportHandler('getIssuedNocRegisterReport'),
  getNocByDepartmentReport: createReportHandler('getNocByDepartmentReport'),
  getApplicantListReport: createReportHandler('getApplicantListReport'),
  getStageWiseReport: createReportHandler('getStageWiseReport'),
  getShortlistRejectionReport: createReportHandler('getShortlistRejectionReport'),
  getOfferAcceptanceReport: createReportHandler('getOfferAcceptanceReport'),
  getJoiningStatusReport: createReportHandler('getJoiningStatusReport'),
  getComplianceReport: createReportHandler('getComplianceReport'),
  getInternshipStatusReport: createReportHandler('getInternshipStatusReport'),
  getCertificatePendingReport: createReportHandler('getCertificatePendingReport'),
  getCompanyInternshipReport: createReportHandler('getCompanyInternshipReport'),
  getPortfolioCompletionReport: createReportHandler('getPortfolioCompletionReport'),
  getPublishedPortfoliosReport: createReportHandler('getPublishedPortfoliosReport'),
  getAnnouncementHistoryReport: createReportHandler('getAnnouncementHistoryReport'),
  getConsentTrackingReport: createReportHandler('getConsentTrackingReport'),
  getPlacementSummaryReport: createReportHandler('getPlacementSummaryReport'),
  getCompanyPerformanceReport: createReportHandler('getCompanyPerformanceReport'),
  getOfferToJoinFunnelReport: createReportHandler('getOfferToJoinFunnelReport'),
  getUnplacedStudentsReport: createReportHandler('getUnplacedStudentsReport'),
  getPlacementCountReport: createReportHandler('getPlacementCountReport'),
  getPlacementListingReport: createReportHandler('getPlacementListingReport'),
  getInternshipNocCountReport: createReportHandler('getInternshipNocCountReport'),
  getInternshipNocListingReport: createReportHandler('getInternshipNocListingReport'),
  getNoDuesCountReport: createReportHandler('getNoDuesCountReport'),
  getNoDuesListingReport: createReportHandler('getNoDuesListingReport'),
  getCompanyCountReport: createReportHandler('getCompanyCountReport'),
  getCompanyStageReport: createReportHandler('getCompanyStageReport'),
} as const;

export const {
  getDashboardStats,
  getPlacementStats,
  getPlacementCellReport,
  getApplicationPipeline,
  getCompanyWiseStats,
  getDepartmentWiseStats,
  getProfileCompletionStats,
  getInterestedStudentsReport,
  getEligibilityReport,
  getRegistrationSummaryReport,
  getProfileCompletionReport,
  getCompanyMasterReport,
  getRecruiterListReport,
  getEngagementHistoryReport,
  getCompanyClassificationReport,
  getActivePostingsReport,
  getPostingHistoryReport,
  getPostingSummaryReport,
  getEventAttendanceReport,
  getDriveCompletionReport,
  getStudentParticipationReport,
  getPendingNocReport,
  getIssuedNocRegisterReport,
  getNocByDepartmentReport,
  getApplicantListReport,
  getStageWiseReport,
  getShortlistRejectionReport,
  getOfferAcceptanceReport,
  getJoiningStatusReport,
  getComplianceReport,
  getInternshipStatusReport,
  getCertificatePendingReport,
  getCompanyInternshipReport,
  getPortfolioCompletionReport,
  getPublishedPortfoliosReport,
  getAnnouncementHistoryReport,
  getConsentTrackingReport,
  getPlacementSummaryReport,
  getCompanyPerformanceReport,
  getOfferToJoinFunnelReport,
  getUnplacedStudentsReport,
  getPlacementCountReport,
  getPlacementListingReport,
  getInternshipNocCountReport,
  getInternshipNocListingReport,
  getNoDuesCountReport,
  getNoDuesListingReport,
  getCompanyCountReport,
  getCompanyStageReport,
} = reportHandlers;
