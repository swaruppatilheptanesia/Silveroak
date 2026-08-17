# Silver Oak University
## Training & Placement Portal
### Functional Workflow Documentation (Role-wise)

**Document Version:** 1.0  
**Date:** February 2026  
**Prepared For:** TPO Team, Silver Oak University  
**Live Preview:** [Portal Preview Link]

---

# 1. System Overview

The Silver Oak University Training & Placement Portal is a comprehensive web-based system that digitizes the end-to-end placement lifecycle — from student profile management and employer engagement through recruitment, offer management, internship administration, and institutional reporting.

The system replaces manual, fragmented processes (WhatsApp groups, spreadsheets, email chains) with a centralized, role-based platform ensuring data integrity, policy enforcement, and audit readiness for institutional accreditation (NAAC/NBA).

### Supported User Roles

| Role | Description |
|------|-------------|
| **Super Admin** | System-level access control, user management, audit logs |
| **TPO Admin** | Full administrative access to all placement operations |
| **TPO Employee** | Delegated administrative access (permissions configurable by Super Admin) |
| **Faculty Coordinator** | Department-scoped view of students, NOC approvals, and placement data |
| **Recruiter** | Company-specific recruitment pipeline, drive participation, candidate access |
| **Management** | Read-only access to analytics and summary dashboards |
| **Student** | Self-service profile, applications, offers, portfolio, and NOC requests |

### Core Modules

The system comprises 16 integrated modules:

1. Student Profile & Management
2. Employer Management
3. Job & Internship Postings
4. Interest Registration & Policy Acceptance
5. Applications & ATS Workflow
6. Events, Campus Drives & Scheduling
7. Offer, Joining & Compliance
8. Stipend & Internship Administration
9. Portfolio & Projects Showcase
10. Communication & Engagement (Announcements)
11. TPO Operations & Reporting
12. Security, Roles & Access Control
13. NOC & Document Generation
14. Circular & Communication Templates
15. Company Data Exchange (integrated into ATS)
16. Selection & Database Management (integrated into Student Hub)

---

# 2. Role-wise Functional Workflows

---

## 2.1 Student

### 2.1.1 Dashboard

**Navigation Path:** Sidebar → Main Menu → Dashboard  
**Route:** `/`

**Description:**
- Displays student identity card with name, roll number, department, batch, email, and phone.
- Shows quick stats: CGPA, resume count, eligible companies, certifications.
- Interest Registration section showing registered placement/internship interests with status.
- Eligibility Overview grid showing company-wise eligibility status (Eligible / Conditional / Not Eligible).
- Recent Activity feed.
- Profile Completion Card with readiness checklist and percentage progress.

**Actions Available:**
- Register/update placement interests.
- Navigate to incomplete profile sections.

---

### 2.1.2 My Profile

**Navigation Path:** Sidebar → Main Menu → My Profile  
**Route:** `/profile`

**Workflow Description:**
- Multi-tab profile editor: Personal, Academic, Skills & Preferences, Projects, Certifications, Employment Status, Placement Policy.
- Three profile states are supported (viewable via Demo Scenario Switcher):
  - **First Time:** Onboarding checklist with required steps (photo, personal details, academic info, skills, resume, projects).
  - **Incomplete:** Warning banner, progress bar, list of missing items with direct links to relevant tabs.
  - **Complete:** Full editable profile with all sections populated.
- **Personal Tab:** Contact details, address, LinkedIn URL, photo upload.
- **Academic Tab:** 10th, 12th/Diploma percentages, CGPA, backlog count, certifications.
- **Skills Tab:** Technical skill tags, domain interests, preferred locations (multi-select from configurable options).
- **Projects Tab:** Add/edit academic and personal projects with descriptions, technologies, links.
- **Certifications Tab:** Add/edit certifications with issuer, date, credential URL.
- **Employment Tab:** Current employment status toggle, employment type, company details, document upload.
- **Policy Tab:** Placement Policy acceptance with mandatory read, rule acknowledgement, and granular consent items (profile sharing, resume sharing, data storage, communication).

**System Validations:**
- Profile completion percentage calculated automatically.
- Minimum 80% profile completion required to access placement features.
- Policy acceptance is a mandatory prerequisite for applications.

**Demo Scenario Switcher:** Available. States: First Time, Incomplete, Complete.

---

### 2.1.3 Resume Management

**Navigation Path:** Sidebar → Main Menu → My Profile (or direct access)  
**Route:** `/resumes`

**Workflow Description:**
- Upload, view, and manage multiple resumes (PDF).
- Set one resume as default for applications.
- Delete non-default resumes.
- View file size, upload date, and download resumes.

---

### 2.1.4 My Portfolio

**Navigation Path:** Sidebar → Main Menu → My Portfolio  
**Route:** `/portfolio`

**Workflow Description:**
- Three tabs: Projects, Internship Showcase, Settings.
- **Projects Tab:** Add academic/personal projects with title, role, dates, description, technologies, keywords, GitHub/live demo links.
- **Internship Showcase Tab:** Add internship experiences linked to existing internship records or manual entries. Manual entries require proof upload (offer letter/certificate). Displays verification status (Verified/Unverified) and key outcomes.
- **Settings Tab:** Publish/Unpublish toggle controlling recruiter visibility. Portfolio summary (project count, internship count, technologies, completion %).
- Completion percentage calculated based on projects, internships, and keyword tagging.

**System Validations:**
- Manual (unlinked) internship entries require mandatory proof document.
- Published portfolios are visible to recruiters and Faculty Coordinators.

---

### 2.1.5 Discover Opportunities

**Navigation Path:** Sidebar → Placements → Opportunities  
**Route:** `/opportunities`

**Workflow Description:**
- Browse all published job and internship postings.
- Eligibility Summary showing counts: Eligible, Conditional, Not Eligible.
- Quick Stats: Total Postings, Eligible For You, Recommended, Open Now.
- "Recommended For You" section displaying postings with ≥60% skill match, sorted by match percentage.
- Filter panel: Search, Type (Job/Internship), Work Mode, Locations.
- Two tabs: "Eligible" (only postings the student qualifies for) and "All" (complete list).
- Each posting card shows company, role, CTC/stipend, location, work mode, deadline, and match percentage indicator.
- Filter preferences can be saved to localStorage.

**System Validations:**
- Eligibility auto-computed based on branch, batch, CGPA, and backlog count.
- If student has an active accepted offer: all Apply buttons disabled with "Applications Blocked" banner.
- If profile completion < 80%: "Profile Incomplete" banner displayed with link to complete profile.

**Demo Scenario Switcher:** Available. States: Eligible & Active, Blocked (Offer Accepted), Profile Incomplete (<80%).

---

### 2.1.6 Opportunity Detail & Apply

**Navigation Path:** Click any opportunity card from `/opportunities`  
**Route:** `/opportunities/:opportunityId`

**Workflow Description:**
- Full posting details: role, company, CTC/stipend, location, work mode, application deadline, description.
- Eligibility breakdown showing branch, CGPA, and backlog criteria with pass/fail indicators.
- Skill match percentage with matched/missing skills.
- Apply button opens Apply Dialog where student selects a resume and confirms application.
- Application is submitted with the selected resume.

**System Validations:**
- Apply button disabled if student is ineligible, blocked, or profile is incomplete.
- This action creates an application record visible in the TPO Admin's Applications module at `/admin/applications`.

---

### 2.1.7 My Applications

**Navigation Path:** Sidebar → Placements → My Applications  
**Route:** `/applications`

**Workflow Description:**
- Three tabs: Applications, Offers, Internships.
- **Applications Tab:** Lists all applications with current stage, mock round result, and timeline. Stage filter chips for quick filtering (All, Applied, Mock Round, Shortlisted, Test, Interview, HR, Offer Released, Rejected). Search by posting title or company.
- **Offers Tab:** Lists all offers with status, CTC, location, and action buttons. Students can Accept pending offers. Rejection rights are reserved for TPO Admin only.
- **Internships Tab:** Embedded Student Internships view showing internship records.
- Application cards show timeline progression (last 4 stages).

**System Validations:**
- Accepting an offer blocks all further applications system-wide.
- Offer acceptance triggers status update visible to TPO Admin at `/admin/offers`.

**Demo Scenario Switcher:** Available. States: Blocked (Offer Accepted), Fresh Student, Active Applicant, Pending Offer, Placed & Joined.

---

### 2.1.8 NOC Requests

**Navigation Path:** Sidebar → Placements → NOC Requests  
**Route:** `/noc`

**Workflow Description:**
- Stats overview: Total Requests, Pending, Issued, Rejected.
- Two tabs: Active Requests, Completed.
- "Request New NOC" button opens a multi-step wizard:
  - Step 1: Select NOC type (Internship, Training, Project).
  - Step 2: Enter company details (for self-sourced) or select from existing companies (university-placed).
  - Step 3: Review and submit.
- Each request card shows status, NOC type, company, submission date.
- Detail sheet shows full request information and approval timeline.

**Approval Chain:**
- Student submits → Faculty Coordinator reviews at `/faculty/noc-approvals` → TPO Admin reviews at `/admin/noc` → NOC issued with unique identifier (e.g., NOC/2026/CSE/0001).

**Demo Scenario Switcher:** Available. States: Has Requests, No Requests, Pending Only.

---

### 2.1.9 My Events & Drives

**Navigation Path:** Sidebar → Placements → My Events & Drives  
**Route:** `/drives`

**Workflow Description:**
- Two tabs: Upcoming, Past.
- Each event card shows: type badge, title, company, date, time, venue, status.
- If the student has an assigned slot: panel name, slot time, and room are displayed.
- Past events show attendance status.

---

### 2.1.10 Announcements

**Navigation Path:** Sidebar → Placements → Announcements  
**Route:** `/announcements`

**Workflow Description:**
- Lists all announcements targeted to the student's department and batch.
- Priority indicators: Urgent (high), Important (medium), Info (low).
- Unread count badge displayed.
- Click to open full announcement detail in a side sheet.
- "Read and Consent" acknowledgement for announcements requiring consent. Consent is timestamped and logged.

**System Validations:**
- Consent tracking is auditable by TPO Admin at `/admin/announcements`.

---

### 2.1.11 Placement Policy Acceptance

**Navigation Path:** Sidebar → Main Menu → My Profile → Policy Tab (or direct route)  
**Route:** `/policy`

**Workflow Description:**
- Full placement policy document displayed with scrollable sections.
- Three mandatory acknowledgements: Read Policy, Accept Rules, Granular Consent Items (profile sharing, resume sharing, data storage, communication).
- Submit button enabled only when all acknowledgements are completed.
- Acceptance is a prerequisite for applying to opportunities.

---

## 2.2 TPO Admin

### 2.2.1 Dashboard

**Navigation Path:** Sidebar → Overview → Dashboard  
**Route:** `/admin`

**Description:**
- Placement KPI cards: Placement Rate, Total Students, Placed, Active Companies, Active Drives, Ongoing Internships, Unplaced Students.
- Offer summary: Total Offers, Accepted, Joined, DNJ, Join Rate.
- Pending Verifications list with quick links to Student Hub.
- Interest Registration summary.
- Quick action links to key modules.

---

### 2.2.2 Student Hub

**Navigation Path:** Sidebar → Student Management → Students  
**Route:** `/admin/students`

**Workflow Description:**
Five tabs accessible via horizontal tab bar:

#### Tab: All Students
- Searchable, filterable table of all registered students.
- Columns: Name, Roll Number, Department, Batch, CGPA, Profile Completion %, Verification Status, Eligibility Status.
- Click any student row to open a detail sheet with full profile, academic data, and skills.

#### Tab: Verification
- **Route:** `/admin/students?tab=verification`
- Lists students with pending document verification.
- TPO Admin can Approve or Reject verification with remarks.
- Status transitions: Pending → Verified / Rejected.

#### Tab: Eligibility Rules
- **Route:** `/admin/students?tab=rules`
- Define and manage eligibility rules: minimum CGPA, maximum backlogs, eligible branches, batch years.
- Rules are applied automatically when evaluating student eligibility for postings.

#### Tab: Portfolios
- **Route:** `/admin/students?tab=portfolio`
- Monitor portfolio completion rates across students.
- Displays: student name, project count, completion %, published status.

#### Tab: Selections (Selection Database)
- **Route:** `/admin/students?tab=selections`
- Read-only system of record for all finalized placement and internship outcomes.
- Auto-derived from recruitment and joining modules.
- Serves institutional audit and accreditation (NAAC/NBA) requirements.

---

### 2.2.3 Employer Hub

**Navigation Path:** Sidebar → Employer Management → Companies  
**Route:** `/admin/employers`

**Workflow Description:**
Two tabs:

#### Tab: Companies
- **Route:** `/admin/employers?tab=companies`
- Table of all registered companies with status, industry, engagement count.
- Add Company dialog: company name, industry, website, address, description, tags.
- Edit and manage company records.
- Click company name to navigate to Company Detail page (`/admin/companies/:companyId`).
- Company Detail page shows: company info, engagement timeline, linked recruiters.
- Add/edit engagements with type (Placement, Internship, Guest Lecture, etc.), dates, students hired.
- Company tagging system for categorization.

#### Tab: Recruiters
- **Route:** `/admin/employers?tab=recruiters`
- Table of all recruiter accounts with verification status.
- Add Recruiter dialog: name, email, phone, designation, linked company.
- Verify/reject recruiter registrations.

---

### 2.2.4 Postings Management

**Navigation Path:** Sidebar → Placement Operations → Postings  
**Route:** `/admin/postings`

**Workflow Description:**
- Table of all job/internship postings with status, type, company, deadline, applicant count.
- Status filter: All, Draft, Published, Closed, Archived.
- Type filter: All, Full-time Job, Internship, Summer Internship, etc.
- "Create Posting" button navigates to `/admin/postings/create`.
- Create Posting form: company selection, role name, type, work mode, location, CTC/stipend, description, eligibility criteria (branches, min CGPA, max backlogs, batch years, skill requirements), application dates.
- Posting lifecycle: Draft → Published → Closed → Archived.
- View posting detail at `/admin/postings/:postingId` with applicant summary.
- Edit posting at `/admin/postings/:postingId/edit`.

---

### 2.2.5 Applications Management

**Navigation Path:** Sidebar → Placement Operations → Applications  
**Route:** `/admin/applications`

**Workflow Description:**
- Overview table of all applications across postings.
- Filter by stage, posting, and search by student name/enrollment.
- Stats cards: Total Applications, Shortlisted, In Progress, Offered.
- Click "View Pipeline" for any posting to navigate to the Application Pipeline.

---

### 2.2.6 Application Pipeline (ATS)

**Navigation Path:** Click "View Pipeline" from Applications Management  
**Route:** `/admin/applications/:postingId`

**Workflow Description:**
- Table-based recruitment pipeline for a specific posting.
- Stage tabs: All, Applied, Mock Round, Shortlisted, Test, Interview, HR, Offer Released, Rejected.
- Each tab shows count of students in that stage.
- Candidate table with columns: Name, Enrollment, Department, CGPA, 10th %, 12th %, Stage, Mock Result.
- **Bulk Action Toolbar** (appears when candidates are selected via checkboxes):
  - Move to Stage: advance selected candidates to the next stage.
  - Set Mock Result: Pass/Fail (only in Mock Round stage).
  - Reject: with mandatory rejection remarks.
- Candidate detail view accessible per row.
- **Export Candidates** dialog for sharing shortlisted candidate data with recruiters.
- **Exchange Log** tab tracking all data exports and imports with recruiters.

**System Validations:**
- Mock Round is a mandatory gatekeeping stage. Only students with "Passed" mock result can be moved to "Shortlisted."
- Shortlisted students' profiles and resumes become visible to recruiters.
- PII protection: recruiter-shared exports mask sensitive personal information.

---

### 2.2.7 Events & Drives Management

**Navigation Path:** Sidebar → Placement Operations → Events & Drives  
**Route:** `/admin/drives`

**Workflow Description:**
- Table of all campus events: placement drives, pre-placement talks, mock interviews, workshops.
- Create Event dialog: title, type, company, date, time, venue, description.
- Slot Allocation dialog: assign students to interview panels and time slots.
- Bulk Attendance dialog: mark attendance (Present/Absent/Late) for all assigned students.
- Event lifecycle: Draft → Published → Ongoing → Completed.

---

### 2.2.8 Offers & Joining Management

**Navigation Path:** Sidebar → Placement Operations → Offers & Joining  
**Route:** `/admin/offers`

**Workflow Description:**
- Unified table of all offers with lifecycle stage filter chips: All, Pending, Accepted, Joined, DNJ (Did Not Join), Rejected, Blocked.
- Stats summary: Total Offers, Pending, Accepted, Joined, DNJ, Blocked, Compliance Rate.
- "Create Offer" dialog: select student, company, posting, role, CTC, location, offer date.
- **Offer Lifecycle:** Pending Student Action → Accepted → Joined (or Did Not Join / Rejected by Admin).
- "Reject Offer" action (Admin only): requires mandatory rejection reason.
- "Confirm Joining" dialog: verify student joining with date and verifier name.
- Offer Detail Sheet: full offer history, compliance status, audit trail.
- Lock/Unlock records: joined records are locked by default.

**System Validations:**
- Students can only Accept offers; Reject and DNJ actions are reserved for TPO Admin.
- Single Active Offer Policy: accepting an offer blocks all further applications.
- Admin can override blocked status if needed.
- This module receives offer triggers from student acceptance at `/applications`.

---

### 2.2.9 Internship Administration

**Navigation Path:** Sidebar → Placement Operations → Internships  
**Route:** `/admin/internships`

**Workflow Description:**
- Table of all internship records with tabs: All, Ongoing, Completed, Issues.
- Stats: Total, Ongoing, Completed, Issues flagged.
- Filter by type (Summer, Winter, Final Semester, NEP, OJT/Stipend), status, company.
- "Import from Offers" dialog: auto-create internship records from accepted internship offers.
- "Add Internship" dialog: manual entry for internships not originating from postings.
- Internship Detail Sheet: student info, company, dates, stipend, mentor, status, issues.
- Issue tracking: flag and resolve internship issues (attendance, stipend delay, mentor concerns).
- Status transitions: Pending → Ongoing → Completed (or Terminated).

---

### 2.2.10 NOC Management

**Navigation Path:** Sidebar → Placement Operations → NOC Management  
**Route:** `/admin/noc`

**Workflow Description:**
- Table of all NOC requests across students with tabs: All, Pending, Approved, Issued, Rejected.
- Stats: Total, Pending TPO Review, Issued, Rejected.
- Detail view for each request: student info, company details, NOC type, approval timeline.
- Approve/Reject actions with remarks.
- Issue NOC: generates unique NOC identifier (e.g., NOC/2026/CSE/0001).
- Tracks faculty approval status before TPO review.

**Approval Chain:** Student → Faculty Coordinator (at `/faculty/noc-approvals`) → TPO Admin → Issuance.

---

### 2.2.11 Announcements

**Navigation Path:** Sidebar → Placement Operations → Announcements  
**Route:** `/admin/announcements`

**Workflow Description:**
- Create announcements targeted to: All Students, specific Batch, specific Department, or Opportunity-specific.
- Set priority: High (Urgent), Medium (Important), Low (Info).
- Enable/disable "Require Consent" flag.
- View delivery metrics: Total Recipients, Read Count, Consent Count.
- Table of all announcements with status, audience, priority, read/consent metrics.
- Detail view with individual student read/consent tracking.

---

### 2.2.12 Circulars & Templates

**Navigation Path:** Sidebar → Placement Operations → Circulars & Templates  
**Route:** `/admin/circulars`

**Workflow Description:**
Two tabs: Templates, Generated Circulars.

#### Templates Tab
- Table of circular templates with type (Placement, Internship, Stipend/NEP), status (Active/Draft/Archived).
- "Create Template" navigates to `/admin/circulars/templates/create`.
- Template editor with structured field sections: Company Info, Compensation, Eligibility, Bond Policy, Process Details.
- Live Preview panel for real-time rendering.
- Template lifecycle: Draft → Active → Archived.

#### Generated Circulars Tab
- Table of generated circulars linked to specific drives/postings.
- "Generate Circular" dialog: select template, auto-fill company and posting details.
- Generated circulars are immutable snapshots.
- View, copy, and archive generated circulars.

---

### 2.2.13 Policy Repository

**Navigation Path:** Sidebar → Analytics → Policies  
**Route:** `/admin/policies`

**Workflow Description:**
- Searchable repository of institutional policy documents.
- Categories: Placement Policy, MoU Template, Code of Conduct, Internship Guidelines, Compliance, Institutional.
- View policy content in detail sheet.
- Download policies.

---

### 2.2.14 Reports & Analytics

**Navigation Path:** Sidebar → Analytics → Reports  
**Route:** `/admin/reports`

**Workflow Description:**
- Sidebar navigation with hierarchical report modules:
  - **Students:** Interest Registration, Verification Status.
  - **Employers:** Engagement History.
  - **Postings:** Active Postings, Type Summary.
  - **ATS:** Applicant List, Stage-wise Pipeline, Shortlist/Rejection Summary.
  - **NOC:** Pending NOC, Issued NOC Register, NOC by Dept/Batch.
  - **Events & Drives:** Attendance, Drive Completion, Participation History.
  - **Offers & Joining:** Offer Acceptance, Joining Status, Active Offer Compliance.
  - **Internships & Stipends:** Status Summaries, Certificate Pending, Company-wise Metrics.
  - **Portfolio & Showcase:** Completion Summary, Published Portfolios.
  - **Communication:** Announcement History, Consent Tracking.
  - **Placement Analytics:** Placement Summary (Dept × Batch), Company Performance (Funnel), Offer-to-Join Funnel (Conversion), Unplaced Students (Intervention list).
- Each report provides: table view, filters (department, batch, date range), and Export to CSV/Excel.
- Standardized ReportToolbar with filter controls.

---

### 2.2.15 Interest Lists

**Navigation Path:** Accessible from Admin Dashboard quick links  
**Route:** `/admin/interests`

**Workflow Description:**
- View student interest registrations by type (Placement, Summer Internship, Winter Internship, etc.).
- Filter and export student pools based on interest type for outreach.

---

## 2.3 TPO Employee

TPO Employee shares the same interface as TPO Admin. The difference is in permissions, which are configurable by the Super Admin through the Roles & Permissions Matrix at `/super-admin`.

Depending on the configuration, a TPO Employee may have:
- **View-only** access to certain modules (e.g., Reports, Selection Database).
- **Create/Edit** access to operational modules (e.g., Postings, Applications, Drives).
- **No access** to sensitive modules (e.g., User Management, Policy Repository).

The specific permission set is defined per-institution and enforced at the UI level. Refer to the Super Admin section (2.7) for the full permissions matrix.

---

## 2.4 Faculty Coordinator

### 2.4.1 Dashboard

**Navigation Path:** Sidebar → Department → Dashboard  
**Route:** `/faculty`

**Description:**
- Department-specific stats: Total Students, Profiles Complete, Eligible for Placements, Placed Students.
- Recent student list with CGPA and eligibility status.

---

### 2.4.2 Department Students

**Navigation Path:** Sidebar → Department → Department Students  
**Route:** `/faculty/students`

**Workflow Description:**
- View all students in the coordinator's department.
- Read-only access to student profiles, academic data, and eligibility status.

---

### 2.4.3 Employer Directory

**Navigation Path:** Sidebar → Employer Directory → Employer Directory  
**Route:** `/faculty/employers`

**Workflow Description:**
- Read-only directory of all registered companies.
- View company details, industry, engagement history.

---

### 2.4.4 NOC Approvals

**Navigation Path:** Sidebar → Placements → NOC Approvals  
**Route:** `/faculty/noc-approvals`

**Workflow Description:**
- Table of NOC requests from students in the coordinator's department.
- Review request details: student info, company, NOC type, purpose.
- Approve or Reject with remarks.
- Approved requests are forwarded to TPO Admin at `/admin/noc` for final review.

**System Validations:**
- Faculty can only see requests from their own department.
- Faculty approval is the first step in the NOC chain; TPO Admin approval follows.

---

### 2.4.5 Offers & Joining (Read-only)

**Navigation Path:** Sidebar → Placements → Offers & Joining  
**Route:** `/faculty/offers`

**Workflow Description:**
- Read-only view of offers for students in the coordinator's department.
- View offer status, company, CTC, joining status.

---

### 2.4.6 Internships (Read-only)

**Navigation Path:** Sidebar → Placements → Internships  
**Route:** `/faculty/internships`

**Workflow Description:**
- Read-only view of internship records for department students.
- View type, company, status, dates, stipend.

---

### 2.4.7 Department Events

**Navigation Path:** Sidebar → Placements → Department Events  
**Route:** `/faculty/drives`

**Workflow Description:**
- View campus events and drives relevant to the department.
- Read-only access to event details, schedules, and attendance.

---

### 2.4.8 Announcements

**Navigation Path:** Sidebar → Placements → Announcements  
**Route:** `/faculty/announcements`

**Workflow Description:**
- View announcements from TPO relevant to the department.
- Read-only access.

---

### 2.4.9 Circulars

**Navigation Path:** Sidebar → Placements → Circulars  
**Route:** `/faculty/circulars`

**Workflow Description:**
- Read-only view of published circulars.
- View circular content, linked posting/drive details.

---

## 2.5 Recruiter

### 2.5.1 Dashboard

**Navigation Path:** Sidebar → Main Menu → Dashboard  
**Route:** `/recruiter`

**Description:**
- Company overview: company name, industry, status.
- Engagement stats: Total Hired, Placement Drives, Internship Programs.
- Recent engagement timeline.
- Quick action links to Pipeline, Drives, Internships.

---

### 2.5.2 Company Profile (Read-only)

**Navigation Path:** Sidebar → Main Menu → Company Profile  
**Route:** `/recruiter/company`

**Workflow Description:**
- View the linked company's profile: name, industry, website, address, tags.
- View engagement history timeline.
- Read-only; company data is managed by TPO Admin.

---

### 2.5.3 Recruiter Profile

**Navigation Path:** Sidebar → Main Menu → My Profile  
**Route:** `/recruiter/profile`

**Workflow Description:**
- View and manage personal recruiter profile: name, designation, email, phone.

---

### 2.5.4 Recruitment Pipeline

**Navigation Path:** Sidebar → Main Menu → Recruitment Pipeline  
**Route:** `/recruiter/pipeline`

**Workflow Description:**
- View shortlisted candidates shared by the TPO team for the recruiter's company.
- Candidates are grouped by posting.
- Expandable posting sections showing candidate table: Name, Department, CGPA, 10th %, 12th %, Stage.
- View candidate detail sheet with academic profile and resume.
- Download candidate data (with PII protection applied).

**System Validations:**
- Only candidates who have passed the Mock Round and been "Shortlisted" by TPO are visible.
- PII (personal phone, address, etc.) is masked in recruiter views and exports.
- This data originates from TPO Admin's ATS Pipeline actions at `/admin/applications/:postingId`.

---

### 2.5.5 My Events

**Navigation Path:** Sidebar → Main Menu → My Events  
**Route:** `/recruiter/drives`

**Workflow Description:**
- View campus events and drives where the recruiter's company is participating.
- Event details: date, time, venue, type, assigned panels.

---

### 2.5.6 Internships

**Navigation Path:** Sidebar → Main Menu → Internships  
**Route:** `/recruiter/internships`

**Workflow Description:**
- View internship records for students placed at the recruiter's company.
- Track intern status, dates, and completion.

---

## 2.6 Management

The Management role provides read-only access to analytics and summary dashboards. This role uses the same Reports & Analytics interface as TPO Admin at `/admin/reports`, with view-only permissions.

**Accessible Data:**
- Placement Summary by Department and Batch.
- Company Performance and Funnel metrics.
- Offer-to-Join conversion rates.
- Unplaced students intervention list.
- All standard reports listed under Section 2.2.14.

**Note:** Management role does not have access to student PII, individual application records, or operational actions.

---

## 2.7 Super Admin

### 2.7.1 Security & Access Control Dashboard

**Navigation Path:** Sidebar → System → Security & Access  
**Route:** `/super-admin`

**Description:**
Three tabs: Users, Roles, Audit Log.

---

### 2.7.2 User Management

**Navigation Path:** Sidebar → System → Security & Access → Users Tab  
**Route:** `/super-admin` (Users tab)

**Workflow Description:**
- Table of all system users with: Name, Email, Role, Status (Active/Inactive/Suspended), Last Login.
- Search and filter by role, status.
- Add/edit user accounts.
- Activate, suspend, or deactivate user accounts.

---

### 2.7.3 Roles & Permissions Matrix

**Navigation Path:** Sidebar → System → Security & Access → Roles Tab  
**Route:** `/super-admin` (Roles tab)

**Workflow Description:**
- Interactive permissions matrix showing all roles vs. all system modules.
- Permission levels: View (V), Create (C), Edit (E), Approve (A), Export (Ex).
- **Edit Mode:** Toggle to enable checkbox-based permission editing per role per module.
- Floating save bar for bulk updates.
- "Reset to Defaults" button to revert to institutional standard configuration.
- Changes apply immediately to all users of the affected role.

---

### 2.7.4 Audit Log

**Navigation Path:** Sidebar → System → Security & Access → Audit Log Tab  
**Route:** `/super-admin` (Audit Log tab)

**Workflow Description:**
- Chronological log of all system actions: login/logout, data changes, permission modifications, sensitive operations.
- Filter by user, action type, date range.
- Each entry shows: timestamp, user, action, affected resource, IP address.

---

# 3. Cross-Workflow System Rules

### 3.1 80% Profile Completion Enforcement
- Students must achieve ≥80% profile completion before applying to any opportunity.
- Enforced at the Opportunities page (`/opportunities`) and Opportunity Detail page.
- Incomplete profiles receive a warning banner with a link to complete the profile.

### 3.2 Mock Round Gatekeeping
- A mandatory Mock Round conducted by the T&P Cell acts as an internal quality gate.
- Only students with a "Passed" mock result can be moved from "Applied" to "Shortlisted" in the ATS pipeline.
- Shortlisted students' profiles and resumes become visible to recruiters.

### 3.3 Single Active Offer Policy
- A student may hold only one active accepted offer at any time.
- Accepting an offer immediately blocks all further applications system-wide.
- The "Applications Blocked" status is displayed on the student's Opportunities page and Applications page.
- TPO Admin can override this block in exceptional cases via the Offers Management page.

### 3.4 PII Protection in Recruiter Views & Exports
- Recruiter-facing views and data exports mask sensitive personal information (phone numbers, personal email, home address).
- Only academic data (CGPA, marks, department) and professional data (skills, resume) are shared.
- Export logs are maintained in the Exchange Log tab of the ATS Pipeline.

### 3.5 NOC Approval Chain
- NOC requests follow a mandatory two-step approval: Faculty Coordinator → TPO Admin.
- Faculty can only view/approve requests from their own department.
- Self-sourced companies may require additional company verification before NOC issuance.
- Issued NOCs receive a unique identifier: `NOC/{Year}/{Department}/{Sequence}`.

### 3.6 Status Lifecycle Controls
- **Postings:** Draft → Published → Closed → Archived. Only published postings are visible to students.
- **Applications:** Applied → Mock Round → Shortlisted → Test → Interview → HR → Offer Released / Rejected. Stage transitions are controlled by TPO Admin via bulk actions.
- **Offers:** Pending Student Action → Accepted → Joined / Did Not Join / Rejected by Admin. Joined records are locked.
- **Events:** Draft → Published → Ongoing → Completed.
- **Internships:** Pending → Ongoing → Completed / Terminated.
- **NOC:** Pending Faculty → Pending TPO → Approved → Issued / Rejected.
- **Circulars:** Draft → Active → Archived. Generated circulars are immutable.

---

# 4. System Access Quick Reference

| Role | Home Route | Sidebar Portal Label |
|------|-----------|---------------------|
| Student | `/` | T&P Cell Portal |
| TPO Admin | `/admin` | TPO Admin Portal |
| Faculty Coordinator | `/faculty` | Faculty Portal |
| Recruiter | `/recruiter` | Recruiter Portal |
| Super Admin | `/super-admin` | Super Admin |

**Role Switching:** A demo Role Switcher is available in the top navigation bar to preview different role interfaces during evaluation. In production, users will be authenticated into their assigned role.

**Theme:** The portal supports both Light and Dark modes, togglable from the top navigation bar.

---

*End of Document*
