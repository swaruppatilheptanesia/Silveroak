# Release Notes — 2026-08-12

Silver Oak T&P Portal

> **⚠ This batch CONTAINS database migrations.** Run the migrations on the backend before serving the new
> frontend. All migrations are **additive / nullable / grandfathered — no backfill script is required** this
> batch (unlike the 2026-08-06 release).
> **Deploy order: backend (run migrations) → frontend → hard-refresh.**

---

## ⚠ Database migrations in this batch

Run from `docs/silveroak_backend/`:

```bash
npx prisma migrate dev        # dev / staging   (production: npx prisma migrate deploy)
```

Schema changes applied by the migrate (all additive, existing rows grandfathered, **no backfill**):

1. `Event.faculty_coordinator_ids String[] @default([])` — assigned-faculty event visibility now keys on real
   faculty **user ids** (legacy-mirror alongside the existing free-typed `faculty_coordinators` names).
2. `Event.application_stage ApplicationStage?` — event auto-assignment can be gated by application pipeline
   stage (nullable = "All"; references the existing `ApplicationStage` enum — no new enum).
3. **`enum CompletionCertStatus { pending, approved, rejected }`** (new) + `NocRequest` completion-certificate
   columns: `completion_certificate_url/_name/_mime_type/_size`, `completion_status` (null = not submitted),
   `completion_submitted_at`, `completion_reviewed_by/_by_name/_at`, `completion_remarks`,
   `completion_due_notified_at` — the internship completion-certificate lifecycle (separate from NOC issuance).
4. `NoDuesRequest` + 7 nullable columns — `sou_passing_year`, `company_sector`, `company_address`,
   `language_test`, `university_address`, `examination_name`, `additional_details` — the dynamic per-exit-reason
   No Dues form.

---

## NOC

### C1. Internship Completion Certificate — submit → TPO approve → portfolio *(⚠ migration)*
Completion tracking is a **separate lifecycle** from NOC issuance (the NOC stays `issued`;
`completion_status` tracks the uploaded certificate: null → pending → approved/rejected). On the student's
**Completed** tab, issued NOCs show an **Upload Completion Certificate** button (re-upload allowed after a
rejection), a status badge, and a view link; a lazy one-time reminder notification fires for an issued NOC
whose end date has passed with no certificate (no cron exists). TPO gets a new **Completion Certificates**
tab (pending list) → Approve / Reject (mandatory remark on reject). **Approval** creates a student
Certification in the portfolio + recomputes profile completion, and every submit/approve/reject is written
to the audit log. The **Issued** tab consolidates Offer Letter + NOC Certificate + Completion Certificate
links and status per student.
- `docs/silveroak_backend/prisma/schema.prisma`, `src/middleware/upload.ts`, `src/modules/noc/noc.service.ts`,
  `noc.schema.ts`, `noc.controller.ts`, `noc.routes.ts`, `src/modules/students/student.service.ts`
- `src/types/noc.ts`, `src/services/nocService.ts`, `src/hooks/use-noc-api.ts`, `src/lib/nocModule.ts`,
  `src/components/noc/CompletionCertificateDialog.tsx`, `CompletionReviewDialog.tsx`, `NOCRequestCard.tsx`,
  `NOCRequestDetailSheet.tsx`, `src/pages/admin/AdminNOCManagement.tsx`

### C2. NOC wizard — City now cascades from the selected State *(bugfix)*
Selecting a State on the Apply-for-NOC form now filters the City dropdown to that state's cities (previously
City was a flat, un-scoped free-text field, so the cascade never worked). Added a curated India state→cities
map with an **"Other → enter new city"** free-text escape; changing State clears the City.
- `src/lib/indianCities.ts` *(new)*, `src/components/noc/NOCRequestWizard.tsx`

---

## No Dues

### N1. "Request No Dues Certificate" is now a dynamic per-Exit-Reason form *(⚠ migration)*
Exit Reason is a dropdown driving a fully dynamic field set + per-reason proof helper text across five reasons
— **Job/Employment**, **Business**, **Planning for Further Studies**, **Admission Taken**, **Competitive
Exam**. SOU Passing Year is a generated range (prefilled from the student's batch); Country is a new dropdown
whose India-vs-Abroad value flips the language-test requirement and proof guidance for the study reasons. One
proof file per request (PDF, upload-first). The backend stays lenient; the frontend enforces per-reason
required fields. The admin No Dues detail sheet renders all new fields.
- `docs/silveroak_backend/prisma/schema.prisma`, `src/modules/no-dues/no-dues.schema.ts`, `no-dues.service.ts`
- `src/types/noDues.ts`, `src/lib/schemas.ts`, `src/lib/countries.ts` *(new)*, `src/lib/noDuesModule.ts`,
  `src/pages/NoDuesCertificate.tsx`, `src/pages/admin/NoDuesManagement.tsx`

---

## Events & Drives

### E1. Application Pipeline Stage eligibility + live Eligible Student Count *(⚠ migration)*
Create/Edit Event gained an **Application Pipeline Stage** dropdown (All / Applied / Mock Round / Shortlisted
/ Test Scheduled / Interview / HR Round / Offer Released / Rejected) below Linked Postings. When a stage is
set, only students at that stage on a linked posting are auto-assigned (snapshot, **add-only** — never removes
existing attendance/panels/manual assignments); "All" = every applicant. The Events & Drives listing gained an
**Eligible Students** column (a live distinct count of matching students; also in the CSV/Excel export).
- `docs/silveroak_backend/prisma/schema.prisma`, `src/modules/events/event.schema.ts`, `event.service.ts`
- `src/types/event.ts`, `src/lib/eventModule.ts`, `src/components/drives/EventEditorDialog.tsx`,
  `src/pages/admin/DrivesManagement.tsx`

### E2. Assigned Faculty Coordinator couldn't see the event *(⚠ migration, bugfix)*
A faculty coordinator assigned to an event saw nothing under Faculty → Department Events, because the event's
coordinator was a **free-typed name** matched exactly against the faculty account name (titles/spacing/typos
never matched). The Create/Edit Event "Faculty Coordinators" field is now a **multi-select of real faculty
accounts**, the event stores their **user ids**, and visibility + attendance scope by id. *(Legacy
name-only events won't appear for faculty until an admin re-opens the event and re-selects the coordinator —
no backfill.)*
- `docs/silveroak_backend/prisma/schema.prisma`, `src/modules/events/event.schema.ts`, `event.service.ts`
- `src/types/event.ts`, `src/lib/eventModule.ts`, `src/lib/schemas.ts`, `src/components/drives/EventEditorDialog.tsx`

---

## Applications & Offers

### AP1. Application Pipeline — "View Resume" per applicant
Each applicant row in the Application Pipeline now has a **View Resume** button that opens the resume the
student submitted for that posting (disabled with a tooltip when none was submitted). *(Frontend-only.)*
- `src/pages/admin/ApplicationPipeline.tsx`

### AP2. Application Pipeline — attendance status for a selected event
The Application Records table gained an **Attendance for Event** dropdown and an **Attendance** column: pick
any event and each applicant shows Present / Absent / Late for it, or **—** when there's no record.
*(Frontend-only.)*
- `src/pages/admin/ApplicationPipeline.tsx`

### AP3. Create Offer — Posting Type filter
The Create Offer dialog gained a **Posting Type** dropdown at the top that filters the Posting list to that
type (UI filter only, not part of the offer payload). *(Frontend-only.)*
- `src/components/offers/CreateOfferDialog.tsx`

---

## Dashboards & Tables

### D1. TPO Admin Dashboard — 10 most recent Interest Registrations
The dashboard's Interest Registrations card now lists the 10 most recent individual registration records
(student, posting type, date, status) instead of aggregate counts, via a new
`GET /admin/interests/registrations/recent` endpoint. *(No migration.)*
- `docs/silveroak_backend/src/modules/admin/admin.service.ts`, `admin.controller.ts`, `admin.routes.ts`
- `src/types/admin.ts`, `src/services/adminService.ts`, `src/hooks/use-admin-api.ts`, `src/pages/admin/AdminDashboard.tsx`

### T1. Column sorting on management tables — Phase 1 (server-side)
Clickable column-header sorting was added to ~20 high-traffic management tables. Header clicks send
`sort_by`/`sort_order` to the API so the **whole dataset** sorts across pages (not just the visible page), and
pagination resets to page 1. New shared primitives `SortableTableHead` + `useServerSort`; each backend list
service gained a **whitelisted `getXOrderBy`** (closing a raw-`sort_by`-into-Prisma injection surface). *(No
migration.)*
- Backend order-by whitelists: `docs/silveroak_backend/src/modules/{offers,applications,employers,admin,noc,events,announcements,no-dues,internships,postings}/*.service.ts`
- `src/components/shared/SortableTableHead.tsx` *(new)*, `src/hooks/use-server-sort.ts` *(new)*, the `sort_by`
  union types in `src/types/*`, and the admin/superadmin/faculty page + component tables (see roll-up).

### T2. Column sorting — Phase 2 (client-side)
Extended sorting to the remaining tables that load their full set in memory (Portfolio, Eligible Students,
Selection Database, Interest Lists, Circulars, Faculty Programs, Recruitment Pipeline, …) via a new
`useClientSort` hook. Reports remain excluded. *(No migration.)*
- `src/hooks/use-client-sort.ts` *(new)* and the client-sorted tables (see roll-up).

---

## Faculty Coordinator

### FC1. Department Students export failed with an "export limit" error *(bugfix)*
The export did a single fetch of 5000 rows, but the backend caps the page size at 100, so the request was
rejected. Export now pages through the list at the backend max and accumulates every matching (filter-scoped)
student. *(Frontend-only.)*
- `src/pages/faculty/DepartmentStudents.tsx`

### FC2. Faculty portal cleanup + read-only offer detail view
My Profile no longer shows the **Notifications** tab for faculty (other roles keep it). **Offer & Joining
Status** gained a per-row **View** button that opens the offer detail slide-over in a new **read-only** mode
(no admin Reject / Update Joining / editable Compliance — compliance shows as badges; all info + audit trail
remain). **Internships** was removed from the faculty sidebar. *(Frontend-only.)*
- `src/pages/shared/MyProfile.tsx`, `src/pages/faculty/FacultyProfile.tsx`,
  `src/components/offers/OfferDetailSheet.tsx`, `src/pages/faculty/FacultyOffers.tsx`, `src/components/layout/AppSidebar.tsx`

---

## UI cleanup

### U1. Print buttons removed app-wide (CSV/Excel export only)
The four remaining inline `window.print()` buttons were removed (Portfolio Completion, Company Internship
Summary, Certificate Pending reports, and the Policy detail sheet). The real certificate "Download PDF / NDC"
buttons are deliberately kept. *(Frontend-only.)*
- `src/components/reports/PortfolioCompletionReport.tsx`, `CompanyInternshipSummary.tsx`, `CertificatePendingReport.tsx`,
  `src/pages/admin/PolicyRepository.tsx`

### U2. Hidden sections + clearer No Dues heading
Hid **Master Data → Branches** (Master Data now opens on Skills) and **Placement Cell Programs** from the TPO
sidebar (both reversible; routes left intact). The No Dues Certificate heading now shows the **student's name**
instead of the internal record UUID (student + admin views). *(Frontend-only.)*
- `src/pages/admin/MasterDataManagement.tsx`, `src/components/layout/AppSidebar.tsx`,
  `src/pages/admin/NoDuesManagement.tsx`, `src/pages/NoDuesCertificate.tsx`

---

## All files changed (94 unique)

**Backend (20)**
- `docs/silveroak_backend/prisma/schema.prisma`
- `docs/silveroak_backend/src/middleware/upload.ts`
- `docs/silveroak_backend/src/modules/admin/admin.controller.ts`
- `docs/silveroak_backend/src/modules/admin/admin.routes.ts`
- `docs/silveroak_backend/src/modules/admin/admin.service.ts`
- `docs/silveroak_backend/src/modules/announcements/announcement.service.ts`
- `docs/silveroak_backend/src/modules/applications/application.service.ts`
- `docs/silveroak_backend/src/modules/employers/employer.service.ts`
- `docs/silveroak_backend/src/modules/events/event.schema.ts`
- `docs/silveroak_backend/src/modules/events/event.service.ts`
- `docs/silveroak_backend/src/modules/internships/internship.service.ts`
- `docs/silveroak_backend/src/modules/no-dues/no-dues.schema.ts`
- `docs/silveroak_backend/src/modules/no-dues/no-dues.service.ts`
- `docs/silveroak_backend/src/modules/noc/noc.controller.ts`
- `docs/silveroak_backend/src/modules/noc/noc.routes.ts`
- `docs/silveroak_backend/src/modules/noc/noc.schema.ts`
- `docs/silveroak_backend/src/modules/noc/noc.service.ts`
- `docs/silveroak_backend/src/modules/offers/offer.service.ts`
- `docs/silveroak_backend/src/modules/postings/posting.service.ts`
- `docs/silveroak_backend/src/modules/students/student.service.ts`

**Frontend (74)**
- `src/components/admin/CompanyListTab.tsx`
- `src/components/admin/EligibleStudentsTab.tsx`
- `src/components/admin/PortfolioMonitoringTab.tsx`
- `src/components/admin/RecruiterListTab.tsx`
- `src/components/admin/SelectionDatabaseTab.tsx`
- `src/components/admin/StudentListTab.tsx`
- `src/components/admin/VerificationTab.tsx`
- `src/components/drives/EventAssignmentDialog.tsx`
- `src/components/drives/EventEditorDialog.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/noc/CompletionCertificateDialog.tsx`
- `src/components/noc/CompletionReviewDialog.tsx`
- `src/components/noc/NOCRequestCard.tsx`
- `src/components/noc/NOCRequestDetailSheet.tsx`
- `src/components/noc/NOCRequestWizard.tsx`
- `src/components/offers/CreateOfferDialog.tsx`
- `src/components/offers/OfferDetailSheet.tsx`
- `src/components/reports/CertificatePendingReport.tsx`
- `src/components/reports/CompanyInternshipSummary.tsx`
- `src/components/reports/PortfolioCompletionReport.tsx`
- `src/components/shared/SortableTableHead.tsx`
- `src/components/superadmin/AuditLogTab.tsx`
- `src/components/superadmin/UserManagementTab.tsx`
- `src/hooks/use-admin-api.ts`
- `src/hooks/use-client-sort.ts`
- `src/hooks/use-noc-api.ts`
- `src/hooks/use-server-sort.ts`
- `src/lib/countries.ts`
- `src/lib/eventModule.ts`
- `src/lib/indianCities.ts`
- `src/lib/nocModule.ts`
- `src/lib/noDuesModule.ts`
- `src/lib/schemas.ts`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/AdminNOCManagement.tsx`
- `src/pages/admin/AnnouncementManagement.tsx`
- `src/pages/admin/ApplicationPipeline.tsx`
- `src/pages/admin/ApplicationsManagement.tsx`
- `src/pages/admin/CircularsManagement.tsx`
- `src/pages/admin/DrivesManagement.tsx`
- `src/pages/admin/InterestLists.tsx`
- `src/pages/admin/InternshipsManagement.tsx`
- `src/pages/admin/MasterDataManagement.tsx`
- `src/pages/admin/NoDuesManagement.tsx`
- `src/pages/admin/OffersManagement.tsx`
- `src/pages/admin/PolicyRepository.tsx`
- `src/pages/admin/PostingsManagement.tsx`
- `src/pages/faculty/DepartmentStudents.tsx`
- `src/pages/faculty/EmployerDirectory.tsx`
- `src/pages/faculty/FacultyAnnouncements.tsx`
- `src/pages/faculty/FacultyCirculars.tsx`
- `src/pages/faculty/FacultyInternships.tsx`
- `src/pages/faculty/FacultyNOCApprovals.tsx`
- `src/pages/faculty/FacultyOffers.tsx`
- `src/pages/faculty/FacultyProfile.tsx`
- `src/pages/faculty/FacultyPrograms.tsx`
- `src/pages/NoDuesCertificate.tsx`
- `src/pages/recruiter/RecruiterInternships.tsx`
- `src/pages/recruiter/RecruitmentPipeline.tsx`
- `src/pages/shared/MyProfile.tsx`
- `src/pages/StudentCirculars.tsx`
- `src/services/adminService.ts`
- `src/services/nocService.ts`
- `src/types/admin.ts`
- `src/types/announcement.ts`
- `src/types/application.ts`
- `src/types/employer.ts`
- `src/types/event.ts`
- `src/types/faculty.ts`
- `src/types/internship.ts`
- `src/types/noc.ts`
- `src/types/noDues.ts`
- `src/types/offer.ts`
- `src/types/posting.ts`

## Deploy steps

**Backend** (`docs/silveroak_backend/`): `npm ci && npx prisma migrate deploy && npm run build` → restart the
service. **No backfill script is required for this batch** (all migrations are additive/nullable/grandfathered).
**Frontend** (repo root): `npm ci && npm run build` → publish `dist/`.
**Order:** backend (with migrations) first, then frontend, then hard-refresh.
