# Silver Oak University — Training & Placement Portal
## System Documentation

---

## 1. Executive Summary

The Silver Oak University (SOU) Training & Placement Portal is a comprehensive web-based platform designed to digitize and streamline the entire campus recruitment lifecycle. It replaces fragmented Excel-based workflows with a unified, role-based system covering student management, employer relations, recruitment operations, compliance, and institutional reporting.

**Technology Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui  
**Design System:** SOU-branded (Primary Green, Secondary Maroon), Dark/Light mode, fully responsive  
**Architecture:** Component-based SPA with role-based routing and mock data layer (ready for backend integration)

---

## 2. Roles & Access Control

The system supports **7 distinct user roles**, each with tailored navigation, dashboards, and permissions:

| Role | Primary Responsibilities |
|------|------------------------|
| **Super Admin** | System configuration, user lifecycle management, roles & permissions matrix, audit logs |
| **TPO Admin** | Full placement operations — postings, applications, offers, drives, reporting, NOC management |
| **TPO Employee** | Subset of TPO Admin capabilities (configurable via permissions matrix) |
| **Faculty Coordinator** | Department-level visibility — students, drives, announcements, NOC approvals |
| **Recruiter** | Company-scoped access — view shortlisted candidates, submit feedback, track pipeline |
| **Management** | Read-only institutional dashboards and summary reports |
| **Student** | Profile management, opportunity discovery, application tracking, offer acceptance |

### Permissions Matrix
Super Admins control a granular permission grid covering **View (V), Create (C), Edit (E), Approve (A), and Export (Ex)** across all modules. Permissions are editable via an interactive checkbox grid with bulk save and reset-to-defaults.

---

## 3. Module-by-Module Breakdown

### Module 1: Student Profile Management
**Route:** `/profile`  
**Roles:** Student (edit), TPO Admin & Faculty (view)

- **Data captured:** Personal info, academic records (10th, 12th, CGPA, backlogs), skills & domain interests, certifications, projects, employment status, documents
- **Profile completion:** Minimum **80%** required to participate in placements
- **Three view states:** First-time (onboarding checklist), Incomplete (progress bar + missing items), Complete
- **Resume management:** Multiple resume uploads with version tracking
- **Verification:** TPO Admin verifies student records; status shown as Verified / Pending / Rejected badges

### Module 2: Employer Management
**Route:** `/admin/employers` (Employer Hub)  
**Roles:** TPO Admin (full CRUD), Faculty (read-only directory)

- **Company Management:** Company profiles with classification (Dream / Super Dream / Regular / Startup), tagging, and engagement timelines
- **Recruiter Management:** Recruiter registration, verification workflow, company association
- **Engagement History:** Timeline of past interactions, visits, and hiring outcomes per company
- **Privacy:** Recruiter contact details visible only to TPO Admins

### Module 3: Job & Internship Postings
**Route:** `/admin/postings`  
**Roles:** TPO Admin (create/publish/close), Student (view/apply)

- **Posting types:** Placement, Internship, PPO
- **Work modes:** On-site, Remote, Hybrid
- **Lifecycle:** Draft → Published → Closed → Cancelled
- **Eligibility engine:** Auto-calculated based on branch, batch, CGPA, backlogs, and skill requirements
- **Application windows:** Configurable start/end dates; "Apply Now" buttons auto-disable after deadline
- **Posting detail page** with role description, compensation, eligibility criteria, and application CTA

### Module 4: Interest Registration & Policy Acceptance
**Route:** `/opportunities`, `/policy-acceptance`  
**Roles:** Student

- **Discovery layer:** Students browse eligible opportunities with filters (domain, location, salary, work mode)
- **Match scoring:** AI-style percentage match based on skills overlap
- **Recommended section:** Top matches surfaced automatically
- **Policy acceptance:** Mandatory placement policy consent before registration; timestamped for audit
- **Filter persistence:** Search preferences auto-saved to localStorage with structural validation

### Module 5: Applications & ATS Workflow
**Routes:** `/applications` (Student), `/admin/applications` (Admin), `/admin/applications/:postingId` (Pipeline)  
**Roles:** TPO Admin (manage pipeline), Student (track status), Recruiter (view shortlisted)

**Pipeline Stages:**
1. Applied
2. Mock Round (mandatory gatekeeping — only "Passed" students progress)
3. Shortlisted (shared with company)
4. Test Scheduled
5. Interview
6. HR Round
7. Offer Released
8. Rejected (terminal)

**Admin Features:**
- Table-based pipeline with stage tabs (including unified "All" tab)
- **Bulk Action Toolbar:** Move to Stage, Set Mock Result (Passed/Failed), Reject (with mandatory remarks)
- Per-student actions: individual stage move, mock result update
- Sortable columns (Name, Enrollment, Branch, CGPA, Applied Date)
- Branch filter + search

**Student Features:**
- Application cards with timeline visualization
- Interactive filter chips with real-time count badges
- Status icons per stage

### Module 6: Events, Campus Drives & Scheduling
**Routes:** `/admin/drives`, `/drives` (Student)  
**Roles:** TPO Admin (create/manage), Student (view/register)

- **Drive management:** Create drives with date, venue, company, posting association
- **Slot allocation:** Time slot management for interview scheduling
- **Bulk attendance:** Mark attendance for drive participants in bulk
- **Student view:** Browse upcoming drives, register interest, view schedule

### Module 7: Offer, Joining & Compliance
**Routes:** `/admin/offers` (Admin hub), `/applications` → Offers tab (Student)  
**Roles:** TPO Admin (full control), Student (accept only)

**Key Rules:**
- Students can **only Accept** offers — rejection and DNJ rights reserved for TPO Admin
- **Single Active Offer Policy:** Accepting an offer blocks all further applications
- Offer lifecycle: Pending → Accepted → Joined / Did Not Join / Rejected by Admin
- Records locked once joining verified
- Compliance tracking: Total offers, blocked students, override counts

**Admin Hub:** Unified table with lifecycle stage filter chips, compliance summary, rejection reasons (simultaneous results / genuine reason), and audit trail

### Module 8: Stipend & Internship Administration
**Routes:** `/admin/internships`, `/applications` → Internships tab (Student)  
**Roles:** TPO Admin (manage), Student (view), Faculty (department view)

- **Internship records:** Linked to accepted internship offers
- **Import from offers:** Auto-create internship records from accepted internship-type offers
- **Tracking:** Start/end dates, stipend details, mentor info, completion status
- **Certificate management:** Track pending/submitted/verified completion certificates
- **Detail sheet:** Full internship information in slide-over panel

### Module 9: Portfolio & Projects Showcase
**Routes:** `/portfolio` (Student), `/admin/students` → Portfolio Monitoring (Admin)  
**Roles:** Student (create/edit), TPO Admin (monitor), Faculty (view)

- **Portfolio builder:** Students curate projects, certifications, and internship showcases
- **Read-only public view:** Shareable portfolio link for external visibility
- **Admin monitoring:** Portfolio completion rates, published portfolio tracking
- **Showcase dialogs:** Add/edit projects, certifications, and internship highlights

### Module 10: Communication & Engagement
**Routes:** `/admin/announcements`, `/announcements` (Student), `/faculty/announcements` (Faculty)  
**Roles:** TPO Admin (create/broadcast), Student (read/consent), Faculty (view)

- **Targeted announcements:** Audience selection — All, by Batch, by Department, or Opportunity-specific
- **Read & Consent:** Mandatory acknowledgement from students with timestamped logs
- **Delivery metrics:** Read count, consent count, engagement rates per announcement
- **Replaces WhatsApp:** Centralized, auditable communication channel

### Module 11: TPO Operations & Reporting
**Route:** `/admin/reports`  
**Roles:** TPO Admin (full access), Faculty (department-scoped), Management (summary view)

**Report Categories:**
| Category | Reports |
|----------|---------|
| Students | Interest Registration, Verification Status |
| Employers | Engagement History |
| Postings | Active Postings, Type Summary |
| ATS | Applicant List, Stage-wise Pipeline, Shortlist/Rejection Summary |
| NOC | Pending NOC, Issued Register, Dept/Batch breakdown |
| Events & Drives | Attendance, Drive Completion, Participation History |
| Offers & Joining | Acceptance Summary, Joining Status, Compliance |
| Internships | Status Summary, Certificate Pending, Company Metrics |
| Portfolio | Completion Summary, Published Portfolios |
| Communication | Announcement History, Consent Tracking |
| Placement Analytics | Placement Summary (Dept × Batch), Company Performance Funnel, Offer-to-Join Conversion, Unplaced Students |

All reports include: Standardized toolbar with CSV export, date range filtering, and department/batch selectors.

### Module 12: Security, Roles & Access Control
**Route:** `/superadmin`  
**Roles:** Super Admin

- **User Management:** Create, deactivate, assign roles/departments
- **Roles & Permissions Matrix:** Interactive grid with checkbox editing, floating save bar, reset to defaults
- **Audit Log:** Read-only, filterable history of all critical system actions (data creation, status updates, login events)
- **Security compliance:** Mandatory for institutional governance

### Module 13: NOC & Document Generation
**Routes:** `/noc` (Student), `/admin/noc` (Admin), `/faculty/noc` (Faculty)  
**Roles:** Student (request), Faculty (first approval), TPO Admin (final review/issue)

**Approval Pipeline:**
1. Student submits NOC request
2. Faculty Coordinator reviews and approves
3. TPO Admin performs final review
4. NOC issued with unique identifier (e.g., `NOC/2026/CSE/0001`)

**Special handling:**
- University-placed students: Details auto-fetched
- Self-sourced placements: Company verification required before issuance
- Eligibility and "Selected" status enforced before issuance

### Module 14: Circular & Communication Templates
**Route:** `/admin/circulars`  
**Roles:** TPO Admin

- **Template builder:** Create reusable circular templates for common communications
- **Generation:** Auto-populate templates with posting/company data
- **Template management:** Save, edit, and reuse templates across academic years

### Module 15: Company Data Exchange
**Integrated into:** Application Pipeline (`/admin/applications/:postingId`)  
**Roles:** TPO Admin

- **Export Candidates Dialog:** Field picker with blocked personal contact fields (Email, Phone, Address) — enforces PII protection policy
- **Format options:** Excel / PDF export
- **Exchange Log:** Read-only audit trail tracking: who exported, when, format used, fields shared
- **No import by design:** Prevents ATS workflow corruption from inconsistent external spreadsheet formats

### Module 16: Selection & Database Management
**Integrated into:** Student Hub (`/admin/students`) → Selection Database tab  
**Roles:** TPO Admin (manage), Faculty (department view), Management (summary)

- **Sub-tabs:** Placements / Internships
- **Auto-derived records:** Read-only data pulled from finalized offers and joining modules
- **Lock indicator:** Finalized records show lock icon (non-editable)
- **Filters:** Batch, Department, Company, Outcome (Joined / Not Joined)
- **Export:** Integrated with privacy-safe field picker
- **Purpose:** Single source of truth for NAAC/NBA accreditation, annual reports, institutional planning

---

## 4. Cross-Cutting Concerns

### 4.1 PII Protection Policy
Student personal contact details (**email, phone, permanent address**) are **strictly blocked** in:
- All recruiter-facing views (CandidateDetailSheet)
- All candidate data exports (ExportCandidatesDialog)
- This ensures all employer-student communication routes through the TPO office

### 4.2 Single Active Offer Policy
- Once a student accepts an offer, `applications_blocked = true`
- All "Apply" buttons are disabled system-wide
- Only a TPO Admin can override this via `admin_override_enabled`
- Prevents students from holding multiple offers simultaneously

### 4.3 Mock Round Gatekeeping
- Every applicant must pass through a mandatory Mock Round before being shortlisted
- Only students with `mock_round_result = 'passed'` can progress to the Shortlisted stage
- Failed students are moved to Rejected

### 4.4 Profile Completion Enforcement
- Minimum **80% profile completion** required for:
  - Registering interest in opportunities
  - Appearing in student lists for postings
  - Applying to any opportunity
- Eligibility is **auto-calculated** and cannot be manually overridden

### 4.5 Data Validation
- localStorage data is structurally validated against TypeScript interfaces
- Try-catch wrappers prevent crashes from malformed local data
- Role-based server-side validation identified as requirement for production deployment

---

## 5. Navigation Structure

### Student Sidebar
| Section | Items |
|---------|-------|
| Main Menu | Dashboard, My Profile, My Portfolio |
| Placements | Opportunities, My Applications, NOC Requests, Companies, My Events & Drives, Announcements |

### TPO Admin Sidebar
| Section | Items |
|---------|-------|
| Overview | Dashboard |
| Student Mgmt | Student Hub (Students, Verification, Eligibility Rules, Portfolio Monitoring, Selection Database) |
| Employer Mgmt | Employer Hub (Companies, Recruiters) |
| Placement Ops | Postings, Applications, Drives, NOC Management, Offers & Joining, Internship Administration, Circulars & Templates |
| Analytics | Reports & Analytics |

### Faculty Sidebar
| Section | Items |
|---------|-------|
| Overview | Faculty Dashboard |
| Department | Department Students, Employer Directory |
| Placements | Announcements, Circulars, Drives, Offers, Internships, NOC Approvals |

### Recruiter Sidebar
| Section | Items |
|---------|-------|
| Overview | Recruiter Dashboard |
| Company | Company Profile, Recruiter Profile |
| Recruitment | Recruitment Pipeline, Drives, Internships |

### Super Admin Sidebar
| Section | Items |
|---------|-------|
| System | Dashboard (User Management, Roles & Permissions, Audit Log) |

---

## 6. Demo / Preview Scenario System

For stakeholder demonstrations, **5 key screens** include a "Preview Scenario" dropdown (marked with a `DEMO` badge) that toggles between different application states:

| Screen | States Available |
|--------|-----------------|
| **My Applications** (Student) | Fresh Student, Active Applicant, Blocked (Offer Accepted), Pending Offer, Placed & Joined |
| **Opportunities** (Student) | Eligible & Active, Blocked, Profile Incomplete |
| **Application Pipeline** (Admin) | Active Pipeline, Empty Pipeline, Closed Posting |
| **Recruitment Pipeline** (Recruiter) | Active Postings, No Assigned Postings |
| **NOC Dashboard** (Student) | Has Requests, No Requests, Pending Only |

These are **non-destructive** demo controls that can be removed before production deployment.

---

## 7. Design System

### Tokens
- **Primary:** SOU Green (`hsl(142, 64%, 32%)`)
- **Secondary:** Maroon accent
- **Semantic tokens:** All colors referenced via CSS custom properties — no hardcoded values in components
- **Dark/Light mode:** Full support via `next-themes`
- **Touch targets:** Minimum 44px for mobile accessibility
- **Responsive breakpoints:** Mobile-first, tablet, desktop

### Component Library
Built on **shadcn/ui** with customized variants:
- StatusBadge (Verification, Eligibility, Posting, Company Classification, Work Mode)
- DataTable (sortable, filterable, paginated)
- Multi-step wizards (NOC, Profile completion)
- Slide-over detail sheets (Offers, Internships, Candidates, NOC)
- Filter chips with count badges

### Layout Patterns
- Fixed headers/footers with scrollable body areas (`max-height: 90vh`)
- Horizontal scrolling tables (`table-responsive`)
- Collapsible sidebar navigation
- Flexbox-based responsive grids

---

## 8. Data Architecture (Mock Layer)

The system currently uses an in-memory mock data layer organized by domain:

| Data File | Purpose |
|-----------|---------|
| `mockStudentData.ts` | Student profiles, academic records, skills, eligibility checks |
| `mockEmployerData.ts` | Companies, recruiters, engagements |
| `mockPostingsData.ts` | Job/internship postings with eligibility criteria |
| `mockApplicationData.ts` | Applications, stage history, recruiter feedback |
| `mockOfferData.ts` | Offers, joining status, audit entries |
| `mockInternshipData.ts` | Internship records, stipend details |
| `mockNOCData.ts` | NOC requests, approval chain |
| `mockDrivesData.ts` | Campus drives, scheduling |
| `mockCircularData.ts` | Circular templates |
| `mockAnnouncementData.ts` | Announcements, consent tracking |
| `mockPortfolioData.ts` | Student portfolios, projects |
| `mockSecurityData.ts` | Audit logs, user records |
| `mockStudentPool.ts` | Student pool for admin views |

**Helper functions** are co-located with mock data for filtering, stats computation, and relationship resolution (e.g., `getApplicationsByStudent()`, `isStudentBlocked()`, `getOffersByPosting()`).

### Backend Readiness
The mock layer is designed for seamless replacement with **Lovable Cloud** (Supabase):
- All data access goes through centralized helper functions
- Type definitions are separated into `/types/*.ts`
- Validation schemas defined in `/lib/schemas.ts` and `/lib/validations.ts`
- Filter utilities in `/lib/filters.ts`
- Formatters in `/lib/formatters.ts`

---

## 9. File Structure Overview

```
src/
├── assets/                  # Static assets (SOU logo)
├── components/
│   ├── admin/               # TPO Admin-specific components
│   ├── circulars/           # Circular generation dialogs
│   ├── dashboard/           # Dashboard widgets
│   ├── drives/              # Drive-related components
│   ├── employer/            # Employer management dialogs
│   ├── internships/         # Internship components
│   ├── layout/              # App shell (Sidebar, Header, Theme, Notifications)
│   ├── noc/                 # NOC workflow components
│   ├── offers/              # Offer management components
│   ├── opportunities/       # Opportunity browsing components
│   ├── pipeline/            # ATS pipeline components (Export, Exchange Log)
│   ├── portfolio/           # Portfolio showcase components
│   ├── profile/             # Profile editing components
│   ├── recruiter/           # Recruiter-facing components
│   ├── reports/             # Individual report components (25+ reports)
│   ├── shared/              # Reusable components (DataTable, SearchInput, ScenarioSwitcher)
│   ├── superadmin/          # Super Admin components
│   └── ui/                  # shadcn/ui primitives + StatusBadge, StatusIndicators
├── contexts/
│   └── RoleContext.tsx       # Role switching context
├── data/                    # Mock data files
├── hooks/                   # Custom hooks
├── lib/                     # Utilities, constants, validations, formatters
├── pages/
│   ├── admin/               # TPO Admin pages (18 pages)
│   ├── faculty/             # Faculty pages (9 pages)
│   ├── recruiter/           # Recruiter pages (6 pages)
│   └── superadmin/          # Super Admin pages (1 page)
└── types/                   # TypeScript type definitions
```

---

## 10. Production Deployment Checklist

Before going live, the following items should be addressed:

- [ ] **Enable Lovable Cloud** — Replace mock data with PostgreSQL database tables
- [ ] **Implement authentication** — Email/password login with role-based routing
- [ ] **Add Row-Level Security (RLS)** — Ensure data isolation per role
- [ ] **Server-side validation** — Role-based permission checks on all mutations
- [ ] **Remove demo scenario switchers** — Delete `ScenarioSwitcher` components from 5 pages
- [ ] **File upload integration** — Resume uploads, NOC document generation, certificate uploads
- [ ] **Email notifications** — Offer alerts, NOC status updates, announcement delivery
- [ ] **PDF generation** — NOC certificates, placement letters, export reports
- [ ] **Analytics dashboards** — Real-time placement statistics with live data
- [ ] **Performance optimization** — Pagination, lazy loading, query caching
- [ ] **Accessibility audit** — WCAG 2.1 AA compliance verification
- [ ] **SEO meta tags** — Title, description, OG tags for public-facing pages

---

*Document generated: February 16, 2026*  
*System Version: MVP 1.0*  
*Total Modules: 16*  
*Total Pages: 40+*  
*Total Components: 100+*
