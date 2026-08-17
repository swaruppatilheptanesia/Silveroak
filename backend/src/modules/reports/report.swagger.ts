/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Full TPO report catalog used by the admin reports screen and dashboard analytics. Several routes have short aliases in the UI.
 *
 * /api/reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Dashboard overview counts
 *     responses:
 *       200:
 *         description: Students, companies, postings, applications, offers, and events totals
 *
 * /api/reports/placement-stats:
 *   get:
 *     tags: [Reports]
 *     summary: Placement stats
 *     responses:
 *       200:
 *         description: Placed and unplaced student counts plus offers grouped by type
 *
 * /api/reports/placement:
 *   get:
 *     tags: [Reports]
 *     summary: Placement stats alias
 *     responses:
 *       200:
 *         description: Same payload as /api/reports/placement-stats
 *
 * /api/reports/placement-cell:
 *   get:
 *     tags: [Reports]
 *     summary: Placement cell report
 *     responses:
 *       200:
 *         description: Placement cell summary with posting-level breakdowns, packages, NOC counts, and rate percentages
 *
 * /api/reports/placement-cell-report:
 *   get:
 *     tags: [Reports]
 *     summary: Placement cell report alias
 *     responses:
 *       200:
 *         description: Same payload as /api/reports/placement-cell
 *
 * /api/reports/application-pipeline:
 *   get:
 *     tags: [Reports]
 *     summary: Application pipeline by stage
 *     responses:
 *       200:
 *         description: Applications grouped by current stage
 *
 * /api/reports/pipeline:
 *   get:
 *     tags: [Reports]
 *     summary: Application pipeline alias
 *     responses:
 *       200:
 *         description: Same payload as /api/reports/application-pipeline
 *
 * /api/reports/company-wise:
 *   get:
 *     tags: [Reports]
 *     summary: Company-wise stats
 *     responses:
 *       200:
 *         description: Company counts with posting, offer, and engagement aggregates
 *
 * /api/reports/companies:
 *   get:
 *     tags: [Reports]
 *     summary: Company-wise stats alias
 *     responses:
 *       200:
 *         description: Same payload as /api/reports/company-wise
 *
 * /api/reports/department-wise:
 *   get:
 *     tags: [Reports]
 *     summary: Department-wise stats
 *     responses:
 *       200:
 *         description: Student counts grouped by department
 *
 * /api/reports/departments:
 *   get:
 *     tags: [Reports]
 *     summary: Department-wise stats alias
 *     responses:
 *       200:
 *         description: Same payload as /api/reports/department-wise
 *
 * /api/reports/profile-completion-stats:
 *   get:
 *     tags: [Reports]
 *     summary: Profile completion distribution for dashboard summary
 *     responses:
 *       200:
 *         description: Four completion buckets used by the admin dashboard
 *
 * /api/reports/profile-completion:
 *   get:
 *     tags: [Reports]
 *     summary: Detailed profile completion report
 *     responses:
 *       200:
 *         description: Students grouped by completion band with department breakdowns
 *
 * /api/reports/interested-students:
 *   get:
 *     tags: [Reports]
 *     summary: Interested students
 *     responses:
 *       200:
 *         description: Students registered for placement or internship interests
 *
 * /api/reports/eligibility:
 *   get:
 *     tags: [Reports]
 *     summary: Eligibility report
 *     responses:
 *       200:
 *         description: Students grouped by eligible, conditional, and not eligible
 *
 * /api/reports/registration-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Registration summary by program type
 *     responses:
 *       200:
 *         description: Interest registration totals split by placement and internship programs
 *
 * /api/reports/company-master:
 *   get:
 *     tags: [Reports]
 *     summary: Company master list
 *     responses:
 *       200:
 *         description: Company directory with recruiter, engagement, posting, and offer counts
 *
 * /api/reports/recruiter-list:
 *   get:
 *     tags: [Reports]
 *     summary: Recruiter list
 *     responses:
 *       200:
 *         description: Recruiters grouped by company and verification status
 *
 * /api/reports/engagement-history:
 *   get:
 *     tags: [Reports]
 *     summary: Engagement history
 *     responses:
 *       200:
 *         description: Company engagement events such as placement drives, internships, visits, and workshops
 *
 * /api/reports/company-classification:
 *   get:
 *     tags: [Reports]
 *     summary: Company classification
 *     responses:
 *       200:
 *         description: Company counts grouped by classification and status
 *
 * /api/reports/active-postings:
 *   get:
 *     tags: [Reports]
 *     summary: Active postings
 *     responses:
 *       200:
 *         description: Published job and internship postings with live application windows
 *
 * /api/reports/posting-history:
 *   get:
 *     tags: [Reports]
 *     summary: Posting history
 *     responses:
 *       200:
 *         description: All postings grouped by academic year and status
 *
 * /api/reports/posting-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Posting summary
 *     responses:
 *       200:
 *         description: Jobs, internships, and stipend internships grouped into status buckets
 *
 * /api/reports/event-attendance:
 *   get:
 *     tags: [Reports]
 *     summary: Event-wise attendance
 *     responses:
 *       200:
 *         description: Event attendance breakdown with assigned student rows and attendance rates
 *
 * /api/reports/drive-completion:
 *   get:
 *     tags: [Reports]
 *     summary: Drive completion summary
 *     responses:
 *       200:
 *         description: Drive completion and attendance totals for campus and internship drives
 *
 * /api/reports/student-participation:
 *   get:
 *     tags: [Reports]
 *     summary: Student participation history
 *     responses:
 *       200:
 *         description: Participation history grouped by student with event attendance details
 *
 * /api/reports/pending-noc:
 *   get:
 *     tags: [Reports]
 *     summary: Pending NOC requests
 *     responses:
 *       200:
 *         description: NOC requests still awaiting faculty, TPO, or company verification
 *
 * /api/reports/issued-noc-register:
 *   get:
 *     tags: [Reports]
 *     summary: Issued NOC register
 *     responses:
 *       200:
 *         description: Issued NOC records with approval metadata
 *
 * /api/reports/noc-by-department:
 *   get:
 *     tags: [Reports]
 *     summary: NOC by department
 *     responses:
 *       200:
 *         description: NOC totals grouped by department and batch
 *
 * /api/reports/applicant-list:
 *   get:
 *     tags: [Reports]
 *     summary: Applicant list per posting
 *     responses:
 *       200:
 *         description: Applications for a posting with stage and feedback details
 *
 * /api/reports/stage-wise:
 *   get:
 *     tags: [Reports]
 *     summary: Stage-wise application count
 *     responses:
 *       200:
 *         description: Applications grouped by posting and current stage
 *
 * /api/reports/shortlist-rejection:
 *   get:
 *     tags: [Reports]
 *     summary: Shortlist vs rejection
 *     responses:
 *       200:
 *         description: Shortlist and rejection mix per posting
 *
 * /api/reports/offer-acceptance:
 *   get:
 *     tags: [Reports]
 *     summary: Offer acceptance summary
 *     responses:
 *       200:
 *         description: Offer acceptance totals by company and department
 *
 * /api/reports/joining-status:
 *   get:
 *     tags: [Reports]
 *     summary: Joining status summary
 *     responses:
 *       200:
 *         description: Joined, pending, and did-not-join counts with audit metadata
 *
 * /api/reports/compliance:
 *   get:
 *     tags: [Reports]
 *     summary: Active offer compliance
 *     responses:
 *       200:
 *         description: Offer compliance and override status
 *
 * /api/reports/internship-status:
 *   get:
 *     tags: [Reports]
 *     summary: Internship status summary
 *     responses:
 *       200:
 *         description: Student internships grouped by status and type
 *
 * /api/reports/certificate-pending:
 *   get:
 *     tags: [Reports]
 *     summary: Certificate pending
 *     responses:
 *       200:
 *         description: Internships requiring completion certificates
 *
 * /api/reports/company-internship:
 *   get:
 *     tags: [Reports]
 *     summary: Company-wise internship summary
 *     responses:
 *       200:
 *         description: Internship totals grouped by company
 *
 * /api/reports/portfolio-completion:
 *   get:
 *     tags: [Reports]
 *     summary: Portfolio completion
 *     responses:
 *       200:
 *         description: Portfolio completion by student and completion band
 *
 * /api/reports/published-portfolios:
 *   get:
 *     tags: [Reports]
 *     summary: Published portfolios
 *     responses:
 *       200:
 *         description: Only published portfolios with department breakdown
 *
 * /api/reports/announcement-history:
 *   get:
 *     tags: [Reports]
 *     summary: Announcement history
 *     responses:
 *       200:
 *         description: Published and archived announcements with read rate
 *
 * /api/reports/consent-tracking:
 *   get:
 *     tags: [Reports]
 *     summary: Consent tracking
 *     responses:
 *       200:
 *         description: Announcement consent receipts and consent status
 *
 * /api/reports/placement-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Placement summary
 *     responses:
 *       200:
 *         description: Placement totals by department
 *
 * /api/reports/company-performance:
 *   get:
 *     tags: [Reports]
 *     summary: Company performance
 *     responses:
 *       200:
 *         description: Company applicant, offer, join, and conversion metrics
 *
 * /api/reports/offer-to-join-funnel:
 *   get:
 *     tags: [Reports]
 *     summary: Offer-to-join funnel
 *     responses:
 *       200:
 *         description: Funnel stages from offer release through joining outcome
 *
 * /api/reports/unplaced-students:
 *   get:
 *     tags: [Reports]
 *     summary: Unplaced students
 *     responses:
 *       200:
 *         description: Students without a placed or joined offer
 */
