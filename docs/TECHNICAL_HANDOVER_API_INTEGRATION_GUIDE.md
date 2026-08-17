# Silver Oak University — Training & Placement Portal
## Technical Handover & API Integration Guide

**Document Version:** 1.0  
**Date:** March 2026  
**Prepared For:** Backend Engineering Team  
**Purpose:** Functional understanding, API contract reference, workflow mapping, and unit test cases for backend integration

---

# Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Layer — API Contract Reference](#2-service-layer--api-contract-reference)
3. [Type Definitions — Data Models](#3-type-definitions--data-models)
4. [Complete Workflow Catalogue](#4-complete-workflow-catalogue)
5. [Business Rules & Constraints](#5-business-rules--constraints)
6. [Role-Based Access Matrix](#6-role-based-access-matrix)
7. [Route Map](#7-route-map)
8. [Unit Test Cases](#8-unit-test-cases)
9. [Database Schema Recommendations](#9-database-schema-recommendations)
10. [Integration Checklist](#10-integration-checklist)

---

# 1. Architecture Overview

## Frontend Stack
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui design system
- **State Management:** React Context (roles), React Hook Form + Zod (forms), TanStack Query (ready for async)
- **Routing:** React Router v6 with lazy-loaded pages

## Data Access Pattern

```
Pages / Components
        ↓
  src/services/*Service.ts    ← Replace mock implementations here
        ↓
  src/data/mock*.ts           ← Current mock data (to be removed)
        ↓
  src/types/*.ts              ← Shared type contracts (keep as-is)
```

**Key Principle:** All UI components consume data exclusively through `src/services/`. No component imports mock data directly. Replace each service function's body with actual API calls (e.g., Supabase client, REST fetch) while keeping the same function signatures.

## Service Files to Integrate

| Service File | Domain | Key Functions |
|---|---|---|
| `studentService.ts` | Student profiles, academics, eligibility | `getCurrentStudent()`, `getAllStudents()`, `getEligibilityRules()` |
| `employerService.ts` | Companies, recruiters, engagements | `getCompanies()`, `getRecruiters()`, `addCompany()` |
| `postingService.ts` | Job/internship postings | `getPostings()`, `createPosting()`, `getPostingDetail()` |
| `applicationService.ts` | Applications, ATS pipeline | `getApplications()`, `moveToStage()`, `bulkAction()` |
| `offerService.ts` | Offers, joining, compliance | `getOffers()`, `acceptOffer()`, `rejectOffer()` |
| `driveService.ts` | Campus drives, scheduling | `getDrives()`, `createDrive()`, `markAttendance()` |
| `internshipService.ts` | Internship records, certificates | `getInternships()`, `importFromOffers()` |
| `nocService.ts` | NOC requests, approval chain | `getNOCRequests()`, `approveNOC()`, `issueNOC()` |
| `noDuesService.ts` | No Dues Certificates | `getStudentRequests()`, `reviewRequest()`, `issueNDC()` |
| `announcementService.ts` | Announcements, consent | `getAnnouncements()`, `createAnnouncement()`, `markConsent()` |
| `circularService.ts` | Circular templates | `getTemplates()`, `generateCircular()` |
| `portfolioService.ts` | Student portfolios | `getPortfolio()`, `updateShowcase()` |
| `securityService.ts` | Audit logs, user management | `getAuditLogs()`, `getUsers()`, `updatePermissions()` |

---

# 2. Service Layer — API Contract Reference

Each service function below represents an API endpoint to be implemented. The function signature IS the API contract.

## 2.1 Student Service

```typescript
// GET /api/students/me
getCurrentStudent(): Promise<StudentMaster>

// GET /api/students/:id/academic
getAcademicProfile(studentId: string): Promise<AcademicProfile>

// GET /api/students/:id/skills
getSkillsProfile(studentId: string): Promise<SkillsProfile>

// GET /api/students/:id/projects
getProjects(studentId: string): Promise<Project[]>

// GET /api/students/:id/resumes
getResumes(studentId: string): Promise<Resume[]>

// GET /api/students/:id/interests
getInterests(studentId: string): Promise<InterestRegistration[]>

// GET /api/students/:id/eligibility
getEligibilityChecks(studentId: string): Promise<EligibilityCheck[]>

// GET /api/students/:id/readiness
getReadinessChecklist(studentId: string): Promise<CareerReadinessItem[]>

// GET /api/students/:id/employment
getCurrentEmployment(studentId: string): Promise<CurrentEmployment>

// GET /api/admin/students
getAllStudents(): Promise<StudentMaster[]>

// GET /api/admin/students/stats
getAdminStats(): Promise<AdminStats>

// GET /api/admin/eligibility-rules
getEligibilityRules(): Promise<EligibilityRule[]>

// POST /api/admin/students/eligible
getEligibleStudents(branches: string[], batchYears: string[], minCgpa: number, maxBacklogs: number): Promise<StudentPoolEntry[]>
```

## 2.2 Employer Service

```typescript
// GET /api/companies
getCompanies(): Promise<Company[]>

// GET /api/companies/:id
getCompanyDetail(companyId: string): Promise<Company>

// POST /api/companies
addCompany(data: Partial<Company>): Promise<Company>

// PUT /api/companies/:id
updateCompany(companyId: string, data: Partial<Company>): Promise<Company>

// GET /api/companies/:id/recruiters
getRecruiters(companyId?: string): Promise<Recruiter[]>

// POST /api/recruiters
addRecruiter(data: Partial<Recruiter>): Promise<Recruiter>

// GET /api/companies/:id/engagements
getEngagements(companyId: string): Promise<Engagement[]>

// POST /api/companies/:id/engagements
addEngagement(companyId: string, data: Partial<Engagement>): Promise<Engagement>
```

## 2.3 Posting Service

```typescript
// GET /api/postings
getPostings(filters?: PostingFilters): Promise<Posting[]>

// GET /api/postings/:id
getPostingDetail(postingId: string): Promise<Posting>

// POST /api/postings
createPosting(data: Partial<Posting>): Promise<Posting>

// PUT /api/postings/:id
updatePosting(postingId: string, data: Partial<Posting>): Promise<Posting>

// PATCH /api/postings/:id/status
updatePostingStatus(postingId: string, status: PostingStatus): Promise<void>
```

## 2.4 Application Service

```typescript
// POST /api/applications
applyToPosting(postingId: string, resumeId: string): Promise<Application>

// GET /api/applications/me
getMyApplications(studentId: string): Promise<Application[]>

// GET /api/admin/applications?postingId=xxx
getApplicationsByPosting(postingId: string): Promise<Application[]>

// PATCH /api/admin/applications/:id/stage
moveToStage(applicationId: string, stage: ApplicationStage): Promise<void>

// PATCH /api/admin/applications/:id/mock-result
setMockResult(applicationId: string, result: 'passed' | 'failed'): Promise<void>

// POST /api/admin/applications/bulk-action
bulkAction(applicationIds: string[], action: BulkActionType, data?: any): Promise<void>

// POST /api/admin/applications/export
exportCandidates(postingId: string, fields: string[], format: 'excel' | 'pdf'): Promise<Blob>
```

## 2.5 Offer Service

```typescript
// GET /api/offers
getOffers(filters?: OfferFilters): Promise<Offer[]>

// POST /api/admin/offers
createOffer(data: Partial<Offer>): Promise<Offer>

// PATCH /api/offers/:id/accept
acceptOffer(offerId: string): Promise<void>    // Student action

// PATCH /api/admin/offers/:id/reject
rejectOffer(offerId: string, reason: string): Promise<void>    // Admin only

// PATCH /api/admin/offers/:id/joining
confirmJoining(offerId: string, data: JoiningData): Promise<void>
```

## 2.6 NOC Service

```typescript
// GET /api/noc/me
getStudentNOCs(studentId: string): Promise<NOCRequest[]>

// POST /api/noc
submitNOCRequest(data: Partial<NOCRequest>): Promise<NOCRequest>

// GET /api/admin/noc
getAllNOCRequests(): Promise<NOCRequest[]>

// PATCH /api/admin/noc/:id/approve
approveNOC(requestId: string): Promise<void>

// PATCH /api/admin/noc/:id/reject
rejectNOC(requestId: string, remarks: string): Promise<void>

// POST /api/admin/noc/:id/issue
issueNOC(requestId: string): Promise<{ noc_number: string }>

// GET /api/faculty/noc
getFacultyNOCRequests(department: string): Promise<NOCRequest[]>
```

## 2.7 No Dues Certificate Service

```typescript
// GET /api/no-dues/me
getStudentNDCRequests(studentId: string): Promise<NoDuesRequest[]>

// POST /api/no-dues
submitNDCRequest(data: Partial<NoDuesRequest>): Promise<NoDuesRequest>

// GET /api/admin/no-dues
getAllNDCRequests(): Promise<NoDuesRequest[]>

// PATCH /api/admin/no-dues/:id/approve-issue
approveAndIssueNDC(requestId: string): Promise<{ ndc_number: string }>

// PATCH /api/admin/no-dues/:id/return
returnNDCRequest(requestId: string, remarks: string): Promise<void>

// PATCH /api/admin/no-dues/:id/reject
rejectNDCRequest(requestId: string): Promise<void>
```

## 2.8 Drive Service

```typescript
// GET /api/drives
getDrives(): Promise<Drive[]>

// POST /api/admin/drives
createDrive(data: Partial<Drive>): Promise<Drive>

// POST /api/admin/drives/:id/slots
allocateSlots(driveId: string, slots: Slot[]): Promise<void>

// POST /api/admin/drives/:id/attendance
markBulkAttendance(driveId: string, studentIds: string[], status: 'present' | 'absent'): Promise<void>
```

## 2.9 Internship Service

```typescript
// GET /api/internships
getInternships(filters?: InternshipFilters): Promise<Internship[]>

// POST /api/admin/internships
addInternship(data: Partial<Internship>): Promise<Internship>

// POST /api/admin/internships/import-from-offers
importFromOffers(offerIds: string[]): Promise<Internship[]>

// PATCH /api/admin/internships/:id/certificate
updateCertificateStatus(internshipId: string, status: CertificateStatus): Promise<void>
```

## 2.10 Announcement Service

```typescript
// GET /api/announcements
getAnnouncements(audience?: AudienceFilter): Promise<Announcement[]>

// POST /api/admin/announcements
createAnnouncement(data: Partial<Announcement>): Promise<Announcement>

// PATCH /api/announcements/:id/read
markAsRead(announcementId: string, studentId: string): Promise<void>

// PATCH /api/announcements/:id/consent
markConsent(announcementId: string, studentId: string): Promise<void>
```

## 2.11 Portfolio Service

```typescript
// GET /api/portfolio/:studentId
getPortfolio(studentId: string): Promise<Portfolio>

// PUT /api/portfolio/:studentId
updatePortfolio(studentId: string, data: Partial<Portfolio>): Promise<Portfolio>

// PATCH /api/portfolio/:studentId/publish
togglePublish(studentId: string, published: boolean): Promise<void>
```

## 2.12 Security & Audit Service

```typescript
// GET /api/admin/audit-log
getAuditLogs(filters?: AuditFilters): Promise<AuditLogEntry[]>

// GET /api/admin/users
getUsers(): Promise<SystemUser[]>

// POST /api/admin/users
createUser(data: Partial<SystemUser>): Promise<SystemUser>

// PATCH /api/admin/users/:id/status
updateUserStatus(userId: string, active: boolean): Promise<void>

// GET /api/admin/permissions
getPermissionsMatrix(): Promise<PermissionsMatrix>

// PUT /api/admin/permissions
updatePermissions(matrix: PermissionsMatrix): Promise<void>
```

---

# 3. Type Definitions — Data Models

All TypeScript interfaces are defined in `src/types/`. These serve as the single source of truth for both frontend and database schema design.

| File | Key Types |
|---|---|
| `student.ts` | `StudentMaster`, `AcademicProfile`, `SkillsProfile`, `Project`, `Resume`, `InterestRegistration`, `EligibilityCheck`, `EligibilityRule`, `CurrentEmployment` |
| `application.ts` | `Application`, `ApplicationStage`, `StageHistoryEntry`, `RecruiterFeedback` |
| `offer.ts` | `Offer`, `OfferStatus`, `JoiningStatus`, `AuditEntry` |
| `internship.ts` | `Internship`, `InternshipStatus`, `CertificateStatus` |
| `noc.ts` | `NOCRequest`, `NOCStatus`, `NOCType` |
| `noDues.ts` | `NoDuesRequest`, `NoDuesStatus`, `NoDuesExitReason` |
| `announcement.ts` | `Announcement`, `AudienceType`, `ConsentRecord` |
| `circular.ts` | `CircularTemplate`, `GeneratedCircular` |
| `event.ts` | `DriveEvent`, `Slot`, `AttendanceRecord` |
| `portfolio.ts` | `Portfolio`, `PortfolioProject`, `InternshipShowcase` |

**Important:** Do NOT modify these types without coordinating with the frontend team. They are the shared contract.

---

# 4. Complete Workflow Catalogue

## WF-01: Student Registration & Profile Completion
```
Student signs up → Onboarding checklist shown → Fills personal info → 
Adds academic records → Adds skills → Uploads resume → 
Profile completion % auto-calculated → Must reach ≥80% to participate
```

## WF-02: Policy Acceptance
```
Student visits /policy → Reads policy document → Checks consent checkbox →
Acceptance timestamped → Required before any application
```

## WF-03: Interest Registration
```
TPO publishes interest categories (Placement, Summer Intern, etc.) →
Student registers interest for applicable categories →
Admin views interest summary by batch/department
```

## WF-04: Job/Internship Posting Lifecycle
```
TPO creates posting (Draft) → Sets eligibility criteria → Publishes →
Students see in /opportunities if eligible → Application window opens →
TPO closes posting → Status: Closed/Cancelled
```

## WF-05: Application & ATS Pipeline
```
Student applies → Status: Applied → 
TPO conducts Mock Round → Result: Passed/Failed →
If Passed → Shortlisted (shared with recruiter) →
Test Scheduled → Interview → HR Round → Offer Released
If Failed at any stage → Rejected (with remarks)
```

## WF-06: Offer Acceptance & Joining
```
TPO creates offer → Student sees in Applications →
Student accepts offer → applications_blocked = true (blocks all future applications) →
TPO verifies joining → Status: Joined / Did Not Join →
Record locked after verification
```

## WF-07: NOC Request & Approval
```
Student submits NOC request → 
Faculty Coordinator reviews → Approves/Returns →
TPO Admin reviews → Approves/Returns/Rejects →
If approved → NOC issued with unique number (NOC/YYYY/DEPT/XXXX)
For self-sourced: Company verification step added before issuance
```

## WF-08: No Dues Certificate (NDC)
```
Student fills NDC form (profile pre-populated) →
Selects exit reason: Employment | Family Business | Higher Studies →
Fills conditional fields → Accepts declaration → Submits →
TPO Admin reviews → 
  Action: Approve & Issue (generates NDC number) |
  Action: Return for Clarification (with remarks) |
  Action: Reject →
Student can download issued NDC certificate
```

## WF-09: Campus Drive
```
TPO creates drive → Associates company + posting →
Allocates time slots → Students register →
Drive day: Bulk attendance marking →
Results fed into application pipeline
```

## WF-10: Internship Administration
```
Offer accepted (internship type) → Import to internship records →
Track: Start date, end date, stipend, mentor →
Monitor certificate submission →
Verify completion certificate
```

## WF-11: Portfolio Showcase
```
Student adds projects → Adds certifications → Adds internship highlights →
Toggles portfolio to "Published" → Shareable read-only link generated →
Admin monitors completion rates
```

## WF-12: Announcement & Consent
```
TPO creates announcement → Selects audience (All / Batch / Department / Posting-specific) →
Students see notification → Read + Consent tracked →
Admin views delivery metrics
```

## WF-13: Circular Generation
```
TPO creates/selects template → Associates with posting/company →
Auto-populates fields → Generates circular document →
Can be exported/shared
```

## WF-14: Candidate Data Export (PII-Protected)
```
TPO opens export dialog → Selects fields →
PII fields (email, phone, address) are BLOCKED and unselectable →
Exports in Excel/PDF → Exchange log recorded
```

## WF-15: Company & Recruiter Management
```
TPO adds company → Classifies (Dream/Super Dream/Regular/Startup) →
Tags company → Adds recruiters → Tracks engagement timeline →
Recruiter contact visible only to TPO (PII protection)
```

## WF-16: Policy Repository Management
```
TPO Admin adds policy → Fills: Title, Category, Content (Markdown), Version →
Policy appears in repository → Can be edited with version tracking →
Students access via Policy Acceptance page
```

## WF-17: User & Role Management (Super Admin)
```
Super Admin creates user → Assigns role + department →
Configures permission matrix (V/C/E/A/Ex per module) →
Can deactivate users → All actions logged in audit trail
```

---

# 5. Business Rules & Constraints

These MUST be enforced server-side. Do not rely on frontend-only validation.

### BR-01: Profile Completion Gate
- Students with `profile_completion_percentage < 80` **cannot** apply to any posting
- Cannot register interest
- Cannot appear in eligible student lists

### BR-02: Single Active Offer Policy
- When a student accepts an offer: `applications_blocked = true`
- All "Apply" buttons disabled system-wide for that student
- Only TPO Admin can override via `admin_override_enabled`
- Student cannot hold multiple active offers

### BR-03: Mock Round Gatekeeping
- Every applicant MUST pass Mock Round before moving to Shortlisted
- `mock_round_result = 'passed'` required to progress
- Failed students are terminal-rejected

### BR-04: PII Protection
- **Never expose** to recruiters: student email, phone, permanent address
- Export dialog: these fields are permanently disabled/blocked
- Candidate detail sheet: PII section hidden for recruiter role
- This must be enforced at the API level (don't return PII fields for recruiter-role tokens)

### BR-05: Offer Management Rights
- Students can **only Accept** offers
- **Only TPO Admin** can Reject offers or mark Did Not Join
- Rejection requires mandatory reason selection

### BR-06: Record Locking
- Offers marked as "Joined" become read-only
- Selection database records are auto-derived and non-editable
- Posted postings cannot be deleted (only closed/cancelled)

### BR-07: NOC Issuance Prerequisites
- Student must have "Selected" status (active offer)
- For self-sourced companies: company verification must be completed first
- Unique NOC number format: `NOC/YYYY/DEPT/XXXX`

### BR-08: NDC Submission Rules
- Only one active NDC request per student (pending/returned/approved)
- Profile data is pre-populated and read-only in the form
- Declaration acceptance is mandatory
- NDC number format: `NDC/YYYY/INST/XXXX`

### BR-09: Announcement Consent
- Consent is timestamped and immutable once given
- Read status tracked separately from consent
- Consent is mandatory for certain announcement types

### BR-10: Audit Trail
- All create, update, delete, and status-change operations must be logged
- Log entry: `{ user_id, action, entity_type, entity_id, timestamp, details }`
- Audit log is append-only (no edits/deletes)

---

# 6. Role-Based Access Matrix

| Module | Super Admin | TPO Admin | TPO Employee | Faculty | Recruiter | Student |
|---|---|---|---|---|---|---|
| Student Profiles | — | V, E | V | V (dept) | — | V, E (own) |
| Eligibility Rules | — | V, C, E | V | V | — | V (own) |
| Companies | — | V, C, E | V | V | V (own) | — |
| Recruiters | — | V, C, E | V | — | V, E (own) | — |
| Postings | — | V, C, E | V, C | V | V (assigned) | V (eligible) |
| Applications | — | V, E, A | V | V (dept) | V (assigned) | V, C (own) |
| Offers | — | V, C, E, A | V | V (dept) | — | V, A (own) |
| Drives | — | V, C, E | V, C | V (dept) | V (assigned) | V |
| Internships | — | V, C, E | V | V (dept) | — | V (own) |
| NOC | — | V, A | V | V, A (dept) | — | V, C (own) |
| No Dues (NDC) | — | V, A | V | — | — | V, C (own) |
| Announcements | — | V, C | V, C | V | — | V |
| Circulars | — | V, C, E | V | V | — | — |
| Portfolio | — | V | V | V (dept) | — | V, C, E (own) |
| Policies | — | V, C, E | V | — | — | V |
| Reports | — | V, Ex | V | V (dept), Ex | — | — |
| User Mgmt | V, C, E | — | — | — | — | — |
| Roles & Perms | V, E | — | — | — | — | — |
| Audit Log | V | — | — | — | — | — |

**Legend:** V=View, C=Create, E=Edit, A=Approve, Ex=Export

---

# 7. Route Map

## Student Routes
| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Overview stats, profile completion, eligibility |
| `/profile` | Profile | Personal, academic, skills editing |
| `/resumes` | Resumes | Upload/manage multiple resumes |
| `/portfolio` | Portfolio | Showcase projects, certs, internships |
| `/opportunities` | Opportunities | Browse eligible postings |
| `/opportunities/:id` | Opportunity Detail | Posting details + apply |
| `/applications` | My Applications | Track application status, offers, internships |
| `/noc` | NOC Dashboard | NOC request management |
| `/no-dues` | No Dues Certificate | NDC request and tracking |
| `/drives` | Student Drives | View campus drive schedule |
| `/announcements` | Announcements | Read announcements, give consent |
| `/policy` | Policy Acceptance | Read and accept placement policy |

## TPO Admin Routes
| Route | Page | Description |
|---|---|---|
| `/admin` | Admin Dashboard | Institutional stats overview |
| `/admin/students` | Student Hub | 6-tab hub: List, Verification, Eligibility, Interest, Portfolio, Selection DB |
| `/admin/employers` | Employer Hub | Companies + Recruiters tabs |
| `/admin/companies/:id` | Company Detail | Company profile + engagement timeline |
| `/admin/postings` | Postings Management | All postings with filters |
| `/admin/postings/create` | Create Posting | Multi-field posting form |
| `/admin/postings/:id` | Posting Detail | Full posting view |
| `/admin/postings/:id/edit` | Edit Posting | Edit existing posting |
| `/admin/interests` | Interest Lists | Interest registration summary |
| `/admin/applications` | Applications Management | Applications by posting |
| `/admin/applications/:id` | Application Pipeline | ATS pipeline with bulk actions |
| `/admin/noc` | NOC Management | Review/approve NOC requests |
| `/admin/no-dues` | No Dues Management | Review/issue NDC requests |
| `/admin/drives` | Drives Management | Create/manage campus drives |
| `/admin/offers` | Offers Management | Offer lifecycle management |
| `/admin/internships` | Internships Management | Internship records + certificates |
| `/admin/announcements` | Announcement Management | Create/broadcast announcements |
| `/admin/circulars` | Circulars Management | Template management |
| `/admin/policies` | Policy Repository | Add/edit policy documents |
| `/admin/reports` | Reports & Analytics | 25+ report views |

## Faculty Routes
| Route | Page |
|---|---|
| `/faculty` | Faculty Dashboard |
| `/faculty/students` | Department Students |
| `/faculty/employers` | Employer Directory |
| `/faculty/noc-approvals` | NOC Approvals |
| `/faculty/drives` | Department Drives |
| `/faculty/offers` | Department Offers |
| `/faculty/internships` | Department Internships |
| `/faculty/announcements` | Announcements |
| `/faculty/circulars` | Circulars |

## Recruiter Routes
| Route | Page |
|---|---|
| `/recruiter` | Recruiter Dashboard |
| `/recruiter/profile` | Recruiter Profile |
| `/recruiter/company` | Company View |
| `/recruiter/pipeline` | Recruitment Pipeline |
| `/recruiter/drives` | Assigned Drives |
| `/recruiter/internships` | Internships |

## Super Admin Routes
| Route | Page |
|---|---|
| `/super-admin` | Dashboard (Users, Roles, Audit) |

---

# 8. Unit Test Cases

## 8.1 Student Profile Module

| # | Test Case | Expected Result |
|---|---|---|
| TC-01 | Student with all fields filled → check profile completion | Returns 100% |
| TC-02 | Student missing 3 required fields → check profile completion | Returns < 80% |
| TC-03 | Student with 79% completion tries to apply | Application rejected with error |
| TC-04 | Student with 80% completion applies | Application accepted |
| TC-05 | Upload resume > 5MB | Rejected with file size error |
| TC-06 | Upload resume with valid PDF | Resume saved, AI score calculated |

## 8.2 Application & ATS Pipeline

| # | Test Case | Expected Result |
|---|---|---|
| TC-07 | Student applies to eligible posting | Application created with status "Applied" |
| TC-08 | Student applies to ineligible posting (CGPA too low) | Application rejected |
| TC-09 | Move student from Applied → Mock Round → result: Passed | Student progresses to Shortlisted |
| TC-10 | Move student from Applied → Mock Round → result: Failed | Student moved to Rejected |
| TC-11 | Try to skip Mock Round (Applied → Shortlisted directly) | Rejected — Mock Round mandatory |
| TC-12 | Bulk select 5 students → Move to Interview | All 5 moved successfully |
| TC-13 | Bulk select with mixed stages → Move to next stage | Only eligible students moved, others skipped |
| TC-14 | Student with `applications_blocked = true` tries to apply | Application rejected |

## 8.3 Offer Management

| # | Test Case | Expected Result |
|---|---|---|
| TC-15 | Student accepts offer | `applications_blocked = true`, status = Accepted |
| TC-16 | Student tries to accept second offer | Rejected — already has active offer |
| TC-17 | TPO Admin rejects offer without reason | Rejected — reason is mandatory |
| TC-18 | TPO Admin rejects offer with reason | Offer rejected, student unblocked |
| TC-19 | TPO Admin marks joining confirmed | Status = Joined, record locked |
| TC-20 | Try to edit a locked (Joined) offer | Edit rejected |
| TC-21 | Student tries to reject offer directly | Action not available — only admin can reject |

## 8.4 NOC Workflow

| # | Test Case | Expected Result |
|---|---|---|
| TC-22 | Student submits NOC request | Status: pending_faculty |
| TC-23 | Faculty approves → Status | Changes to pending_tpo |
| TC-24 | TPO approves → Issue NOC | NOC number generated, status: issued |
| TC-25 | TPO returns for clarification without remarks | Rejected — remarks mandatory |
| TC-26 | TPO returns with remarks | Status: returned, remarks saved |
| TC-27 | Self-sourced company NOC without verification | Blocked — verification required first |
| TC-28 | NOC number uniqueness | No duplicate NOC numbers in system |

## 8.5 No Dues Certificate (NDC)

| # | Test Case | Expected Result |
|---|---|---|
| TC-29 | Student submits NDC with exit_reason = employment, all fields filled | Request created, status: pending_review |
| TC-30 | Student submits NDC without company_name (employment) | Validation error |
| TC-31 | Student submits NDC for family_business without business_address | Validation error |
| TC-32 | Student submits NDC for higher_studies without institution_name | Validation error |
| TC-33 | Student submits NDC without accepting declaration | Validation error |
| TC-34 | Student with existing pending NDC tries to submit another | Rejected — one active request limit |
| TC-35 | Admin approves & issues NDC | NDC number generated, status: issued |
| TC-36 | Admin returns NDC without remarks | Rejected — remarks mandatory |
| TC-37 | Admin returns NDC with remarks | Status: returned, remarks visible to student |

## 8.6 PII Protection

| # | Test Case | Expected Result |
|---|---|---|
| TC-38 | Recruiter calls GET /api/students/:id | Response excludes email, phone, address |
| TC-39 | Export candidates with recruiter token | PII fields not available in export |
| TC-40 | Admin calls GET /api/students/:id | Full student data returned including PII |
| TC-41 | Export candidates with admin token, PII fields selected | PII fields included in export |

## 8.7 Role-Based Access

| # | Test Case | Expected Result |
|---|---|---|
| TC-42 | Student tries to access /admin/* routes | 403 Forbidden |
| TC-43 | Faculty tries to create a posting | 403 Forbidden |
| TC-44 | Recruiter tries to access student PII endpoint | 403 Forbidden |
| TC-45 | Super Admin accesses audit log | Full access granted |
| TC-46 | TPO Employee with limited permissions tries to approve offer | 403 based on permission matrix |

## 8.8 Announcements

| # | Test Case | Expected Result |
|---|---|---|
| TC-47 | Create announcement for specific batch | Only students in that batch see it |
| TC-48 | Student marks announcement as read | Read timestamp recorded |
| TC-49 | Student gives consent | Consent timestamp recorded, immutable |
| TC-50 | Try to revoke consent | Action not available |

## 8.9 Drive & Scheduling

| # | Test Case | Expected Result |
|---|---|---|
| TC-51 | Create drive with overlapping slots | Validation error — no time overlap |
| TC-52 | Mark attendance for 50 students | All records saved, stats updated |
| TC-53 | Student registers for drive | Registration recorded |

## 8.10 Data Integrity

| # | Test Case | Expected Result |
|---|---|---|
| TC-54 | Delete company with active postings | Blocked — has dependent records |
| TC-55 | Delete posting with active applications | Blocked — must close first |
| TC-56 | Deactivate user with active session | Session invalidated |
| TC-57 | Concurrent offer acceptance (race condition) | Only one succeeds, other gets conflict error |

---

# 9. Database Schema Recommendations

## Core Tables

```
students              — StudentMaster fields
academic_profiles     — One-to-one with students
skills_profiles       — One-to-one with students
projects              — Many-to-one with students
resumes               — Many-to-one with students
certifications        — Many-to-one with students
interest_registrations — Many-to-one with students

companies             — Company profiles
recruiters            — Many-to-one with companies
company_engagements   — Many-to-one with companies
company_tags          — Many-to-many (companies ↔ tags)

postings              — Job/internship postings
posting_eligibility   — One-to-one with postings (criteria)

applications          — Many-to-one with postings & students
stage_history         — Many-to-one with applications (audit trail)
mock_round_results    — One-to-one with applications

offers                — Many-to-one with applications
offer_audit_log       — Many-to-one with offers

internships           — Many-to-one with offers
internship_certificates — One-to-one with internships

noc_requests          — Many-to-one with students
no_dues_requests      — Many-to-one with students

drives                — Campus drive events
drive_slots           — Many-to-one with drives
drive_attendance      — Many-to-many (drives ↔ students)

announcements         — Broadcast messages
announcement_reads    — Many-to-many (announcements ↔ students)
announcement_consents — Many-to-many (announcements ↔ students)

circular_templates    — Reusable templates
generated_circulars   — Instances from templates

portfolios            — One-to-one with students
portfolio_projects    — Many-to-one with portfolios
portfolio_showcases   — Many-to-one with portfolios

policy_documents      — Policy repository

system_users          — All portal users
user_roles            — Role assignments (separate table, NOT on users)
permissions_matrix    — Module × Role × Permission grid
audit_log             — Append-only system activity log
```

## Key Indexes
- `students.roll_number` — UNIQUE
- `students.email` — UNIQUE
- `applications(student_id, posting_id)` — UNIQUE (prevent duplicate applications)
- `offers.student_id` WHERE status = 'accepted' — partial UNIQUE (single active offer)
- `noc_requests.noc_number` — UNIQUE
- `no_dues_requests.ndc_number` — UNIQUE
- `audit_log.created_at` — for time-range queries

## Row-Level Security (RLS) Guidelines
- Students can only read/write their own records
- Faculty can read records within their department only
- Recruiters can read only applications assigned to their company's postings
- Recruiter queries MUST exclude PII columns (email, phone, address)
- TPO Admin has full read/write on all placement data
- Super Admin has full access to system configuration tables
- User roles stored in a **separate `user_roles` table** (never on the users table)

---

# 10. Integration Checklist

### Phase 1: Authentication & Core Data
- [ ] Set up Supabase project with auth (email/password + Google SSO)
- [ ] Create `students`, `academic_profiles`, `skills_profiles` tables
- [ ] Implement `studentService` API integration
- [ ] Set up RLS policies for student data
- [ ] File storage for resumes and documents

### Phase 2: Employer & Postings
- [ ] Create `companies`, `recruiters`, `engagements` tables
- [ ] Create `postings`, `posting_eligibility` tables
- [ ] Implement `employerService` and `postingService`
- [ ] Eligibility engine (server-side calculation)

### Phase 3: Applications & ATS
- [ ] Create `applications`, `stage_history`, `mock_round_results` tables
- [ ] Implement `applicationService` with stage transitions
- [ ] Enforce Mock Round gatekeeping server-side
- [ ] PII filtering middleware for recruiter role

### Phase 4: Offers & Compliance
- [ ] Create `offers`, `offer_audit_log` tables
- [ ] Implement Single Active Offer constraint
- [ ] `applications_blocked` enforcement
- [ ] Record locking for finalized offers

### Phase 5: NOC, NDC & Documents
- [ ] Create `noc_requests`, `no_dues_requests` tables
- [ ] Implement approval chain (Faculty → TPO)
- [ ] Unique number generation (NOC/NDC)
- [ ] PDF certificate generation (Edge Function)

### Phase 6: Drives, Internships & Communication
- [ ] Create `drives`, `internships`, `announcements` tables
- [ ] Bulk attendance API
- [ ] Import-from-offers internship creation
- [ ] Announcement consent tracking

### Phase 7: Reporting, Security & Audit
- [ ] Create `audit_log`, `user_roles`, `permissions_matrix` tables
- [ ] Implement audit logging middleware
- [ ] Report data aggregation queries
- [ ] CSV/PDF export Edge Functions
- [ ] Email notification Edge Functions

### Phase 8: Cleanup
- [ ] Remove all `src/data/mock*.ts` files
- [ ] Remove `ScenarioSwitcher` components from 5 pages
- [ ] Remove `RoleContext` dev switcher (replace with auth-based role detection)
- [ ] Performance testing with production data volumes
- [ ] Security audit of all RLS policies

---

*End of Document*
