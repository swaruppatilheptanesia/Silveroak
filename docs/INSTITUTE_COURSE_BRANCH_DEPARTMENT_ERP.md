# Institute / Course / Branch / Department & the ERP — reference

> **Status:** Reference note captured 2026-08-25 from a codebase investigation, for the deferred task
> *"institute/course/branch should come from ERP, remove department in every report & filter."*
> The task was **not implemented** — this documents the findings so it can be picked up later.

---

## TL;DR (the load-bearing fact)

**There is NO per-student "branch" anywhere — not in our DB, not in the ERP.**
- **Institute** and **Course** are genuine ERP fields, stored on the `Student` row.
- **"Branch"** in this app is a *relabel* of `Student.department`, which is itself just the ERP
  **course short name** (`deriveDepartment` = `courseShortName`). So Branch == Department == course-derived.
- The ERP's per-student endpoint (`GetStudentDetailByEnrollmentNo`) returns **no branch field**. Branch only
  exists as a standalone **institute→course→branch** lookup hierarchy (`GetBranchList`, keyed by `CourseId`)
  with **no enrollment-number / per-student mapping**.

Therefore "branch comes from ERP" can only mean *branch = the ERP-course-derived value* (today's
`department`), unless a new per-student branch data source or manual mapping is introduced.

---

## ERP: `GetStudentDetailByEnrollmentNo`

Base: `http://115.244.149.106:44325/api/CRMAPIStudent/GetStudentDetailByEnrollmentNo?EnrollmentNo=<no>`
(header `Api-Key: <CRM_API_KEY>`). Returns a JSON array; `[0]` is the student. **38 fields**, confirmed by a
live call (enrollment `2404030100150`):

```
aadhaarNumber, admissionYear, birthDate, bloodGroup, board10, board12OrDiploma, category, cgpa,
convocationFeeStatus, courseFullName, courseShortName, cpi, currentAddress, currentBacklog,
currentSemester, enrollmentNo, fullName, gender, instituteName, officialEmail,
overallAttendancePercentage, parentContactNo, parentName, passOutDate, passingYear10,
passingYear12OrDiploma, percentage10, percentage12OrDiploma, permanentAddress, personalEmail,
photoUrl, programName, result_Semester, result_Status, spi, studentMobileNo, temporaryEnrolmentNo,
totalBacklog
```

- **No `branch` / `branchName`** field. Finest academic granularity per student = `courseShortName` /
  `courseFullName` / `programName`.
- `passOutDate` **exists** but is an **empty string `""`** for currently-enrolled students (only populated
  after a student actually passes out). `admissionYear` also came back `null` on that record — the ERP does
  not populate every field for every student.
- Mirrored by the `CrmStudentDetail` type in
  [backend/src/modules/auth/auth.service.ts](../backend/src/modules/auth/auth.service.ts) (~L25–62).
  Fetch helper: `fetchStudentFromCrm(enrollmentNo)` (exported).

---

## Student model & CRM seeding

`Student` model in [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) (model ~L307):
- `department  String   @db.VarChar(100)` — **required, NOT null**
- `course      String?  @db.VarChar(100)`
- `institute   String?  @db.VarChar(200)`
- `program_name String? @db.VarChar(100)`
- `pass_out_date String? @db.VarChar(40)` — added 2026-08-25 (ERP `passOutDate`)
- **No `branch` column.** `@@index([tenant_id, department])` is the only academic grouping index.
  ("branch" elsewhere in the schema = `Policy.target_branches` / enums — policy-audience targeting only.)

Seeded in `auth.service.ts` `registerStudent` create flow (~L484–509):
- `institute` ← `cleanString(student.instituteName)`
- `course` ← `cleanString(student.courseFullName) ?? cleanString(student.courseShortName)`
- `department` ← `deriveDepartment(student)` = `cleanString(courseShortName) ?? cleanString(courseFullName) ?? 'Unassigned'`
- `program_name` ← `cleanString(student.programName)`
- `pass_out_date` ← `cleanString(student.passOutDate)`

## The standalone branch hierarchy (not per-student)

`policy.service.ts`: `getInstituteOptions()` → `getCourseOptions(InstituteId)` → `getBranchOptions(CourseId)`
hit `env.crmBranchListUrl` (`GetBranchList`), returning `{id,name}` option lists for **policy targeting**.
Route `/policies/audience/branches` = `getBranchOptions`. The only place a student "branch" is produced is
`getStudentAudience` → `branch: student.department` (an alias). `buildStudentAudienceWhere` filters
`target_branches` against `department`.

---

## Backend query-param mapping (the "branch == department" reality)

[backend/src/shared/utils/student-scope-filter.ts](../backend/src/shared/utils/student-scope-filter.ts)
`buildStudentScopeConditions()`:
- **`branch` → `Student.department`** (case-insensitive **contains**). Comment in-file: *"branch == the
  course-derived Student.department"*.
- `institute → Student.institute`, `course → Student.course`, `semester → Student.current_semester`,
  `academic_year`/`passing_year → Student.batch` (all `contains`, case-insensitive).
- Consumed by `admin.service`, `offer.service`, `no-dues.service`, `application.service`, `noc.service`.

**Dual-mapping quirk:** a separate **`department`** query param is applied *independently* in
`admin.service.ts` `buildStudentWhere()` as an **EXACT** match on `Student.department`. So the admin student
list + InterestLists can send BOTH `department` (exact) AND `branch` (contains) against the **same column**.

---

## Where "Department" vs "Branch" appear today

**No report shows both a Branch and a Department column at once.** Same underlying data
(`Student.department`), two inconsistent labels.

### Labeled "Branch" (already standardized) — keep
- Scope reports via `ReportScopeFilters` ("Branches"): `PlacementCountReport`, `PlacementListingReport`,
  `InternshipNocCountReport`, `InternshipNocListingReport`, `NoDuesCountReport`, `NoDuesListingReport`.
- Column "Branch": `EventAttendanceReport`, `StudentParticipationHistory`, `UnplacedStudentsReport`
  (⚠ header says "Branch" but reads `student.department`; backend returns identical `dept_breakdown` +
  `branch_breakdown`).
- Shared filters `AdminListScopeFilters` (placeholder "Branch", options from ERP `usePolicyBranchOptions`)
  and `ReportScopeFilters` — send param `branch`.

### Labeled "Department" (legacy — the relabel/remove targets)
Frontend report components (column and/or filter, all read `*.department`):
`ApplicantListReport`, `CertificatePendingReport`, `ComplianceReport`, `ConsentTrackingReport`,
`InternshipStatusSummary`, `JoiningStatusSummary`, `IssuedNOCRegister`, `NOCByDepartmentReport`
(dept/batch breakdown), `PendingNOCReport`, `PlacementSummaryReport` (dept breakdown), `PortfolioCompletionReport`,
`PublishedPortfoliosReport` (+ "Department Coverage"), `ShortlistRejectionReport`, `OfferToJoinFunnelReport`
(CSV + filter), `OfferAcceptanceSummary` (CSV header).
Admin pages: `ReportsAnalytics.tsx` (Interested Students column+filter; Eligibility & Profile-Completion
dept-wise breakdowns), `StudentManagement.tsx`, `InternshipsManagement.tsx`, `InterestLists.tsx`,
`StudentListTab.tsx`.

Backend `report.analytics.service.ts` reports that **output a `department` field**:
`getInterestedStudentsReport`, `getPendingNocReport`, `getIssuedNocRegisterReport`, `getApplicantListReport`,
`getShortlistRejectionReport`, `getOfferAcceptanceReport`, `getJoiningStatusReport`, `getComplianceReport`,
`getInternshipStatusReport`, `getCertificatePendingReport`, `getPortfolioCompletionReport`,
`getPublishedPortfoliosReport`, `getConsentTrackingReport`, `getOfferToJoinFunnelReport`. Dept-grouped
breakdowns: `getProfileCompletionReport`, `getNocByDepartmentReport`, `getPlacementSummaryReport`,
`getCompanyInternshipReport`, `getEligibilityReport`.

### Filters exposing BOTH (redundant, same column)
`StudentListTab.tsx` (Department dropdown from `useAdminDepartmentOptions()` = master category `branch`;
param `department` exact) **and** the shared Branch filter (param `branch` contains).
`InterestLists.tsx` — same dual setup.

---

## Deferred task & open decisions (unanswered by user)

Request: *"institute course and branch comes from erp and remove department in every report and filter"* —
for TPO Admin & Faculty. Deferred 2026-08-25. Before implementing, resolve:
1. **Branch reality** — since the ERP has no per-student branch, does "remove department" mean **relabel
   Department→Branch** (keep the course-derived value; recommended) or **drop the column entirely**?
2. **Add Institute/Course?** — many legacy reports have only a Department column; add Institute+Course
   columns/filters too, or relabel only?
3. **Scope** — TPO Admin only, or Admin + Faculty?

Recommended shape (pending confirmation): relabel every "Department" column/filter → "Branch" (send `branch`
param → `Student.department`), delete the duplicate Department dropdowns on `StudentListTab`/`InterestLists`,
keep reading `student.department`. Purely a vocabulary standardization; Institute/Course already ERP-sourced,
Branch stays the ERP-course-derived value. Consider renaming backend output field `department`→`branch` for
consistency (larger ripple) vs FE-label-only (smaller, safer).
