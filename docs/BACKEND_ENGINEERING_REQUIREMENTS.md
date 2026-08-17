# SOU Training & Placement Portal - Backend Engineering Requirements Document

## Node.js + PostgreSQL Implementation Guide

**Version:** 1.0
**Date:** 2026-03-07
**Derived From:** Frontend Codebase Analysis (React 18 + TypeScript + Vite)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Application Purpose

The SOU Training & Placement Portal is a comprehensive, multi-tenant university placement management system designed to digitize and streamline the entire campus recruitment lifecycle. It replaces manual placement processes with a centralized platform serving students, TPO administrators, faculty coordinators, recruiters, and super administrators.

## 1.2 Major Business Domains

1. **Student Profile & Career Readiness Management** - Profile completion, academic records, skills, resumes, policy acceptance
2. **Employer & Company Relationship Management** - Company registration, recruiter management, engagement tracking, classification
3. **Job & Internship Posting Management** - Multi-type posting creation, eligibility criteria, selection process definition
4. **Application Tracking System (ATS)** - 8-stage pipeline, mock round gatekeeping, bulk operations, recruiter feedback
5. **Offer, Joining & Compliance Management** - Offer lifecycle, single-active-offer policy, joining confirmation, compliance blocking
6. **Campus Events & Drive Scheduling** - Event creation, slot allocation, panel management, attendance tracking
7. **NOC (No Objection Certificate) Management** - Multi-step wizard, dual approval chain, company verification, certificate issuance
8. **Internship Administration** - Record tracking, stipend management, issue tracking, certificate management
9. **Portfolio & Showcase** - Student project showcases, internship highlights, recruiter visibility
10. **Communications** - Announcements with consent tracking, circular template generation
11. **No Dues Certificate (NDC)** - Exit processing, conditional workflows by exit reason
12. **Policy & Compliance** - Policy repository, acceptance tracking, data consent management
13. **Reports & Analytics** - 25+ report types across all modules
14. **Security & Access Control** - Role-based access, permission matrix, audit logging, user management

## 1.3 User Roles (7 Roles)

| Role | Internal Key | Description |
|------|-------------|-------------|
| Student | `student` | Browse opportunities, apply, manage profile/portfolio, request NOC/NDC |
| TPO Admin | `tpo_admin` | Full placement operations management, all CRUD operations |
| TPO Employee | `tpo_employee` | Same interface as TPO Admin, permissions configurable via Super Admin |
| Faculty Coordinator | `faculty_coordinator` | Department-scoped read access, NOC approval, attendance marking |
| Recruiter | `recruiter` | View candidates (PII-restricted), manage pipeline, view drives |
| Management | `management` | Read-only analytics dashboards and reports |
| Super Admin | `super_admin` | User management, role/permission configuration, audit logs |

## 1.4 Overall Backend Scope

- **43 frontend routes** requiring API backing
- **16 major modules** with full CRUD and workflow operations
- **30+ PostgreSQL tables** estimated
- **150+ API endpoints** estimated
- **60+ test cases** documented in frontend docs
- **10 business rules** requiring server-side enforcement
- Multi-tenant architecture with tenant-specific configuration
- Role-based access control (RBAC) with permission matrix
- PII protection layer for recruiter-facing APIs
- Audit logging for all sensitive operations

---

# 2. FRONTEND INVENTORY

## 2.1 Student Module (12 Routes)

### 2.1.1 Student Dashboard (`/`)
- **Purpose:** Landing page showing student identity, stats, eligibility, readiness
- **UI Components:** Identity card, quick stats grid (CGPA, resumes, eligible companies, certs), interest registration card, eligibility overview table, recent activity, profile completion progress
- **Data Inputs:** None (read-only)
- **Data Outputs:** Student profile, academic profile, resumes, eligibility checks, readiness checklist, interest registrations
- **Backend Dependencies:** GET student profile, GET academic profile, GET resumes, GET eligibility checks, GET readiness checklist, GET interests

### 2.1.2 Student Profile (`/profile`)
- **Purpose:** Multi-tab profile editor with 7 sections
- **UI Components:** Tabbed form (Personal, Academic, Skills & Interests, Projects, Certifications, Employment, Policy & Consent)
- **Data Inputs:** All student profile fields, academic fields, skills, projects, certifications, employment, policy acceptance
- **Data Outputs:** Updated profile data
- **Backend Dependencies:** GET/PUT student profile, GET/PUT academic profile, GET/PUT skills profile, CRUD projects, CRUD certifications, GET/PUT employment, POST policy acceptance

### 2.1.3 Resume Management (`/resumes`)
- **Purpose:** Upload, manage, and track resume scores
- **UI Components:** Upload area, resume cards with AI score, default resume toggle
- **Data Inputs:** Resume file upload, default flag
- **Data Outputs:** Resume list with metadata and AI scores
- **Backend Dependencies:** POST upload resume, GET resumes, PUT set default, DELETE resume, GET AI score

### 2.1.4 Portfolio (`/portfolio`)
- **Purpose:** Showcase projects and internship experiences
- **UI Components:** Projects tab (CRUD), Internship Showcase tab (CRUD), Settings tab (visibility toggle)
- **Data Inputs:** Project details, internship showcase details, visibility setting
- **Data Outputs:** Portfolio with projects, internships, completion stats
- **Backend Dependencies:** CRUD portfolio projects, CRUD internship showcases, PUT portfolio settings, GET portfolio stats

### 2.1.5 Discover Opportunities (`/opportunities`)
- **Purpose:** Browse and filter eligible job/internship postings
- **UI Components:** Eligibility summary stats, recommended section, filters (type, work mode, location, domain, stipend, CTC), tabs (eligible/all), opportunity cards with match percentage
- **Data Inputs:** Filter parameters
- **Data Outputs:** Paginated postings with eligibility status and match percentage
- **Backend Dependencies:** GET postings with eligibility check, GET match percentage calculation

### 2.1.6 Opportunity Detail (`/opportunities/:opportunityId`)
- **Purpose:** View full posting details and apply
- **UI Components:** Header with match/eligibility status, company & role info, eligibility criteria with pass/fail indicators, selection process, apply dialog
- **Data Inputs:** Application submission (resume selection, confirmations)
- **Data Outputs:** Full posting detail, eligibility result, match percentage
- **Backend Dependencies:** GET posting by ID, GET eligibility for student, POST application

### 2.1.7 My Applications (`/applications`)
- **Purpose:** Track applications, offers, and internships
- **UI Components:** 3 tabs (Applications with stage filters, Offers with status filters, Internships), celebration banner, blocked banner
- **Data Inputs:** Offer acceptance action
- **Data Outputs:** Applications with stage history, offers with status, internships
- **Backend Dependencies:** GET applications by student, GET offers by student, GET internships by student, POST accept offer

### 2.1.8 NOC Dashboard (`/noc`)
- **Purpose:** Request and track NOC certificates
- **UI Components:** Stats cards, tabs (active/completed), request wizard (4-step), detail sheet
- **Data Inputs:** NOC request form (type, program, source, company, contact, details, documents)
- **Data Outputs:** NOC requests with status, certificates
- **Backend Dependencies:** GET NOC requests by student, POST NOC request, GET NOC certificate download

### 2.1.9 Student Drives (`/drives`)
- **Purpose:** View upcoming and past campus events
- **UI Components:** Tabs (upcoming/past), event cards with schedule/panel/slot info, attendance status
- **Data Inputs:** None (read-only)
- **Data Outputs:** Events with student slot assignments and attendance
- **Backend Dependencies:** GET events for student

### 2.1.10 Announcements (`/announcements`)
- **Purpose:** View announcements and provide consent
- **UI Components:** Unread banner, announcement cards, detail sheet with consent button
- **Data Inputs:** Consent acknowledgment, read receipt
- **Data Outputs:** Announcements with read/consent status
- **Backend Dependencies:** GET announcements for student, POST mark read, POST give consent

### 2.1.11 Policy Acceptance (`/policy`)
- **Purpose:** Read and accept placement policy and data consent
- **UI Components:** Policy sections (5), consent items (4), checkboxes, digital acceptance
- **Data Inputs:** Policy read confirmation, consent items, digital acceptance
- **Data Outputs:** Acceptance status
- **Backend Dependencies:** GET policy content, GET acceptance status, POST accept policy

### 2.1.12 No Dues Certificate (`/no-dues`)
- **Purpose:** Request NDC for exit processing
- **UI Components:** Request list, request form with conditional fields by exit reason
- **Data Inputs:** Exit reason, conditional fields (employment/family business/higher studies), declaration
- **Data Outputs:** NDC requests with status, certificate
- **Backend Dependencies:** GET NDC requests by student, POST NDC request, GET NDC certificate download

## 2.2 Admin Module (23 Routes)

### 2.2.1 Admin Dashboard (`/admin`)
- **Purpose:** KPI overview with placement stats
- **UI Components:** 6 KPI cards, placement/join rate progress, quick actions, pending verifications, interest registrations, platform overview
- **Backend Dependencies:** GET admin stats (placed, interned, offers, companies, unplaced counts), GET pending verifications, GET interest summary, GET platform metrics

### 2.2.2 Student Hub (`/admin/students`)
- **Purpose:** Student management with 5 tabs
- **Tabs:** All Students, Verification (with pending count), Eligibility Rules, Portfolios, Selection Database
- **Backend Dependencies:** GET all students (paginated, filtered), PUT verify student, CRUD eligibility rules, GET portfolios, GET selection database

### 2.2.3 Employer Hub (`/admin/employers`)
- **Purpose:** Company and recruiter management
- **Tabs:** Companies, Recruiters (with pending count)
- **Backend Dependencies:** CRUD companies, CRUD recruiters, PUT verify recruiter, PUT classify company

### 2.2.4 Company Detail (`/admin/companies/:companyId`)
- **Purpose:** Single company view with recruiters and engagement history
- **Backend Dependencies:** GET company by ID, GET company stats, GET recruiters by company, GET engagements by company, POST add recruiter, POST add engagement

### 2.2.5 Postings Management (`/admin/postings`)
- **Purpose:** Job/internship posting CRUD with filtering
- **Backend Dependencies:** GET postings (filtered by status, type, search), GET posting stats, PUT publish/close posting

### 2.2.6 Create Posting (`/admin/postings/create`)
- **Purpose:** 5-step posting creation wizard
- **Backend Dependencies:** POST create posting (draft or published)

### 2.2.7 Posting Detail (`/admin/postings/:postingId`)
- **Purpose:** View posting details with eligible students tab
- **Backend Dependencies:** GET posting by ID, GET eligible students for posting, PUT publish posting, PUT close posting

### 2.2.8 Edit Posting (`/admin/postings/:postingId/edit`)
- **Purpose:** Edit existing posting (same 5-step wizard)
- **Backend Dependencies:** GET posting by ID, PUT update posting

### 2.2.9 Interest Lists (`/admin/interests`)
- **Purpose:** View and export students by interest type
- **Backend Dependencies:** GET students by interest type (filtered by department), GET interest type summary

### 2.2.10 Applications Management (`/admin/applications`)
- **Purpose:** Overview of all applications with pipeline quick links
- **Backend Dependencies:** GET application stats, GET applications (filtered), GET postings with application counts

### 2.2.11 Application Pipeline (`/admin/applications/:postingId`)
- **Purpose:** Full ATS pipeline per posting with bulk operations
- **Backend Dependencies:** GET applications by posting, PUT bulk move stage, PUT bulk set mock result, PUT bulk reject, GET exchange log, POST export candidates

### 2.2.12 NOC Management (`/admin/noc`)
- **Purpose:** Review and approve NOC requests, verify companies
- **Backend Dependencies:** GET NOC requests (filtered), PUT approve NOC, PUT reject NOC, PUT verify company, GET NOC stats

### 2.2.13 Drives Management (`/admin/drives`)
- **Purpose:** Create and manage campus events
- **Backend Dependencies:** CRUD events, PUT publish/complete event, POST slot allocation, POST bulk attendance, GET event stats

### 2.2.14 Offers Management (`/admin/offers`)
- **Purpose:** Manage offers, joining, compliance
- **Backend Dependencies:** POST create offer, PUT reject offer, PUT confirm joining, GET offers (filtered), GET compliance stats

### 2.2.15 Internships Management (`/admin/internships`)
- **Purpose:** Track internship records with bulk operations
- **Backend Dependencies:** CRUD internships, PUT bulk status change, GET internship stats, GET issues, GET certificate alerts

### 2.2.16 Announcement Management (`/admin/announcements`)
- **Purpose:** Create, publish, track announcements
- **Backend Dependencies:** CRUD announcements, PUT publish/archive, GET receipts and stats

### 2.2.17 Circulars Management (`/admin/circulars`)
- **Purpose:** Manage circular templates and generate circulars
- **Backend Dependencies:** CRUD templates, POST generate circular, GET generated circulars

### 2.2.18 Create/Edit Circular Template (`/admin/circulars/templates/create`, `/admin/circulars/templates/:templateId/edit`)
- **Backend Dependencies:** POST create template, PUT update template

### 2.2.19 No Dues Management (`/admin/no-dues`)
- **Purpose:** Review and process NDC requests
- **Backend Dependencies:** GET NDC requests (filtered), PUT approve/reject/return NDC, POST issue NDC

### 2.2.20 Policy Repository (`/admin/policies`)
- **Purpose:** Manage placement policy documents
- **Backend Dependencies:** CRUD policies

### 2.2.21 Reports & Analytics (`/admin/reports`)
- **Purpose:** Generate 25+ report types
- **Backend Dependencies:** Multiple report endpoints (see Reports section)

## 2.3 Faculty Module (9 Routes)

### 2.3.1 Faculty Dashboard (`/faculty`)
- **Purpose:** Department-scoped stats overview
- **Backend Dependencies:** GET department stats (students, profiles, eligible, placed)

### 2.3.2 Department Students (`/faculty/students`)
- **Purpose:** Read-only student directory
- **Backend Dependencies:** GET students by department (filtered, paginated)

### 2.3.3 Employer Directory (`/faculty/employers`)
- **Purpose:** Read-only company directory
- **Backend Dependencies:** GET companies (filtered)

### 2.3.4 NOC Approvals (`/faculty/noc-approvals`)
- **Purpose:** Review and approve/reject NOC requests for department
- **Backend Dependencies:** GET pending faculty approvals (department-scoped), PUT approve/reject NOC

### 2.3.5 Faculty Drives (`/faculty/drives`)
- **Purpose:** View department events, mark attendance
- **Backend Dependencies:** GET events by department, PUT mark attendance

### 2.3.6 Faculty Offers (`/faculty/offers`)
- **Purpose:** Read-only offer/joining status view
- **Backend Dependencies:** GET offers by department

### 2.3.7 Faculty Internships (`/faculty/internships`)
- **Purpose:** Read-only internship records
- **Backend Dependencies:** GET internships by department

### 2.3.8 Faculty Announcements (`/faculty/announcements`)
- **Purpose:** Read-only announcements view
- **Backend Dependencies:** GET published announcements

### 2.3.9 Faculty Circulars (`/faculty/circulars`)
- **Purpose:** Read-only circulars view
- **Backend Dependencies:** GET generated circulars

## 2.4 Recruiter Module (6 Routes)

### 2.4.1 Recruiter Dashboard (`/recruiter`)
- **Purpose:** Welcome page with company overview and quick stats
- **Backend Dependencies:** GET recruiter profile, GET company summary, GET engagement stats

### 2.4.2 Recruiter Profile (`/recruiter/profile`)
- **Purpose:** View/edit recruiter contact details
- **Backend Dependencies:** GET recruiter profile, PUT update phone/designation

### 2.4.3 Company View (`/recruiter/company`)
- **Purpose:** Read-only company profile and team
- **Backend Dependencies:** GET company by recruiter, GET team members, GET engagement timeline

### 2.4.4 Recruitment Pipeline (`/recruiter/pipeline`)
- **Purpose:** View shortlisted candidates (PII-restricted)
- **Backend Dependencies:** GET postings by recruiter company, GET applications by posting (PII-filtered), POST recruiter feedback

### 2.4.5 Recruiter Drives (`/recruiter/drives`)
- **Purpose:** View assigned campus events
- **Backend Dependencies:** GET events for recruiter

### 2.4.6 Recruiter Internships (`/recruiter/internships`)
- **Purpose:** View internship records for company
- **Backend Dependencies:** GET internships by company

## 2.5 Super Admin Module (1 Route)

### 2.5.1 Security & Access Control (`/super-admin`)
- **Purpose:** User management, role/permission configuration, audit logs
- **Tabs:** Users, Roles & Permissions, Audit Log
- **Backend Dependencies:** CRUD users, GET/PUT permission matrix, GET audit logs (filtered)
# 3. FEATURE-BY-FEATURE FUNCTIONAL BREAKDOWN

## 3.1 Student Profile Management

### Feature: Profile Completion Tracking
- **Business Purpose:** Ensure students have minimum 80% profile completion before accessing placement features
- **Trigger:** Any profile field update
- **User Steps:** Student fills profile sections across 7 tabs
- **System Behavior:** Recalculate completion percentage on each save; enforce 80% minimum for interest registration, opportunity browsing, and applications
- **Success:** Profile completion percentage updated, progress bar reflects change
- **Failure:** Validation errors displayed per field
- **Validations:** Name (required, locked after policy), email (format), phone (10-15 digits), CGPA (0-10), percentages (0-100), LinkedIn URL format
- **Backend:** PUT `/api/students/:id/profile`, recalculate profile_completion_percentage, return updated profile

### Feature: Policy Acceptance
- **Business Purpose:** Legal compliance - student must accept placement rules and data consent before participating
- **Trigger:** Student clicks "Accept & Submit" on policy page
- **User Steps:** Read policy (scroll through 5 sections) -> check "I have read" -> check "I accept all rules" -> check 4 consent items -> submit
- **System Behavior:** Record acceptance with timestamp, unlock placement features
- **Success:** Green acceptance card shown, features unlocked
- **Failure:** Cannot proceed without all checkboxes
- **Validations:** All 6 checkboxes must be true; cannot re-accept (idempotent)
- **Backend:** POST `/api/students/:id/policy-acceptance`, store acceptance_timestamp, consent_items, ip_address

### Feature: Resume Management
- **Business Purpose:** Students maintain resumes for applications; one default resume per student
- **Trigger:** Upload button click
- **User Steps:** Upload file -> view in list -> optionally set as default -> optionally delete
- **System Behavior:** Store file, generate metadata, trigger AI scoring (async)
- **Success:** Resume appears in list with metadata and AI score
- **Failure:** File type/size validation error
- **Validations:** PDF/DOC/DOCX only (inferred), max file size TBD, max resume count TBD
- **Backend:** POST `/api/students/:id/resumes` (multipart), PUT `/api/students/:id/resumes/:resumeId/default`, DELETE `/api/students/:id/resumes/:resumeId`

### Feature: Interest Registration
- **Business Purpose:** Students register interest in placement types to be included in interest lists
- **Trigger:** Dashboard interest registration card
- **User Steps:** Select interest types (placement, summer_internship, winter_internship, etc.)
- **System Behavior:** Record interest types; requires profile >= 80% and policy accepted
- **Success:** Interest registered, shown in dashboard
- **Failure:** Blocked if profile incomplete or policy not accepted
- **Validations:** Profile completion >= 80%, policy accepted
- **Backend:** POST `/api/students/:id/interests`, body: { interest_types: string[] }

## 3.2 Employer Management

### Feature: Add Company
- **Business Purpose:** Register new employer companies for placement drives
- **Trigger:** "Add Company" button in Employer Hub
- **User Steps:** Step 1: Enter basic info (name, industry) -> Step 2: Optional details (address, website, description)
- **System Behavior:** Create company record with 'active' status, 'normal' classification
- **Success:** Company appears in list, toast confirmation
- **Failure:** Validation errors on required fields
- **Validations:** Company name (required, unique suggested), industry (required), website (URL format if provided)
- **Backend:** POST `/api/companies`

### Feature: Company Classification/Tagging
- **Business Purpose:** Classify companies as preferred/normal/blacklisted with internal remarks
- **Trigger:** Tag/classify button on company detail
- **User Steps:** Select classification (preferred/normal/blacklisted) -> add internal remarks -> save
- **System Behavior:** Update classification, log change in audit; blacklisted companies excluded from new postings
- **Success:** Classification badge updated
- **Failure:** N/A
- **Validations:** Valid classification value
- **Backend:** PUT `/api/companies/:id/classification`

### Feature: Add Recruiter
- **Business Purpose:** Register recruiter contacts associated with companies
- **Trigger:** "Add Recruiter" button on company detail page
- **User Steps:** Enter name, email, phone, designation -> submit
- **System Behavior:** Create recruiter with 'pending' verification status linked to company
- **Success:** Recruiter appears in company's recruiter list
- **Failure:** Validation errors
- **Validations:** Name (required), email (required, format, unique), phone (format), designation (required)
- **Backend:** POST `/api/companies/:companyId/recruiters`

### Feature: Recruiter Verification
- **Business Purpose:** Admin verifies recruiter identity before granting portal access
- **Trigger:** Verify button in recruiter list
- **User Steps:** Review recruiter info -> approve or reject
- **System Behavior:** Update verification status; if approved, recruiter gains login access
- **Success:** Status changes to verified/rejected
- **Failure:** N/A
- **Backend:** PUT `/api/recruiters/:id/verify`, body: { status: 'verified' | 'rejected' }

### Feature: Engagement Tracking
- **Business Purpose:** Record company visits, drives, lectures, workshops for reporting
- **Trigger:** "Add Engagement" on company detail
- **User Steps:** Select type (placement/internship/campus_visit/guest_lecture/workshop) -> enter date, remarks -> conditional: students_hired, packages_offered
- **System Behavior:** Create engagement record linked to company
- **Success:** Engagement appears in timeline
- **Failure:** Validation errors
- **Backend:** POST `/api/companies/:companyId/engagements`

## 3.3 Posting Management

### Feature: Create Posting (5-Step Wizard)
- **Business Purpose:** Define job/internship opportunities with eligibility and selection criteria
- **Trigger:** "Create Posting" button
- **User Steps:**
  1. Select type (job/internship/stipend_internship), company, title, academic year
  2. Enter role details (name, location, work mode, CTC/stipend, bond, description)
  3. Define eligibility (branches, batches, min CGPA, max backlogs, skills)
  4. Define selection process (written test, GD, technical rounds, HR rounds)
  5. Set timeline (application start/end dates), review, save as draft or publish
- **System Behavior:** Create posting with all details; if published, becomes visible to eligible students
- **Success:** Posting created with draft/published status
- **Failure:** Step-level Zod validation errors
- **Validations:**
  - Step 1: type required, company required (active, non-blacklisted), title (max 200), academic year required
  - Step 2: role name required, location required, work mode required, description (min 10 chars), CTC/stipend conditional on type
  - Step 3: at least one branch, at least one batch, CGPA 0-10
  - Step 5: end date > start date
- **Backend:** POST `/api/postings`

### Feature: Publish Posting
- **Business Purpose:** Make draft posting visible to eligible students
- **Trigger:** Publish button on posting detail or management page
- **User Steps:** Click publish -> confirm in dialog
- **System Behavior:** Change status draft -> published, set published_at timestamp
- **Success:** Status badge changes to published
- **Failure:** Cannot publish if required fields missing
- **Backend:** PUT `/api/postings/:id/publish`

### Feature: Close Posting
- **Business Purpose:** Stop accepting applications
- **Trigger:** Close button on published posting
- **User Steps:** Click close -> confirm
- **System Behavior:** Change status published -> closed, set closed_at timestamp
- **Success:** Status badge changes to closed, no new applications accepted
- **Backend:** PUT `/api/postings/:id/close`

## 3.4 Application & ATS Pipeline

### Feature: Apply to Opportunity
- **Business Purpose:** Student submits application to a posting
- **Trigger:** "Apply Now" button on opportunity detail
- **User Steps:** Select resume -> confirm 3 declarations -> submit
- **System Behavior:** Create application at 'applied' stage; check eligibility, offer blocking, profile completion, mock round status
- **Success:** Application created, success dialog shown
- **Failure:** Blocked if: not eligible, has active offer (single offer policy), profile < 80%, posting closed
- **Validations:** Resume selected, all 3 confirmations checked, student eligible, no blocking offer, profile >= 80%, posting status is 'published', within application window
- **Backend:** POST `/api/applications`
- **Duplicate Protection:** One application per student per posting

### Feature: Pipeline Stage Movement
- **Business Purpose:** Admin moves applications through ATS stages
- **Trigger:** Move button (individual or bulk) in pipeline view
- **User Steps:** Select application(s) -> choose target stage -> add remarks -> confirm
- **System Behavior:** Update current_stage, create stage_history record, handle auto-transitions
- **Stages:** applied -> mock_round -> shortlisted -> test_scheduled -> interview -> hr_round -> offer_released -> rejected
- **Success:** Stage badge updated, history recorded
- **Failure:** Invalid transition
- **Backend:** PUT `/api/applications/bulk-move`, body: { application_ids[], target_stage, remarks }

### Feature: Mock Round Result Setting
- **Business Purpose:** Gatekeeping mechanism - students must pass mock round before shortlisting
- **Trigger:** Mock result button in pipeline
- **User Steps:** Select application(s) at mock_round stage -> set result (passed/failed) -> add remarks
- **System Behavior:** If passed -> auto-move to shortlisted; if failed -> auto-move to rejected
- **Success:** Result recorded, auto-transition executed
- **Business Rule:** Mock round gatekeeping is tenant-configurable
- **Backend:** PUT `/api/applications/bulk-mock-result`, body: { application_ids[], result, remarks }

### Feature: Bulk Reject
- **Business Purpose:** Reject multiple applications at once
- **Trigger:** Bulk reject button when applications selected
- **User Steps:** Select applications -> click reject -> enter reason -> confirm
- **System Behavior:** Move all selected to 'rejected' stage with reason
- **Backend:** PUT `/api/applications/bulk-reject`, body: { application_ids[], reason }

### Feature: Export Candidates
- **Business Purpose:** Export candidate data for company sharing (with PII protection)
- **Trigger:** Export button in pipeline
- **User Steps:** Select fields (some blocked by PII policy) -> choose format (Excel/PDF) -> preview -> export
- **System Behavior:** Generate export file, record in exchange log, block personal contact fields
- **PII Blocked Fields:** Email, phone number, personal address
- **Success:** File downloaded, exchange log entry created
- **Backend:** POST `/api/applications/export`, body: { posting_id, fields[], format, application_ids[] }

### Feature: Recruiter Feedback
- **Business Purpose:** Recruiter provides assessment feedback on candidates
- **Trigger:** Submit Feedback button in candidate detail sheet
- **User Steps:** Select decision (shortlist/under_consideration/not_selected) -> optional remarks -> submit
- **System Behavior:** Record feedback linked to application
- **Backend:** POST `/api/applications/:id/feedback`, body: { decision, remarks }

## 3.5 Offer & Joining Management

### Feature: Create Offer
- **Business Purpose:** Record offer letter issued to student
- **Trigger:** "Create Offer" button in offers management
- **User Steps:** Select opportunity -> select student -> enter type (job/internship), role, CTC/stipend, location, offer date -> submit
- **System Behavior:** Create offer with 'pending_student_action' status; enforce single active offer policy
- **Success:** Offer created, student notified
- **Failure:** Student already has active offer (if single offer policy enabled)
- **Validations:** Student exists, posting exists, no duplicate offer for same student+posting
- **Backend:** POST `/api/offers`

### Feature: Student Accepts Offer
- **Business Purpose:** Student formally accepts an offer
- **Trigger:** "Accept Offer" button on student applications page
- **User Steps:** Click accept on pending offer
- **System Behavior:** Status changes to 'accepted'; if single_active_offer enabled, block new applications
- **Success:** Offer status updated, applications_blocked flag set
- **Backend:** PUT `/api/offers/:id/accept`

### Feature: Reject Offer (Admin)
- **Business Purpose:** Admin rejects an offer on student's behalf or for compliance
- **Trigger:** Reject button in offers management
- **User Steps:** Select reason from dropdown -> add remarks -> confirm
- **System Behavior:** Status changes to 'rejected_by_admin', unblock applications if was blocking
- **Rejection Reasons:** student_request, company_withdrew, compliance_violation, duplicate_offer, other
- **Backend:** PUT `/api/offers/:id/reject`, body: { reason, remarks }

### Feature: Joining Confirmation
- **Business Purpose:** Record whether student actually joined the company
- **Trigger:** Joining confirmation button on accepted offer
- **User Steps:** Select status (joined/did_not_join) -> if joined: enter joining date -> if DNJ: enter reason -> confirm
- **System Behavior:** Update joining_status, record joining_date or dnj_reason; if joined, lock record
- **Backend:** PUT `/api/offers/:id/joining`, body: { status, joining_date?, reason? }

## 3.6 NOC Management

### Feature: Student NOC Request (4-Step Wizard)
- **Business Purpose:** Student requests No Objection Certificate for internship/training
- **Steps:**
  1. Select NOC type (internship/training/project) and program
  2. Select source (university drive or self-sourced) and company details
  3. Enter role details, dates, stipend, upload offer letter
  4. Review and submit with declaration
- **System Behavior:** Create request with 'pending_faculty' status, start approval chain
- **Validations:** All required fields per step, declaration checkbox, date range validation, company contact details
- **Backend:** POST `/api/noc-requests`

### Feature: Faculty NOC Approval
- **Business Purpose:** Department faculty reviews and approves/rejects NOC
- **Trigger:** Review button in faculty NOC approvals
- **User Steps:** Review student/company details -> add remarks -> approve or reject
- **System Behavior:** If approved -> status moves to 'pending_tpo'; if rejected -> status becomes 'rejected'
- **Backend:** PUT `/api/noc-requests/:id/faculty-review`, body: { action: 'approve'|'reject', remarks }

### Feature: TPO NOC Approval & Company Verification
- **Business Purpose:** TPO admin final approval and company verification
- **Trigger:** Review button in admin NOC management
- **User Steps:** Verify company (if needed) -> review details -> approve & issue or reject
- **System Behavior:** If approved -> generate NOC number, issue certificate; verify company status separately
- **Backend:** PUT `/api/noc-requests/:id/tpo-review`, PUT `/api/noc-requests/:id/verify-company`

## 3.7 Campus Events & Drives

### Feature: Create Event
- **Business Purpose:** Schedule campus placement events
- **Trigger:** "Create Event" button
- **User Steps:** Select type, company, title, link to opportunity, date/time, venue, reporting time, dress code, instructions -> save
- **System Behavior:** Create event with 'draft' status
- **Backend:** POST `/api/events`

### Feature: Slot Allocation (3-Tab Dialog)
- **Business Purpose:** Assign students to event time slots and interview panels
- **Tab 1 - Add Students:** Filter/search from student pool, auto-import from linked posting, add selected
- **Tab 2 - Assign Slots:** Set time slot and panel for each student
- **Tab 3 - Manage Panels:** Create panels with name, room, time, recruiters
- **Backend:** POST `/api/events/:id/students`, PUT `/api/events/:id/slots`, CRUD `/api/events/:id/panels`

### Feature: Bulk Attendance
- **Business Purpose:** Faculty marks student attendance at events
- **Trigger:** "Mark Attendance" button
- **User Steps:** View student list -> mark each as Present/Absent/Late -> save
- **System Behavior:** Update attendance for all students in event
- **Backend:** PUT `/api/events/:id/attendance`, body: { attendance: [{ student_id, status }] }

## 3.8 Internship Administration

### Feature: Add Internship Record
- **Business Purpose:** Track student internship placements
- **Trigger:** "Add Internship" button or import from offers
- **User Steps:** Enter student, company, role, type, dates, stipend details -> save
- **System Behavior:** Create internship record
- **Backend:** POST `/api/internships`

### Feature: Bulk Status Change
- **Business Purpose:** Mark multiple internships as completed or discontinued
- **Trigger:** Bulk action toolbar when internships selected
- **User Steps:** Select internships -> click "Mark Completed" or "Mark Discontinued" -> confirm
- **Backend:** PUT `/api/internships/bulk-status`, body: { internship_ids[], status }

## 3.9 Announcements

### Feature: Create Announcement
- **Business Purpose:** Communicate with students via targeted announcements
- **Trigger:** "New Announcement" button
- **User Steps:** Choose mode (manual or from circular) -> enter title, content, priority, target audience -> optional: require consent -> save as draft or publish
- **Target Audience Types:** all, batch (select batches), department (select departments)
- **System Behavior:** Create announcement; if published, deliver to matching students
- **Backend:** POST `/api/announcements`

### Feature: Consent Tracking
- **Business Purpose:** Track student acknowledgment of important announcements
- **Trigger:** Student clicks "I have read and consent" on announcement detail
- **System Behavior:** Record consent with timestamp per student
- **Backend:** POST `/api/announcements/:id/consent`

## 3.10 Circular Templates

### Feature: Create Circular Template
- **Business Purpose:** Define reusable templates for placement/internship circulars
- **Trigger:** "New Template" button
- **User Steps:** Define template with name, type, sections, fields (text/textarea/date/currency/list), version
- **Backend:** POST `/api/circular-templates`

### Feature: Generate Circular
- **Business Purpose:** Generate filled circular from template for a specific company/posting
- **Trigger:** "Generate Circular" button
- **User Steps:** Select template -> select company -> fill in field values -> generate
- **System Behavior:** Create generated circular instance with filled values
- **Backend:** POST `/api/circulars/generate`

## 3.11 No Dues Certificate

### Feature: Submit NDC Request
- **Business Purpose:** Student requests clearance certificate before exit
- **Trigger:** "Request NDC" button
- **User Steps:** View pre-filled student info -> select exit reason -> fill conditional fields -> check declaration -> submit
- **Conditional Fields:**
  - Employment: company name, designation, package (LPA), joining date
  - Family Business: business name, nature of business, address
  - Higher Studies: institution name, program name, country
- **Backend:** POST `/api/no-dues-requests`

### Feature: Admin NDC Review
- **Business Purpose:** Admin reviews and processes NDC requests
- **Trigger:** Click on pending request
- **User Steps:** Review details -> approve & issue / return for clarification / reject
- **Return:** Requires remarks explaining what needs clarification
- **Backend:** PUT `/api/no-dues-requests/:id/review`, body: { action, remarks?, ndc_number? }

## 3.12 Reports & Analytics

### Feature: 25+ Report Types
Reports are grouped into 10 modules:

1. **Student Management:** Interested Students, Eligibility Report, Profile Completion, Registration Summary
2. **Employer Management:** Company Master List, Recruiter List, Engagement History, Company Classification
3. **Postings:** Active Postings, Posting History by Year, Internship vs Placement
4. **Events & Drives:** Event Attendance, Drive Completion, Student Participation History
5. **NOC & Documents:** Pending NOC, Issued NOC Register, NOC by Department/Batch
6. **Applications & ATS:** Applicant List per Opportunity, Stage-wise Count, Shortlist vs Rejection
7. **Offers & Joining:** Offer Acceptance Summary, Joining Status, Active Offer Compliance
8. **Internships:** Status Summary, Certificate Pending, Company-wise Summary
9. **Portfolio:** Completion Report, Published Portfolios
10. **Communication:** Announcement History, Consent Tracking
11. **Placement Analytics:** Placement Summary, Company Performance, Offer-to-Join Funnel, Unplaced Students

Each report supports:
- Filterable parameters (department, batch, date range, status, etc.)
- CSV/Excel export
- Tabular data display

**Backend:** GET `/api/reports/:reportType` with query parameters for filters

## 3.13 Security & Access Control

### Feature: User Management
- **Business Purpose:** Super admin manages system users
- **Trigger:** Users tab in super admin dashboard
- **User Steps:** Add user (name, email, role, department) -> edit user -> toggle active/inactive
- **Backend:** CRUD `/api/users`

### Feature: Roles & Permissions Matrix
- **Business Purpose:** Configure granular permissions per role per module
- **Trigger:** Roles tab in super admin dashboard
- **User Steps:** View matrix -> toggle permissions per role/module -> save
- **Permission Areas:** Students, Companies, Recruiters, Postings, Applications, Events, Offers, Internships, NOC, Announcements, Circulars
- **Permission Types:** View, Create, Edit, Delete, Export, Approve
- **Backend:** GET/PUT `/api/permissions/matrix`

### Feature: Audit Log
- **Business Purpose:** Track all sensitive system actions for compliance
- **Trigger:** Audit tab in super admin dashboard
- **Filters:** Action type, module, date range
- **Export:** CSV export
- **Backend:** GET `/api/audit-logs` (filtered, paginated)
# 4. USER FLOWS

## 4.1 Student Registration & Onboarding Flow
- **Start:** Student account created (via admin or SSO)
- **Steps:** Login -> View Dashboard (incomplete profile alert) -> Fill Profile tabs (Personal -> Academic -> Skills -> Projects -> Certifications) -> Upload Resume -> Accept Placement Policy & Data Consent -> Register Interests
- **Decisions:** Profile < 80%? Block placement features. Policy not accepted? Block interest registration and applications.
- **Data Passed:** Profile fields, academic data, skills, policy acceptance timestamp
- **DB Impact:** INSERT/UPDATE students, academic_profiles, skills_profiles, resumes, policy_acceptances, interest_registrations
- **APIs:** PUT profile, POST resume upload, POST policy acceptance, POST interests
- **Outcome:** Student fully onboarded with 100% profile, ready for placements

## 4.2 Opportunity Discovery & Application Flow
- **Start:** Student navigates to Opportunities page
- **Steps:** View recommended postings -> Apply filters (type, work mode, location, domain) -> Click posting -> View eligibility check -> Click Apply -> Select resume -> Confirm declarations -> Submit
- **Decisions:** Eligible? Show apply button. Has active offer? Block. Profile < 80%? Block. Posting open? Allow apply.
- **Data Passed:** student_id, posting_id, resume_id
- **DB Impact:** INSERT applications, INSERT application_stage_history
- **APIs:** GET postings (filtered), GET posting detail, GET eligibility check, POST application
- **Outcome:** Application created at 'applied' stage

## 4.3 ATS Pipeline Processing Flow
- **Start:** Admin opens application pipeline for a posting
- **Steps:** View all applications by stage -> Select candidates -> Move to next stage OR set mock result OR reject -> Add remarks -> Confirm -> Export candidates for company
- **Decisions:** Mock round enabled? Require pass before shortlist. Bulk or individual? Stage transition valid?
- **Data Passed:** application_ids, target_stage, mock_result, remarks
- **DB Impact:** UPDATE applications.current_stage, INSERT application_stage_history, INSERT export_records
- **APIs:** GET applications by posting, PUT bulk-move, PUT bulk-mock-result, PUT bulk-reject, POST export
- **Outcome:** Candidates progress through hiring pipeline

## 4.4 Offer Lifecycle Flow
- **Start:** Admin creates offer for a student
- **Steps:** Create offer -> Student receives notification -> Student accepts -> Admin confirms joining -> Record joined/DNJ
- **Decisions:** Single offer policy? Block if active offer exists. Student accepts? Block new applications. Joined? Lock record.
- **Data Passed:** offer details, acceptance, joining status
- **DB Impact:** INSERT offers, UPDATE offers, INSERT offer_audit
- **APIs:** POST offer, PUT accept, PUT reject, PUT joining
- **Outcome:** Complete offer lifecycle recorded with audit trail

## 4.5 NOC Approval Chain Flow
- **Start:** Student submits NOC request via 4-step wizard
- **Steps:** Student submits -> Faculty coordinator reviews (department-scoped) -> Faculty approves/rejects -> If approved, TPO admin reviews -> TPO verifies company (if needed) -> TPO approves & issues NOC OR rejects
- **Decisions:** Faculty approve? Move to TPO. Faculty reject? End. Company verified? Allow issuance. TPO approve? Generate NOC number and certificate.
- **Data Passed:** request details, faculty remarks, TPO remarks, company verification
- **DB Impact:** INSERT noc_requests, UPDATE status, INSERT noc_certificates
- **APIs:** POST noc-request, PUT faculty-review, PUT tpo-review, PUT verify-company, GET certificate
- **Outcome:** NOC certificate issued with unique number

## 4.6 Campus Drive Scheduling Flow
- **Start:** Admin creates event
- **Steps:** Create event (draft) -> Allocate students (from pool or linked posting) -> Create panels -> Assign slots -> Publish event -> Day of event: Mark attendance -> Complete event
- **Decisions:** Link to posting? Auto-import eligible students. Panels exist? Assign to panels.
- **Data Passed:** event details, student assignments, panel config, attendance records
- **DB Impact:** INSERT events, INSERT event_students, INSERT event_panels, UPDATE attendance
- **APIs:** POST event, POST students, POST panels, PUT slots, PUT attendance, PUT publish, PUT complete
- **Outcome:** Complete event lifecycle with attendance records

## 4.7 NDC Processing Flow
- **Start:** Student submits NDC request
- **Steps:** Student fills exit reason + conditional details -> Submits with declaration -> Admin reviews -> Admin approves (issue NDC) / returns for clarification / rejects
- **Decisions:** Exit reason determines required fields. Return? Student must resubmit with corrections.
- **Data Passed:** exit details, admin action, NDC number
- **DB Impact:** INSERT no_dues_requests, UPDATE status, generate ndc_number
- **APIs:** POST ndc-request, PUT review
- **Outcome:** NDC certificate issued or request returned/rejected

## 4.8 Announcement Broadcast Flow
- **Start:** Admin creates announcement
- **Steps:** Choose source (manual or from circular) -> Set title, content, priority -> Define target audience (all/batch/department) -> Optionally require consent -> Save as draft or publish
- **Post-Publish:** Students see announcement -> Mark as read -> Provide consent if required -> Admin tracks delivery stats
- **DB Impact:** INSERT announcements, INSERT announcement_receipts per target student
- **APIs:** POST announcement, PUT publish, GET student announcements, POST mark-read, POST consent
- **Outcome:** Announcement delivered with read/consent tracking

## 4.9 Report Generation Flow
- **Start:** Admin navigates to Reports & Analytics
- **Steps:** Select report module -> Select specific report -> Apply filters (department, batch, date range, etc.) -> View data -> Export as CSV/Excel
- **Data Passed:** Report type, filter parameters
- **DB Impact:** Read-only queries across multiple tables
- **APIs:** GET `/api/reports/:type` with query params
- **Outcome:** Filtered report data displayed and exportable

## 4.10 Recruiter Pipeline View Flow
- **Start:** Verified recruiter logs in
- **Steps:** View dashboard -> Navigate to pipeline -> View postings with candidates -> Filter by stage -> View candidate detail (PII-restricted) -> Submit feedback
- **Decisions:** PII blocked? Hide email, phone, address. Verified recruiter? Allow access.
- **Data Passed:** feedback decision, remarks
- **DB Impact:** INSERT recruiter_feedback
- **APIs:** GET postings by company, GET applications (PII-filtered), POST feedback
- **Outcome:** Recruiter reviews candidates within PII restrictions

---

# 5. ENTITY AND DATABASE DESIGN FOR POSTGRESQL

## 5.1 Core Entities

### 5.1.1 tenants
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| slug | VARCHAR(50) | NOT NULL | | UNIQUE |
| name | VARCHAR(200) | NOT NULL | |
| short_name | VARCHAR(50) | | | |
| logo_url | TEXT | | | |
| tagline | TEXT | | | |
| contact_email | VARCHAR(255) | | | |
| contact_phone | VARCHAR(20) | | | |
| website | TEXT | | | |
| config | JSONB | NOT NULL | '{}' | Stores TenantConfig |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.2 users
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| email | VARCHAR(255) | NOT NULL | | UNIQUE per tenant |
| password_hash | VARCHAR(255) | NOT NULL | | |
| role | VARCHAR(30) | NOT NULL | | CHECK IN roles enum |
| name | VARCHAR(200) | NOT NULL | | |
| phone | VARCHAR(20) | | | |
| department | VARCHAR(100) | | | |
| designation | VARCHAR(100) | | | |
| is_active | BOOLEAN | NOT NULL | true | |
| last_login_at | TIMESTAMPTZ | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (tenant_id, email) UNIQUE, (tenant_id, role), (tenant_id, is_active)

### 5.1.3 students
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| user_id | UUID | NOT NULL | | FK -> users.id, UNIQUE |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| enrollment_number | VARCHAR(50) | NOT NULL | | UNIQUE per tenant |
| roll_number | VARCHAR(50) | | | |
| full_name | VARCHAR(200) | NOT NULL | | |
| email | VARCHAR(255) | NOT NULL | | |
| mobile | VARCHAR(20) | | | |
| date_of_birth | DATE | | | |
| gender | VARCHAR(20) | | | |
| department | VARCHAR(100) | NOT NULL | | |
| batch | VARCHAR(20) | NOT NULL | | e.g., '2022-2026' |
| course | VARCHAR(100) | | | |
| institute | VARCHAR(200) | | | |
| linkedin_url | TEXT | | | |
| alternate_phone | VARCHAR(20) | | | |
| residential_address | TEXT | | | |
| permanent_address | TEXT | | | |
| profile_photo_url | TEXT | | | |
| profile_completion_percentage | INTEGER | NOT NULL | 0 | CHECK 0-100 |
| verification_status | VARCHAR(20) | NOT NULL | 'pending' | CHECK IN (pending, verified, rejected) |
| verified_by | UUID | | | FK -> users.id |
| verified_at | TIMESTAMPTZ | | | |
| policy_accepted | BOOLEAN | NOT NULL | false | |
| policy_accepted_at | TIMESTAMPTZ | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (tenant_id, enrollment_number) UNIQUE, (tenant_id, department), (tenant_id, batch), (tenant_id, verification_status), (profile_completion_percentage)

### 5.1.4 academic_profiles
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id, UNIQUE |
| cgpa | DECIMAL(4,2) | | | CHECK 0-10 |
| tenth_percentage | DECIMAL(5,2) | | | CHECK 0-100 |
| twelfth_percentage | DECIMAL(5,2) | | | CHECK 0-100 |
| diploma_percentage | DECIMAL(5,2) | | | CHECK 0-100 |
| backlog_count | INTEGER | NOT NULL | 0 | CHECK >= 0 |
| active_backlogs | INTEGER | NOT NULL | 0 | CHECK >= 0 |
| semester | INTEGER | | | CHECK 1-10 |
| year_of_study | INTEGER | | | CHECK 1-5 |
| course_duration | INTEGER | | | Years |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.5 skills_profiles
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id, UNIQUE |
| technical_skills | TEXT[] | | '{}' | Array of skill tags |
| domain_interests | TEXT[] | | '{}' | |
| preferred_locations | TEXT[] | | '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.6 student_projects
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id |
| title | VARCHAR(200) | NOT NULL | | |
| description | TEXT | | | |
| technologies | TEXT[] | | '{}' | |
| github_url | TEXT | | | |
| demo_url | TEXT | | | |
| start_date | DATE | | | |
| end_date | DATE | | | |
| is_ongoing | BOOLEAN | NOT NULL | false | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.7 certifications
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id |
| name | VARCHAR(200) | NOT NULL | | |
| issuer | VARCHAR(200) | NOT NULL | | |
| issue_date | DATE | | | |
| credential_url | TEXT | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.8 resumes
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id |
| name | VARCHAR(200) | NOT NULL | | |
| file_url | TEXT | NOT NULL | | |
| file_size | INTEGER | | | Bytes |
| mime_type | VARCHAR(50) | | | |
| is_default | BOOLEAN | NOT NULL | false | |
| ai_score | INTEGER | | | CHECK 0-100 |
| uploaded_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Constraint:** Only one default resume per student (partial unique index WHERE is_default = true)

### 5.1.9 current_employment
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id, UNIQUE |
| is_currently_working | BOOLEAN | NOT NULL | false | |
| employment_type | VARCHAR(50) | | | |
| company_name | VARCHAR(200) | | | |
| designation | VARCHAR(200) | | | |
| duration | VARCHAR(100) | | | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.10 policy_acceptances
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id |
| policy_read | BOOLEAN | NOT NULL | false | |
| rules_accepted | BOOLEAN | NOT NULL | false | |
| profile_sharing_consent | BOOLEAN | NOT NULL | false | |
| resume_sharing_consent | BOOLEAN | NOT NULL | false | |
| data_storage_consent | BOOLEAN | NOT NULL | false | |
| communication_consent | BOOLEAN | NOT NULL | false | |
| accepted_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| ip_address | VARCHAR(50) | | | |

### 5.1.11 interest_registrations
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id |
| interest_type | VARCHAR(50) | NOT NULL | | |
| registered_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Constraint:** UNIQUE(student_id, interest_type)

### 5.1.12 companies
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| name | VARCHAR(300) | NOT NULL | | |
| industry | VARCHAR(100) | | | |
| address | TEXT | | | |
| website | TEXT | | | |
| description | TEXT | | | |
| status | VARCHAR(20) | NOT NULL | 'active' | CHECK IN (active, inactive) |
| classification | VARCHAR(20) | NOT NULL | 'normal' | CHECK IN (preferred, normal, blacklisted) |
| internal_remarks | TEXT | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (tenant_id, name), (tenant_id, status), (tenant_id, classification)

### 5.1.13 recruiters
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| user_id | UUID | | | FK -> users.id, UNIQUE |
| company_id | UUID | NOT NULL | | FK -> companies.id |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| name | VARCHAR(200) | NOT NULL | | |
| email | VARCHAR(255) | NOT NULL | | |
| phone | VARCHAR(20) | | | |
| designation | VARCHAR(100) | | | |
| verification_status | VARCHAR(20) | NOT NULL | 'pending' | CHECK IN (pending, verified, rejected) |
| verified_by | UUID | | | FK -> users.id |
| verified_at | TIMESTAMPTZ | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (tenant_id, email) UNIQUE, (company_id), (verification_status)

### 5.1.14 company_engagements
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| company_id | UUID | NOT NULL | | FK -> companies.id |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| visitor_type | VARCHAR(30) | NOT NULL | | CHECK IN (placement, internship, campus_visit, guest_lecture, workshop) |
| date | DATE | NOT NULL | | |
| remarks | TEXT | | | |
| students_hired | INTEGER | | 0 | |
| packages_offered | TEXT | | | |
| academic_year | VARCHAR(20) | | | |
| created_by | UUID | | | FK -> users.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.15 postings
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| company_id | UUID | NOT NULL | | FK -> companies.id |
| title | VARCHAR(200) | NOT NULL | | |
| type | VARCHAR(30) | NOT NULL | | CHECK IN (job, internship, stipend_internship) |
| academic_year | VARCHAR(20) | NOT NULL | | |
| role_name | VARCHAR(200) | NOT NULL | | |
| location | VARCHAR(200) | NOT NULL | | |
| work_mode | VARCHAR(20) | NOT NULL | | CHECK IN (onsite, remote, hybrid) |
| ctc | VARCHAR(100) | | | For jobs |
| stipend | VARCHAR(100) | | | For internships |
| duration | VARCHAR(100) | | | For internships |
| bond_details | TEXT | | | |
| role_description | TEXT | | | |
| eligible_branches | TEXT[] | NOT NULL | '{}' | |
| eligible_batches | TEXT[] | NOT NULL | '{}' | |
| min_cgpa | DECIMAL(4,2) | | 0 | |
| max_backlogs | INTEGER | | 0 | |
| skill_requirements | TEXT | | | |
| has_written_test | BOOLEAN | NOT NULL | false | |
| written_test_details | TEXT | | | |
| has_gd | BOOLEAN | NOT NULL | false | |
| gd_details | TEXT | | | |
| technical_rounds | INTEGER | NOT NULL | 0 | |
| hr_rounds | INTEGER | NOT NULL | 0 | |
| additional_info | TEXT | | | |
| application_start_date | DATE | | | |
| application_end_date | DATE | | | |
| status | VARCHAR(20) | NOT NULL | 'draft' | CHECK IN (draft, published, closed) |
| published_at | TIMESTAMPTZ | | | |
| closed_at | TIMESTAMPTZ | | | |
| created_by | UUID | | | FK -> users.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (tenant_id, status), (tenant_id, type), (company_id), (tenant_id, academic_year)

### 5.1.16 applications
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| posting_id | UUID | NOT NULL | | FK -> postings.id |
| resume_id | UUID | | | FK -> resumes.id |
| current_stage | VARCHAR(30) | NOT NULL | 'applied' | CHECK IN stage enum |
| mock_round_result | VARCHAR(20) | | | CHECK IN (pending, passed, failed) |
| applied_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Constraints:** UNIQUE(student_id, posting_id)
**Indexes:** (posting_id, current_stage), (student_id), (tenant_id, current_stage)

### 5.1.17 application_stage_history
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| application_id | UUID | NOT NULL | | FK -> applications.id |
| from_stage | VARCHAR(30) | | | |
| to_stage | VARCHAR(30) | NOT NULL | | |
| changed_by | UUID | | | FK -> users.id |
| remarks | TEXT | | | |
| changed_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.18 recruiter_feedback
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| application_id | UUID | NOT NULL | | FK -> applications.id |
| recruiter_id | UUID | NOT NULL | | FK -> recruiters.id |
| decision | VARCHAR(30) | NOT NULL | | CHECK IN (shortlist, under_consideration, not_selected) |
| remarks | TEXT | | | |
| submitted_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.19 offers
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| posting_id | UUID | NOT NULL | | FK -> postings.id |
| company_id | UUID | NOT NULL | | FK -> companies.id |
| type | VARCHAR(20) | NOT NULL | | CHECK IN (job, internship) |
| role | VARCHAR(200) | NOT NULL | | |
| ctc | VARCHAR(100) | | | |
| stipend | VARCHAR(100) | | | |
| location | VARCHAR(200) | | | |
| offer_date | DATE | NOT NULL | | |
| status | VARCHAR(30) | NOT NULL | 'pending_student_action' | |
| accepted_at | TIMESTAMPTZ | | | |
| rejected_at | TIMESTAMPTZ | | | |
| rejection_reason | VARCHAR(50) | | | |
| rejection_remarks | TEXT | | | |
| rejected_by | UUID | | | FK -> users.id |
| joining_status | VARCHAR(20) | | 'pending' | CHECK IN (pending, joined, did_not_join) |
| joining_date | DATE | | | |
| dnj_reason | TEXT | | | |
| is_locked | BOOLEAN | NOT NULL | false | |
| compliance_status | VARCHAR(20) | NOT NULL | 'compliant' | CHECK IN (compliant, blocked, override_enabled) |
| applications_blocked | BOOLEAN | NOT NULL | false | |
| admin_override_enabled | BOOLEAN | NOT NULL | false | |
| created_by | UUID | | | FK -> users.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (student_id, status), (company_id), (posting_id), (tenant_id, status)

### 5.1.20 offer_audit
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| offer_id | UUID | NOT NULL | | FK -> offers.id |
| action | VARCHAR(50) | NOT NULL | | |
| performed_by | UUID | | | FK -> users.id |
| details | TEXT | | | |
| performed_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.21 events
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| company_id | UUID | NOT NULL | | FK -> companies.id |
| posting_id | UUID | | | FK -> postings.id |
| title | VARCHAR(300) | NOT NULL | | |
| type | VARCHAR(30) | NOT NULL | | CHECK IN (campus_drive, ppt, test_assessment, internship_drive, workshop) |
| status | VARCHAR(20) | NOT NULL | 'draft' | CHECK IN (draft, published, ongoing, completed, cancelled) |
| date | DATE | NOT NULL | | |
| start_time | TIME | NOT NULL | | |
| end_time | TIME | NOT NULL | | |
| venue | VARCHAR(300) | NOT NULL | | |
| reporting_time | TIME | | | |
| dress_code | VARCHAR(200) | | | |
| instructions | TEXT | | | |
| documents_required | TEXT[] | | '{}' | |
| faculty_coordinators | TEXT[] | | '{}' | |
| created_by | UUID | | | FK -> users.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.22 event_panels
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| event_id | UUID | NOT NULL | | FK -> events.id |
| panel_name | VARCHAR(100) | NOT NULL | | |
| room | VARCHAR(100) | NOT NULL | | |
| start_time | TIME | | | |
| end_time | TIME | | | |
| recruiters | TEXT[] | | '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.23 event_students
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| event_id | UUID | NOT NULL | | FK -> events.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| panel_id | UUID | | | FK -> event_panels.id |
| slot_time | TIME | | | |
| attendance | VARCHAR(20) | | | CHECK IN (present, absent, late, null) |
| marked_by | UUID | | | FK -> users.id |
| marked_at | TIMESTAMPTZ | | | |

**Constraint:** UNIQUE(event_id, student_id)

### 5.1.24 noc_requests
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| noc_type | VARCHAR(20) | NOT NULL | | CHECK IN (internship, training, project) |
| program | VARCHAR(50) | NOT NULL | | |
| placement_source | VARCHAR(20) | NOT NULL | | CHECK IN (university_drive, self_sourced) |
| drive_id | UUID | | | FK -> events.id |
| company_name | VARCHAR(300) | NOT NULL | | |
| company_address | TEXT | | | |
| company_city | VARCHAR(100) | | | |
| company_state | VARCHAR(100) | | | |
| company_pincode | VARCHAR(10) | | | |
| company_verification_status | VARCHAR(20) | NOT NULL | 'pending' | |
| contact_person_name | VARCHAR(200) | | | |
| contact_person_designation | VARCHAR(100) | | | |
| contact_person_phone | VARCHAR(20) | | | |
| contact_person_email | VARCHAR(255) | | | |
| reference_by | VARCHAR(50) | | | |
| reference_details | TEXT | | | |
| role_title | VARCHAR(200) | NOT NULL | | |
| technology_domain | VARCHAR(200) | | | |
| job_description | TEXT | | | |
| stipend_amount | DECIMAL(10,2) | | | |
| start_date | DATE | NOT NULL | | |
| end_date | DATE | NOT NULL | | |
| duration_weeks | INTEGER | | | |
| offer_letter_url | TEXT | | | |
| status | VARCHAR(30) | NOT NULL | 'pending_faculty' | |
| faculty_approved_by | UUID | | | FK -> users.id |
| faculty_approved_at | TIMESTAMPTZ | | | |
| faculty_remarks | TEXT | | | |
| tpo_approved_by | UUID | | | FK -> users.id |
| tpo_approved_at | TIMESTAMPTZ | | | |
| tpo_remarks | TEXT | | | |
| noc_number | VARCHAR(50) | | | UNIQUE |
| issued_at | TIMESTAMPTZ | | | |
| certificate_url | TEXT | | | |
| rejected_at | TIMESTAMPTZ | | | |
| rejection_reason | TEXT | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (student_id), (tenant_id, status), (noc_number) UNIQUE WHERE NOT NULL

### 5.1.25 internships
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| company_id | UUID | | | FK -> companies.id |
| company_name | VARCHAR(300) | NOT NULL | | |
| role | VARCHAR(200) | NOT NULL | | |
| department | VARCHAR(100) | | | |
| internship_type | VARCHAR(20) | NOT NULL | | CHECK IN (paid, unpaid, stipend_based) |
| status | VARCHAR(20) | NOT NULL | 'ongoing' | CHECK IN (ongoing, completed, discontinued) |
| start_date | DATE | NOT NULL | | |
| end_date | DATE | | | |
| stipend_amount | DECIMAL(10,2) | | | |
| stipend_frequency | VARCHAR(20) | | | CHECK IN (monthly, lump_sum) |
| is_receiving_stipend | BOOLEAN | NOT NULL | false | |
| certificate_uploaded | BOOLEAN | NOT NULL | false | |
| certificate_url | TEXT | | | |
| offer_id | UUID | | | FK -> offers.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.26 internship_issues
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| internship_id | UUID | NOT NULL | | FK -> internships.id |
| title | VARCHAR(300) | NOT NULL | | |
| description | TEXT | | | |
| status | VARCHAR(20) | NOT NULL | 'open' | CHECK IN (open, resolved) |
| reported_by | UUID | | | FK -> users.id |
| resolved_at | TIMESTAMPTZ | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.27 announcements
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| title | VARCHAR(200) | NOT NULL | | |
| content | TEXT | NOT NULL | | |
| priority | VARCHAR(10) | NOT NULL | 'medium' | CHECK IN (high, medium, low) |
| status | VARCHAR(20) | NOT NULL | 'draft' | CHECK IN (draft, published, archived) |
| target_audience_type | VARCHAR(30) | NOT NULL | 'all' | CHECK IN (all, batch, department, eligible_for_posting) |
| target_batches | TEXT[] | | '{}' | |
| target_departments | TEXT[] | | '{}' | |
| target_posting_id | UUID | | | FK -> postings.id |
| requires_consent | BOOLEAN | NOT NULL | false | |
| linked_circular_id | UUID | | | FK -> generated_circulars.id |
| total_recipients | INTEGER | NOT NULL | 0 | |
| read_count | INTEGER | NOT NULL | 0 | |
| consent_count | INTEGER | NOT NULL | 0 | |
| created_by | UUID | | | FK -> users.id |
| published_at | TIMESTAMPTZ | | | |
| archived_at | TIMESTAMPTZ | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.28 announcement_receipts
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| announcement_id | UUID | NOT NULL | | FK -> announcements.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| is_read | BOOLEAN | NOT NULL | false | |
| read_at | TIMESTAMPTZ | | | |
| has_consented | BOOLEAN | NOT NULL | false | |
| consented_at | TIMESTAMPTZ | | | |

**Constraint:** UNIQUE(announcement_id, student_id)

### 5.1.29 circular_templates
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| name | VARCHAR(200) | NOT NULL | | |
| type | VARCHAR(30) | NOT NULL | | CHECK IN (placement, internship, stipend_internship, nep_internship) |
| status | VARCHAR(20) | NOT NULL | 'draft' | CHECK IN (draft, active, archived) |
| version | VARCHAR(20) | NOT NULL | '1.0' | |
| sections | JSONB | NOT NULL | '[]' | Array of {section, fields[]} |
| used_count | INTEGER | NOT NULL | 0 | |
| created_by | UUID | | | FK -> users.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.30 generated_circulars
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| template_id | UUID | NOT NULL | | FK -> circular_templates.id |
| company_id | UUID | NOT NULL | | FK -> companies.id |
| company_name | VARCHAR(300) | NOT NULL | | |
| role_name | VARCHAR(200) | NOT NULL | | |
| type | VARCHAR(30) | NOT NULL | | |
| field_values | JSONB | NOT NULL | '{}' | Key-value pairs of filled fields |
| generated_by | UUID | | | FK -> users.id |
| generated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.31 no_dues_requests
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| student_id | UUID | NOT NULL | | FK -> students.id |
| exit_reason | VARCHAR(30) | NOT NULL | | CHECK IN (employment, family_business, higher_studies) |
| company_name | VARCHAR(300) | | | For employment |
| designation | VARCHAR(200) | | | For employment |
| package_lpa | DECIMAL(10,2) | | | For employment |
| joining_date | DATE | | | For employment |
| business_name | VARCHAR(300) | | | For family_business |
| business_nature | VARCHAR(200) | | | For family_business |
| business_address | TEXT | | | For family_business |
| institution_name | VARCHAR(300) | | | For higher_studies |
| program_name | VARCHAR(200) | | | For higher_studies |
| country | VARCHAR(100) | | | For higher_studies |
| declaration_accepted | BOOLEAN | NOT NULL | false | |
| status | VARCHAR(30) | NOT NULL | 'pending_review' | CHECK IN (pending_review, under_review, approved, returned, rejected, issued) |
| admin_remarks | TEXT | | | |
| reviewed_by | UUID | | | FK -> users.id |
| reviewed_at | TIMESTAMPTZ | | | |
| ndc_number | VARCHAR(50) | | | UNIQUE |
| issued_at | TIMESTAMPTZ | | | |
| certificate_url | TEXT | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.32 portfolios
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| student_id | UUID | NOT NULL | | FK -> students.id, UNIQUE |
| status | VARCHAR(20) | NOT NULL | 'draft' | CHECK IN (draft, published) |
| project_count | INTEGER | NOT NULL | 0 | |
| internship_count | INTEGER | NOT NULL | 0 | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.33 portfolio_projects
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| portfolio_id | UUID | NOT NULL | | FK -> portfolios.id |
| title | VARCHAR(200) | NOT NULL | | |
| description | TEXT | | | |
| role | VARCHAR(200) | | | |
| technologies | TEXT[] | | '{}' | |
| keywords | TEXT[] | | '{}' | |
| github_url | TEXT | | | |
| live_url | TEXT | | | |
| start_date | DATE | | | |
| end_date | DATE | | | |
| is_ongoing | BOOLEAN | NOT NULL | false | |
| attachments | JSONB | | '[]' | Array of {name, url, type} |
| display_order | INTEGER | NOT NULL | 0 | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.34 internship_showcases
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| portfolio_id | UUID | NOT NULL | | FK -> portfolios.id |
| company_name | VARCHAR(300) | NOT NULL | | |
| role | VARCHAR(200) | NOT NULL | | |
| duration_months | INTEGER | | | |
| start_date | DATE | | | |
| end_date | DATE | | | |
| key_outcomes | TEXT[] | | '{}' | |
| proof_url | TEXT | | | |
| is_verified | BOOLEAN | NOT NULL | false | |
| linked_internship_id | UUID | | | FK -> internships.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.35 policies
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| title | VARCHAR(200) | NOT NULL | | |
| category | VARCHAR(50) | NOT NULL | | |
| description | TEXT | | | |
| content | TEXT | NOT NULL | | Markdown content |
| version | VARCHAR(20) | NOT NULL | '1.0' | |
| effective_date | DATE | | | |
| updated_by | VARCHAR(200) | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.36 eligibility_rules
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| rule_name | VARCHAR(200) | NOT NULL | | |
| company_name | VARCHAR(300) | | | |
| min_cgpa | DECIMAL(4,2) | NOT NULL | 0 | |
| max_backlogs | INTEGER | NOT NULL | 0 | |
| eligible_branches | TEXT[] | | '{}' | |
| eligible_batches | TEXT[] | | '{}' | |
| min_tenth | DECIMAL(5,2) | | | |
| min_twelfth | DECIMAL(5,2) | | | |
| additional_criteria | TEXT | | | |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.37 export_records
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| posting_id | UUID | | | FK -> postings.id |
| company_name | VARCHAR(300) | | | |
| role_name | VARCHAR(200) | | | |
| exported_by | UUID | NOT NULL | | FK -> users.id |
| format | VARCHAR(10) | NOT NULL | | CHECK IN (xlsx, pdf) |
| record_count | INTEGER | NOT NULL | | |
| fields_included | TEXT[] | NOT NULL | '{}' | |
| exported_at | TIMESTAMPTZ | NOT NULL | NOW() | |

### 5.1.38 audit_logs
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| user_id | UUID | | | FK -> users.id |
| user_name | VARCHAR(200) | | | |
| action | VARCHAR(50) | NOT NULL | | |
| module | VARCHAR(50) | NOT NULL | | |
| target_type | VARCHAR(50) | | | |
| target_id | UUID | | | |
| details | TEXT | | | |
| ip_address | VARCHAR(50) | | | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (tenant_id, created_at DESC), (tenant_id, module), (tenant_id, action), (user_id)

### 5.1.39 role_permissions
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| role | VARCHAR(30) | NOT NULL | | |
| module | VARCHAR(50) | NOT NULL | | |
| can_view | BOOLEAN | NOT NULL | false | |
| can_create | BOOLEAN | NOT NULL | false | |
| can_edit | BOOLEAN | NOT NULL | false | |
| can_delete | BOOLEAN | NOT NULL | false | |
| can_export | BOOLEAN | NOT NULL | false | |
| can_approve | BOOLEAN | NOT NULL | false | |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Constraint:** UNIQUE(tenant_id, role, module)

### 5.1.40 notifications
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| tenant_id | UUID | NOT NULL | | FK -> tenants.id |
| user_id | UUID | NOT NULL | | FK -> users.id |
| type | VARCHAR(30) | NOT NULL | | CHECK IN (profile, policy, readiness, placement) |
| title | VARCHAR(300) | NOT NULL | | |
| description | TEXT | | | |
| priority | VARCHAR(10) | NOT NULL | 'low' | CHECK IN (high, medium, low) |
| is_read | BOOLEAN | NOT NULL | false | |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | |

**Indexes:** (user_id, is_read), (user_id, created_at DESC)

## 5.2 Relationship Summary

### One-to-One
- users <-> students (user_id)
- users <-> recruiters (user_id)
- students <-> academic_profiles (student_id)
- students <-> skills_profiles (student_id)
- students <-> current_employment (student_id)
- students <-> portfolios (student_id)

### One-to-Many
- tenants -> users, students, companies, postings, events, etc.
- students -> resumes, projects, certifications, interest_registrations, applications, offers, noc_requests, no_dues_requests
- companies -> recruiters, engagements, postings
- postings -> applications
- applications -> stage_history, recruiter_feedback
- offers -> offer_audit
- events -> event_panels, event_students
- internships -> internship_issues
- announcements -> announcement_receipts
- portfolios -> portfolio_projects, internship_showcases
- circular_templates -> generated_circulars

### Many-to-Many (via junction tables)
- events <-> students (via event_students)
- events <-> panels (via event_panels, panels -> event_students)

### Lookup/Master Tables
- tenants (multi-tenant master)
- policies (reference documents)
- eligibility_rules (configurable rules)
- role_permissions (RBAC matrix)
# 6. API SPECIFICATION FOR NODE.JS BACKEND

## 6.1 Authentication & Session APIs

### POST /api/auth/login
- **Purpose:** User login
- **Auth Required:** No
- **Request Body:** `{ email: string, password: string, tenant_slug?: string }`
- **Validation:** email required (format), password required
- **Service Logic:** Verify credentials, generate JWT + refresh token, log audit entry
- **Tables Affected:** users (read), audit_logs (insert)
- **Success Response:** `{ token: string, refresh_token: string, user: { id, name, email, role, tenant_id } }`
- **Error Response:** `{ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }`

### POST /api/auth/refresh
- **Purpose:** Refresh access token
- **Auth Required:** Refresh token in body
- **Request Body:** `{ refresh_token: string }`
- **Success Response:** `{ token: string, refresh_token: string }`

### POST /api/auth/logout
- **Purpose:** Invalidate session
- **Auth Required:** Yes
- **Service Logic:** Blacklist token, log audit
- **Success Response:** `{ message: 'Logged out successfully' }`

### POST /api/auth/forgot-password
- **Purpose:** Initiate password reset
- **Request Body:** `{ email: string }`
- **Service Logic:** Generate reset token, send email
- **Success Response:** `{ message: 'Reset link sent' }`

### POST /api/auth/reset-password
- **Purpose:** Reset password with token
- **Request Body:** `{ token: string, new_password: string }`
- **Success Response:** `{ message: 'Password reset successful' }`

---

## 6.2 Student APIs

### GET /api/students/me
- **Purpose:** Get current student's profile
- **Auth:** Yes (student)
- **Tables:** students, academic_profiles, skills_profiles
- **Success:** `{ student: StudentMaster, academic: AcademicProfile, skills: SkillsProfile }`

### PUT /api/students/me/personal
- **Purpose:** Update personal profile fields
- **Auth:** Yes (student)
- **Request Body:** `{ full_name?, mobile?, date_of_birth?, linkedin_url?, alternate_phone?, residential_address?, permanent_address?, profile_photo_url? }`
- **Validation:** full_name locked if policy accepted; phone 10-15 digits; LinkedIn URL format
- **Service Logic:** Update fields, recalculate profile_completion_percentage
- **Tables:** students (update)

### PUT /api/students/me/academic
- **Purpose:** Update academic profile
- **Auth:** Yes (student)
- **Request Body:** `{ cgpa?, tenth_percentage?, twelfth_percentage?, diploma_percentage?, backlog_count?, semester?, year_of_study? }`
- **Validation:** cgpa 0-10, percentages 0-100, backlog_count >= 0
- **Tables:** academic_profiles (upsert)

### PUT /api/students/me/skills
- **Purpose:** Update skills and interests
- **Auth:** Yes (student)
- **Request Body:** `{ technical_skills: string[], domain_interests: string[], preferred_locations: string[] }`
- **Tables:** skills_profiles (upsert)

### GET /api/students/me/projects
- **Purpose:** Get student's projects
- **Auth:** Yes (student)
- **Tables:** student_projects
- **Success:** `{ projects: Project[] }`

### POST /api/students/me/projects
- **Purpose:** Add a project
- **Auth:** Yes (student)
- **Request Body:** `{ title, description?, technologies?, github_url?, demo_url?, start_date?, end_date?, is_ongoing? }`
- **Validation:** title required (max 200)
- **Tables:** student_projects (insert)

### PUT /api/students/me/projects/:projectId
- **Purpose:** Update a project
- **Auth:** Yes (student, owns project)

### DELETE /api/students/me/projects/:projectId
- **Purpose:** Delete a project
- **Auth:** Yes (student, owns project)

### GET /api/students/me/certifications
- **Purpose:** Get certifications
- **Auth:** Yes (student)
- **Tables:** certifications

### POST /api/students/me/certifications
- **Purpose:** Add certification
- **Auth:** Yes (student)
- **Request Body:** `{ name, issuer, issue_date?, credential_url? }`

### DELETE /api/students/me/certifications/:certId
- **Auth:** Yes (student, owns cert)

### GET /api/students/me/resumes
- **Purpose:** List resumes
- **Auth:** Yes (student)
- **Tables:** resumes

### POST /api/students/me/resumes
- **Purpose:** Upload resume
- **Auth:** Yes (student)
- **Content-Type:** multipart/form-data
- **Request Body:** file (PDF/DOC/DOCX), name
- **Validation:** File type, file size
- **Service Logic:** Store file, create metadata, trigger AI scoring async
- **Tables:** resumes (insert)

### PUT /api/students/me/resumes/:resumeId/default
- **Purpose:** Set resume as default
- **Auth:** Yes (student)
- **Service Logic:** Unset previous default, set new default (transaction)
- **Tables:** resumes (update)

### DELETE /api/students/me/resumes/:resumeId
- **Purpose:** Delete resume
- **Auth:** Yes (student, owns resume)
- **Service Logic:** Delete file from storage, delete record
- **Tables:** resumes (delete)

### GET /api/students/me/employment
- **Purpose:** Get current employment
- **Auth:** Yes (student)
- **Tables:** current_employment

### PUT /api/students/me/employment
- **Purpose:** Update employment status
- **Auth:** Yes (student)
- **Request Body:** `{ is_currently_working, employment_type?, company_name?, designation?, duration? }`
- **Tables:** current_employment (upsert)

### POST /api/students/me/policy-acceptance
- **Purpose:** Accept placement policy and data consent
- **Auth:** Yes (student)
- **Request Body:** `{ policy_read: true, rules_accepted: true, profile_sharing_consent: true, resume_sharing_consent: true, data_storage_consent: true, communication_consent: true }`
- **Validation:** All fields must be true
- **Service Logic:** Create acceptance record, update student.policy_accepted, log audit
- **Tables:** policy_acceptances (insert), students (update), audit_logs (insert)

### GET /api/students/me/interests
- **Purpose:** Get registered interests
- **Auth:** Yes (student)
- **Tables:** interest_registrations

### POST /api/students/me/interests
- **Purpose:** Register interest types
- **Auth:** Yes (student)
- **Request Body:** `{ interest_types: string[] }`
- **Validation:** profile_completion >= 80%, policy_accepted = true
- **Service Logic:** Upsert interest registrations
- **Tables:** interest_registrations (upsert)

### GET /api/students/me/eligibility
- **Purpose:** Get eligibility checks against active rules
- **Auth:** Yes (student)
- **Service Logic:** Evaluate student against all active eligibility rules
- **Tables:** eligibility_rules, students, academic_profiles
- **Success:** `{ checks: EligibilityCheck[] }`

### GET /api/students/me/readiness
- **Purpose:** Get career readiness checklist
- **Auth:** Yes (student)
- **Service Logic:** Calculate readiness items (profile, resume, policy, mock, etc.)

### GET /api/students/me/dashboard
- **Purpose:** Aggregated dashboard data
- **Auth:** Yes (student)
- **Service Logic:** Combine profile, academic, resumes, eligibility, readiness, interests
- **Tables:** Multiple reads

---

## 6.3 Opportunity APIs (Student-Facing)

### GET /api/opportunities
- **Purpose:** List eligible/all postings for student
- **Auth:** Yes (student)
- **Query Params:** `type?, work_mode?, locations[]?, domains[]?, min_stipend?, max_ctc?, search?, page?, limit?, tab=(eligible|all)`
- **Service Logic:** Filter postings, calculate eligibility per posting, calculate match percentage
- **Tables:** postings, companies, students, academic_profiles, skills_profiles
- **Pagination:** Yes (default 20)
- **Sort:** By match percentage (desc), posting date (desc)
- **Success:** `{ postings: PostingWithEligibility[], total, page, limit }`

### GET /api/opportunities/:postingId
- **Purpose:** Full posting detail with eligibility check
- **Auth:** Yes (student)
- **Service Logic:** Get posting, check eligibility, calculate match %, check if already applied, check if application window open
- **Tables:** postings, companies, applications
- **Success:** `{ posting: Posting, eligibility: { eligible: boolean, checks: [] }, match_percentage: number, has_applied: boolean, is_open: boolean }`

---

## 6.4 Application APIs

### POST /api/applications
- **Purpose:** Student applies to a posting
- **Auth:** Yes (student)
- **Request Body:** `{ posting_id: UUID, resume_id: UUID }`
- **Validation:** Student eligible, posting published, within window, no existing application, no blocking offer, profile >= 80%, policy accepted
- **Service Logic:** Create application at 'applied' stage, create stage history, log audit
- **Tables:** applications (insert), application_stage_history (insert), audit_logs (insert)
- **Idempotency:** UNIQUE(student_id, posting_id) prevents duplicates
- **Error Cases:** `ALREADY_APPLIED`, `NOT_ELIGIBLE`, `OFFER_BLOCKED`, `PROFILE_INCOMPLETE`, `POLICY_NOT_ACCEPTED`, `POSTING_CLOSED`

### GET /api/applications/my
- **Purpose:** Student's applications
- **Auth:** Yes (student)
- **Query Params:** `stage?, search?, page?, limit?`
- **Service Logic:** Get applications with posting/company details, stage history (last 4)
- **Tables:** applications, postings, companies, application_stage_history

### GET /api/applications/by-posting/:postingId
- **Purpose:** All applications for a posting (admin pipeline)
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `stage?, branch?, search?, sort_field?, sort_dir?, page?, limit?`
- **Tables:** applications, students, academic_profiles
- **Pagination:** Yes
- **Sort:** name, enrollment, cgpa, stage, applied_at

### PUT /api/applications/bulk-move
- **Purpose:** Move multiple applications to a new stage
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ application_ids: UUID[], target_stage: string, remarks?: string }`
- **Validation:** Valid stage transition, all applications belong to same posting
- **Service Logic:** Update current_stage for all, create stage_history for each, log audit
- **Tables:** applications (update), application_stage_history (insert), audit_logs (insert)

### PUT /api/applications/bulk-mock-result
- **Purpose:** Set mock round result for multiple applications
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ application_ids: UUID[], result: 'passed'|'failed', remarks?: string }`
- **Service Logic:** Set mock_round_result; if passed -> auto-move to shortlisted; if failed -> auto-move to rejected; create stage history
- **Tables:** applications (update), application_stage_history (insert)

### PUT /api/applications/bulk-reject
- **Purpose:** Reject multiple applications
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ application_ids: UUID[], reason: string }`
- **Service Logic:** Move all to 'rejected' stage, record reason in stage history
- **Tables:** applications (update), application_stage_history (insert)

### POST /api/applications/export
- **Purpose:** Export candidate data for a posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ posting_id: UUID, application_ids?: UUID[], fields: string[], format: 'xlsx'|'pdf' }`
- **Service Logic:** Generate export file, block PII fields (email, phone, address), record in export_records
- **Tables:** applications, students, academic_profiles, export_records (insert)
- **Success:** File download stream

### GET /api/applications/:postingId/exchange-log
- **Purpose:** View export history for a posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** export_records

### POST /api/applications/:applicationId/feedback
- **Purpose:** Recruiter submits feedback on candidate
- **Auth:** Yes (recruiter)
- **Request Body:** `{ decision: 'shortlist'|'under_consideration'|'not_selected', remarks?: string }`
- **Tables:** recruiter_feedback (insert)

### GET /api/applications/stats
- **Purpose:** Application statistics overview
- **Auth:** Yes (tpo_admin)
- **Service Logic:** Count by stage, by posting, by mock result
- **Tables:** applications (aggregate)

---

## 6.5 Offer APIs

### POST /api/offers
- **Purpose:** Create a new offer
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ student_id, posting_id, type, role, ctc?, stipend?, location, offer_date }`
- **Validation:** Student exists, posting exists, no duplicate offer for same student+posting; if single_active_offer policy -> check no existing active offer
- **Service Logic:** Create offer, create audit entry, if single_active_offer -> set applications_blocked
- **Tables:** offers (insert), offer_audit (insert)
- **Error Cases:** `DUPLICATE_OFFER`, `ACTIVE_OFFER_EXISTS`

### GET /api/offers
- **Purpose:** List all offers (admin)
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator)
- **Query Params:** `status?, company_id?, search?, page?, limit?`
- **Tables:** offers, students, companies, postings
- **Pagination:** Yes

### GET /api/offers/my
- **Purpose:** Student's offers
- **Auth:** Yes (student)
- **Tables:** offers, companies, postings

### PUT /api/offers/:offerId/accept
- **Purpose:** Student accepts offer
- **Auth:** Yes (student, owns offer)
- **Validation:** Offer status must be 'pending_student_action'
- **Service Logic:** Set status to 'accepted', set accepted_at, if single_active_offer -> set applications_blocked=true, create audit entry
- **Tables:** offers (update), offer_audit (insert)

### PUT /api/offers/:offerId/reject
- **Purpose:** Admin rejects offer
- **Auth:** Yes (tpo_admin)
- **Request Body:** `{ reason: string, remarks?: string }`
- **Validation:** Valid rejection reason
- **Service Logic:** Set status to 'rejected_by_admin', unblock applications if was blocking, create audit entry
- **Tables:** offers (update), offer_audit (insert)

### PUT /api/offers/:offerId/joining
- **Purpose:** Confirm joining status
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ status: 'joined'|'did_not_join', joining_date?: date, reason?: string }`
- **Validation:** Offer must be 'accepted'; if joined -> joining_date required; if DNJ -> reason required
- **Service Logic:** Update joining_status, if joined -> lock record (is_locked=true), create audit entry
- **Tables:** offers (update), offer_audit (insert)

### GET /api/offers/stats
- **Purpose:** Offer statistics (compliant, blocked, override, locked counts)
- **Auth:** Yes (tpo_admin)
- **Tables:** offers (aggregate)

### GET /api/offers/:offerId/audit
- **Purpose:** Offer audit trail
- **Auth:** Yes (tpo_admin)
- **Tables:** offer_audit

---

## 6.6 Company & Employer APIs

### GET /api/companies
- **Purpose:** List companies
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator)
- **Query Params:** `status?, classification?, search?, page?, limit?`
- **Tables:** companies
- **Pagination:** Yes

### POST /api/companies
- **Purpose:** Create company
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ name, industry?, address?, website?, description? }`
- **Validation:** name required, website URL format if provided
- **Tables:** companies (insert), audit_logs (insert)

### GET /api/companies/:companyId
- **Purpose:** Get company details with stats
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator, recruiter)
- **Service Logic:** Get company, calculate stats (recruiters count, drives count, hired count)
- **Tables:** companies, recruiters, company_engagements

### PUT /api/companies/:companyId
- **Purpose:** Update company
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ name?, industry?, address?, website?, description?, status? }`
- **Tables:** companies (update), audit_logs (insert)

### PUT /api/companies/:companyId/classification
- **Purpose:** Set company classification
- **Auth:** Yes (tpo_admin)
- **Request Body:** `{ classification: 'preferred'|'normal'|'blacklisted', internal_remarks?: string }`
- **Tables:** companies (update), audit_logs (insert)

### GET /api/companies/:companyId/recruiters
- **Purpose:** List recruiters for a company
- **Auth:** Yes (tpo_admin, tpo_employee, recruiter)
- **Tables:** recruiters

### POST /api/companies/:companyId/recruiters
- **Purpose:** Add recruiter to company
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ name, email, phone?, designation }`
- **Validation:** email unique, phone format
- **Tables:** recruiters (insert)

### PUT /api/recruiters/:recruiterId
- **Purpose:** Update recruiter details
- **Auth:** Yes (tpo_admin, tpo_employee, recruiter [own profile only])
- **Request Body:** `{ name?, phone?, designation? }`
- **Tables:** recruiters (update)

### PUT /api/recruiters/:recruiterId/verify
- **Purpose:** Verify/reject recruiter
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ status: 'verified'|'rejected' }`
- **Tables:** recruiters (update), audit_logs (insert)

### DELETE /api/recruiters/:recruiterId
- **Purpose:** Remove recruiter
- **Auth:** Yes (tpo_admin)
- **Tables:** recruiters (delete)

### GET /api/companies/:companyId/engagements
- **Purpose:** Engagement history for a company
- **Auth:** Yes (tpo_admin, tpo_employee, recruiter)
- **Tables:** company_engagements

### POST /api/companies/:companyId/engagements
- **Purpose:** Record company engagement
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ visitor_type, date, remarks?, students_hired?, packages_offered?, academic_year? }`
- **Tables:** company_engagements (insert)

---

## 6.7 Posting APIs (Admin)

### GET /api/postings
- **Purpose:** List all postings
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `status?, type?, search?, academic_year?, page?, limit?`
- **Tables:** postings, companies
- **Pagination:** Yes

### POST /api/postings
- **Purpose:** Create posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** Full posting object (all fields from CreatePosting wizard)
- **Validation:** Zod schema - company active and not blacklisted, title max 200, description min 10, end date > start date, at least one branch and batch
- **Tables:** postings (insert), audit_logs (insert)

### GET /api/postings/:postingId
- **Purpose:** Get posting detail
- **Auth:** Yes (all authenticated)
- **Tables:** postings, companies

### PUT /api/postings/:postingId
- **Purpose:** Update posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Validation:** Cannot edit closed postings
- **Tables:** postings (update), audit_logs (insert)

### PUT /api/postings/:postingId/publish
- **Purpose:** Publish draft posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Validation:** Status must be 'draft', all required fields present
- **Service Logic:** Set status='published', set published_at
- **Tables:** postings (update), audit_logs (insert)

### PUT /api/postings/:postingId/close
- **Purpose:** Close published posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Validation:** Status must be 'published'
- **Service Logic:** Set status='closed', set closed_at
- **Tables:** postings (update), audit_logs (insert)

### GET /api/postings/:postingId/eligible-students
- **Purpose:** Get students eligible for a posting
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `branch?, min_cgpa?, search?, page?, limit?`
- **Service Logic:** Filter students by posting eligibility criteria (branches, batches, CGPA, backlogs), calculate match percentage
- **Tables:** postings, students, academic_profiles, skills_profiles, resumes

### GET /api/postings/stats
- **Purpose:** Posting statistics
- **Auth:** Yes (tpo_admin)
- **Tables:** postings (aggregate)

---

## 6.8 Event & Drive APIs

### GET /api/events
- **Purpose:** List events
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator)
- **Query Params:** `type?, status?, search?, page?, limit?`
- **Tables:** events, companies

### POST /api/events
- **Purpose:** Create event
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ type, company_id, posting_id?, title, date, start_time, end_time, venue, reporting_time?, dress_code?, instructions? }`
- **Tables:** events (insert)

### GET /api/events/:eventId
- **Purpose:** Get event detail with panels and students
- **Auth:** Yes (all authenticated)
- **Tables:** events, event_panels, event_students, companies

### PUT /api/events/:eventId
- **Purpose:** Update event
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** events (update)

### PUT /api/events/:eventId/publish
- **Purpose:** Publish draft event
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** events (update)

### PUT /api/events/:eventId/complete
- **Purpose:** Mark event as completed
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** events (update)

### POST /api/events/:eventId/students
- **Purpose:** Add students to event
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ student_ids: UUID[] }`
- **Tables:** event_students (insert)

### DELETE /api/events/:eventId/students/:studentId
- **Purpose:** Remove student from event
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** event_students (delete)

### PUT /api/events/:eventId/slots
- **Purpose:** Assign time slots and panels to students
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ assignments: [{ student_id, slot_time, panel_id? }] }`
- **Tables:** event_students (update)

### POST /api/events/:eventId/panels
- **Purpose:** Create interview panel
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ panel_name, room, start_time?, end_time?, recruiters? }`
- **Tables:** event_panels (insert)

### DELETE /api/events/:eventId/panels/:panelId
- **Purpose:** Delete panel
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Service Logic:** Unassign students from panel first
- **Tables:** event_panels (delete), event_students (update)

### PUT /api/events/:eventId/attendance
- **Purpose:** Bulk mark attendance
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator)
- **Request Body:** `{ attendance: [{ student_id: UUID, status: 'present'|'absent'|'late' }] }`
- **Tables:** event_students (update)

### GET /api/events/my
- **Purpose:** Student's assigned events
- **Auth:** Yes (student)
- **Tables:** events, event_students, event_panels

### GET /api/events/recruiter
- **Purpose:** Recruiter's assigned events
- **Auth:** Yes (recruiter)
- **Tables:** events, event_panels, event_students

### GET /api/events/stats
- **Purpose:** Event statistics
- **Auth:** Yes (tpo_admin)
- **Tables:** events (aggregate)

---

## 6.9 NOC APIs

### POST /api/noc-requests
- **Purpose:** Submit NOC request
- **Auth:** Yes (student)
- **Request Body:** Full NOC request fields from 4-step wizard
- **Validation:** All required fields per step, declaration accepted, date range valid
- **Service Logic:** Create request with status 'pending_faculty', log audit
- **Tables:** noc_requests (insert), audit_logs (insert)

### GET /api/noc-requests/my
- **Purpose:** Student's NOC requests
- **Auth:** Yes (student)
- **Tables:** noc_requests

### GET /api/noc-requests
- **Purpose:** All NOC requests (admin)
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `status?, department?, search?, page?, limit?`
- **Tables:** noc_requests, students

### GET /api/noc-requests/faculty-pending
- **Purpose:** Pending faculty approvals (department-scoped)
- **Auth:** Yes (faculty_coordinator)
- **Service Logic:** Filter by faculty's department and status='pending_faculty'
- **Tables:** noc_requests, students

### PUT /api/noc-requests/:requestId/faculty-review
- **Purpose:** Faculty approve/reject
- **Auth:** Yes (faculty_coordinator)
- **Request Body:** `{ action: 'approve'|'reject', remarks?: string }`
- **Service Logic:** If approve -> status='pending_tpo'; if reject -> status='rejected'
- **Tables:** noc_requests (update), audit_logs (insert)

### PUT /api/noc-requests/:requestId/tpo-review
- **Purpose:** TPO approve/reject/issue
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ action: 'approve'|'reject', remarks?: string }`
- **Service Logic:** If approve -> generate NOC number (format from tenant config), set status='issued', create certificate
- **Tables:** noc_requests (update), audit_logs (insert)

### PUT /api/noc-requests/:requestId/verify-company
- **Purpose:** Verify company in NOC request
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ status: 'verified'|'rejected' }`
- **Tables:** noc_requests (update)

### GET /api/noc-requests/:requestId/certificate
- **Purpose:** Download NOC certificate
- **Auth:** Yes (student [own], tpo_admin)
- **Service Logic:** Generate/serve PDF certificate
- **Tables:** noc_requests

### GET /api/noc-requests/stats
- **Purpose:** NOC statistics
- **Auth:** Yes (tpo_admin)
- **Tables:** noc_requests (aggregate)

### GET /api/noc-requests/verified-companies
- **Purpose:** List of previously verified companies for autocomplete
- **Auth:** Yes (student)
- **Tables:** noc_requests (distinct company names where verified)

### GET /api/noc-requests/university-drives
- **Purpose:** List active university drives for NOC source selection
- **Auth:** Yes (student)
- **Tables:** events (filtered by type and status)

---

## 6.10 Internship APIs

### GET /api/internships
- **Purpose:** List internships
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator)
- **Query Params:** `status?, type?, department?, batch?, search?, page?, limit?`
- **Tables:** internships, students, companies
- **Pagination:** Yes

### POST /api/internships
- **Purpose:** Create internship record
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ student_id, company_name, company_id?, role, department?, internship_type, start_date, end_date?, stipend_amount?, stipend_frequency?, is_receiving_stipend?, offer_id? }`
- **Tables:** internships (insert)

### PUT /api/internships/:internshipId
- **Purpose:** Update internship
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** internships (update)

### PUT /api/internships/bulk-status
- **Purpose:** Bulk status change
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ internship_ids: UUID[], status: 'completed'|'discontinued' }`
- **Tables:** internships (update)

### GET /api/internships/my
- **Purpose:** Student's internships
- **Auth:** Yes (student)
- **Tables:** internships

### GET /api/internships/stats
- **Purpose:** Internship statistics
- **Auth:** Yes (tpo_admin)
- **Tables:** internships (aggregate), internship_issues (aggregate)

### GET /api/internships/:internshipId/issues
- **Purpose:** Issues for an internship
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** internship_issues

### GET /api/internships/certificate-alerts
- **Purpose:** List internships with pending certificates
- **Auth:** Yes (tpo_admin)
- **Service Logic:** Filter completed internships where certificate_uploaded = false
- **Tables:** internships

---

## 6.11 Announcement APIs

### GET /api/announcements
- **Purpose:** List announcements (admin)
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `status?, priority?, search?, page?, limit?`
- **Tables:** announcements

### POST /api/announcements
- **Purpose:** Create announcement
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ title, content, priority, target_audience_type, target_batches?, target_departments?, requires_consent, linked_circular_id?, status: 'draft'|'published' }`
- **Validation:** title max 200, content max 5000
- **Service Logic:** If published, calculate recipients and create announcement_receipts
- **Tables:** announcements (insert), announcement_receipts (bulk insert if published)

### PUT /api/announcements/:announcementId
- **Purpose:** Update announcement
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** announcements (update)

### PUT /api/announcements/:announcementId/publish
- **Purpose:** Publish draft announcement
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Service Logic:** Set status='published', calculate and create receipts for target students
- **Tables:** announcements (update), announcement_receipts (bulk insert), students (read for targeting)

### PUT /api/announcements/:announcementId/archive
- **Purpose:** Archive announcement
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** announcements (update)

### GET /api/announcements/student
- **Purpose:** Student's announcements (targeted to them)
- **Auth:** Yes (student)
- **Service Logic:** Get announcements where student matches target audience, join with receipt for read/consent status
- **Tables:** announcements, announcement_receipts

### POST /api/announcements/:announcementId/read
- **Purpose:** Mark announcement as read
- **Auth:** Yes (student)
- **Service Logic:** Update receipt, increment read_count on announcement
- **Tables:** announcement_receipts (update), announcements (update read_count)

### POST /api/announcements/:announcementId/consent
- **Purpose:** Student gives consent
- **Auth:** Yes (student)
- **Validation:** Announcement must require consent
- **Tables:** announcement_receipts (update), announcements (update consent_count)

### GET /api/announcements/:announcementId/receipts
- **Purpose:** Delivery receipts for an announcement
- **Auth:** Yes (tpo_admin)
- **Tables:** announcement_receipts, students

### GET /api/announcements/stats
- **Purpose:** Announcement statistics
- **Auth:** Yes (tpo_admin)
- **Tables:** announcements (aggregate)

---

## 6.12 Circular APIs

### GET /api/circular-templates
- **Purpose:** List templates
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `type?, status?, search?`
- **Tables:** circular_templates

### POST /api/circular-templates
- **Purpose:** Create template
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ name, type, sections: [{section, fields: [{id, label, type, required, placeholder}]}] }`
- **Tables:** circular_templates (insert)

### GET /api/circular-templates/:templateId
- **Purpose:** Get template detail
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** circular_templates

### PUT /api/circular-templates/:templateId
- **Purpose:** Update template
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** circular_templates (update)

### PUT /api/circular-templates/:templateId/archive
- **Purpose:** Archive template
- **Auth:** Yes (tpo_admin)
- **Tables:** circular_templates (update)

### PUT /api/circular-templates/:templateId/reactivate
- **Purpose:** Reactivate archived template
- **Auth:** Yes (tpo_admin)
- **Tables:** circular_templates (update)

### POST /api/circular-templates/:templateId/duplicate
- **Purpose:** Duplicate template
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** circular_templates (insert)

### POST /api/circulars/generate
- **Purpose:** Generate circular from template
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ template_id, company_id, role_name, field_values: {} }`
- **Service Logic:** Validate all required fields filled, increment template used_count
- **Tables:** generated_circulars (insert), circular_templates (update used_count)

### GET /api/circulars
- **Purpose:** List generated circulars
- **Auth:** Yes (tpo_admin, tpo_employee, faculty_coordinator)
- **Query Params:** `search?, page?, limit?`
- **Tables:** generated_circulars, circular_templates, companies

### GET /api/circulars/:circularId
- **Purpose:** Get generated circular detail
- **Auth:** Yes (all authenticated)
- **Tables:** generated_circulars, circular_templates

---

## 6.13 No Dues Certificate APIs

### POST /api/no-dues-requests
- **Purpose:** Submit NDC request
- **Auth:** Yes (student)
- **Request Body:** `{ exit_reason, company_name?, designation?, package_lpa?, joining_date?, business_name?, business_nature?, business_address?, institution_name?, program_name?, country? }`
- **Validation:** exit_reason required, conditional fields based on exit_reason, declaration_accepted=true
- **Tables:** no_dues_requests (insert)

### GET /api/no-dues-requests/my
- **Purpose:** Student's NDC requests
- **Auth:** Yes (student)
- **Tables:** no_dues_requests

### GET /api/no-dues-requests
- **Purpose:** All NDC requests (admin)
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `status?, search?, page?, limit?`
- **Tables:** no_dues_requests, students

### PUT /api/no-dues-requests/:requestId/review
- **Purpose:** Admin review action
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ action: 'approve'|'return'|'reject', remarks?: string }`
- **Validation:** If return -> remarks required
- **Service Logic:** If approve -> generate NDC number, set status='issued'; if return -> set status='returned'; if reject -> set status='rejected'
- **Tables:** no_dues_requests (update), audit_logs (insert)

### GET /api/no-dues-requests/:requestId/certificate
- **Purpose:** Download NDC certificate
- **Auth:** Yes (student [own], tpo_admin)
- **Tables:** no_dues_requests

---

## 6.14 Policy APIs

### GET /api/policies
- **Purpose:** List policy documents
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `category?, search?`
- **Tables:** policies

### POST /api/policies
- **Purpose:** Create policy document
- **Auth:** Yes (tpo_admin)
- **Request Body:** `{ title, category, description?, content, version, effective_date?, updated_by? }`
- **Tables:** policies (insert)

### PUT /api/policies/:policyId
- **Purpose:** Update policy
- **Auth:** Yes (tpo_admin)
- **Tables:** policies (update)

### GET /api/policies/:policyId
- **Purpose:** Get policy detail
- **Auth:** Yes (all authenticated)
- **Tables:** policies

---

## 6.15 Portfolio APIs

### GET /api/portfolios/my
- **Purpose:** Student's portfolio
- **Auth:** Yes (student)
- **Tables:** portfolios, portfolio_projects, internship_showcases

### PUT /api/portfolios/my/settings
- **Purpose:** Update portfolio visibility
- **Auth:** Yes (student)
- **Request Body:** `{ status: 'published'|'draft' }`
- **Tables:** portfolios (update)

### POST /api/portfolios/my/projects
- **Purpose:** Add portfolio project
- **Auth:** Yes (student)
- **Tables:** portfolio_projects (insert), portfolios (update counts)

### PUT /api/portfolios/my/projects/:projectId
- **Purpose:** Update portfolio project
- **Auth:** Yes (student)
- **Tables:** portfolio_projects (update)

### DELETE /api/portfolios/my/projects/:projectId
- **Purpose:** Delete portfolio project
- **Auth:** Yes (student)
- **Tables:** portfolio_projects (delete), portfolios (update counts)

### POST /api/portfolios/my/internship-showcases
- **Purpose:** Add internship showcase
- **Auth:** Yes (student)
- **Tables:** internship_showcases (insert), portfolios (update counts)

### PUT /api/portfolios/my/internship-showcases/:showcaseId
- **Purpose:** Update internship showcase
- **Auth:** Yes (student)
- **Tables:** internship_showcases (update)

### DELETE /api/portfolios/my/internship-showcases/:showcaseId
- **Purpose:** Delete internship showcase
- **Auth:** Yes (student)
- **Tables:** internship_showcases (delete), portfolios (update counts)

### GET /api/portfolios
- **Purpose:** List all portfolios (admin)
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** portfolios, students

### GET /api/portfolios/:studentId
- **Purpose:** View student's portfolio (read-only, for recruiters)
- **Auth:** Yes (recruiter, tpo_admin, faculty_coordinator)
- **Validation:** Portfolio must be 'published' for recruiter access
- **Tables:** portfolios, portfolio_projects, internship_showcases

---

## 6.16 Report APIs

### GET /api/reports/interested-students
- **Query:** `interest_type?, department?, min_cgpa?, verified_only?`

### GET /api/reports/eligibility
- **Query:** `department?, batch?`

### GET /api/reports/profile-completion
- **Query:** `department?, batch?`

### GET /api/reports/registration-summary
- **Query:** `academic_year?`

### GET /api/reports/company-master
- **Query:** `status?, industry?`

### GET /api/reports/recruiter-list
- **Query:** `company_id?, verification_status?`

### GET /api/reports/engagement-history
- **Query:** `company_id?, type?, academic_year?`

### GET /api/reports/company-classification
- **Query:** `classification?`

### GET /api/reports/active-postings
- **Query:** `type?, academic_year?`

### GET /api/reports/posting-history
- **Query:** `academic_year?, type?`

### GET /api/reports/posting-summary
- **Query:** `academic_year?`

### GET /api/reports/event-attendance
- **Query:** `event_id?, date_range?`

### GET /api/reports/drive-completion
- **Query:** `date_range?`

### GET /api/reports/student-participation
- **Query:** `student_id?, department?`

### GET /api/reports/pending-noc
- **Query:** `department?`

### GET /api/reports/issued-noc-register
- **Query:** `department?, date_range?`

### GET /api/reports/noc-by-department
- **Query:** `academic_year?`

### GET /api/reports/applicant-list
- **Query:** `posting_id`

### GET /api/reports/stage-wise
- **Query:** `posting_id?`

### GET /api/reports/shortlist-rejection
- **Query:** `posting_id?`

### GET /api/reports/offer-acceptance
- **Query:** `academic_year?`

### GET /api/reports/joining-status
- **Query:** `academic_year?`

### GET /api/reports/compliance
- **Query:** `(none)`

### GET /api/reports/internship-status
- **Query:** `department?, type?`

### GET /api/reports/certificate-pending
- **Query:** `(none)`

### GET /api/reports/company-internship
- **Query:** `company_id?`

### GET /api/reports/portfolio-completion
- **Query:** `department?`

### GET /api/reports/published-portfolios
- **Query:** `department?`

### GET /api/reports/announcement-history
- **Query:** `date_range?`

### GET /api/reports/consent-tracking
- **Query:** `announcement_id?`

### GET /api/reports/placement-summary
- **Query:** `academic_year?, department?`

### GET /api/reports/company-performance
- **Query:** `academic_year?`

### GET /api/reports/offer-to-join-funnel
- **Query:** `academic_year?`

### GET /api/reports/unplaced-students
- **Query:** `department?, batch?`

**All report APIs:**
- Auth: Yes (tpo_admin, tpo_employee, management)
- Support CSV/Excel export via `Accept` header or `format` query param
- Return paginated data for display

---

## 6.17 Security & Admin APIs

### GET /api/admin/students
- **Purpose:** All students (admin hub)
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Query Params:** `department?, batch?, verification_status?, search?, min_cgpa?, page?, limit?`
- **Tables:** students, academic_profiles

### PUT /api/admin/students/:studentId/verify
- **Purpose:** Verify student profile
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Request Body:** `{ status: 'verified'|'rejected' }`
- **Tables:** students (update), audit_logs (insert)

### GET /api/admin/stats
- **Purpose:** Admin dashboard statistics
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Service Logic:** Aggregate placement stats, verification stats, interest summary
- **Tables:** Multiple tables (aggregate queries)

### GET /api/admin/interest-summary
- **Purpose:** Interest registration counts by type
- **Auth:** Yes (tpo_admin)
- **Tables:** interest_registrations (aggregate)

### GET /api/admin/eligibility-rules
- **Purpose:** List eligibility rules
- **Auth:** Yes (tpo_admin, tpo_employee)
- **Tables:** eligibility_rules

### POST /api/admin/eligibility-rules
- **Purpose:** Create eligibility rule
- **Auth:** Yes (tpo_admin)
- **Tables:** eligibility_rules (insert)

### PUT /api/admin/eligibility-rules/:ruleId
- **Purpose:** Update eligibility rule
- **Auth:** Yes (tpo_admin)
- **Tables:** eligibility_rules (update)

### DELETE /api/admin/eligibility-rules/:ruleId
- **Purpose:** Delete eligibility rule
- **Auth:** Yes (tpo_admin)
- **Tables:** eligibility_rules (delete)

### GET /api/admin/selection-database
- **Purpose:** Aggregated selection/placement records
- **Auth:** Yes (tpo_admin)
- **Query Params:** `type?, department?, batch?, company?, outcome?, date_from?, date_to?, search?`
- **Service Logic:** Combine offers (joined/DNJ) and internships into unified view
- **Tables:** offers, internships, students, companies

### GET /api/admin/interest-lists
- **Purpose:** Students by interest type
- **Auth:** Yes (tpo_admin)
- **Query Params:** `interest_type, department?, search?`
- **Tables:** interest_registrations, students, academic_profiles

---

## 6.18 Super Admin APIs

### GET /api/super-admin/users
- **Purpose:** List system users
- **Auth:** Yes (super_admin)
- **Query Params:** `role?, status?, search?, page?, limit?`
- **Tables:** users

### POST /api/super-admin/users
- **Purpose:** Create user
- **Auth:** Yes (super_admin)
- **Request Body:** `{ name, email, role, department?, password }`
- **Tables:** users (insert), audit_logs (insert)

### PUT /api/super-admin/users/:userId
- **Purpose:** Update user
- **Auth:** Yes (super_admin)
- **Request Body:** `{ name?, role?, department?, is_active? }`
- **Tables:** users (update), audit_logs (insert)

### GET /api/super-admin/permissions
- **Purpose:** Get permission matrix
- **Auth:** Yes (super_admin)
- **Tables:** role_permissions

### PUT /api/super-admin/permissions
- **Purpose:** Update permission matrix
- **Auth:** Yes (super_admin)
- **Request Body:** `{ permissions: [{ role, module, can_view, can_create, can_edit, can_delete, can_export, can_approve }] }`
- **Tables:** role_permissions (upsert), audit_logs (insert)

### GET /api/super-admin/audit-logs
- **Purpose:** View audit logs
- **Auth:** Yes (super_admin)
- **Query Params:** `action?, module?, date_from?, date_to?, search?, page?, limit?`
- **Tables:** audit_logs
- **Pagination:** Yes
- **Sort:** created_at DESC

### GET /api/super-admin/audit-logs/export
- **Purpose:** Export audit logs as CSV
- **Auth:** Yes (super_admin)
- **Query Params:** Same filters as list
- **Tables:** audit_logs

---

## 6.19 Notification APIs

### GET /api/notifications
- **Purpose:** Get user notifications
- **Auth:** Yes (all authenticated)
- **Query Params:** `is_read?, page?, limit?`
- **Tables:** notifications

### PUT /api/notifications/:notificationId/read
- **Purpose:** Mark notification as read
- **Auth:** Yes (own notifications)
- **Tables:** notifications (update)

### PUT /api/notifications/mark-all-read
- **Purpose:** Mark all as read
- **Auth:** Yes (all authenticated)
- **Tables:** notifications (update)

### DELETE /api/notifications/:notificationId
- **Purpose:** Dismiss notification
- **Auth:** Yes (own notifications)
- **Tables:** notifications (delete)

---

## 6.20 Tenant Configuration API

### GET /api/tenant/config
- **Purpose:** Get tenant configuration for frontend
- **Auth:** No (public, by tenant slug)
- **Query Params:** `slug`
- **Tables:** tenants
- **Success:** `{ branding, policyRules, academicConfig, placementConfig, featureFlags }`

---

## 6.21 Recruiter-Facing APIs

### GET /api/recruiter/me
- **Purpose:** Get recruiter profile
- **Auth:** Yes (recruiter)
- **Tables:** recruiters, companies

### PUT /api/recruiter/me
- **Purpose:** Update phone/designation
- **Auth:** Yes (recruiter)
- **Validation:** phone 10-15 digits, designation max 100
- **Tables:** recruiters (update)

### GET /api/recruiter/company
- **Purpose:** Get company details (recruiter view)
- **Auth:** Yes (recruiter)
- **Tables:** companies, recruiters, company_engagements

### GET /api/recruiter/pipeline
- **Purpose:** Get postings with candidates (PII-filtered)
- **Auth:** Yes (recruiter, verified only)
- **Service Logic:** Get postings by recruiter's company, get applications per posting, STRIP PII (email, phone, address)
- **Tables:** postings, applications, students, academic_profiles
- **PII Protection:** Remove email, mobile, address fields from response

### GET /api/recruiter/drives
- **Purpose:** Recruiter's assigned events
- **Auth:** Yes (recruiter)
- **Tables:** events, event_panels, event_students

### GET /api/recruiter/internships
- **Purpose:** Internships by recruiter's company
- **Auth:** Yes (recruiter)
- **Tables:** internships

---

## 6.22 Faculty-Scoped APIs

### GET /api/faculty/dashboard
- **Purpose:** Department stats
- **Auth:** Yes (faculty_coordinator)
- **Service Logic:** Count department students, profile completions, eligible, placed
- **Tables:** students, academic_profiles, offers

### GET /api/faculty/students
- **Purpose:** Department students
- **Auth:** Yes (faculty_coordinator)
- **Service Logic:** Filter by faculty's department
- **Tables:** students, academic_profiles

### GET /api/faculty/offers
- **Purpose:** Department offers (read-only)
- **Auth:** Yes (faculty_coordinator)
- **Service Logic:** Filter offers where student is in faculty's department
- **Tables:** offers, students

### GET /api/faculty/internships
- **Purpose:** Department internships (read-only)
- **Auth:** Yes (faculty_coordinator)
- **Tables:** internships, students
# 7. VALIDATION AND BUSINESS RULES

## 7.1 Field-Level Validations

### Student Profile
| Field | Rules |
|-------|-------|
| full_name | Required, max 200, locked after policy acceptance |
| email | Required, valid email format, unique per tenant |
| mobile | 10-15 digits, optional + prefix |
| date_of_birth | Valid date, must be in the past |
| linkedin_url | Valid URL format, must contain linkedin.com |
| cgpa | Decimal, 0.0 - 10.0 (tenant-configurable max) |
| tenth_percentage | Decimal, 0.0 - 100.0 |
| twelfth_percentage | Decimal, 0.0 - 100.0 |
| backlog_count | Integer >= 0 |
| enrollment_number | Required, unique per tenant, immutable |
| department | Required, must be in tenant's department list |
| batch | Required, must be in tenant's batch list |

### Company
| Field | Rules |
|-------|-------|
| name | Required, max 300 |
| industry | Required when provided |
| website | Valid URL format if provided |
| classification | Must be one of: preferred, normal, blacklisted |

### Recruiter
| Field | Rules |
|-------|-------|
| name | Required, max 200 |
| email | Required, valid format, unique |
| phone | 10-15 digits with optional + |
| designation | Required, max 100 |

### Posting
| Field | Rules |
|-------|-------|
| title | Required, max 200 |
| type | Required, one of: job, internship, stipend_internship |
| role_description | Required, min 10 characters |
| company_id | Required, must reference active non-blacklisted company |
| eligible_branches | At least one required |
| eligible_batches | At least one required |
| min_cgpa | 0-10 |
| application_end_date | Must be after application_start_date |
| ctc | Required when type is 'job' |
| stipend | Required when type is 'internship' or 'stipend_internship' |

### NOC Request
| Field | Rules |
|-------|-------|
| noc_type | Required, one of: internship, training, project |
| program | Required, valid program value |
| company_name | Required |
| contact_person_name | Required for self-sourced |
| contact_person_email | Required for self-sourced, valid format |
| role_title | Required |
| start_date | Required, valid date |
| end_date | Required, must be after start_date |
| declaration | Must be true |

### No Dues Request
| Field | Rules |
|-------|-------|
| exit_reason | Required, one of: employment, family_business, higher_studies |
| company_name | Required if exit_reason = employment |
| designation | Required if exit_reason = employment |
| package_lpa | Required if exit_reason = employment, numeric > 0 |
| joining_date | Required if exit_reason = employment |
| business_name | Required if exit_reason = family_business |
| institution_name | Required if exit_reason = higher_studies |
| program_name | Required if exit_reason = higher_studies |

### Announcement
| Field | Rules |
|-------|-------|
| title | Required, max 200 |
| content | Required, max 5000 |
| priority | Required, one of: high, medium, low |
| target_audience_type | Required |
| target_departments | Required if target_audience_type = department |
| target_batches | Required if target_audience_type = batch |

## 7.2 Business Rules (Server-Side Enforcement Required)

### BR-01: Profile Completion Gate (80% Minimum)
- Students cannot register interests, apply to opportunities, or be included in interest lists unless profile_completion_percentage >= 80%
- Profile completion is calculated as: (filled_fields / total_required_fields) * 100
- Required sections: Personal info, Academic profile, Skills, at least 1 resume
- **Enforcement Points:** POST /api/applications, POST /api/students/me/interests, GET /api/admin/interest-lists

### BR-02: Policy Acceptance Gate
- Students must accept placement policy and all data consent items before participating in placements
- Policy acceptance is permanent (cannot be revoked)
- **Enforcement Points:** POST /api/applications, POST /api/students/me/interests

### BR-03: Single Active Offer Policy
- When enabled (tenant-configurable), a student can have only one active (pending/accepted) offer at a time
- When an offer is accepted, applications_blocked = true, preventing new applications
- When offer is rejected or DNJ, unblock applications
- **Enforcement Points:** POST /api/offers, POST /api/applications

### BR-04: Mock Round Gatekeeping
- When enabled (tenant-configurable), students at mock_round stage must pass before being moved to shortlisted
- Passed -> auto-transition to shortlisted
- Failed -> auto-transition to rejected
- **Enforcement Points:** PUT /api/applications/bulk-mock-result, PUT /api/applications/bulk-move

### BR-05: PII Protection in Recruiter Views
- Personal contact information (email, phone, address) must NEVER be exposed to recruiters
- Blocked in: API responses to recruiter role, candidate exports
- **Enforcement Points:** GET /api/recruiter/pipeline, POST /api/applications/export

### BR-06: NOC Dual Approval Chain
- NOC requests must follow: Student Submit -> Faculty Approve -> TPO Approve -> Issue
- Faculty can only approve NOCs from their department
- TPO must verify company before issuing NOC
- Status transitions must be sequential (no skipping)
- **Enforcement Points:** All NOC review endpoints

### BR-07: Posting Status Lifecycle
- Valid transitions: draft -> published, published -> closed
- Cannot edit closed postings
- Cannot publish if required fields are missing
- Cannot apply to draft or closed postings
- **Enforcement Points:** PUT /api/postings/:id/publish, PUT /api/postings/:id/close, POST /api/applications

### BR-08: Offer Record Locking
- When joining_status = 'joined', the offer record becomes locked (is_locked = true)
- Locked records cannot be modified
- **Enforcement Points:** All offer update endpoints

### BR-09: Application Uniqueness
- One application per student per posting (database constraint)
- **Enforcement Points:** POST /api/applications, UNIQUE constraint

### BR-10: Company Blacklist Impact
- Blacklisted companies cannot have new postings created against them
- Existing postings from blacklisted companies remain visible but cannot be republished
- **Enforcement Points:** POST /api/postings, PUT /api/postings/:id/publish

## 7.3 Status Transition Rules

### Application Stages
```
applied -> mock_round -> shortlisted -> test_scheduled -> interview -> hr_round -> offer_released
                |                                                                       |
                v                                                                       v
            rejected <---------- (can be rejected from any stage) -------------------+
```
- Forward transitions only (no moving backwards)
- Rejection is possible from any stage
- mock_round result auto-transitions (passed -> shortlisted, failed -> rejected)

### Offer Status
```
pending_student_action -> accepted -> joining_confirmed (joined | did_not_join)
         |
         v
    rejected_by_admin
```

### NOC Status
```
pending_faculty -> pending_tpo -> issued
       |                |
       v                v
    rejected         rejected
```
With optional pending_company_verification before issue.

### Event Status
```
draft -> published -> ongoing -> completed
                        |
                        v
                    cancelled
```

### NDC Status
```
pending_review -> under_review -> approved -> issued
       |               |
       v               v
    returned        rejected
```
Returned -> student can resubmit -> pending_review again.

---

# 8. AUTHENTICATION, AUTHORIZATION, AND SESSION HANDLING

## 8.1 Authentication Architecture

### Recommended: JWT + Refresh Token
- **Access Token:** Short-lived (15 minutes), contains user_id, tenant_id, role
- **Refresh Token:** Long-lived (7 days), stored in database, rotated on use
- **Token Payload:** `{ user_id, tenant_id, role, email, department? }`

### Login Flow
1. User submits email + password (+ optional tenant slug)
2. Server validates credentials against bcrypt hash
3. Server generates access token + refresh token
4. Refresh token stored in database with expiry
5. Both tokens returned to client
6. Client stores access token in memory, refresh token in httpOnly cookie

### Session Management
- Access token sent as `Authorization: Bearer <token>` header
- Refresh endpoint rotates both tokens
- Logout invalidates refresh token in database
- Multiple device support via multiple refresh tokens per user

## 8.2 Role-Based Access Control (RBAC)

### Role Hierarchy
```
super_admin > tpo_admin > tpo_employee > faculty_coordinator > recruiter > student
```

### Permission Matrix (from Frontend Evidence)

| Module | Super Admin | TPO Admin | TPO Employee | Faculty | Recruiter | Student |
|--------|------------|-----------|--------------|---------|-----------|---------|
| Students | V | V,C,E | V,C,E | V (dept) | - | Own |
| Companies | V | V,C,E | V,C,E | V | V (own) | - |
| Recruiters | V | V,C,E,A | V,C,E,A | - | Own | - |
| Postings | V | V,C,E | V,C,E | V | V (own co) | V (eligible) |
| Applications | V | V,E,Ex | V,E,Ex | - | V (own co) | Own |
| Events | V | V,C,E | V,C,E | V,E (att) | V (own) | V (own) |
| Offers | V | V,C,E | V,C,E | V (dept) | - | Own |
| Internships | V | V,C,E | V,C,E | V (dept) | V (own co) | Own |
| NOC | V | V,A | V,A | V,A (dept) | - | Own |
| Announcements | V | V,C,E | V,C,E | V | - | V (targeted) |
| Circulars | V | V,C,E | V,C,E | V | - | - |
| Policies | V | V,C,E | V | - | - | V |
| Reports | V | V,Ex | V,Ex | V (dept) | - | - |
| No Dues | V | V,A | V,A | - | - | Own |
| Users | V,C,E | - | - | - | - | - |
| Audit | V | - | - | - | - | - |
| Permissions | V,E | - | - | - | - | - |

Legend: V=View, C=Create, E=Edit, A=Approve, Ex=Export

### Route Guards
- Every API endpoint must check:
  1. Valid authentication token
  2. User role matches required role(s)
  3. Permission matrix allows the action
  4. Scope restrictions (department for faculty, company for recruiter, own records for student)

### Scope Restrictions
- **Faculty:** Can only see/approve for their own department
- **Recruiter:** Can only see their own company's data, PII is stripped
- **Student:** Can only access/modify their own records
- **TPO Employee:** Same as TPO Admin but permissions configurable via matrix

## 8.3 Middleware Stack
```
Request -> Rate Limiter -> Auth Middleware -> Role Middleware -> Permission Middleware -> Route Handler
```

---

# 9. SEARCH, FILTER, SORT, AND PAGINATION REQUIREMENTS

## 9.1 Standard Pagination Contract

```typescript
// Request
GET /api/resource?page=1&limit=20

// Response
{
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    total_pages: number,
    has_next: boolean,
    has_prev: boolean
  }
}
```

Default page size: 20 (configurable per endpoint)
Page size options: [10, 20, 50, 100]

## 9.2 Search, Filter, Sort by Module

### Students List
- **Search:** name, enrollment_number, email
- **Filters:** department, batch, verification_status, min_cgpa range
- **Sort:** name, enrollment_number, cgpa, profile_completion
- **Default Sort:** name ASC

### Companies List
- **Search:** name
- **Filters:** status (active/inactive), classification (preferred/normal/blacklisted)
- **Sort:** name, created_at
- **Default Sort:** name ASC

### Recruiters List
- **Search:** name, email, company name
- **Filters:** verification_status, company
- **Sort:** name, company
- **Default Sort:** name ASC

### Postings List
- **Search:** title, company_name, role_name
- **Filters:** status (draft/published/closed), type (job/internship/stipend_internship), academic_year
- **Sort:** created_at, title, company_name
- **Default Sort:** created_at DESC

### Opportunities (Student View)
- **Search:** title, company_name, role
- **Filters:** type, work_mode, locations (multi), domains (multi), min_stipend, max_ctc
- **Tabs:** eligible, all
- **Sort:** match_percentage DESC, created_at DESC

### Applications Pipeline
- **Search:** student name, enrollment_number, email
- **Filters:** current_stage, branch
- **Sort:** name, enrollment_number, cgpa, applied_at (all sortable with asc/desc toggle)
- **Default Sort:** applied_at DESC
- **Tab Filter:** by stage (all, applied, mock_round, shortlisted, etc.)

### Applications Management (Overview)
- **Search:** student name, enrollment, company
- **Filters:** posting (dropdown), stage (dropdown)

### Offers Management
- **Search:** student name, enrollment, company
- **Filters:** status chips (all/pending/accepted/joined/dnj/rejected/blocked), company dropdown
- **Sort:** offer_date DESC

### Events/Drives
- **Search:** title
- **Filters:** type, status
- **Sort:** date DESC

### Internships
- **Search:** student name, enrollment, company, role
- **Filters:** department, batch, type, status (tab-based)
- **Sort:** start_date DESC

### NOC Requests
- **Search:** student name, enrollment, company, noc_number
- **Filters:** status, department
- **Tab Filter:** pending_approval, company_verification, issued, all

### NDC Requests
- **Search:** student name, roll number, request ID
- **Tab Filter:** pending, returned, issued, all

### Announcements
- **Search:** title
- **Filters:** status, priority

### Circulars
- **Search:** company, role, template name
- **Filters:** type, status (templates tab)

### Audit Logs
- **Filters:** action, module, date_from, date_to
- **Sort:** created_at DESC

### Users (Super Admin)
- **Search:** name, email
- **Filters:** role, is_active
- **Sort:** name ASC

## 9.3 PostgreSQL Query Considerations
- Use GIN indexes for text search on frequently searched columns
- Use composite indexes for common filter combinations (e.g., tenant_id + status)
- Use partial indexes where appropriate (e.g., WHERE is_active = true)
- Consider `pg_trgm` extension for fuzzy search on names
- Use ILIKE for case-insensitive search or normalize to lowercase
- Implement cursor-based pagination for very large result sets (students, applications)
- Use CTEs for complex report queries
- Use materialized views for frequently-accessed aggregate stats (dashboard KPIs)

---

# 10. FILE AND MEDIA HANDLING

## 10.1 File Upload Sources

| Source Screen | File Type | Purpose |
|--------------|-----------|---------|
| Resume Management | PDF, DOC, DOCX | Student resume upload |
| NOC Request Wizard (Step 3) | PDF, DOC, DOCX | Offer letter upload |
| Portfolio Projects | Images, PDFs | Project attachments |
| Internship Showcase | PDF, Images | Proof/certificate upload |
| Internship Admin | PDF | Completion certificate |
| Profile Photo | JPG, PNG | Student profile picture |

## 10.2 Storage Approach
- **Recommended:** Object storage (S3-compatible: AWS S3, MinIO, or DigitalOcean Spaces)
- **File Naming:** `{tenant_id}/{module}/{entity_id}/{uuid}_{original_name}`
- **Metadata:** Store in PostgreSQL (file name, URL, size, mime type, uploaded_at)
- **Access Control:** Generate presigned URLs for downloads with expiration

## 10.3 File Constraints (Inferred)
| Type | Max Size | Accepted Formats |
|------|----------|-----------------|
| Resume | 5 MB | PDF, DOC, DOCX |
| Offer Letter | 5 MB | PDF, DOC, DOCX |
| Profile Photo | 2 MB | JPG, PNG, WEBP |
| Attachments | 10 MB | PDF, JPG, PNG |
| Certificate | 5 MB | PDF |

## 10.4 Backend APIs for File Handling
- POST `/api/upload` - Generic upload endpoint returning file URL
- GET `/api/files/:fileId` - Serve file or redirect to presigned URL
- DELETE `/api/files/:fileId` - Remove file from storage

## 10.5 AI Resume Scoring
- Resume uploads trigger async AI scoring job
- Score stored in resumes table (ai_score: 0-100)
- Frontend displays score with color coding (green >= 80, amber >= 60, red < 60)
- Scoring can be implemented via:
  - External AI API integration
  - Background job queue (Bull/BullMQ)
  - Webhook callback when score is ready

---

# 11. NOTIFICATIONS, ALERTS, AND MESSAGING

## 11.1 Notification Types (from Frontend)

| Type | Trigger | Priority | Target |
|------|---------|----------|--------|
| profile | Profile incomplete or needs update | high | Student |
| policy | Policy acceptance pending | high | Student |
| readiness | Career readiness action needed (mock interview, training) | medium | Student |
| placement | New company registered, resume score update, new opportunity | low-medium | Student/Admin |

## 11.2 Notification Generation Events
- Student profile < 80% → Generate profile notification
- Policy not accepted → Generate policy notification
- New posting published → Notify eligible students
- Offer created → Notify student
- NOC status changed → Notify student
- NDC status changed → Notify student
- Announcement published → Implicit via announcement system
- Application stage changed → Notify student
- Event published → Notify assigned students

## 11.3 Database Design
- `notifications` table (see entity 5.1.40)
- Server-side notification creation on trigger events
- Client polls or uses WebSocket for real-time updates

## 11.4 Read/Dismiss Behavior
- Mark individual as read
- Mark all as read
- Dismiss (delete) individual notification
- Unread count shown as badge on bell icon

---

# 12. STATE AND STATUS MAPPING

## 12.1 Verification Status
| Frontend Label | Backend Enum | Meaning | Modules |
|---------------|-------------|---------|---------|
| Pending | `pending` | Awaiting admin verification | Students, Recruiters |
| Verified | `verified` | Approved by admin | Students, Recruiters |
| Rejected | `rejected` | Rejected by admin | Students, Recruiters |

## 12.2 Application Stages
| Frontend Label | Backend Enum | Meaning | Allowed Transitions |
|---------------|-------------|---------|---------------------|
| Applied | `applied` | Initial submission | mock_round, rejected |
| Mock Round | `mock_round` | Awaiting mock test result | shortlisted (pass), rejected (fail) |
| Shortlisted | `shortlisted` | Selected for next round | test_scheduled, rejected |
| Test Scheduled | `test_scheduled` | Written test phase | interview, rejected |
| Interview | `interview` | Technical interview phase | hr_round, rejected |
| HR Round | `hr_round` | HR discussion phase | offer_released, rejected |
| Offer Released | `offer_released` | Offer extended | (terminal) |
| Rejected | `rejected` | Application rejected | (terminal) |

## 12.3 Mock Round Results
| Frontend Label | Backend Enum | Meaning |
|---------------|-------------|---------|
| Pending | `pending` | Not yet evaluated |
| Passed | `passed` | Cleared mock round |
| Failed | `failed` | Did not clear |

## 12.4 Offer Status
| Frontend Label | Backend Enum | Meaning | Transitions |
|---------------|-------------|---------|-------------|
| Pending | `pending_student_action` | Awaiting student response | accepted, rejected_by_admin |
| Accepted | `accepted` | Student accepted | joining confirmation |
| Joined | (joining_status) `joined` | Student joined company | (locked) |
| Did Not Join | (joining_status) `did_not_join` | Student didn't join | - |
| Rejected | `rejected_by_admin` | Admin rejected offer | - |

## 12.5 Posting Status
| Frontend Label | Backend Enum | Meaning |
|---------------|-------------|---------|
| Draft | `draft` | Not yet published |
| Published | `published` | Visible to students |
| Closed | `closed` | No longer accepting applications |

## 12.6 NOC Status
| Frontend Label | Backend Enum | Meaning |
|---------------|-------------|---------|
| Pending Faculty | `pending_faculty` | Awaiting faculty approval |
| Pending TPO | `pending_tpo` | Awaiting TPO approval |
| Pending Verification | `pending_company_verification` | Company needs verification |
| Approved | `approved` | Approved, awaiting issuance |
| Issued | `issued` | NOC certificate issued |
| Rejected | `rejected` | Request rejected |

## 12.7 NDC Status
| Frontend Label | Backend Enum | Meaning |
|---------------|-------------|---------|
| Pending Review | `pending_review` | Submitted, awaiting review |
| Under Review | `under_review` | Admin is reviewing |
| Approved | `approved` | Approved for issuance |
| Returned | `returned` | Returned for clarification |
| Rejected | `rejected` | Request rejected |
| Issued | `issued` | NDC certificate issued |

## 12.8 Event Status
| Frontend Label | Backend Enum | Meaning |
|---------------|-------------|---------|
| Draft | `draft` | Not yet published |
| Published | `published` | Visible to students |
| Ongoing | `ongoing` | Currently in progress |
| Completed | `completed` | Event finished |
| Cancelled | `cancelled` | Event cancelled |

## 12.9 Company Classification
| Frontend Label | Backend Enum | Meaning | Impact |
|---------------|-------------|---------|--------|
| Preferred | `preferred` | Priority partner | Highlighted in UI |
| Normal | `normal` | Standard company | Default |
| Blacklisted | `blacklisted` | Blocked company | Cannot create new postings |

## 12.10 Internship Type
| Frontend Label | Backend Enum |
|---------------|-------------|
| Paid | `paid` |
| Unpaid | `unpaid` |
| Stipend Based | `stipend_based` |

## 12.11 Internship Status
| Frontend Label | Backend Enum |
|---------------|-------------|
| Ongoing | `ongoing` |
| Completed | `completed` |
| Discontinued | `discontinued` |

## 12.12 Attendance Status
| Frontend Label | Backend Enum |
|---------------|-------------|
| Present | `present` |
| Absent | `absent` |
| Late | `late` |
| (unmarked) | `null` |

---

# 13. ERROR HANDLING CONTRACT

## 13.1 Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ],
    "request_id": "uuid-for-tracing"
  }
}
```

## 13.2 Error Codes

### Authentication Errors (401)
| Code | Message |
|------|---------|
| `INVALID_CREDENTIALS` | Invalid email or password |
| `TOKEN_EXPIRED` | Access token has expired |
| `TOKEN_INVALID` | Invalid or malformed token |
| `SESSION_EXPIRED` | Session has expired, please login again |

### Authorization Errors (403)
| Code | Message |
|------|---------|
| `INSUFFICIENT_PERMISSIONS` | You do not have permission to perform this action |
| `ROLE_NOT_ALLOWED` | Your role does not have access to this resource |
| `SCOPE_VIOLATION` | You can only access resources in your department/company |
| `ACCOUNT_INACTIVE` | Your account has been deactivated |
| `RECRUITER_NOT_VERIFIED` | Your recruiter account is pending verification |

### Validation Errors (400)
| Code | Message |
|------|---------|
| `VALIDATION_ERROR` | One or more fields have validation errors (details array) |
| `MISSING_REQUIRED_FIELD` | Required field is missing |
| `INVALID_FORMAT` | Field value format is invalid |
| `OUT_OF_RANGE` | Value is outside acceptable range |
| `INVALID_DATE_RANGE` | End date must be after start date |

### Business Rule Errors (409/422)
| Code | Message |
|------|---------|
| `PROFILE_INCOMPLETE` | Profile completion must be at least 80% |
| `POLICY_NOT_ACCEPTED` | Placement policy must be accepted first |
| `ALREADY_APPLIED` | You have already applied to this posting |
| `ACTIVE_OFFER_EXISTS` | Student already has an active offer |
| `OFFER_BLOCKED` | Applications are blocked due to active offer |
| `POSTING_CLOSED` | This posting is no longer accepting applications |
| `POSTING_NOT_PUBLISHED` | This posting has not been published yet |
| `INVALID_STAGE_TRANSITION` | Cannot move from current stage to target stage |
| `RECORD_LOCKED` | This record is locked and cannot be modified |
| `COMPANY_BLACKLISTED` | Cannot create postings for blacklisted companies |
| `DUPLICATE_OFFER` | An offer already exists for this student and posting |
| `NOC_INVALID_TRANSITION` | Invalid NOC status transition |

### Not Found Errors (404)
| Code | Message |
|------|---------|
| `RESOURCE_NOT_FOUND` | The requested resource was not found |
| `STUDENT_NOT_FOUND` | Student not found |
| `POSTING_NOT_FOUND` | Posting not found |
| `APPLICATION_NOT_FOUND` | Application not found |

### Server Errors (500)
| Code | Message |
|------|---------|
| `INTERNAL_ERROR` | An unexpected error occurred |
| `DATABASE_ERROR` | Database operation failed |
| `FILE_UPLOAD_ERROR` | File upload failed |
| `EXPORT_ERROR` | Report/data export failed |

---

# 14. NODE.JS BACKEND ARCHITECTURE RECOMMENDATION

## 14.1 Suggested Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ LTS |
| Framework | Express.js (pragmatic) or NestJS (enterprise) |
| Language | TypeScript 5.x |
| Database | PostgreSQL 16 |
| ORM | Prisma (recommended) or Knex.js + Objection.js |
| Validation | Zod (matches frontend, shared schemas possible) |
| Authentication | jsonwebtoken + bcryptjs |
| File Storage | AWS S3 SDK / MinIO SDK |
| Job Queue | BullMQ with Redis |
| Caching | Redis |
| Logging | Pino or Winston |
| Testing | Jest + Supertest |
| API Documentation | Swagger/OpenAPI via swagger-jsdoc |
| Migration | Prisma Migrate or Knex migrations |

## 14.2 Project Structure (Express.js)

```
src/
  config/
    database.ts        # PostgreSQL connection config
    auth.ts            # JWT config
    storage.ts         # S3/file storage config
    tenant.ts          # Multi-tenant config
    redis.ts           # Redis config
  middleware/
    auth.ts            # JWT verification
    role.ts            # Role checking
    permission.ts      # Permission matrix checking
    tenant.ts          # Tenant resolution
    validation.ts      # Request validation
    error-handler.ts   # Global error handler
    rate-limiter.ts    # Rate limiting
    audit.ts           # Audit logging
    pii-filter.ts      # PII stripping for recruiter responses
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.routes.ts
      auth.schema.ts
    students/
      student.controller.ts
      student.service.ts
      student.routes.ts
      student.schema.ts
    employers/
      company.controller.ts
      recruiter.controller.ts
      engagement.controller.ts
      employer.service.ts
      employer.routes.ts
    postings/
      posting.controller.ts
      posting.service.ts
      posting.routes.ts
      posting.schema.ts
    applications/
      application.controller.ts
      application.service.ts
      application.routes.ts
      pipeline.service.ts
      export.service.ts
    offers/
      offer.controller.ts
      offer.service.ts
      offer.routes.ts
    events/
      event.controller.ts
      event.service.ts
      event.routes.ts
      attendance.service.ts
      slot.service.ts
    noc/
      noc.controller.ts
      noc.service.ts
      noc.routes.ts
    internships/
      internship.controller.ts
      internship.service.ts
      internship.routes.ts
    announcements/
      announcement.controller.ts
      announcement.service.ts
      announcement.routes.ts
    circulars/
      circular.controller.ts
      circular.service.ts
      circular.routes.ts
    no-dues/
      no-dues.controller.ts
      no-dues.service.ts
      no-dues.routes.ts
    portfolios/
      portfolio.controller.ts
      portfolio.service.ts
      portfolio.routes.ts
    policies/
      policy.controller.ts
      policy.service.ts
      policy.routes.ts
    reports/
      report.controller.ts
      report.service.ts
      report.routes.ts
      report-generators/
        student-reports.ts
        employer-reports.ts
        placement-reports.ts
        ...
    notifications/
      notification.controller.ts
      notification.service.ts
      notification.routes.ts
    admin/
      admin.controller.ts
      admin.service.ts
      admin.routes.ts
    super-admin/
      super-admin.controller.ts
      super-admin.service.ts
      super-admin.routes.ts
  shared/
    types/              # Shared TypeScript interfaces
    utils/              # Utility functions
    errors/             # Custom error classes
    constants/          # Enums, constants
  jobs/
    resume-scoring.ts   # AI resume scoring job
    notification.ts     # Notification generation job
  prisma/
    schema.prisma       # Database schema
    migrations/         # Migration files
    seed.ts             # Seed data
  app.ts                # Express app setup
  server.ts             # Server entry point
```

## 14.3 Key Middleware Design

### Auth Middleware
```typescript
// Verify JWT, attach user to request
req.user = { id, tenant_id, role, email, department }
```

### Tenant Middleware
```typescript
// Resolve tenant from JWT or subdomain
// Attach tenant config to request
req.tenant = { id, config, slug }
```

### Permission Middleware
```typescript
// Check role_permissions table
// permit('postings', 'create') -> checks can_create for user's role on 'postings' module
```

### PII Filter Middleware
```typescript
// For recruiter routes, strip: email, mobile, personal_address, alternate_phone
// Applied at response level
```

### Audit Middleware
```typescript
// Log sensitive operations to audit_logs table
// Triggered on CREATE, UPDATE, DELETE for key entities
```

## 14.4 Environment Configuration

```env
# Server
NODE_ENV=development|staging|production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/sou_placement

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=<secret>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Storage
S3_BUCKET=sou-placement-files
S3_REGION=ap-south-1
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>

# AI Resume Scoring (optional)
AI_SCORING_API_URL=<url>
AI_SCORING_API_KEY=<key>

# Multi-tenant
DEFAULT_TENANT_SLUG=sou
```

---

# 15. POSTGRESQL DESIGN RECOMMENDATIONS

## 15.1 UUID vs Serial
- **Recommendation:** UUID (gen_random_uuid()) for all primary keys
- **Rationale:** Multi-tenant safe, no sequential enumeration, safe for API exposure, merge-friendly

## 15.2 Timestamp Handling
- Use `TIMESTAMPTZ` (timestamp with time zone) for all timestamps
- Store in UTC, convert to local time on frontend
- Use `NOW()` as default for created_at
- Use trigger or application logic for updated_at

## 15.3 Indexes
Critical indexes:
```sql
-- Multi-tenant scoping (ALL tables with tenant_id)
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);

-- Common filters
CREATE INDEX idx_students_dept_batch ON students(tenant_id, department, batch);
CREATE INDEX idx_students_verification ON students(tenant_id, verification_status);
CREATE INDEX idx_postings_status_type ON postings(tenant_id, status, type);
CREATE INDEX idx_applications_posting_stage ON applications(posting_id, current_stage);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_offers_student_status ON offers(student_id, status);
CREATE INDEX idx_events_date ON events(tenant_id, date);
CREATE INDEX idx_noc_student ON noc_requests(student_id);
CREATE INDEX idx_noc_status ON noc_requests(tenant_id, status);
CREATE INDEX idx_audit_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Text search
CREATE INDEX idx_students_name_trgm ON students USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_companies_name_trgm ON companies USING gin(name gin_trgm_ops);

-- Partial indexes
CREATE UNIQUE INDEX idx_resumes_default ON resumes(student_id) WHERE is_default = true;
CREATE INDEX idx_noc_number ON noc_requests(noc_number) WHERE noc_number IS NOT NULL;
```

## 15.4 Constraints
- All foreign keys with ON DELETE CASCADE or RESTRICT as appropriate
- CHECK constraints for enum fields
- UNIQUE constraints for business keys (enrollment_number per tenant, email per tenant)
- NOT NULL on all required fields

## 15.5 Audit Columns
Every table should have:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (with trigger)

## 15.6 Soft Delete Strategy
- **Recommended approach:** Use `is_active` boolean flag instead of physical delete
- Apply to: users, students, companies, recruiters
- For transactional records (applications, offers, NOC requests): No soft delete, use status fields instead
- For truly deletable items (projects, certifications, resumes): Physical delete is acceptable

## 15.7 Transaction Requirements
Operations requiring database transactions:
- Setting default resume (unset old + set new)
- Creating application (insert application + stage history + check constraints)
- Offer acceptance (update offer + set applications_blocked)
- Offer rejection (update offer + unblock applications)
- Publishing announcement (update announcement + bulk insert receipts)
- Bulk application stage move (update all + insert stage histories)
- NOC approval (update status + record approver + timestamps)

## 15.8 Row-Level Security (Optional)
For extra security, PostgreSQL RLS can enforce:
- Students can only read/write their own records
- Faculty can only read records from their department
- Recruiters can only read records from their company
- All queries scoped to tenant_id

---

# 16. GAPS, ASSUMPTIONS, AND OPEN QUESTIONS

## 16.1 Assumptions Made

1. **Authentication:** Frontend has no login/signup screens implemented; JWT-based auth is assumed based on route guards and role switching
2. **File Storage:** S3-compatible storage assumed; frontend shows file URLs but no upload implementation
3. **AI Resume Scoring:** Frontend shows AI scores but no scoring logic; assumed as external async service
4. **Email/SMS:** No email/SMS sending visible in frontend; assumed needed for password reset, notifications
5. **Real-time Updates:** No WebSocket usage visible; polling assumed for notifications
6. **Multi-tenant:** Tenant config system exists but only one default tenant configured; assumed single tenant for MVP
7. **Password Policy:** No password complexity rules visible in frontend
8. **Data Import:** No bulk import screens visible; assumed manual entry for MVP
9. **Mobile App:** No mobile-specific APIs needed; responsive web only
10. **Localization:** English only assumed; no i18n evidence
11. **Export Formats:** CSV and Excel mentioned; PDF export assumed for certificates and reports

## 16.2 Unclear Features

1. **Resume AI Scoring** - What model/service? Real-time or batch? Scoring criteria?
2. **Certificate Generation** - NOC and NDC certificates shown as downloadable PDFs; template design and generation approach not defined
3. **Interest Type Details** - 7 interest types listed but registration workflow is minimal; what happens after registration?
4. **Career Readiness Checklist** - Items shown but completion criteria not fully defined
5. **Faculty-Student Mapping** - How are faculty coordinators mapped to departments? Through user.department field?
6. **Recruiter Login Flow** - How does a recruiter first get credentials? Admin creates user + recruiter?
7. **Match Percentage Calculation** - Algorithm for student-posting match score not fully defined
8. **Report Drill-down** - Some reports show summary; drill-down navigation not clear
9. **Management Role** - Listed as read-only analytics; exact dashboard not fully implemented in frontend

## 16.3 Open Questions for Stakeholders

1. **User Onboarding:** How are student accounts created? SSO integration? Bulk import from university system?
2. **Password Reset:** Email-based or OTP-based? What email service?
3. **File Size Limits:** What are the actual file size limits for resumes, certificates, etc.?
4. **Resume Count Limit:** How many resumes can a student upload?
5. **Notification Delivery:** In-app only, or also email/SMS?
6. **Academic Year Rollover:** How does the system handle academic year transitions?
7. **Data Retention:** How long should audit logs, applications, and old postings be retained?
8. **Concurrent Users:** Expected peak concurrent users for capacity planning?
9. **Integration Requirements:** Any SSO (SAML/OAuth), ERP, or third-party system integrations?
10. **Certificate Templates:** Who designs the NOC/NDC PDF templates?
11. **Backup & Recovery:** RPO/RTO requirements?
12. **Compliance:** Any specific regulatory requirements (NAAC/NBA data formats)?
13. **Rate Limiting:** Specific rate limits for API endpoints?
14. **Session Management:** Maximum concurrent sessions per user?
15. **Data Migration:** Existing data to be migrated from any legacy system?

---

# 17. FINAL BACKEND DELIVERY CHECKLIST

## 17.1 Infrastructure Setup
- [ ] Node.js 20+ project initialization with TypeScript
- [ ] PostgreSQL 16 database provisioning
- [ ] Redis instance for caching and job queue
- [ ] S3-compatible storage bucket setup
- [ ] Environment configuration for dev/staging/prod
- [ ] CI/CD pipeline setup
- [ ] Docker containerization

## 17.2 Database
- [ ] Prisma schema with all 40 tables defined
- [ ] Initial migration
- [ ] Seed data for development (tenant, admin user, sample data)
- [ ] Index creation script
- [ ] Constraint verification

## 17.3 Core Modules (16 Modules)
- [ ] Authentication (login, refresh, logout, password reset)
- [ ] Student Management (profile CRUD, academic, skills, projects, certs, resumes, employment, policy, interests)
- [ ] Employer Management (companies CRUD, recruiters CRUD, engagements CRUD, classification)
- [ ] Posting Management (CRUD, publish/close lifecycle, eligible students)
- [ ] Application & ATS (apply, pipeline stages, mock round, bulk ops, export, exchange log)
- [ ] Offer Management (CRUD, accept, reject, joining, compliance, audit trail)
- [ ] Event & Drive Management (CRUD, panels, slot allocation, attendance, publish/complete)
- [ ] NOC Management (request wizard, faculty review, TPO review, company verification, certificate issuance)
- [ ] Internship Administration (CRUD, bulk status, issues, certificate tracking)
- [ ] Announcement Management (CRUD, publish/archive, receipts, consent tracking)
- [ ] Circular Management (templates CRUD, generate, duplicate, archive)
- [ ] No Dues Certificate (request, review, return, issue)
- [ ] Policy Repository (CRUD)
- [ ] Portfolio Management (CRUD projects, showcases, visibility)
- [ ] Reports & Analytics (25+ report types with filters and export)
- [ ] Notifications (CRUD, mark read, dismiss)

## 17.4 Cross-Cutting Concerns
- [ ] JWT authentication middleware
- [ ] Role-based authorization middleware
- [ ] Permission matrix middleware
- [ ] Tenant resolution middleware
- [ ] PII protection middleware (recruiter responses)
- [ ] Audit logging middleware
- [ ] Request validation middleware (Zod)
- [ ] Global error handler
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Request logging (Pino/Winston)
- [ ] Health check endpoint

## 17.5 Business Rules (10 Rules)
- [ ] BR-01: Profile completion 80% gate
- [ ] BR-02: Policy acceptance gate
- [ ] BR-03: Single active offer policy
- [ ] BR-04: Mock round gatekeeping
- [ ] BR-05: PII protection for recruiters
- [ ] BR-06: NOC dual approval chain
- [ ] BR-07: Posting status lifecycle
- [ ] BR-08: Offer record locking
- [ ] BR-09: Application uniqueness
- [ ] BR-10: Company blacklist impact

## 17.6 File Handling
- [ ] S3 upload service
- [ ] Presigned URL generation
- [ ] File type/size validation
- [ ] Resume upload endpoint
- [ ] Offer letter upload endpoint
- [ ] Certificate upload endpoint
- [ ] Profile photo upload endpoint
- [ ] File deletion

## 17.7 Background Jobs
- [ ] BullMQ setup with Redis
- [ ] AI resume scoring job
- [ ] Notification generation job
- [ ] Report generation job (for large exports)
- [ ] Certificate PDF generation job

## 17.8 Testing
- [ ] Unit tests for all service functions
- [ ] Integration tests for all API endpoints
- [ ] Business rule enforcement tests (60+ test cases from docs)
- [ ] Auth/permission tests
- [ ] PII filter tests
- [ ] Database constraint tests
- [ ] File upload tests
- [ ] Load testing for critical paths

## 17.9 Documentation
- [ ] OpenAPI/Swagger specification
- [ ] API authentication guide
- [ ] Error code reference
- [ ] Deployment guide
- [ ] Database schema documentation
- [ ] Environment variable reference

## 17.10 Security
- [ ] Input sanitization
- [ ] SQL injection prevention (via ORM)
- [ ] XSS prevention in stored content
- [ ] CSRF protection
- [ ] Helmet.js security headers
- [ ] Password hashing (bcrypt, cost factor 12)
- [ ] Rate limiting on auth endpoints
- [ ] Token blacklisting on logout
- [ ] Secure file upload validation

## 17.11 Production Readiness
- [ ] Error monitoring (Sentry or similar)
- [ ] Performance monitoring (APM)
- [ ] Database connection pooling
- [ ] Graceful shutdown handling
- [ ] Database backup automation
- [ ] Log aggregation
- [ ] SSL/TLS configuration
- [ ] CORS whitelist configuration
- [ ] Environment-specific config validation

---

**END OF DOCUMENT**

*This document was generated through comprehensive analysis of the SOU Training & Placement Portal frontend codebase. It is intended as a base document for backend API design, schema design, development estimation, and sprint planning using Node.js + PostgreSQL.*
