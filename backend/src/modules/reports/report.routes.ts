import { Router } from 'express';
import type { RequestHandler } from 'express';
import * as ctrl from './report.controller';
import { requirePermission } from '../../middleware/permission';
import { requireRole } from '../../middleware/role';

const router = Router();
const viewReports = requirePermission('reports', 'view');

router.use(requireRole('tpo_admin', 'tpo_employee', 'management', 'super_admin'));

const register = (path: string, handler: RequestHandler) => {
  router.get(path, viewReports, handler);
};

const reportRoutes: Array<[string, RequestHandler]> = [
  ['/dashboard', ctrl.getDashboardStats],
  ['/placement-stats', ctrl.getPlacementStats],
  ['/placement', ctrl.getPlacementStats],
  ['/placement-cell', ctrl.getPlacementCellReport],
  ['/placement-cell-report', ctrl.getPlacementCellReport],
  ['/application-pipeline', ctrl.getApplicationPipeline],
  ['/pipeline', ctrl.getApplicationPipeline],
  ['/company-wise', ctrl.getCompanyWiseStats],
  ['/companies', ctrl.getCompanyWiseStats],
  ['/department-wise', ctrl.getDepartmentWiseStats],
  ['/departments', ctrl.getDepartmentWiseStats],
  ['/profile-completion', ctrl.getProfileCompletionReport],
  ['/profile', ctrl.getProfileCompletionReport],
  ['/profile-completion-stats', ctrl.getProfileCompletionStats],
  ['/interested-students', ctrl.getInterestedStudentsReport],
  ['/interested', ctrl.getInterestedStudentsReport],
  ['/eligibility', ctrl.getEligibilityReport],
  ['/registration-summary', ctrl.getRegistrationSummaryReport],
  ['/registration', ctrl.getRegistrationSummaryReport],
  ['/company-master', ctrl.getCompanyMasterReport],
  ['/recruiter-list', ctrl.getRecruiterListReport],
  ['/engagement-history', ctrl.getEngagementHistoryReport],
  ['/company-classification', ctrl.getCompanyClassificationReport],
  ['/active-postings', ctrl.getActivePostingsReport],
  ['/posting-history', ctrl.getPostingHistoryReport],
  ['/posting-summary', ctrl.getPostingSummaryReport],
  ['/event-attendance', ctrl.getEventAttendanceReport],
  ['/drive-completion', ctrl.getDriveCompletionReport],
  ['/student-participation', ctrl.getStudentParticipationReport],
  ['/pending-noc', ctrl.getPendingNocReport],
  ['/issued-noc-register', ctrl.getIssuedNocRegisterReport],
  ['/issued-noc', ctrl.getIssuedNocRegisterReport],
  ['/noc-by-department', ctrl.getNocByDepartmentReport],
  ['/noc-by-dept', ctrl.getNocByDepartmentReport],
  ['/applicant-list', ctrl.getApplicantListReport],
  ['/stage-wise', ctrl.getStageWiseReport],
  ['/shortlist-rejection', ctrl.getShortlistRejectionReport],
  ['/offer-acceptance', ctrl.getOfferAcceptanceReport],
  ['/joining-status', ctrl.getJoiningStatusReport],
  ['/compliance', ctrl.getComplianceReport],
  ['/internship-status', ctrl.getInternshipStatusReport],
  ['/certificate-pending', ctrl.getCertificatePendingReport],
  ['/company-internship', ctrl.getCompanyInternshipReport],
  ['/portfolio-completion', ctrl.getPortfolioCompletionReport],
  ['/published-portfolios', ctrl.getPublishedPortfoliosReport],
  ['/announcement-history', ctrl.getAnnouncementHistoryReport],
  ['/consent-tracking', ctrl.getConsentTrackingReport],
  ['/placement-summary', ctrl.getPlacementSummaryReport],
  ['/company-performance', ctrl.getCompanyPerformanceReport],
  ['/offer-to-join-funnel', ctrl.getOfferToJoinFunnelReport],
  ['/offer-join-funnel', ctrl.getOfferToJoinFunnelReport],
  ['/unplaced-students', ctrl.getUnplacedStudentsReport],
  ['/placement-count', ctrl.getPlacementCountReport],
  ['/placement-listing', ctrl.getPlacementListingReport],
  ['/internship-noc-count', ctrl.getInternshipNocCountReport],
  ['/internship-noc-listing', ctrl.getInternshipNocListingReport],
  ['/no-dues-count', ctrl.getNoDuesCountReport],
  ['/no-dues-listing', ctrl.getNoDuesListingReport],
  ['/company-count', ctrl.getCompanyCountReport],
  ['/company-stage', ctrl.getCompanyStageReport],
];

reportRoutes.forEach(([path, handler]) => register(path, handler));

export default router;
