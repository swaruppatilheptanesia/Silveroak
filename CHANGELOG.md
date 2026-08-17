# Silver Oak T&P Portal — Functional Changelog

A crisp, user-facing summary of every fix and enhancement shipped in this
working window. Listed roughly in the order they were done, grouped by
area for easier scanning.

---

## UI cleanup

### Faculty portal cleanup + offer detail view
- **My Profile** for faculty no longer shows the **Notifications** tab (only Profile + Security). Other
  roles keep Notifications.
- **Offer & Joining Status** now has a **View** button on each row that opens a slide-over with the full
  offer details and history — read-only (no admin actions).
- **Internships** is removed from the faculty sidebar.

### Hidden sections & clearer No Dues heading
- **Master Data → "Branches"** section is hidden from the TPO Master Data page (Master Data now opens on
  "Skills"). Nothing was deleted — it can be brought back later.
- **"Placement Cell Programs"** is removed from the TPO sidebar.
- **No Dues Certificate** now shows the **student's name** at the top of each request (both the student's
  own list and the TPO admin detail panel), instead of the long internal reference ID.

---

## NOC

### NOC certificate letter — updated recipient, student details, and letterhead
Refreshed the NOC certificate (both the on-screen preview and the downloadable PDF, kept in sync): the
**To,** block is now `To,` / `H.R. Manager / Training Team` / `<Company Name>`; the **Student Details** are
shown as labeled rows — Enrollment No., Student Name, Institute Name, Course, Branch, Semester, Duration
(Institute Name and Course are newly shown); the signature footer now reads
`Email: internship@silveroakuni.ac.in` with the Mobile Number line removed; and the bottom **letterhead**
now shows three centered lines (Established under The Gujarat Private Universities Act 2009 / the updated
Ahmedabad address / Phone · E-Mail · Web). Already-issued PDF files are unchanged; the on-screen view of
past certificates reflects the new layout. *(No migration.)*

### Internship Completion Certificate — submit, TPO approve, and portfolio integration
After a NOC's internship end date passes, the student is reminded (in-app notification) to upload their
**Internship Completion Certificate** from **My NOC Requests → Completed** (an "Upload Completion Certificate"
button on each issued request; a status badge and a view link once submitted). The TPO reviews it under a new
**NOC Management → Completion Certificates** tab and can **Approve** or **Reject** (a remark is mandatory on
rejection; the student can then re-upload). On approval the certificate is **automatically added to the
student's Portfolio → Certifications**, and the student is notified. The **Issued NOC** section now shows all
internship records together per student — Offer Letter, NOC Certificate, and Completion Certificate links plus
the completion status, approval date, and remarks. ⚠ Requires a database migration.

### Apply for NOC — City now filters by the selected State
On the Request NOC wizard (Step 2, both University-drive and Self-sourced), the **City** field now cascades
from **State**: pick a state and the City dropdown shows only that state's cities. Changing the state clears
the city so a stale value can't linger, and an **"Other"** option reveals a free-text box for any city not in
the list (the state's own "Other" free-text path also keeps City as free text). Previously City was a
free-text box whose suggestions ignored the chosen state entirely.

## Applications

### Application Pipeline — attendance status for a selected event
The Application Records table now has an **Attendance for Event** dropdown and an **Attendance** column.
Pick any Events & Drives event and each applicant row shows whether that student was marked **Present /
Absent** (or Late) for it — or **—** when there's no attendance record for that event (or no event is
selected yet). Read-only, no data entry here.

### Application Pipeline — View Resume per applicant
The TPO Admin **Applications → Application Pipeline** applicant list now has a **View Resume** button on each
row that opens exactly the resume the student submitted for that posting (in a new tab). It's disabled with a
"No resume submitted" tooltip for applicants who didn't attach one. Previously the resume was only reachable
from the student profile or a CSV export.

## Tables

### Column sorting on more lists (Phase 2)
Extended clickable column sorting to the remaining list tables that load their data in one go: **Portfolio
Monitoring**, **Eligible Students**, **Selection Database**, **Interest Lists**, **Circulars** (admin,
faculty, student), **Faculty Programs**, and the **recruiter** internship & recruitment-pipeline tables. These
sort the loaded rows instantly in the browser. **Reports are intentionally not included.** No migration.

### Column sorting on management lists (Phase 1)
Management tables across the **admin**, **super admin**, and **faculty** areas now have **clickable column
headers** for sorting — click a header to sort ascending, click again for descending, with an arrow showing the
active column and direction. Sorting is **server-side**: it reorders the entire list across all pages (not just
the rows currently on screen) and returns you to the first page. Covered lists include Offers, Applications &
Pipeline, NOC requests, Drives, Announcements, No Dues, Internships, Postings, Companies, Recruiters, Students,
Users, and Audit Logs. Non-meaningful columns (Actions, computed/multi-value columns like Compensation,
Compliance, Posting Types) are intentionally not sortable. Reports and a few remaining lists will follow in a
later phase. No migration.

## Reports & Exports

### Print & PDF buttons removed — export is CSV/Excel only
Removed the **Print** buttons that sat next to the Export/CSV buttons on the Portfolio Completion, Company
Internship Summary, and Certificate Pending reports, and the **"Print Preview"** button on the Policy
Repository detail sheet. Report tables now offer only the CSV/Excel **Export** options. Note: there was no
separate PDF-export feature to remove, and the **NOC "Download PDF"** and **No-Dues "Download NDC"** buttons
(which download the actual issued certificate) are unchanged.

## Faculty — Department Students

### Fix: exporting the student list failed with an "export limit" error
On **Faculty → Student Directory → Department Students**, exporting to CSV/Excel failed for any department with
more than a handful of students. The export tried to pull everything in one request that exceeded the server's
page-size cap, so the request was rejected. Export now **pages through the full list** and writes every matching
student to the file — no cap, no error. The **Date Range** filter (alongside Institute/Course/Branch/Semester)
already applies to the export, so you can scope what you download. Frontend-only, no migration.

## Drives / Events

### Application Pipeline Stage eligibility + Eligible Student Count
Create/Edit Event now has an **Application Pipeline Stage** dropdown (All, Applied, Mock Round, Shortlisted,
Test Scheduled, Interview, HR Round, Offer Released, Rejected) below Linked Postings. When a stage is chosen,
only students whose **current application stage** on a linked posting matches are added to the event and shown
in the Attendance list ("All" = every applicant). The set is captured when the event is saved and editing only
ever adds students (never removes marked attendance or panel placements). The Events & Drives listing gains an
**Eligible Students** column showing the live count of students matching the event's linked postings + stage
(also in the CSV/Excel export). ⚠ Requires a database migration.

### Fix: assigned Faculty Coordinator couldn't see the event
Assigning a Faculty Coordinator when creating an event didn't surface it under that faculty's **Department
Events**. The coordinator was captured as free-typed text but the backend matched a faculty's events by exact
name, so any difference (title/spacing) meant no match. The "Faculty Coordinators" field is now a **dropdown of
actual faculty accounts**, and event visibility is scoped by the faculty's user id — so an assigned coordinator
reliably sees the event. ⚠ Requires a migration (`Event.faculty_coordinator_ids`). Existing events must be
re-opened and their coordinators re-selected from the dropdown to appear for faculty.

## Interest registration

### Withdrawal — audit trail, student message, and lock
Extended the interest approve/withdraw workflow. When a TPO Admin withdraws (or approves) a student's interest,
the system now records the **admin's name** alongside the date/time. In the **Interest List**, withdrawn students
now stay visible by default with a **Withdrawn** badge plus the withdrawal date/time, admin name, and reason. On the
**student Dashboard**, a withdrawn posting type now shows the message *"You have been withdrawn from this Posting
Type by TPO Admin on [Date] by [Admin Name]."* and the Register button is **locked** — the student can no longer
re-register (a change from the previous behavior where re-registering sent it back to pending); only a TPO Admin can
reinstate. Postings and applying for that type stay blocked as before. ⚠ Requires a migration
(`InterestRegistration.reviewed_by_name`). Events/drives gating for a withdrawn posting type is a separate follow-up.

## Reverts

### No Dues approval no longer closes the placement/internship process
Reverted the earlier behavior where an approved (or issued) No Dues record blocked the student from applying,
showing interest, or requesting a new NOC. Those actions are open again, and the "process closed" banners on the
Dashboard, NOC page, and opportunity detail are gone. The separate rule that a student can only have **one
approved No Dues record** (no duplicate submissions, no admin re-review of an approved one) is unchanged. No
schema change, no migration.

---

## TPO Admin — Filters / Counters / Exports (meeting sheet)

### Dashboard — 10 most recent Interest Registrations
The TPO Admin Dashboard's "Interest Registrations" card previously showed aggregate counts by posting type.
It now lists the **10 most recent registration records** (newest first — student, posting type, date, and a
status badge), so staff can see the latest activity at a glance. The full aggregate breakdown remains on the
Interest Lists page. *(No migration.)*

### Student Management — scope filters + richer exports (Phase 1)
Rolled out a shared **Institute / Course / Branch / Semester** filter bar (with Academic-Year and a date-range
picker) and applied it across Student Management. **All Students** now filters by institute/course/branch/semester,
company, and date range, and its export is a proper **CSV + Excel** over *all* matching students with the full column
set (name, mobile, gender, email, enrollment, institute, course, branch, semester, CPI, 12th, 10th, backlogs, academic
year, project & internship counts, status, resume link). **Verification** gained an Academic-Year filter.
**Portfolio** gained institute/course/branch/semester filters and its export button was removed. **Selection Database**
gained institute/course/branch/academic-year filters and a fuller export (adds gender, email, institute, course,
semester, CPI, 10th/12th, backlogs, academic year). Backend list endpoints accept the new filters; no schema change,
no migration. (Eligibility-Rules institute/course dropdowns are deferred pending a scope-vs-persist decision.)

### Employer / Posting / Applications / Offers — scope filters, counters & exports (Phase 2)
Extended the same shared filter bar to the recruitment screens. **Offer & Joining** now filters by
institute/course/branch/semester/academic-year and an offer-date range, adds a **"Rejected by student"** counter, and
its search box no longer shrinks (the Export/Create buttons moved into the card header). **Applications Management**
gained the same scope + date filters, an **"Applied"** counter, an Academic-Year filter beside Posting Type, and a
**Resume Link** column in the export. **Application Pipeline** replaced its page-derived Branch dropdown with
server-side Institute/Course/Branch + date filters. **Posting Operations** gained Institute/Course/Branch +
Academic-Year + date filters and a CSV + Excel **Export** (company, role, posting type, academic year, bond, min CGPA,
max backlogs, application window, package/stipend, status). **Companies** gained a **Sector/Industry** dropdown + date
filter, an **"Inactive"** counter, and a recruiter-aware **Export** (one row per recruiter). **Recruiters** gained a
**"Rejected"** counter and an Export. Backend list endpoints accept the new filters; no schema change, no migration.
(Postings' Institute/Course/Branch filter the posting's targeting arrays, which are empty until that targeting UI is
re-enabled.)

### Faculty Coordinator — filters, counters, exports, labels (role 2)
Applied the sheet's Faculty Coordinator backlog. The **Dashboard** gained **Total Offer Released** and **Join**
counters and renamed **Placed Students → Accepted**. **Department Students** swapped its Institute/Branch multi-selects
for the shared ERP cascade (Institute→Course→Branch) + date range, relabeled the roll-number column to **Enrollment No**
(now showing the enrollment number), and added an Excel export. **My Programs** added **Gender** to the export, renamed
its export date column to **Interested On Date**, and renamed the listing **Source → Status**. **NOC Approvals** gained
Posting-Type / Academic-Year / date filters, **Approved by TPO / Rejected by Department / Rejected by TPO** counters, a
**NOC Number** column, and a CSV+Excel export. **Offers/Joining** replaced its Joined/Blocked counters with
**Pending/Rejected**, added Academic-Year / date / Posting-Type filters and a **Rejected by Students** status option, and
an export. **Department Events** gained a search box. The faculty NOC and Offers screens reuse the shared endpoints, so
most filters were already backed; no schema change, no migration.

### Super Admin — Audit Logs role filter
Added a **Role** dropdown to Super Admin → Security & Access Control → Audit Logs (it previously filtered
only by Action, Module, and a specific user). Because the audit record doesn't carry the actor's role, the
filter is **server-side**: `getAuditLogs` filters the included `user` relation by role (`where.user = { role }`),
so it's correct across pagination. The individual-**user** dropdown was **removed** (the Role filter covers the
need), which also retired the extra `useUsers` query on that screen. The `role` query param is hardened with
`.catch(undefined)` so any stray value (e.g. an `all` sentinel from a stale bundle) falls back to "no filter"
instead of returning a validation error. Additive backend change; no schema, no migration.

### Student — filters, tabs, search (role 3, final)
Applied the sheet's Student backlog — all frontend, all client-side (the student list endpoints return the
full set, so filtering is in-memory). **My Applications** removed the **Internships** tab (now just
Applications + Offers) and gained a **Posting Type** single-select filter beside the search box. **NOC
Requests** gained a **Posting Type** filter that narrows the request cards and stat counters together. **My
Events & Drives** and **Announcements** each gained a live **Search** box (Drives searches title/company/
venue/type; Announcements searches title/content/audience/author). The **Super Admin → Audit Logs** row of the
sheet was skipped: a role-wise filter already exists and Print & PDF was already removed globally from the
report toolbar. No schema change, no migration.

### NOC / Events / Announcements / No-Dues / Policy / Interest — filters, counters, tabs (Phase 3)
Extended the shared filter bar to the remaining TPO admin screens. **NOC Management** gained Posting-Type +
Institute/Course/Branch + Academic-Year + date filters; its tabs were reworked — "Ready to Issue" was removed
(approved NOCs are now issued from **All Requests** by filtering Status = Approved and using **Review** on the row),
and **Pending by Faculty** + **Rejected** tabs were added. **Events & Drives** gained **Ongoing** and **Cancelled**
counters, Institute/Course/Branch + date filters, an event **Export** (CSV + Excel), and the "Cancel" action was
renamed **Event Cancel** (attendance import/export was deferred). **Announcements** and **Interest Lists** gained the
scope + date filters (Interest Lists also Semester + Academic-Year). **No Dues** gained **Returned** and **Rejected**
counters plus Institute/Course/Branch + Passing-Year filters. **Policy Repository** had its category badge-pill filters
removed. Backend list endpoints accept the new filters; no schema change, no migration. This completes the TPO Admin
role of the FILTER COUNTER EXPORT sheet.

## Reports (TPO → Reports)

### New reports from the meeting sheet — 8 reports across the existing branches
Added **8 reports** under TPO → Reports, placed under their relevant existing branches — Placement Count &
Placement Data Listing under **Placement Analytics**, Internship/NOC Count & Listing under **NOC & Documents**,
Company Data Count & Stage-wise under **Applications & ATS**, and No-Due Count & Listing under a new **No Dues**
section. Each has its own filter bar and CSV + Excel export:
- **Placement Count** and **Placement Data Listing** — placement metrics (total/registered/eligible-at-CGPA≥6.5
  students, companies, NOC count, package highest/average/median/lowest, offer accept/reject/pending) aggregated
  by posting type × institute/course/branch/semester, plus a student-level export.
- **Internship / NOC Count** and **Internship / NOC Listing** — NOC totals (accept/reject, University-Drive vs
  Self-Sourced, stipend highest/average, company count) and a full NOC-level export.
- **No-Due Count** and **No-Due Listing** — No-Due totals with the **five plan-after-graduation categories**
  (Job, Business, Planning for Further Studies, Admission Taken, Competitive Exam) and a student-level export.
- **Company Data Count** and **Company Stage-wise** — company/application totals and the 8-stage funnel per
  posting type.

Every report shares one filter bar (multi-select **Posting Type** + Institute / Course / Branch / Semester +
Academic Year) and safe CSV/Excel export with resolved file links. A few columns without a data source are shown
read-only (NOC completion certificate, placement offer-letter sourced from a matching NOC, "Passing Year" = Batch,
internship+placement status derived). **The No-Due form now offers all 5 reasons** (was 3). ⚠ This adds two
`ExitReason` enum values — **run `npx prisma migrate dev`** in `docs/silveroak_backend`.

### Reports cleanup per the review sheet — Pass 2
The heavier follow-ups to Pass 1, across the 6 kept reports that needed content changes.
**Registration Summary** now groups by **Posting Type** — one row per posting type students actually
registered for (including admin-created/legacy types), instead of four fixed buckets. **NOC by
Department/Batch** swapped its NOC-Type filter for a **Posting Type** filter (matches on the NOC's
program). **Posting History** gained a **Posting Type Summary** card (counts of draft/published/closed
per posting type, following the year/type filters). **Student Participation History** dropped its lone
Branch dropdown and now filters and shows **Institute / Course / Branch**. **Unplaced Students** dropped
the Department filter/column and now filters and shows **Institute / Course / Branch / Semester**. The
**Eligibility Report** replaced its truncated student table with a **department-wise breakdown** (eligible
share per department + eligible/conditional/not-eligible chips), matching the Profile Completion layout.
CSV exports were updated to the new columns. "Branch" everywhere maps to the course-derived department
(students carry no separate branch attribute). No schema change, no migration; restart the backend to pick
up the reports service change.

### Reports cleanup per the review sheet — Pass 1
Trimmed and tidied the Reports section per the "EXISTING REPORTS REMARK" review: **25 reports were removed**
from the menu (and 4 now-empty categories — Employer Management, Internships & Stipends, Portfolio & Showcase,
Communication — disappeared), leaving the 10 reports the team keeps. **Print & PDF buttons were removed from
every report** (CSV export stays). Report exports now say **"Enrollment Number"** instead of "Roll Number"
(Eligibility, Profile Completion, Student Participation). The redundant **"All Department"** dropdown was
removed from Shortlist vs Rejection and Offer Acceptance Summary, and **Posting History by Year** dropped its
per-year summary boxes (the year filter dropdown stays). Frontend-only; no backend or migration. (A Pass 2
covers the heavier items: posting-type regrouping, institute/course/branch/semester filters, and the
Eligibility report redesign.)

## Forms & Validation

### Posting-type filter dropdowns all read "Posting Type"
Every list screen's filter for posting type now shows a consistent **"Posting Type"** label (with **"All
Posting Types"**) — previously one read the bare "Type" and several read lowercase "Posting type". While
standardizing, the **Drives** and **Internships** posting-type filters were also fixed: they were sending
the wrong value and returning no results (a 400) — they now filter correctly. Non-posting "Type" filters
(Event Type, NOC Type, internship payment Type) are unchanged. Frontend-only; no backend or migration.

### Submitting a form now jumps to the first invalid field
When a form is submitted with validation errors, the page now **smooth-scrolls to and focuses the first
invalid field** instead of leaving the user to hunt for the red text — including when that field is a
dropdown (Select). This works across the standard forms (No Dues request, policy add/edit, offers,
internships, certifications, portfolio project/showcase, login). In the multi-step **NOC request wizard**,
submitting from a later step now jumps to the step that holds the first error **and** scrolls/focuses that
field. Frontend-only; no backend or migration.

## Student Management

### TPO approval required before a student joins a Program (Posting Type) + withdraw
Registering interest in a posting type ("Show Interest") no longer instantly enrolls the student — it now
creates a **pending** registration that a **TPO admin must approve**. While pending, the posting type's
postings stay **visible** but the student **cannot apply** (backend blocks with `POSTING_TYPE_PENDING_APPROVAL`;
the Apply button is disabled with an explanatory reason and the Dashboard shows a **Pending approval** badge).
The TPO **Interest Lists** page (`/admin/interests`) gained a **status filter** (Active / Pending / Approved /
Withdrawn) and per-row **Approve** and **Withdraw** actions. **Withdraw** is soft — it marks the registration
`withdrawn` (kept for history, revokes apply), notifies the student, and the student may register again later.
Existing registrations are **grandfathered as approved**, so current students are unaffected. ⚠ Requires a DB
migration; existing tenants also need the one-time `backfill-interest-lists-approve` script so TPO admins have
the approve permission.

### Employment records in the admin Student Details popup
The TPO-admin **Student Details** dialog (View on a student) now shows the student's full **Employment**
records read-only — each entry as a card with company + Active/Closed status, designation · type · package,
the "Closed on" date for closed entries, and the **Offer letter** / **Completion proof** document links —
instead of just a one-line summary. (UI-only; no migration — the backend already returned the list and now
also includes the offer-letter URL + proof name.)

---

## Postings

### Free-text salary/stipend range + original JD PDF filenames
The Create/Edit Posting form now lets admins **type** the Package (CTC) and Stipend range freely
(e.g. "3 - 6 LPA") instead of picking from a fixed dropdown of buckets — in both the single and
multi-role forms. And uploaded **Job Description PDFs keep their original filename** instead of
being labelled "PDF 1 / PDF 2" — the real name shows in the form and on the student/admin posting
detail pages. (Postings created before this still show "PDF N" since their names weren't stored.)

> ⚠ **DB migration (additive):** `Posting` gains `job_description_pdf_names String[]` (index-aligned
> with the existing URLs array). Run `npx prisma migrate dev` and restart the backend. Salary/stipend
> needed no migration — those columns were already free text.

---

## Drives / Events

### Fix: Panel Assignment showed no students
Assigning students to a panel was impossible — the student list came up empty. It only ever offered
people who had **applied to the drive's first linked role**, so it was blank whenever the drive had no
linked role, had several roles (only the first counted), or simply had no applications yet. Students
**already on the drive were hidden entirely**, so an existing attendee could never be placed on a panel
or moved between panels. The list now shows: students already on the drive (with an **Assigned** badge
and their **current panel**, so they can be moved), applicants across **all** linked roles, and — when
the drive has no applicants — **any student**, searchable by name or enrolment number. Empty results
now explain why instead of showing a blank table. Note that choosing **"No panel (remove from panel)"**
for an already-assigned student removes them from their panel. *(No migration.)*

### Fix: Create Event — searchable Event Type & Posting Type dropdowns
In the **Create/Edit Event** form the Company dropdown let you type to search, but **Event Type** and
**Posting Type** did not — you had to scroll the list. Both are now the same searchable dropdown as
Company: click, type to filter, pick. Behaviour is otherwise unchanged (both stay required, changing
the Posting Type still resets Company and Linked Postings). *(UI-only; no migration.)*

### Pipeline targeting — send a drive to an institute/course/branch only
The Create/Edit Event form now has a **Pipeline (audience)** scope card — pick an **institute, course,
and/or branch** and the drive is sent to **only those students**. The matching students are **assigned
automatically**, so when the event is published they're notified and see it under their drives (the
existing assignment/attendance/panel flow is reused). Leave the pipeline empty to assign students
manually as before. Editing an event's pipeline **adds** newly-matching students and never removes
anyone (no loss of attendance/manual assignments). Branch picks fall back to the parent course (students
have no branch-level value), consistent with the posting-type behaviour.

> ⚠ **DB migration (additive):** `Event` gains `target_institutes`, `target_courses`,
> `target_branches` (`String[]`). Run `npx prisma migrate dev` and restart the backend.

---

## Master Data

### Application Receiving ON/OFF toggle for posting types
Each posting type in **Master → Posting Types** now has an **Application Receiving** switch (above the
Edit / Deactivate / Delete buttons). When switched **OFF**, the posting type is still **visible** on the
Student Dashboard, but its **Register** button (Interest Registration) is disabled and students can't
apply to that type's postings — including students who had already registered interest — until it's
switched back ON. It's independent of Deactivate (which hides the type entirely). Everything else is
unchanged.

> ⚠ **DB migration (additive):** `MasterOption` gains `accepting_applications Boolean @default(true)`
> (all existing posting types stay ON — no backfill). Run `npx prisma migrate dev` and restart the
> backend.

### Fix: "Referenced record does not exist" when deleting a posting type
Deleting some posting types failed with the cryptic error **"Referenced record does not exist"**, while
others deleted fine. A posting type **cannot** be deleted while any posting (draft, published or closed)
still uses it — that's a deliberate safeguard, otherwise those postings and their applications/offers
would be orphaned. The error now says so plainly: *"Cannot delete posting type 'X' — 4 postings still
use it. Delete or reassign those postings first, or deactivate this posting type to hide it from new
forms."* **Deactivate** (the button next to Delete) is the intended way to retire a type that's in use —
it stops new students showing interest and removes it from admin dropdowns, while existing postings keep
working. The delete confirmation also now spells out side effects that used to happen silently: linked
**NOC templates** are deleted, student **placement-preference** records are removed, and linked
**policies** revert to global. *(No migration.)*

### Fix: branch-scoped posting types were hidden from students
Scoping a posting type to a **branch** made its postings disappear for students — even students of that
branch. (With no scope, or institute/course/semester scope, everything worked.) Cause: students have no
branch-level field (their "branch" is derived from their course), so a branch filter could never match a
student and, because all scope dimensions are AND-ed, it cancelled the otherwise-correct institute/course
match — removing the type from the student's interest registration and the Opportunities type filter, which
in turn hid its postings on the Dashboard. **Branch now falls back to its parent course** for student
visibility, so a branch-scoped type correctly shows to students of that course. Institute/course/semester
scope are unchanged, and postings/applications/analytics are untouched. (Backend-only; no migration.)

### Posting Types — Academic Year scope + filter
A posting type can now be scoped to one or more **academic years** in the Institute/Course/Branch scope card
(new "Academic Years" multi-select, options from the Academic Years master). The Posting Types section gains a
**"Filter by academic year"** dropdown: pick a year to see the types for that year — types with no academic
year set are treated as applying to all years and always show. This is an admin-side organizing/filter tool
only; it does not change what students see.

> ⚠ **DB migration (additive):** `MasterOption` gains `target_academic_years String[]`. Run
> `npx prisma migrate dev` and restart the backend.

---

### Posting Types show their companies
In TPO admin → Master Data → **Posting Types**, each type now lists the **companies that have used it** —
the distinct companies with a published or closed posting of that type (drafts excluded), shown as chips
under the type ("No companies yet." when there are none). Read-only; no schema change.

---

### Event Type is now a configurable Master
Event types are no longer a fixed code list — they're a tenant-managed Master like Posting Type / NOC Type.
TPO admin → **Master Data Management** now has an **Event Types** section (pre-seeded with the existing 5:
Campus Drive, Pre-Placement Talk, Test / Assessment, Internship Drive, Workshop). Admins can add/relabel/disable
types, and the **event creation** dropdown is driven by that list. New types show correctly everywhere events
are listed (student/faculty/recruiter drives, detail & circular dialogs, reports, the admin type filter).

> ⚠ **DB migration:** `MasterCategory` enum gains `event_type`; `Event.type` changes from the `EventType` enum
> to a string (the `EventType` enum is dropped). Existing event rows keep their values. Run `npx prisma migrate
> dev` and restart the backend. Event writes are validated against the active event-type masters.

---

## Recruiter Portal

### Offer-letter document hidden from recruiters
On the recruiter's **Internships** detail view, the uploaded internship document (the
"Completion Certificate → Open certificate" link — the file students upload as their offer
letter / internship proof) is no longer openable by recruiters. The Uploaded/Pending status
still shows, but the document link is removed for the recruiter role. Admin and student views
are unchanged. (UI-only; the document URL is still in the API response — a future hardening
task could strip it server-side.)

---

## Student Navigation

### "New"/unread dot on the student sidebar
Student left-sidebar items now show a small dot when the surface has new content. **Announcements** uses the
real backend unread flag (clears as each is read). **Circulars** and **My Events & Drives** have no read
flag, so they use a "new since you last opened the page" signal (a last-visit timestamp stored locally) —
opening the page clears the dot, and a newly posted circular/drive brings it back. Frontend-only; the
indicator queries run only for students.

---

## Announcements

### Republish an archived announcement
Archiving an announcement used to be a one-way door — an archived row had no actions at all, so a
recurring notice (or an accidental archive) could never be brought back. Opening an archived
announcement now shows a **Republish** button that returns it to the active student feed. Republishing
**notifies students again** and updates the **Published** date to the republish date — the confirmation
dialog says so before you commit. Its earlier read/consent counts are kept, so the read rate continues
from where it left off rather than resetting. Archived announcements still can't be edited directly —
republish first, then edit. *(No migration.)*

### Fix: multiple Institutes/Courses/Branches + hierarchical Semester targeting
The Create/Edit Announcement audience picker only allowed **one** Institute, **one** Course and **one**
Branch, and had no Semester at all. It's now a proper **Institute → Course → Branch → Semester**
hierarchy where **every level is multi-select** and each level narrows the one below it (leave a level
empty to include all of it). The **Semester** list is built from the students actually in the chosen
scope and shows a student count per semester — so a B.Tech-only semester simply never appears while
BCA is selected, and **invalid combinations can't be picked at all**. Two supporting behaviour notes:
selecting a **Branch** also matches its parent **Course** (student records carry no branch field, so a
strict branch filter previously reached nobody), and **Semester now applies to every announcement**, not
just ones created in the old "Specific Semester" mode — which is why that mode has been removed from the
audience dropdown. Existing "Specific Semester" announcements open as **All Students** with their
semesters intact and reach exactly the same students. *(No migration — the columns already existed.)*

### Semester targeting + PDF/image attachment (create form)
The Create Announcement audience dropdown is now **All Students / Specific Semester / Eligible for
Posting** — the **Batch** and **Department** options (and their checkbox groups) were removed and replaced
by **Specific Semester** (pick semesters 1–8). Announcements can now carry **one optional attachment** (PDF
or image), shown to students as an **"Open attachment"** link on the announcement. Existing batch/department
announcements still reach their original audience (kept for back-compat); only the create UI changed.

> ⚠ **DB migration (additive):** `TargetAudienceType` enum gains `semester`; `Announcement` gains
> `target_semesters` + `attachment_url/name/mime_type/size`. Run `npx prisma migrate dev` and restart the
> backend.

---

## Faculty Coordinator

### Fix: faculty couldn't see their students, NOCs, or the Institute/Semester filters
A faculty coordinator's **Student Directory** was empty (or showed too few students), the **Institute** and
**Semester** filter dropdowns didn't load, and their students' **NOC requests** weren't visible. Cause:
faculty visibility matched students by an exact, case-sensitive `student department == faculty department`,
but a student's department is derived from their CRM course while the faculty's was free-typed (or a branch
name) — so they rarely matched, and the institute/course/branch assignment the admin actually sets in Add
User was **ignored**. Faculty scoping now **honours that assignment** (institute/course/branch) with tolerant
matching (a student matches when their course/department lines up, branch falling back to course) — so the
Directory lists the right students, the Institute/Semester dropdowns populate (derived from the now-correct
set), and the NOC list/approvals show the faculty's students. Offers for faculty honour the same assignment.
Department-only faculty keep working (now case-tolerant). (No migration.)

### Fix: student Portfolio tab wouldn't load in Department Students
On **Department Students → View**, the **Portfolio** tab sat on "Loading portfolio…" forever (only the
Profile tab worked). The student-portfolio endpoint was blocking faculty outright (a role gate rejected
them before the route's own faculty allowance), and even past that it filtered students by an exact
department-name match that almost never lines up — so faculty saw nothing. Faculty can now open the
portfolio of any student in their Directory, using the same scoping as the rest of their views. *(No
migration.)*

### Fix: My Programs showed the whole class under every program
On **My Programs**, selecting a program listed the faculty's entire course cohort — the same students
appeared under every program, so the list wasn't specific to the program at all. A program now shows only
the students actually engaged with it: those who **registered interest**, **applied**, or **received an
offer** for that posting type. Students who did none of those no longer appear (they're still in the Student
Directory). The Source badge now reads Interested / Applied / both. *(No migration.)*

> Note: if the **Semester** dropdown is still empty after this, it's because `academic_profiles.semester`
> isn't populated for those students — a separate data fix.

## NOC (No Objection Certificate)

### "Internship Type" (Internship / Placement) on the NOC apply form
The student NOC apply form now has a required **Internship Type** selector (single-choice: **Internship**
or **Placement**) right after the Start Date / End Date fields. The choice is saved on the request and
shown on the student NOC detail sheet and the admin review dialog. ⚠ Requires a DB migration (a new
nullable `internship_type` column; existing NOCs read as blank).

### "Pending Faculty" counter added to the NOC Management summary
The admin NOC Management summary now shows a **Pending Faculty** card (awaiting faculty/coordinator
approval) alongside Total / Pending TPO / Approved / Issued / Rejected — previously that first-stage count
was missing. Display-only counter; frontend-only, no backend or migration.

### "Other – Enter New Company" pinned to the top of the company search
In the student NOC wizard (Self-Sourced/Off-Campus), the Company Name search now shows **"Other – Enter
New Company" at the top of the results and keeps it visible even while you type** — so if the company
isn't in the list, you can always pick Other and type a new name (which the backend creates). Previously
the Other option sat at the bottom and disappeared as soon as you searched, which is exactly when you'd
need it. Implemented via a reusable `pinnedOptions` prop on the shared searchable-select. Frontend-only;
no backend or migration.

### Fix: Phone and Pincode are now validated on the NOC form
Step 2 of **Apply for NOC** accepted anything in the **Phone** and **Pincode** fields — `hello` was a
valid phone number and `abcdefgh` a valid pincode, and those values ended up on the issued certificate
and on the recruiter record created from it. Phone must now be a **10-digit Indian mobile** (typing
`+91 98765-43210` or `098765 43210` is fine — it's saved as `9876543210`), and Pincode must be **6
digits**. Both fields **stay optional** — you're only stopped if you type something invalid — and the
same rules are enforced by the server, not just the form. Existing NOCs are untouched. *(No migration.)*

### Fix: NOC Program list now shows only the student's own posting types
Raising a **Self-Sourced** NOC listed **every posting type in the university** — a B.Tech student was
offered BCA-only programmes and vice versa. The **Program / Category** dropdown now shows only the
posting types that student is **eligible for** (their institute / course / branch / semester scope —
posting types with no targeting still reach everyone) **or has registered interest in** from their
Dashboard. Old interest records that point at programmes which no longer exist are ignored, so nothing
in the list can fail validation on submit. If a student has nothing available, the field explains that
they need to register interest first rather than showing an unusable list. **University Drive NOCs are
unchanged** — those still come from the student's released offers, so a student placed in a programme
outside their scope can still raise their NOC. *(No migration.)*

### Fix: company name missing under "To," on the NOC certificate
The recipient block on an issued NOC showed only the contact person's name and designation — the
**company name was never printed**, and when a NOC had no contact person recorded (the normal case for
a NOC raised from a TPO-released offer) the certificate showed a blank underscore line instead. The
block now reads **To, / Recipient Name / Designation / Company Name**, and **lines with no data are
left out entirely** rather than printed as blanks or dashes — so a NOC without a contact person simply
reads "To," followed by the company name. This block was hardcoded in two places (the generated PDF and
the on-screen certificate) which had drifted apart; both now match, so the template's Live Preview shows
what actually gets issued. Already-issued NOCs pick up the company line on screen; their previously
generated PDF files are unchanged. *(No migration.)*

### "University Placement Drive" category now lists TPO-released offers
A student placed by the **TPO Cell** has an **accepted Offer**, not a campus-drive **Event** — so the NOC
wizard's **"Assigned University Drive"** dropdown (which was sourced only from Events) came up empty for them,
forcing the NOC under **"By Self" (Self-Sourced)**. That single dropdown now lists **two groups**: the existing
**University Drives** and **Offers Released by TPO Cell** (the student's accepted offers). Picking an offer
**pre-fills the company name and role** (and the posting type when valid) — all still editable — and files the
NOC under **University Placement Drive** instead of Self-Sourced. The assigned-drives path and the "By Self"
path are unchanged. **Frontend-only — no `PlacementSource` enum change, no migration, no backend change**
(`placement_source` stays `university_drive`; the company is matched by name to its existing verified record).

### Self-placed NOC blocks applying for the same posting type
If a student has a **self-sourced (self-placed) NOC** that isn't rejected for a posting type, they can no
longer **apply to** or **register interest in** postings of that **same posting type** (other types stay
open; on-campus / university-drive NOCs don't trigger this — those are covered by the offer lock). The
Opportunity page disables Apply with a clear reason, and the apply/interest action is rejected server-side
(HTTP 422). No DB change.

### TPO Admin — current stage + view documents from the list
The NOC Management table now has a **"Stage"** column showing where each request currently sits
("Faculty Coordinator", "TPO Cell", "TPO Cell — ready to issue", "Completed", "Closed"), so a NOC
**still at the Faculty Coordinator is visible** (under All Requests) instead of only appearing once
faculty has approved. A new **"Documents"** column lets the TPO admin open the uploaded **offer
letter** and **company proof** straight from the row (new tab); rows with no documents show "—". No
change to who can approve what — faculty-stage rows stay view/track-only for the TPO.

### Cleaner company capture, verifiable company, optional end date
The NOC request form was upgraded so self-sourced company details are tidier and feed a
real, verifiable company record:

- **Company Name** is now a **dropdown** of existing companies, with an **"Other → enter a
  new company"** escape for first-time employers.
- **State** is a built-in **Indian-states dropdown** (plus "Other"); **City** and
  **Designation** stay free-text but now **autocomplete** from values used in earlier
  requests.
- Added optional **Company PAN** and **GST** fields (light format checks) and **one optional
  Supporting Document** upload (e.g. PAN card, GST certificate, registration proof) alongside
  the existing offer letter.
- Submitting an NOC now **find-or-creates a real Company** record, **marked "Added by
  Student"** and **pending verification**. When the NOC is **issued**, that company is
  automatically **marked verified**. An existing company matched by name is linked (and only
  its empty fields are filled) — never overwritten.
- **End Date is no longer mandatory.** Leaving it blank submits cleanly; open-ended
  engagements show as **"Ongoing"** across the student cards, detail, admin table, and the
  generated certificate.
- The posting type a request is for was already shown in the student and admin lists
  (unchanged). The admin/faculty review view now also shows **PAN/GST**, the **supporting
  document** link, and the **company source / verified** badges.

> ⚠ **DB migration:** new `CompanySource` enum; `Company` gains `source`,
> `verification_status`, `pan`, `gst`, `city`, `state`; `NocRequest` gains `company_id`
> (FK), `company_pan`, `company_gst`, `supporting_document_url/_name`, and `end_date` becomes
> nullable. Defaults are chosen so **existing companies need no backfill** (they stay
> verified). Run `npx prisma migrate dev`, then restart the backend.

---

## No Dues (NDC)

### Request form is now dynamic per Exit Reason
The student **Request No Dues Certificate** form now shows a different set of fields depending on the chosen
**Exit Reason** (a dropdown of 5: Job / Employment, Business / Entrepreneurship, Planning for Further
Studies, Admission Taken for Further Study, Competitive Exam Preparation). Every reason captures an **SOU
Passing Year** and a proof attachment whose helper text lists the accepted documents for that reason (the
Planning and Admission reasons show different accepted documents for **India vs Abroad**, based on a new
Country dropdown). For Planning, the **Language Test** field is required only when the country is not India.
Each reason's fields (company/sector/package/address, business details, university/course/country, exam
details, etc.) are all captured and shown to the TPO reviewer in the request detail. ⚠ Requires a database
migration.

### Export All to Excel (full details + document links)
The No Dues Management list now has an **Export All** button. It downloads an Excel (`.xlsx`) file
containing **every request matching the currently selected status filter** (across all pages), with one
column per detail field — student info, exit-path-specific fields (employment / family business / higher
studies), and status/review metadata — plus **clickable document URL columns** (Offer Letter, Admission
Letter, Proof, Certificate). Frontend-only; no backend or schema change.

### "Issue NDC" action hidden from the admin UI
The admin-only **Issue NDC** button (and the non-admin notice) on an approved request's detail sheet was
removed so issuing isn't a required/visible step. The backend issue endpoint is untouched (UI-only).

### Approved No Dues closes the student's placement & internship process
Once a student's No Dues request is **approved** (or issued), their placement/internship process is now
**closed**: they can no longer **apply** to a posting, **register interest** (Show Interest) in a posting
type, or **request a new NOC**. Enforced on the backend (HTTP 422 `NO_DUES_PROCESS_CLOSED`) at all three
entry points, so the rule holds regardless of the UI. In the app, the **Apply**, **Register**, and
**Request New NOC** buttons are disabled with an explanatory banner/tooltip once No Dues is approved,
while existing applications, offers, and NOC records **stay viewable**. Accepting/rejecting an existing
offer is unaffected. No schema change, no migration.

### One approved No Dues record per student (approval-validation guard)
Previously a student's No Dues process wasn't locked after approval: the API let a student submit another
request, and a TPO admin could approve/reject/change-status a *different* pending or rejected request for the
same student (creating two approved records) or flip the approved one via **Change Status**. Now, once a
student has an **approved** (or issued) No Dues record, all No Dues actions for that student are blocked — new
submission, resubmission, edit, and every review/status change — enforced on the backend (HTTP 422
`NO_DUES_ALREADY_APPROVED`). The **first** approval and issuing an approved record still work. The admin
detail sheet now hides the **Edit Form** / **Change Status** actions on an approved request. No schema change,
no migration.

---

## Top bar & Branding

### Logo-only sidebar header
The top-left branding now shows the university logo on its own (the "SOU" title and the
portal-name line were removed) and the logo is enlarged for full view.

### User-type chip with Change Password / Logout
The top-right Logout button is replaced by a **user chip** showing the signed-in person's
avatar, **role** (e.g. "TPO Admin", "Faculty Coordinator", "Student") and name. Clicking it
opens a menu with **Change Password** (a quick dialog usable from anywhere — no longer only in
the profile Security tab) and **Logout**.

---

## Employment

### Multiple employment entries + close with completion proof
The student Employment tab is now a **list** — add as many employment entries as
needed (Type, Company, Designation, Package). The **Duration** field was removed.
Adding an entry **requires an offer-letter document**. Each entry has a **Close**
action that **requires uploading a completion proof document**; once closed the entry
is **read-only**. Active and closed entries can be deleted (with confirmation). Entry
cards link to the offer letter and (once closed) the completion proof. The admin
student detail now shows the full list.

> ⚠ **DB migration:** `CurrentEmployment` goes one-to-many (drops the per-student
> unique), drops `duration`, and adds `status` / `closed_at` / `completion_proof_url` /
> `completion_proof_name`. Run `npx prisma migrate dev`.

---

## Placement preferences (opt-out)

### Re-enable is now TPO-admin-only; admin sees the full history
Opting out (global or per posting type) is still self-service with a **reason + confirm**, but it is now
**locked** — a student **cannot re-enable it themselves**. The opt-out switches become read-only with a
"contact your T&P office to re-enable" note. Only the **TPO admin** can **reopen** placement: the admin
**Student Details** popup gains a **Placement** card showing the opt-out status + reason + date, any
per-posting-type opt-outs, the full **enable/disable history with reasons**, and **Reopen** buttons
(single confirm, no reason). The apply/register-interest gate message now points students to the T&P
office. (No migration — the fields and history table already existed.)

### Students can opt out of placement — globally or per posting type
A new **Placement** tab in the student profile lets a student turn off placement
**entirely** (a master switch) or **per posting type**. Opting out asks for a
**reason** and a confirmation; re-enabling is a one-click confirm. Every change is
saved to a **history** list shown in the tab.

### Opted-out postings stay visible but can't be applied to
Postings of an opted-out type still appear in the student's listings, but the
**Apply** button is disabled with a clear reason ("you've opted out of … — re-enable
in Profile → Placement"), and the server blocks the apply / register-interest call.
Existing applications are untouched — only new ones are blocked. The global switch
overrides the per-type switches while it's on.

> ⚠ **DB migration:** adds 3 `Student` columns + two tables
> (`student_posting_type_preferences`, `student_placement_preference_history`).
> Run `npx prisma migrate dev`.

---

## Profile & Account

### My Profile page for every non-student role
Added a "My Profile" page (with Profile + Security tabs) for TPO Admin,
TPO Employee, Faculty Coordinator, Super Admin and Management. Each
role now has a sidebar entry to view their own details and change their
password — previously only students had this.

### Profile page no longer crashes on package details
The student profile used to crash with a `lpa.toFixed` error when the
saved package value came back as a string. Now any package value is
handled cleanly and displays correctly.

### Management role login no longer shows a blank screen
A management user landing on the portal after login used to see nothing.
Now the management login lands on their My Profile page (their only
configured route).

---

## Notifications

### Audit of every notification trigger across the system
Produced a tabular report of every action that should send a
notification, who should receive it, and whether it was wired up.
Found that only the "offer released" flow was actually firing — every
other domain event was silent.

### Notifications wired into every domain event
The bell now lights up for: showing interest, applying to a posting,
moving an application across stages, mock-round results, application
withdrawals, offer acceptance / rejection / admin override, NOC
requests through every approval and issuance step, event slot
assignment + attendance, no-dues submissions and approvals, recruiter
verification verdicts, announcements, circulars and policy
publications.

### Per-user notification preferences
A new Notifications tab on every user's profile lets them mute or
unmute each category (offers, applications, NOC, events,
announcements, etc.) independently. Plus "Enable all" / "Mute all"
convenience buttons. Preferences are honoured at write time so muted
categories don't even create unread rows.

---

## Offers & Application Lifecycle

### Create Offer — filter the Posting list by Posting Type
The **Create Offer** dialog now has a **Posting Type** dropdown at the top. Pick a type and the Posting
dropdown lists only postings of that type, so you select from the relevant set; "All posting types"
restores the full list. Changing the type clears any previously-selected posting. *(No migration.)*

### Fix: Posting Type filter broke the Offer Records list
Choosing a **Posting Type** in Offer & Joining Management showed *"Unable to load offers — One or more
fields have validation errors"* and the list disappeared until the filter was cleared. The dropdown was
sending the posting type's **name** where the server expects its **ID**, so the request was rejected
outright. The filter now works and genuinely narrows the list. *(No migration.)*

### Fix: Offer Records was stuck on the first 20 records
**Offer & Joining Management → Offer Records** showed only 20 offers with no way to reach the rest —
the Previous/Next controls existed but never appeared, because the page count sent by the server was
being read under the wrong name and always came back as "1 page". Paging now works, and the same fix
restores the pager on **Faculty → Offers**. The **search box now searches every offer record** instead
of only the 20 rows on screen, so you can find a student who sits on page 7 — searching still covers
student name, enrolment number, company and role, but **no longer matches posting title or type**.
*(No migration.)*

### Released offers visible to students for explicit accept/reject
TPO-created offers now wait in a "Pending Acceptance" state instead of
being auto-accepted on creation. Students see the offer prominently
on their Dashboard and inline in My Applications, with Accept and
Reject buttons. A Reject action prompts with a permanence warning
before going through.

### Applications locked permanently once an offer is released
The moment an offer is released, the student cannot apply to or
register interest in any other posting — across both jobs and
internships. The block stays even after rejection or admin
withdrawal. Apply / Register Interest buttons are pre-disabled with a
clear reason on the relevant student screens.

### Create Offer no longer crashes on save
The TPO admin's Create Offer dialog used to crash on submit when the
posting type implied an optional field was absent. Saves work
correctly for both job and internship offers now.

---

## NOC

### NOC reference number uses a real 3-letter posting code
Previously most postings produced 2-letter codes (and
`summer_internship` collided with `stipend_internship`). The reference
now uses the first 3 letters of the posting type, uppercase — e.g.
`SUM`, `WIN`, `STI`, `IND` — so each NOC's reference is clearly
distinguishable.

### NOC Type field hidden on Create NOC (defaults to internship)
The Create NOC wizard no longer asks for "NOC Type"; the value is
fixed to "Internship" behind the scenes. One fewer field for students
to fill in.

### End Date no longer mandatory on Create NOC
The End Date field is now optional. The system still validates that
end date is not earlier than start date when both are provided.

### Mobile number removed from issued NOC certificate
The Director's contact mobile line on the issued NOC PDF is no
longer printed. Name, designation and email remain.

### Circulars visible to students
Students didn't have a way to see circulars at all. Added a
"Circulars" sidebar entry + page where students can browse and search
all generated circulars from the T&P office, with detail view in a
side sheet.

### Drives page works for students
The "My Events & Drives" page used to error with "Role 'student'
cannot view on 'events'". Now students see only the events they're
slotted into. Event detail also opens cleanly without the same error.

---

## Recruiters & Employers

### Recruiter login broken for orphaned accounts — repaired
Some recruiter accounts had been created without being linked to a
company, so the recruiter portal failed for them with
"Recruiter profile not found". Added an admin "Link to Company"
action in User Management, plus the specific user
(`recruiter@gmail.com`) was relinked to Sai Fakira.

### Staff email validation accepts both institute domains
Creating a TPO / Faculty / Management user now accepts an email ending in **either**
`@silveroakuni.ac.in` **or** `@socet.edu.in` (previously only the first was allowed, which blocked
staff — including CRM-imported staff — whose official email is on `@socet.edu.in`). Other domains are
still rejected for those roles; students and recruiters are unaffected. *(No migration.)*

### Stronger password rules when setting a password
Anywhere a password is **set** — student sign-up, forgot/reset password, Change Password, and Super
Admin Add User — the new password must now be **at least 8 characters and contain at least one
uppercase letter and one special character** (previously just 8+ characters). Each form shows the rule
and flags exactly what's missing. **Logging in is unchanged**, so existing accounts keep working with
their current passwords — the rules only apply when a new password is chosen. Auto-generated temporary
passwords (shown when an admin creates/reactivates a user) now also meet these rules. *(No migration.)*

### Recruiter creation now produces a real user
When a TPO admin adds a recruiter from the Company Detail page, the
system now also creates a login account in the same step (previously
the recruiter had no way to sign in). The recruiter is auto-verified
because admin-created = trusted.

### One-time temporary password shown on screen
Because there's no email transport yet, every new recruiter create
(and every re-activation of a recruiter) shows a one-time password in
a copy-able modal. The admin shares it out of band. Closing the
modal without copying means regenerating it.

### Super Admin can deactivate / re-activate any user
The existing deactivate-toggle now also covers recruiters; on
re-activation, a fresh password is generated and shown. Deactivation
just flips the flag.

### Add Company dialog cleaned up
Required-field stars added to Name, Industry and Address. Website is
clearly marked optional. The "must start with http://" check on
Website is removed so plain domains like `silveroak.ac.in` work.

### Duplicate companies are now prevented as you type
Typing a Company Name in **Add Company** now shows matching companies
that already exist, each with a **Use this company** button that opens
that company instead. If the name is the *same* company typed
differently — different case, spacing or punctuation ("Infosys",
"infosys", "Info-sys") — the dialog says *"A similar company already
exists. Please select it from the list."* and **Save is blocked**. If
it merely resembles one ("Infosys BPM" next to "Infosys"), it's only a
warning and you can still save, since those are genuinely different
companies. Renaming a company onto another company's name is refused
the same way. Legal suffixes are treated as meaningful, so "Acme Ltd"
and "Acme Inc" stay separate. *(No migration. Companies that are
already duplicated stay as they are — this only stops new ones.)*

---

## Admin Tools & Filters

### Application Management posting filter fixed
Picking a Posting Type used to either return zero results or 400
errors. The dropdown now correctly narrows the Posting list to the
selected type and filters applications properly.

### Faculty Coordinator: Institute / Branch / Semester filters on Student Directory
The faculty's "Department Students" page now has Institute, Branch
and Semester multi-select filters that narrow the student list (AND
across categories, OR within each). The CSV export respects the
active filters and includes the full filtered result set — not just
the visible page.

### Student Directory — date-wise + 100 per page
The Super Admin / TPO Admin All Students tab now lists students
newest-first and shows 100 per page (was sorted by name, 5 per
page).

### TPO Employee removed from "Add User" role list
The Super Admin's Add User dialog no longer offers TPO Employee.
Existing TPO Employee users remain visible, editable and filterable
in the listing.

### Student and Super Admin also removed from "Add User" role list
The same Add User dialog now only offers TPO Admin, Faculty
Coordinator, Recruiter and Management. Students should sign up via
their own onboarding flow; Super Admin accounts aren't provisioned
from this screen.

### Internal staff accounts must use the @silveroak.ac.in domain
When creating a TPO Admin, TPO Employee, Faculty Coordinator or
Management user, the email must end with `@silveroak.ac.in`. The
constraint is enforced both at the form level (with a clear hint
under the email field) and at the API level. Student and recruiter
emails are unaffected.

### Bigger Dialog reliability
All confirmation dialogs and modals across the portal now only close
via the X icon or an explicit Cancel button. Clicking on the dim
backdrop or pressing Escape no longer dismisses a dialog — so a
mis-click can no longer wipe a half-filled form.

### Confirmation prompts on every destructive action
Any "Delete" or "Deactivate" action now opens a confirmation dialog
before proceeding. This covers slot-allocation student/panel
removals, circular-template field removals and notification dismissal
— the few places that previously acted instantly. Other destructive
flows were already confirming.

### Students-on-posting view scoped to the viewing student
On a Job/Internship Detail page, a student used to see the full list
of every other student who had received an offer on that posting.
Now they see only themselves (if they were offered). Admin / faculty
/ recruiter views still show the full list.

---

## Data Consistency

### CGPA: NULL is treated as 0 everywhere
Previously a student with no CGPA recorded would show "Not set" in
some places and 0 in others. Now NULL is uniformly treated as 0 —
the display falls back to `0.00`, new student records default to 0,
and a one-off script is available to backfill existing NULL rows in
the database.

### Crash on recruiter pipeline and other date displays
The recruiter pipeline used to crash with "Invalid time value" when
a posting had no deadline or a malformed date. The shared date
formatter now safely handles missing / unparseable dates by showing
"Not available" instead of crashing.

---

## Recruiter & Other UX Polish

### Filter chips with overflow fixed (multi-select)
The Institute / Course / Branch selectors in user management used to
break when too many chips were selected — the X icons on chips
overflowed across columns, so picking the wrong X could remove an
unintended item. Chips now stay confined to their column and each X
reliably removes only its own item. The cascade behaviour (clear an
Institute → clear its dependent Courses + Branches) was preserved.

---

## Student Profile

### Skills tab — long suggestion lists collapse to one row
On the student's own Profile → Skills tab, the master suggestion chips
(Technical Skills, Domain Interests, Preferred Locations) used to render
the full list and push the page down. They now collapse to a single row
with a "Show more / Show less" toggle that only appears when the chips
actually overflow one line. (Project-technologies and the Portfolio
dialog use the same component but are unaffected — the behaviour is
opt-in.)

### Projects — GitHub URL and Demo URL are now optional
Adding/editing a project no longer forces GitHub URL and Demo URL. They
can be left blank (the required asterisks are gone, labels read
"(optional)"). If a value is typed it must still be a valid URL. Backend
validation relaxed to match (the columns were already nullable, so no
migration).

### Employment Type limited to Full-time / Part-time
The Employment Type dropdown now offers only "Full-Time Job" and
"Part-Time" — "Business" was removed. Any student who had previously
saved "Business" is shown as Full-Time when they next open the profile.

### Resume Manager — PDF only
Resume uploads are now restricted to PDF files (was PDF/DOC/DOCX),
enforced in the file picker, with a client-side check before upload, and
on the server. Policy-document and NOC offer-letter uploads still accept
DOC/DOCX. Existing non-PDF resumes already on file remain usable.

---

## My Portfolio

### Simplified to two tabs with a summary header
Removed the **Settings** tab. The **Portfolio Summary** stats card
(Projects / Internships / Technology Tags / Completion) now sits above
the tabs and is always visible. The **Showcases** tab is renamed
**Internships**. The **"Visible to recruiters"** publish toggle was
removed entirely — portfolios are visible to recruiters/faculty by
default (the backend default), so nothing is hidden; students just can
no longer move a portfolio back to draft from this screen.

---

## Postings

### All Postings now shows the real posting type
On **Postings → All Postings**, the **Type** column labelled every
admin-created posting type as "Stipend Internship" — only the two
original built-in types ("job" and "internship") displayed correctly.
Each row now shows the posting type actually chosen when the posting
was created ("Test Placement", "OJT - 2026 HONOURS NEP INTERNSHIP",
and so on), and the column header is renamed **Posting Type**. On the
current data that fixes 8 of 23 postings — and since no posting is
actually of type "stipend_internship", that label was wrong every time
it appeared. *(UI-only; no migration.)*

> Note: the same underlying cause still affects a few other screens —
> the posting-type badge is **blank** on the student Opportunities
> cards / Opportunity Detail / admin Posting Detail, the
> "Placements" / "Internships" count cards on All Postings still count
> every non-job type as an internship, and the recruiter Recruitment
> Pipeline and Offer-to-Join Funnel report label types by hand. Left as
> is for now by decision.

### Posting form reworked
- **Application Override** removed (postings no longer get the
  "keep open past end date" toggle).
- **Job Description PDF** now supports **multiple** PDFs (upload several,
  each removable; detail pages list them all).
- **Student Visibility** section hidden (commented out) for now —
  postings are visible to all students; Posting Type stays per-role.
- **Location** is now **multiple cities** entered as free-text chips
  (per role).
- **Salary / Stipend** use **preset range buckets** (e.g. "3 - 6 LPA",
  "10,000 - 20,000 / month") instead of single numbers.

### "Create & Add Another" removed
The Create Posting page now has only **Create Drafts** and **Create and
Publish**.

---

## Student Management

### Selectable bulk verification
The Verification tab now has per-row checkboxes and a **"Verify
Selected"** action (alongside the existing "Verify All"). Selecting a few
students verifies only those.

### Posting-type column + filter
The Verification and All-Students lists now show the posting type(s) each
student has applied to and can be filtered by posting type. (Empty for
students with no applications.)

### Selection Database posting-type filter fixed
The Selection Database posting-type filter did nothing because the
request sent the wrong query-parameter name. It now filters correctly.

---

## Policies

### Fix: program-specific policy was mostly skipped
The policy linked to a **posting type** was only shown to students now and then — most of the time the
system let them Show Interest / Apply without ever displaying it, and the server accepted those
applications too. The cause: a student who had accepted the **general placement policy** was wrongly
treated as having accepted the **program-specific** one as well, whenever their general acceptance was
newer than the program policy's last edit. That's why it looked random — and why editing the policy
made it briefly reappear. A program-specific policy now always requires its own explicit acceptance,
both in the app and on the server. **Students who were being skipped will be asked to accept it once**;
the general placement policy gate is unchanged and nobody is re-prompted for it. *(No migration.)*

### Student Visibility selector hidden on Add/Edit Policy
The **Student Visibility** (institute / course / branch) scope card is now hidden on both the Add and
Edit Policy dialogs (commented out, not removed — same as the posting forms). Policies are created/saved
with an empty audience, which the backend treats as **visible to / required by all students** — so
behaviour is unchanged from leaving the selector empty. The separate **Posting Type** (Global vs linked)
control is unaffected. Re-enable later by uncommenting. (Frontend-only; no migration.)

### Policies can be tagged with a Posting Type (or left Global)
The Add/Edit Policy form now has an optional **Posting Type** selector. Leaving it
on **"Global (all students)"** makes it a global policy; picking a posting type
reserves the policy for that type. The Policy Repository list shows a **Global**
badge or the posting-type label on each policy.

### Global policies are a hard acceptance gate at student registration
After signing up, a student is taken to a mandatory **policy-acceptance screen**
and **cannot enter the portal** until every global policy is accepted (a single
"I have read and accept this policy" tick per policy). The same gate re-appears if
a new global policy is published later. Until all global policies are accepted, the
student also can't apply to postings (existing placement gate). Posting-type-linked
policies are **not** shown to students yet — they're reserved for future per-type use.

### New "Policies" tab in the student profile
The student My Profile has a new **Policies** tab listing all global policies with
their **Accepted / Pending** status, where pending ones can be accepted.

> ⚠ **DB migration:** adds `Policy.posting_type_master_id` (nullable FK to the
> posting-type master, `onDelete: SetNull`). Run `npx prisma migrate dev`.

## Known follow-ups (not done in this window)

- Email transport (SMTP / SES) for actually delivering temporary
  passwords and certain notifications — currently the password modal
  + in-app bell carry the load.
- Targeting columns on circulars (so students see only relevant
  circulars, not the tenant-wide feed).
- Visual polish on the notifications bell (per-category icons).
- A retroactive backfill for existing pending recruiters (we only
  auto-verify newly created ones; existing pending records still
  need manual verification).
- **Student Visibility on postings is hidden, not removed** — the
  targeting UI is commented out in `MultiPostingForm` / `PostingForm`.
  Re-enable when per-posting student targeting is needed again.
