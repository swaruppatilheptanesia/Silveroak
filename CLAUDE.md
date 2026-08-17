# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Working notes for the Silver Oak T&P Portal.

> **⚠ Repo restructured (2026-08-12):** code now lives in **`frontend/`** (was the repo
> root) and **`backend/`** (was `docs/silveroak_backend/`). Docs + project files stay at
> the root. Path references in older Findings/logs below (`src/…`, `docs/silveroak_backend/…`)
> are historical — read them as `frontend/src/…` and `backend/…` respectively.

> **Status:** Incomplete / working document. Gleaned from sessions, not yet the
> authoritative project doc. The canonical docs live in `docs/` (see References
> below). Update this file as new patterns, gotchas, or decisions surface.
>
> **For a chronological functional summary of every shipped fix and enhancement,
> see [`CHANGELOG.md`](./CHANGELOG.md).** That's the "what changed" log.
> This file is the "how the system behaves now" reference.

---

## Set Instructions (must follow every session)

1. **Read relevant MD files** in `docs/` and `docs/frontend-doc/` when context
   is needed. Don't blindly re-read everything — pick what's relevant to the
   task.
2. **If there are conflicts or code clashes** between docs/code or between
   multiple instructions — **clarify with the user first** before changing
   code.
3. **Keep output and conversation crisp.** Short, direct, no filler.
4. **Backups before changes** — whenever modifying source under a `src/`
   folder, first copy the affected `src/` (or the specific files) into a
   sibling folder one level above `src/` using the format:

   ```
   backup_yyyyMMdd_HHmm
   ```

   Examples (note the underscore separators, per user instruction):
   - Frontend:
     `/Users/developerheptanesia/Downloads/20260424-Adarsh/20260429/souheptanesia-main-fe/backup_20260530_0930/`
   - Backend:
     `/Users/developerheptanesia/Downloads/20260424-Adarsh/20260429/souheptanesia-main-fe/docs/silveroak_backend/backup_20260530_0930/`

   Rules:
   - Backup directory sits **alongside** (above) each `src/` — never inside
     `src/`.
   - One backup folder per change session is fine; don't create one per file.
   - Backup **before** the edit, not after.
   - Historical backups in the repo use a dash format (`backup-YYYYMMDD-HHMM`).
     New backups should use the underscore format above.

5. **Backend lives in** `./backend` (moved 2026-08-12 from `./docs/silveroak_backend`).
   Its `src/` is `./backend/src/`, so its backups go in `./backend/backup_yyyyMMdd_HHmm/`.
   The **frontend** lives in `./frontend` (moved 2026-08-12 from the repo root); its `src/`
   is `./frontend/src/` and backups go in `./frontend/backup_yyyyMMdd_HHmm/`.
6. **Write findings here.** When something is non-obvious, surprising, or
   likely to recur (build quirks, env requirements, naming gotchas, where a
   feature actually lives), note it under "Findings" below.

7. **Per-module doc files (frozen rule).** If `CLAUDE.md` grows clunky
   (more than ~300 lines, or multiple unrelated long sections), split
   per-role/per-module into `STUDENT.md`, `TPOADMIN.md`, `SUPERADMIN.md`,
   `FACULTY.md`, `RECRUITER.md`, `MANAGEMENT.md` (and per-domain if
   needed), and reference them from `CLAUDE.md`. `CLAUDE.md` stays the
   index. Not needed yet — file is small.

8. **`changefile.txt` change log (user instruction).** Maintain
   `changefile.txt` at the repo root. For each task, append a
   `# Enhancement:` (or `# Bugfix:`) comment block describing *what
   enhancement* the change is for, then list the **unique** source file
   paths changed for it (no repeats). When a change touches the DB
   schema, add a prominent `# ⚠ MIGRATION REQUIRED` line naming
   `schema.prisma` + the columns and the `npx prisma migrate dev` step.
   It is a curated, deduped log maintained by hand — not an auto-append
   (an earlier PostToolUse hook was removed because it can't describe the
   enhancement and produced duplicates).

---

## Project Snapshot

- **Repo type:** Monorepo-ish — Frontend at root, backend nested under
  `docs/silveroak_backend/`.
- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui.
  - Entry: `src/` at repo root.
  - Scripts: `npm run dev`, `npm run build`, `npm run lint`.
  - Routing: React Router v6, lazy-loaded pages.
  - State: React Context (roles), React Hook Form + Zod (forms),
    TanStack Query (async-ready).
- **Backend:** Node.js + Express 5 + TypeScript + Prisma + PostgreSQL.
  - Location: `docs/silveroak_backend/`.
  - Scripts: `npm run dev` (tsx watch), `npm run build`, `npm run migrate`,
    `npm run db:seed`, `npm test`.
  - Auth: JWT bearer tokens.
  - Validation: Zod.
  - Logging: pino.
- **Domain:** Silver Oak University Training & Placement Portal. 7 roles
  (student, tpo_admin, tpo_employee, faculty_coordinator, recruiter,
  management, super_admin). 16 modules from profile → applications → offers →
  NOC → reports.

---

## Commands

Frontend (`cd frontend`):

```bash
npm run dev        # Vite dev server, http://localhost:5173
npm run build      # production build   (build:dev for development mode)
npm run lint       # eslint .
npx tsc --noEmit -p tsconfig.app.json   # type-check — MUST pass -p (see below). ~100-error baseline.
# ⚠ Plain `npx tsc --noEmit` checks ZERO files: the root tsconfig.json is {"files": [], "references": […]}.
# It prints nothing and always "passes", which is not a clean type-check.
```

Backend (`cd backend`):

```bash
npm run dev            # tsx watch src/server.ts  → http://localhost:3000
npm run lint           # tsc --noEmit  (there is no eslint here)
npm run build && npm start
npm test               # jest --runInBand --forceExit
npm run test:watch
npm test -- src/__tests__/noc.test.ts            # single file
npm test -- -t "issues a NOC"                    # single test by name
npm run db:generate    # prisma generate — safe, run this yourself after schema edits
npm run migrate        # prisma migrate dev — USER RUNS THIS, not you (see gotchas)
npm run migrate:deploy # production, idempotent
npm run db:seed / db:studio
```

Tests are Jest + ts-jest + supertest against the real `app`, run serially
(`--runInBand`) — they hit a live Postgres, so they are not hermetic. Path
aliases `@config/ @middleware/ @modules/ @shared/` are mapped in both
`tsconfig.json` and `jest.config.ts`; add new aliases to both.

Env: frontend `.env` needs `VITE_API_BASE_URL` (defaults to `/api`) and
`VITE_TENANT_SLUG`. Backend requires `DATABASE_URL` + `JWT_SECRET` (validated at
boot in `src/config/env.ts`), plus the `CRM_*` URLs + `CRM_API_KEY` used by
student signup / institute-course-branch lookups. Swagger UI is served at
`/api-docs`.

---

## Architecture (big picture)

**Two independent apps, one repo.** They share no code — the contract between
them is the frontend `src/services/*Service.ts` layer vs the backend
`/api/*` routes. Changing a backend response shape means changing the matching
service + its `src/types/*` interface.

### Frontend request path

`page/component` → `src/hooks/use-*-api.ts` (TanStack Query wrappers; query-key
factories like `postingKeys`, mutations invalidate keys) → `src/services/*Service.ts`
(typed functions, one per endpoint) → `src/services/apiClient.ts`.

`apiClient` owns everything auth: an in-memory + `sessionStorage` `TokenManager`,
a single-flight refresh lock (concurrent 401s share one refresh call), and
`ApiResponse<T> = {data, error, status}` — services unwrap it, so callers see
data or a thrown/normalized error (`src/lib/apiError.ts`). There is one
`src/lib/*Module.ts` per domain holding pure helpers (labels, status maps,
derive/normalize functions) — put display logic there, not in components.

Providers wrap in this order in `App.tsx`: QueryClient → Theme → Tenant → Auth →
Role → Tooltip → Router. Every route is `lazy()` + `<ProtectedRoute>`;
`ProtectedRoute` enforces role access **and** the student gates (policy gate
before photo gate). Role→landing-route mapping lives in
`src/lib/permissionModule.ts:getDefaultRouteForUser` — it and `AppSidebar.tsx`
must be updated together when a role is added.

### Backend request path

`src/app.ts` mounts, in order: public static `/uploads` + `/api/uploads`, then
`/api/auth` (unauthenticated), then `app.use('/api', authenticate, resolveTenant)`
— **everything registered after that line is authenticated and tenant-scoped**;
anything that must be public (static files, auth, upload endpoints reachable by
`<img>`/`window.open`) has to be mounted above it. Then per-module routers,
a 404 handler, and `errorHandler` last.

Each module in `src/modules/<name>/` follows the same five files:
`*.routes.ts` (mounts middleware: `requirePermission`/`requireRole`/`validate(schema)`)
→ `*.controller.ts` (thin: req→service→res) → `*.service.ts` (all business logic
+ Prisma) → `*.schema.ts` (Zod) → `*.swagger.ts` (JSDoc annotations). Business
rules live in services only; controllers never touch Prisma.

Cross-cutting middleware in `src/middleware/`: `auth` (JWT → `req.user` incl.
`institutes/courses/branches`), `tenant` (`req.tenantId`), `permission`
(module+action RBAC from `src/shared/permissions.ts`), `scope`
(`scopeToCompany` for recruiters), `student-access`, `upload` (multer configs —
see the shared-MIME gotcha below), `audit`, `pii-filter`, `error-handler`
(`AppError`/`BusinessRuleError` → HTTP).

`src/shared/utils/` is where the reusable **domain guards** live, and they are
the load-bearing part of this codebase: `offer-block.ts`,
`placement-interest.ts`, `posting-type-interest.ts`, `posting-type-policy.ts`,
`self-placed-noc-block.ts` all export an `assert*` that throws a 422
`BusinessRuleError`, and they are chained in a fixed order inside
`application.service.apply()` and `student.service.registerInterests()`.
`student-targeting.ts` / `faculty-scope.ts` decide who can see whom. Never drop
one of these calls when editing the apply/interest path — each maps to a
documented rule below.

Multi-tenancy: every table carries `tenant_id`; services filter on
`req.tenantId`. Masters (`MasterCategory`) make posting types, event types, NOC
types etc. admin-configurable — prefer a master over a new enum.

---

## References (canonical docs)

- `docs/SYSTEM_DOCUMENTATION.md` — high-level system + module overview.
- `docs/TPO_FUNCTIONAL_WORKFLOW_DOCUMENTATION.md` — role-wise workflows.
- `docs/TECHNICAL_HANDOVER_API_INTEGRATION_GUIDE.md` — service-layer API
  contracts (function signature = API contract).
- `docs/BACKEND_ENGINEERING_REQUIREMENTS.md` — full backend spec (entities,
  endpoints, business rules).
- `docs/BACKEND_EXECUTION_GUIDE.md` — step-by-step backend build prompts.
- `docs/frontend-doc/00-overview.md` + `01..17-*.md` — per-module frontend
  integration docs (base URL, auth, pagination, error codes, file index).

---

## Conventions (do not silently revert)

These are deliberate behaviours from past sessions. Reverting any of them
will regress real user pain. If a future request asks for the opposite,
flag the conflict before changing code.

### UX / dialogs

- **Modals close via X or Cancel only.** All four shadcn primitives in
  `src/components/ui/` (`dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`,
  `drawer.tsx`) intentionally block dismissal on overlay click AND
  Escape key. The defaults sit before `{...props}` so individual
  consumers can still opt back in by passing their own handler.
  Popovers / DropdownMenus / Tooltips are not modals and are unchanged.
- **Every destructive action goes through a confirmation dialog.** Use
  the shared `ConfirmActionDialog` from
  `src/components/shared/ConfirmActionDialog.tsx` (or shadcn
  `AlertDialog` directly) with `confirmVariant="destructive"`. No
  silent deletes, no silent deactivates, including small ones like
  notification dismiss or template field removal.
- **One-time credentials live in `TemporaryPasswordDialog`.** Reuse
  `src/components/shared/TemporaryPasswordDialog.tsx` whenever a flow
  generates a password the admin must share out-of-band. No email
  transport exists yet, so this is the canonical UX.

### Auth / roles

- **Internal staff emails must end in `@silveroakuni.ac.in` OR `@socet.edu.in`.**
  (Two-domain allowlist since 2026-08-04 — CRM-fetched staff carry `@socet.edu.in`.)
  Enforced in `createUserSchema.superRefine` for roles `tpo_admin`,
  `tpo_employee`, `faculty_coordinator`, `management`. FE pre-blocks
  with a toast. Student and recruiter emails are unaffected. See the fuller
  finding below (`INSTITUTE_EMAIL_DOMAINS`, mirrored FE/BE).
- **Super Admin Add User dialog hides `student`, `tpo_employee` and
  `super_admin` roles** (`ROLES_HIDDEN_FROM_CREATE` in
  `UserManagementTab.tsx`). The role *filter* and *Edit User* selects
  still show them so existing records remain visible and editable.
- **Default route per role** is centralised in
  `src/lib/permissionModule.ts:getDefaultRouteForUser`. When adding a
  new role, update both the switch and the sidebar `AppSidebar.tsx`.
- **Recruiter creation always creates a `User` row.** Both the TPO
  admin path (`employer.service.ts:createRecruiter`) and the Super
  Admin path (`admin.service.ts:createUser`) auto-verify the recruiter
  (`verification_status: 'verified'`). On reactivation of a recruiter
  user, a fresh password is generated.

### Domain rules

- **Offer flow:** `createOffer` writes `status: 'pending_student_action'`,
  `applications_blocked: true`. Students explicitly Accept / Reject from
  Dashboard or My Applications. **The block is permanent** — any offer
  ever on record (any status, including rejected) blocks future applies
  and interest registrations across BOTH job and internship postings.
  Enforced by `assertNoExistingOffer(studentId)` in
  `src/shared/utils/offer-block.ts`.
- **CGPA: NULL ≡ 0.** `formatCGPA` defaults to `'0.00'` when null. New
  student records seed `cgpa: 0` (auth.service:`buildAcademicSeed`).
  Backfill for legacy NULL rows is `scripts/backfill-cgpa-zero.ts`.
- **NOC reference format:** `SOU/TPO/MM-YYYY/XXX/NNNN` where `XXX` is
  the first 3 letters of the posting type, uppercase. Sequence is
  per-tenant per-month. `buildNocReferenceNumber` +
  `buildPostingTypeShortCode` in `noc-certificate.renderer.ts`.
- **NOC create form:** NOC Type is hidden, defaulted to `'internship'`.
  End Date is optional (start ≤ end still validated when both
  provided). Step-required-field lists are in `NOC_STEP_FIELDS`.

### Notifications

- **Single source of trigger logic:** `notification.service.ts` helpers
  `createNotification`, `notifyManyUsers`, `notifyTpoAudience`. Every
  domain trigger goes through one of these. They are best-effort —
  wrap in try/catch in the calling service so a notification failure
  cannot break the parent mutation (pattern from `createOffer`).
- **Per-user preferences default = enabled.** No row in
  `notification_preferences` means the user receives that category.
  Storing a row with `enabled: false` mutes it.
- **TPO audience** = all active `tpo_admin` + `tpo_employee` in the
  tenant. Typically 2–6 rows per tpo-targeted trigger.
- **Trigger coverage** is summarised in `CHANGELOG.md` (Notifications
  section). When adding a new domain event, decide which category
  (offer / application / interest / noc / event / no_dues / recruiter /
  announcement / circular / policy) it belongs to and reuse an existing
  category — only extend the enum if it genuinely doesn't fit.

### Student-side data scoping

- **Posting / Opportunity detail filters offers** to the viewing
  student when `role === 'student'` (`posting.service.ts:getPostingById`).
  Admin / faculty / recruiter callers still get the full list.
- **Events:** the student-only routes `GET /events/my` and
  `GET /events/my/:id` skip the generic `events:view` permission gate;
  the service-level `applyVisibilityScope` already scopes students to
  their own `EventStudent` rows.
- **Circulars:** student-only `GET /circulars/generated/my`. No
  targeting columns exist on `GeneratedCircular` so it broadcasts all
  tenant circulars — call this out if asked for "targeted circulars".

---

## Recurring gotchas (likely to bite the next change)

- **`toQueryString(params)` typing.** Many service files (`facultyService`,
  `offerService`, `employerService`, `postingService`, `driveService`,
  …) hold a typed `*QueryParams` interface but `toQueryString` expects
  `Record<string, unknown>`. TS2345 results. Fix per call site with
  `toQueryString(params as Record<string, unknown>)`. Do **not** widen
  the typed param itself.
- **Pre-existing FE TS errors — and the type-check command that hides
  them.** ⚠ **`npx tsc --noEmit` at the repo root checks NOTHING** —
  the root `tsconfig.json` is `{"files": [], "references": [...]}`, so
  it emits no output and looks like a pass. Always use
  **`npx tsc --noEmit -p tsconfig.app.json`** (or `npx tsc -b`), which
  reports the real baseline: **exactly 100 errors** as of 2026-07-21,
  across reports / posting type labels / policy dialogs. Filter to the
  files you edited rather than counting totals; the baseline should not
  block your work — but do check the count hasn't grown. Those 100 are
  not all noise: 5 of them were the live posting-type-label defect
  below, flagged by tsc the whole time in a baseline nobody read.
- **Posting type fields:**
  - `posting.posting_type_master_id` = UUID, what the BE filter
    expects (`posting_type_master_id` query param).
  - `posting.type` = flattened human string ("job", "internship",
    "summer_internship", …) via `flattenPostingType` (`docs/silveroak_backend/src/shared/utils/flatten-posting-type.ts`).
  - The Posting Type `<Select>` option value must bind to
    `option.id` (UUID), not `option.value` (string). See
    `ApplicationsManagement.tsx`.
- **Prisma migrations:** the classifier blocks running mutating
  scripts. After editing `schema.prisma`, **run `npx prisma generate`**
  yourself (safe — only updates the client) so subsequent TS-checks
  see the new types. **Migration (`npx prisma migrate dev`) is the
  user's responsibility** — surface it explicitly in your end-of-turn
  summary. For production deploys: `npx prisma migrate deploy`
  (idempotent, never resets).
- **Backend restart:** `tsx watch` usually picks up changes, but on
  rare occasions doesn't. If a new route returns 404 right after a
  schema or routes file change, instruct the user to restart the BE
  before debugging further.
- **`AddRecruiterDialog` → `temporary_password` flow.** The
  `createRecruiter` response now includes a `temporary_password`. If
  you change the response shape for any reason, the FE dialog plus
  `TemporaryPasswordDialog` consumer must follow.

---

## Where things live (quick map)

### Frontend (`src/`)

- `pages/shared/MyProfile.tsx` — single profile component used by
  Student, TPO Admin, TPO Employee, Faculty, Super Admin, Management.
  Profile + Security + Notifications tabs.
- `pages/StudentDrives.tsx`, `pages/StudentCirculars.tsx` — student
  surfaces for events and circulars. Use `mode="my"` on dialogs that
  fetch detail.
- `pages/admin/AdminProfile.tsx`, `pages/faculty/FacultyProfile.tsx`,
  `pages/superadmin/SuperAdminProfile.tsx`,
  `pages/management/ManagementProfile.tsx` — thin wrappers around
  `MyProfile`.
- `components/shared/ConfirmActionDialog.tsx` — confirmation modal.
- `components/shared/TemporaryPasswordDialog.tsx` — one-time password
  modal with copy button.
- `components/shared/SearchableMultiSelect.tsx` — multi-select with
  chip removal. Chips stay column-confined (already-fixed overflow
  bug).
- `lib/formatters.ts` — `formatCGPA`, `formatLPA`, `formatDate`,
  `formatDatePattern`, `formatDateTime`, `getInitials`. All
  null-tolerant.
- `lib/offerModule.ts` — offer status labels, lifecycle helpers.
- `lib/permissionModule.ts` — role guards + default routes.

### Backend (`docs/silveroak_backend/src/`)

- `modules/notifications/notification.service.ts` — `createNotification`,
  `notifyTpoAudience`, `notifyManyUsers`, preferences. Always wrap in
  try/catch at the caller.
- `modules/offers/offer.service.ts` — `createOffer`, `acceptOffer`,
  `rejectOfferByStudent`, `rejectOffer`.
- `modules/applications/application.service.ts` — apply, moveStage,
  setMockRoundResult, withdrawApplication. All notify-wired.
- `modules/admin/admin.service.ts` — `createUser`,
  `regenerateUserPassword`, `linkRecruiterToCompany`.
- `modules/employers/employer.service.ts` — `createRecruiter`
  (auto-verifies + auto-creates user with temp password).
- `shared/utils/password.ts` — `hashPassword`, `comparePassword`,
  `generateTemporaryPassword(length)` using `crypto.randomBytes`.
- `shared/utils/offer-block.ts` — `assertNoExistingOffer(studentId)`.
- `modules/noc/noc-certificate.renderer.ts` —
  `buildNocReferenceNumber`, `buildPostingTypeShortCode`.

### Helper scripts (`docs/silveroak_backend/scripts/`)

- `link-recruiter-once.ts` — one-off repair: link a User to a Company
  via the recruiter table.
- `backfill-cgpa-zero.ts` — set null CGPA rows to 0 (dry-run by
  default; `--apply` to commit).
- `diagnose-faculty-filter-options.ts` — print what each faculty
  would see in Institute/Branch/Semester filters; read-only.
- `seed-dummy-offers.ts` — create tagged dummy Offer rows for
  exercising the Offer Records list/pagination (dry-run by default;
  `--apply`, `--count=N`, and `--remove --apply` to undo). Only
  targets students with **no** existing offer, because any offer row
  **permanently blocks that student from applying** (`assertNoExistingOffer`)
  until the dummies are removed.

---

## Findings (append as discovered)

- The repo currently has many uncommitted modifications across both frontend
  (`src/components/admin/...`, drives, etc.) and backend
  (`docs/silveroak_backend/src/modules/...`). Do not assume `main` matches
  what's checked out — always inspect working tree before editing.
- Existing backup folders use **dash** format
  (`backup-20260510-1221`). Going forward, use **underscore** format per user
  instruction (`backup_yyyyMMdd_HHmm`).
- `README.md` at root is the default Lovable boilerplate — not a useful
  project doc. The real docs are under `docs/`.
- Backend `package.json` confirms: Prisma 5, Express 5, jsonwebtoken,
  bcryptjs, multer, swagger-jsdoc, jest+supertest for tests.
- Frontend stack confirmed: Vite 5, React 18.3, TanStack Query 5,
  react-hook-form + zod, recharts, exceljs (for exports), sonner (toasts),
  lucide-react (icons), shadcn/ui via Radix primitives.
- **No email transport** (SMTP / SES / nodemailer) is configured.
  Anywhere docs/code mention "we'll email the user", treat it as a
  TODO unless wired. Today's substitute = `TemporaryPasswordDialog`
  for credentials and the in-app bell for notifications.
- The classifier blocks running mutating Bash actions on the dev DB
  (e.g. `npx tsx scripts/foo.ts` that writes, `prisma migrate dev`).
  Author the scripts, then surface the command for the user to run.
- `MyProfile` reads from `useAuth()`. After mutating user fields, call
  `refreshUser()` so the sidebar header reflects changes.
- The recruiter portal middleware (`scopeToCompany` in
  `src/middleware/scope.ts`) throws **"Recruiter profile not found"**
  when a recruiter User has no linked Recruiter row. Now rare since
  both create paths build the link, but the orphan-repair admin action
  in `UserManagementTab` is still there for legacy rows.
- **Postings now have multi-value location + JD PDF via a legacy-mirror
  pattern.** `Posting` has BOTH the new arrays (`locations String[]`,
  `job_description_pdf_urls String[]`) AND the original scalars
  (`location`, `job_description_pdf_url`). On create/update the service
  sets the scalar = the **first** array element
  (`posting.service.ts`), so the many display/filter/offer/export sites
  that read `posting.location` / `posting.job_description_pdf_url` keep
  working unchanged — only the two detail pages render the full arrays.
  Forms (`MultiPostingForm`/`PostingForm`) read the array, falling back
  to `[scalar]` for pre-migration rows (`postingModule.ts`
  `deriveLocations`/`deriveJobDescriptionPdfUrls`). **Don't "clean up"
  the scalar columns** — they're the back-compat surface. (Migration
  `20260604081429_posting_multiple_location_and_file` applied 2026-06-04.)
- **JD PDFs keep their original filename via `job_description_pdf_names`.**
  (Added 2026-06-05.) `Posting.job_description_pdf_names String[] @default([])`
  is **index-aligned** with `job_description_pdf_urls` (no legacy scalar — names
  are new). The name comes from the browser `File.name` at upload time (the
  upload endpoint still returns only the URL). In both forms: upload appends to
  **both** arrays, remove splices **both** by index, and `buildCreatePostingPayload`
  zips+filters as `{url,name}` pairs so the two arrays never drift. Forms +
  `OpportunityDetail` + admin `PostingDetail` render
  `job_description_pdf_names[i] || \`PDF ${i+1}\`` — **pre-migration postings have
  empty names → "PDF N" fallback** (no backfill). ⚠ additive migration
  (auto-migratable). `deriveJobDescriptionPdfNames` in `postingModule.ts`.
- **Posting salary/stipend are FREE-TYPED range strings** (changed
  2026-06-05 from preset buckets). Both forms now use a plain `<Input>`
  (admin types e.g. "3 - 6 LPA"); the value is stored verbatim in the
  freeform `ctc`/`stipend` columns (`z.string().max(100)`), so no migration
  and all `posting.ctc`/`posting.stipend` display sites still work. The
  `CTC_RANGE_OPTIONS`/`STIPEND_RANGE_OPTIONS` constants remain in
  `postingModule.ts` but are **no longer used by the forms** — don't
  reintroduce the `<Select>` bucket picker.
- **Posting "Student Visibility" UI is commented out** (not deleted) in
  both posting forms; **"Application Override" was removed** from the
  forms but the `application_override_enabled` column remains (defaults
  false). Posting Type stays a required **per-role** selector.
- **`RESUME_MIME_TYPES` in `docs/silveroak_backend/src/middleware/upload.ts`
  is shared** — used by `resumeUpload`, `policyDocumentUpload`,
  `nocOfferLetterUpload`, and (spread into `SUPPORTING_DOCUMENT_MIME_TYPES`)
  internship/certification/employment/no-dues/portfolio uploads. To make
  ONE upload PDF-only, point it at the existing `PDF_MIME_TYPES`
  constant — do **not** edit `RESUME_MIME_TYPES`. Resume upload is now
  PDF-only (FE `accept` + a client-side guard in `Resumes.tsx` +
  `PDF_MIME_TYPES` on the server); other uploads still take DOC/DOCX.
- **Posting Type filter parameter differs per endpoint.** The Selection
  Database endpoint (`/admin/selection-database`) filters by
  `posting_type` (the value string job/internship/stipend_internship),
  while Applications and the admin student-list filter by
  `posting_type_master_id` (UUID). Bind the `<Select>` accordingly —
  `option.value` for Selection Database, `option.id` for the others.
- **Student profile project URLs (github/demo) are optional**; backend
  Zod relaxed to `.url().optional().nullable()`. **Employment Type** is
  Full-time/Part-time only (legacy `business` coerces to Full-time on
  load). **My Portfolio** defaults to `status: published` (Prisma
  default), so removing the publish toggle left everything visible.
- **Policies are "global" (no posting type) vs "linked" (posting type set).**
  `Policy.posting_type_master_id` (nullable FK → `MasterOption`, `onDelete: SetNull`;
  migration adds it) decides everything: **global = the only policies students ever
  see** (registration gate + the My Profile "Policies" tab), **linked = captured for
  future per-type use, surfaced nowhere yet.** Critical: the placement-apply gate
  (`application.service.ts` `!student.policy_accepted`) and `policy_accepted` itself
  come from `areAllVisiblePoliciesAccepted` → `buildVisiblePolicyWhere`, now scoped to
  `posting_type_master_id: null`. **Do not widen it to include linked policies** — they
  aren't acceptable anywhere, so counting them deadlocks applying. The student policy
  listing (`getPolicies`/`buildPolicyWhere`) is likewise forced to global for students
  (`?global=true` for others). `getMyProfile` returns `pending_policy_count` (global,
  unaccepted), which `ProtectedRoute` uses to bounce students to `/student/policy-gate`
  before the photo gate (`Login.getDashboardPath` sends students there first).
- **Policy acceptance was relaxed to a single "I accept".** `policyAcceptanceSchema`
  now requires only `policy_read` + `rules_accepted` true; the 4 sharing consents are
  optional (DB default false). Safe — **no code reads the individual consent columns for
  enforcement**, only the `policy_accepted` boolean. The legacy `/policy`
  `PolicyAcceptance.tsx` page (posts all 6 true) still validates and works. Shared UI:
  `components/policies/GlobalPolicyCard.tsx` (one policy + single-checkbox accept) reused
  by `StudentPolicyGate.tsx` and `StudentPoliciesTab.tsx`. `useAcceptPolicy` now
  invalidates `policyKeys.all` too (not just profile) so `accepted_current` refreshes.
- **Policy "Student Visibility" (institute/course/branch) selector is commented out in BOTH policy
  dialogs.** (Added 2026-06-11.) `PolicyAudienceSelector` + its import + the `targetInstitutes/Branches/
  Courses` watch vars are commented (not deleted) in `AddPolicyDialog.tsx` and `EditPolicyDialog.tsx`
  (mirrors the posting forms' hidden `UserScopeSelector`). The Zod fields keep `.default([])` and
  `handleSubmit` still sends `target_*` (as `[]`), so the payload is unchanged. Backend treats empty
  targets as **all students** — `buildStudentAudienceWhere` returns `{}` when empty
  (`policy.service.ts`), and the student-visibility query counts `isEmpty` as a match — so this is purely
  UI hiding with no behavior change. The **Posting Type** (global vs linked = `posting_type_master_id`)
  selector is separate and **stays**. Re-enable by uncommenting both files. Don't "clean up" the now-empty
  `target_*` columns.
- **Placement opt-out (global + per-posting-type) gates apply/register-interest.** A student can opt
  out of placement entirely (`Student.placement_opt_out`) or per posting type
  (`student_posting_type_preferences`, keyed `posting_type_master_id`; **absent row = interested**).
  Enforced by `assertPlacementInterest(studentId, postingTypeMasterId)`
  (`src/shared/utils/placement-interest.ts`, mirrors `offer-block.ts`) called in
  `application.service.ts` `apply()` (after the policy check) **and** in `student.service.ts`
  `registerInterests()`. **Global overrides per-type** (checked first → `PLACEMENT_OPT_OUT`; per-type →
  `POSTING_TYPE_OPT_OUT`, both HTTP 422). **Postings stay visible** — only the apply/register action is
  blocked (FE: `OpportunityDetail` `readinessReasons` disables Apply; managed in Profile → **Placement**
  tab, `StudentPlacementTab`). Opting out needs a reason; every change is
  appended to `student_placement_preference_history` (label snapshot, no FK, survives type rename/delete).
  **Don't drop the `assertPlacementInterest` calls** when touching apply/interest.
  **Re-enable (reopen) is TPO-admin-only (changed 2026-06-11 — it was self-service).** The student
  opt-in/opt-out endpoints now **reject the opt-in direction** for students (`updateGlobalPlacementOptOut`
  with `opted_out:false` and `updatePostingTypePreference` with `interested:true` throw
  `PLACEMENT_REOPEN_ADMIN_ONLY`); the FE switches are read-only once opted out. Reopen is done by the admin
  via **`PUT /admin/students/:studentId/placement/reopen`** `{ scope:'global'|'posting_type',
  posting_type_master_id? }` (no reason; `requirePermission('students','edit')`) → `admin.service.reopenStudentPlacement`
  writes an `interested:true` history row + audit. `mapAdminStudent` now serializes `placement{opted_out,reason,
  opted_out_at}` + `posting_type_opt_outs[]` + `placement_pref_history[]`, rendered in the **Placement card**
  (`StudentPlacementSection.tsx`) inside the live `StudentListTab` popup (Reopen buttons + history). **No
  migration** — fields + history table pre-existed. [[working-preferences]]
- **Self-placed NOC blocks apply + register-interest for the SAME posting type.** (Added 2026-06-05.)
  A **non-rejected self-sourced** NOC (`placement_source='self_sourced'`, status in
  `pending_faculty`/`pending_tpo`/`pending_company_verification`/`approved`/`issued`) blocks the student
  from applying to or registering interest in postings of that **same posting type** (other types stay
  open; university-drive NOCs never trigger it — those are governed by the offer block). Enforced by
  `assertNoSelfPlacedNoc(studentId, postingTypeMasterId)` + `getSelfPlacedNocProgramValues(studentId)`
  in `src/shared/utils/self-placed-noc-block.ts` (mirrors `offer-block.ts`/`placement-interest.ts`),
  called in `application.service.apply()` (after `assertPlacementInterest`) and
  `student.service.registerInterests()` (after the per-type opt-out check). Throws
  `BusinessRuleError 'SELF_PLACED_NOC_BLOCK'` (HTTP 422). Matching is `NOC.program` (= posting-type
  MasterOption **value**) vs the posting's master value, trimmed+lowercased — **no migration**. FE surfaces
  it as an `OpportunityDetail` readiness reason (disables Apply). **Don't drop these calls** when touching
  the apply/interest gate. [[working-preferences]]
- **Employment is now a LIST (one-to-many), not a single record.** `CurrentEmployment` no longer has
  `student_id @unique`; `Student.employments` (plural) replaces `current_employment`. The `duration`
  column was **removed**. Each entry has `status` ('active'|'closed'), `closed_at`,
  `completion_proof_url/name`. **Adding an entry requires a mandatory offer-letter document** (POST
  `/me/employments` is multipart → stored in the legacy `offer_letter_url` column; controller 400
  `FILE_REQUIRED`) and **closing requires a mandatory completion-proof document** — both enforced FE
  (file inputs gate the action) **and** BE (controller 400 `FILE_REQUIRED`); a closed entry is locked
  (second close → 422 `EMPLOYMENT_ALREADY_CLOSED`). Endpoints: `GET/POST /students/me/employments`,
  `POST /students/me/employments/:id/close` (multipart), `DELETE /students/me/employments/:id`. The student profile API returns `employments: []` (was
  `employment`); admin `getStudentDetail` returns `employments: []`. The Employment tab is the
  self-contained `components/employment/StudentEmploymentTab.tsx` (mirrors the Certifications list pattern).
  `is_currently_working` is kept and maintained (= active) only for admin display; `recalcProfileCompletion`
  does not read employment. **Don't reintroduce the single-record / duration assumption.** (Update 2026-06-11:
  the TPO-admin **Student Details popup** now renders the `employments[]` as a read-only **"Employment"**
  section — company + Active/Closed badge, designation·type·package, Closed-on date, Offer-letter +
  Completion-proof links — replacing the old summary items in the renamed "Skills" card. ⚠ The **live popup is
  the inline `<Dialog>` inside `src/components/admin/StudentListTab.tsx`** (opened by the row "View"), NOT
  `AdminStudentDetailsDialog.tsx` — that file is an **unused/dead twin** (no imports anywhere), so editing it
  has no visible effect; both got the section but only StudentListTab's matters. `selectedStudent` comes from
  the list row, but the list (`getStudents`) and detail (`getStudentById`) share `mapAdminStudent`, so
  `employments[]` (now incl. `offer_letter_url` + `completion_proof_name`) is already in the list payload —
  additive, no migration.)
- **NOC now creates a real Company; NOC `end_date` is nullable; PAN/GST are denormalized.** (Added 2026-06-05.)
  `createNoc` (`noc.service.ts`) **find-or-creates a `Company`** by case-insensitive name: no match → create
  `source='student'`, `verification_status='pending'`; match → link only, **fill-if-empty** pan/gst/city/state,
  never overwrite. `NocRequest.company_id` (FK, `onDelete: SetNull`) ties them. On **issue** (`tpoApprove` +
  `issueNoc`) the linked company flips to `verified` via `markLinkedCompanyVerified()` — **best-effort
  try/catch, must never break issuance**; don't make it throw. `Company` gained `source`/`verification_status`/
  `pan`/`gst`/`city`/`state` with **migration defaults `source=admin`, `verification_status=verified`** so
  existing companies need **no backfill** (only student-NOC inserts are explicitly pending) — keep those
  defaults. **`NocRequest.end_date` is now nullable** (Prisma `DateTime?`, Zod `.optional().nullable()`); FE
  posts `null` when blank and every date render guards null → **"Ongoing"** (wizard review, `NOCRequestCard`,
  `NOCRequestDetailSheet`, `NOCReviewDialog`, `AdminNOCManagement`, `noc-certificate.renderer.ts`,
  `admin.service.ts` student-detail). `company_pan`/`company_gst` are **denormalized onto `NocRequest`** (mirror,
  like `company_city`/`company_state` already are) **and** stored on the `Company` — don't "clean up" the NOC
  copies. The student-safe `GET /noc/field-suggestions` (companies/cities/designations) powers the create-form
  Name select + City/Designation datalists; **don't expose the admin companies API to students** for this.
  New optional `POST /noc/supporting-document` mirrors the offer-letter upload (single file). The State dropdown
  uses a built-in `src/lib/indianStates.ts` list with an **"Other"** free-text escape (no state/city masters exist).
- **NOC "University Placement Drive" category now lists TPO-released offers, not just campus-drive Events.**
  (Added 2026-06-17, frontend-only, NO migration / no backend change.) The wizard's single required "Assigned
  University Drive" selector (`NOCRequestWizard.tsx`) was sourced ONLY from Events (`useEvents` filtered to
  `campus_drive`/`internship_drive`, the student's `EventStudent` assignments). Students placed via the **Offer**
  flow (`createOffer` → accepted; **no Event is created**) saw an empty dropdown → forced into "By Self". Fix:
  the same dropdown now renders **two `<SelectGroup>`s** — "University Drives" (`availableDrives`, unchanged) +
  "Offers Released by TPO Cell" (`acceptedOffers` = `useMyOffers()` filtered to `status === 'accepted'`). Option
  values are **prefixed `drive:`/`offer:`** to keep the two id spaces distinct in one value; `handlePlacementSelectionChange`
  parses the prefix. Picking an offer sets a new `selected_offer_id` form field, clears `drive_id`, and **prefills**
  `company_name` + `role_title` (+ `program` only when `offer.posting.type` is a valid, not-already-issued posting
  type) — all **editable** (an editable Company Name input is shown for the offer path; role is editable on step 3).
  Validation requires a drive **OR** an offer. Submit keeps `placement_source='university_drive'`, `drive_id` null
  for offers; backend `createNoc` find-or-creates the company by name → matches the offer's existing **verified**
  company. The company_name auto-fill `useEffect` is guarded to not stomp the offer prefill (skips when
  `selected_offer_id` set). The assigned-drives path and "By Self" are byte-for-byte unchanged. **Offer is NOT
  persisted as a hard link** (`NocRequest` has no `offer_id` column) — adding one would need a migration; deferred.
- **Announcement targeting: batch/department dropped from the UI, semester added; single PDF/image
  attachment.** (Added 2026-06-05.) The Create Announcement audience dropdown is now **All / Specific
  Semester / Eligible for Posting**. The `batch`/`department` `TargetAudienceType` enum values + the
  `target_batches`/`target_departments` columns + the read-side `studentMatchesAnnouncement` cases are
  **intentionally KEPT** (legacy announcements still target correctly) — only the create UI removed them, and
  editing a legacy batch/department announcement **coerces** its audience to `all` (no UI option). New
  `target_semesters String[]` matches the student's `AcademicProfile.semester` (case via `matchesAllowedValue`,
  options 1–8). One optional attachment via `attachment_url/name/mime_type/size` (PDF + image) uploaded
  **upload-first** to `POST /announcements/attachments` (`announcementAttachmentUpload` multer, registered
  BEFORE the `router.use(requireRole('student'))` line in `announcement.routes.ts`), then referenced in the
  create/update payload; shown to students as an "Open attachment" link. **Additive migration** (no drops) —
  see changefile. Don't reintroduce batch/department to the dropdown or drop their columns.
- **No Dues list has an "Export All" (Excel).** (Added 2026-06-05.) `NoDuesManagement.tsx` toolbar button
  `handleExportAll` fetches **every request matching the active `statusFilter`** by looping
  `noDuesService.getRequests({ status, page, limit:100 })` until `pagination.hasNext` is false, normalizes
  via `normalizeNoDuesRequest`, then calls the shared `downloadExcelTable` (`src/lib/spreadsheetExport.ts`).
  Columns = all detail fields + the four document URLs (`offer_letter_url`/`admission_letter_url`/`proof_url`/
  `certificate_url`) resolved to absolute clickable URLs via `resolveBackendAssetUrl`. **Frontend-only — no
  backend/schema/migration.** Reuse this pattern (`downloadExcelTable` + loop-all-pages on the existing list
  service) for other admin list exports; don't hand-roll CSV.
- **Student sidebar shows a "new" dot on Announcements / Circulars / Drives.** (Added 2026-06-05.)
  `AppSidebar.tsx` calls `useStudentNewIndicators(isStudent)` (`src/hooks/use-student-new-indicators.ts`) and
  renders `<span className="ml-auto h-2 w-2 rounded-full bg-primary" />` on the matching placement nav item.
  **Announcements** = any `!my_receipt?.is_read` (real backend unread). **Circulars/Drives** have no read
  flag, so they use a **"new since last visit"** heuristic: a localStorage last-seen timestamp per surface
  (`sou:lastSeen:<surface>`); an item is new when `created_at > lastSeen`. `markSurfaceSeen('circulars'|'drives')`
  is fired from a `useEffect` on mount of `StudentCirculars.tsx` / `StudentDrives.tsx` to clear the dot; the
  store uses `useSyncExternalStore` + a module listener `Set` because the browser `storage` event doesn't fire
  in the same tab. The three list hooks (`useAnnouncements`/`useMyCirculars`/`useMyEvents`) gained an optional
  `enabled` param (default `true`) so the sidebar gates these queries to `currentRole === 'student'` only —
  non-students fire no requests and see no dots. **Frontend-only — no backend/schema/migration.**
- **Recruiters can't open the internship offer-letter/certificate document.** (Added 2026-06-05.) The shared
  `InternshipDetailSheet` (`src/components/internships/InternshipDetailSheet.tsx`) renders the internship's
  `certificate_url` (uploaded as "Offer letter / internship certificate") as a "Completion Certificate → Open
  certificate" link — the only offer-letter-type doc a recruiter could reach (via `RecruiterInternships`). The
  anchor is now gated `{!isRecruiter && …}` (`useRole()` from `@/contexts/RoleContext`); the Uploaded/Pending
  badge stays, admin/student views are unchanged. **UI-only — `certificate_url` is still in the recruiter's API
  payload** (deliberate per request; a future hardening could omit it in `internship.service.ts` for
  `role === 'recruiter'`). The `canManageStatus` edit block was already hidden for recruiters (prop defaults false).
- **Event Type is a configurable Master (was a DB enum).** (Added 2026-06-05.) `Event.type` changed from the
  Prisma `EventType` enum to **`String @db.VarChar(150)`** (the `EventType` enum was **dropped**); `MasterCategory`
  gained **`event_type`**. ⚠ migration — the column cast preserves existing values; the 5 legacy types are
  **seeded** as `event_type` masters in `masters.service.ts` (`ensureTenantEventTypeSeeded`, mirrors
  `ensureTenantNocTypeSeeded`). Backend `event.schema.ts` validates `type` as a free string; `event.service.ts`
  `assertValidEventType()` rejects a create/update `type` that isn't an **active** `event_type` master (replaces
  the enum's guarantee). FE: registered in Master Data UI (`master.ts` union + `MasterDataManagement` config/orders,
  **no targeting** — `UserScopeSelector` stays gated to `posting_type`); new `useEventTypeOptions` (mirrors
  `usePostingTypeOptions`) drives the `EventEditorDialog` dropdown and the admin Drives type filter. **All
  type→label rendering must go through `getEventTypeLabel(value)`** in `src/types/event.ts` (legacy pretty labels
  for the 5, else humanized) so admin-added types don't render blank — `eventTypeLabels` is now just the fallback
  map. `ApiEventType` is now `string`. Don't reintroduce a hardcoded event-type enum/list in forms or displays.
- **Admin masters posting-type options carry a `companies[]`.** (Added 2026-06-11.) `getAdminMasters`
  (`masters.service.ts`) runs **one** extra query (only when the result has posting_type masters):
  `prisma.posting.findMany` filtered by `tenant_id` + `posting_type_master_id in [...]` + `status in
  [published, closed]`, `distinct ['posting_type_master_id','company_id']`, grouped into a
  `Map<masterId, {id,name}[]>`. `mapMasterOption(master, companies?)` includes `companies` **only for
  `category === 'posting_type'`** (`companies ?? []`). FE `ApiMasterOption.companies?: {id,name}[]`;
  `MasterDataManagement` renders them as chips under each posting type ("No companies yet." when empty).
  Read-only aggregation, **no migration**. The public student-facing `getMasters` calls `mapMasterOption(m)`
  with no companies (so posting_type there just gets `[]`) — don't pass `.map(mapMasterOption)` directly
  (Array.map's index arg collides with the new `companies` param; use `(m) => mapMasterOption(m)`).
- **Posting-type masters have a `target_academic_years` scope — ADMIN-ONLY (NOT a student gate).** (Added
  2026-06-11.) `MasterOption.target_academic_years String[] @default([])` (⚠ additive migration) is threaded like
  the other `target_*` arrays (masters schema create/update + `.refine`, `MasterOptionWithTargets`/`mapMasterOption`/
  `createMaster`/`updateMaster` via `uniqueNormalizedValues`; FE `ApiMasterOption`/`Create`/`Update` + `TargetScopeState`
  + `createEmptyTargetScope` + `openEditDialog` + both `UserScopeSelector` bindings). The scope card
  (`UserScopeSelector`) shows an "Academic Years" multi-select (options via `useMasterValues('academic_year')`,
  mirrors Semester); `MasterDataManagement` shows an "Academic Year:" row + a client-side **"Filter by academic
  year"** Select in the Posting Types section (untagged/empty = all years, always shown; tagged = its year only).
  **CRITICAL: `target_academic_years` is deliberately EXCLUDED from `matchesStudentTargeting`/`StudentTargetValues`**
  — unlike the other `target_*` arrays which gate student visibility, students have **no academic-year property**
  (`StudentTargetContext` = institute/course/branch/semester), so adding it there would hide these posting types
  from every student. Keep it admin-side only unless students gain an `academic_year` targeting context.
- **Posting-type (master) student visibility uses `matchesStudentTargetingForMaster`, where BRANCH falls back to
  the parent COURSE.** (Added 2026-06-11.) Students carry **no branch-level attribute** — `Student.department` is
  *course-derived* (`auth.service.deriveDepartment` = CRM courseShortName/Full), while the scope picker's branch
  list comes from a different CRM level (`BranchName` via `/policies/audience/branches`). On the strict
  `matchesStudentTargeting` (AND of institute/course/branch/semester) a **branch selection can never match a
  student and, via the AND, cancels an otherwise-correct institute/course match** — so a branch-scoped posting
  type (and its postings) vanished even for students of that branch. Mechanism of the hide: posting types are
  gated for students in `getMasters` (`masters.service.ts` ~L371) → `useMasterValues('posting_type')` →
  the Dashboard "register interest → matching postings" flow (`InterestPostingsCard` shows a posting only if its
  type matches a *registered* interest) + the Opportunities type-filter dropdown. **Fix:**
  `matchesStudentTargetingForMaster` (`shared/utils/student-targeting.ts`) is identical to the strict matcher
  except a target branch is satisfied by the **parent course** (course-scoped → matching `target_courses` is
  enough; branch-only → student `course` vs the branch label). `getMasters` is the ONLY caller — **postings /
  applications / analytics keep the strict `matchesStudentTargeting`** (currently a no-op for them: the posting
  "Student Visibility" UI is commented out, so `posting.target_*` is always empty and `getPostings` never hides).
  Institute/course/semester scope work today and are unchanged. Don't route postings/applications/analytics
  through the master variant, and don't reintroduce branch as a hard AND for master visibility. [[working-preferences]]
- **Faculty coordinators are scoped to students via their institute/course/branch ASSIGNMENT, not a single
  department string.** (Changed 2026-06-17 — ⚠ **shipped but NOT yet user-tested; verify on a real faculty
  coordinator before relying on it.** Was exact `student.department === user.department`.) A faculty
  coordinator has **no explicit student mapping** — they're "assigned" through the Add/Edit User
  `UserScopeSelector` (institute/course/branch arrays) and/or a free-typed `department`. Previously every faculty
  view matched students by **exact, case-sensitive `student.department === faculty.department`**, but
  `Student.department` is **course-derived** (`deriveDepartment` = CRM courseShortName/Full) while
  `faculty.department` was free-typed or `branches[0]` (a CRM *branch* name) → they almost never matched, so the
  **Faculty Student Directory was empty, the Institute/Semester filter dropdowns didn't load** (their options are
  derived from the scoped student set; Branch loads from the master so it still worked), and the **faculty NOC
  list was empty**. The assignment arrays were stored but **ignored**. **Fix:** `shared/utils/faculty-scope.ts` —
  `resolveFacultyScope(user)` (normalized union of `department + courses + branches`, plus `institutes`) +
  `studentMatchesFacultyScope(student, scope)` (tolerant: student `department` OR `course` matches a target,
  **branch-falls-back-to-course**, institute-gated only when institutes are assigned), reusing `normalizeComparable`.
  `faculty.service.ts` filters students **in-memory** with it (`getStudents`/`getStudentById`/`getDashboard`,
  paginating after — it already did in-memory eligibility+slice) and derives Institute+Semester dropdown options
  from the scoped set; `noc.service.ts` filters the faculty NOC list/detail in-memory and scope-checks
  `facultyApprove`/`rejectNoc` with the matcher, and `createNoc` notifies faculty whose scope covers the student;
  `offer.service.ts` faculty filter honours the assignment arrays (exact-match `OR` over department/course +
  institute, keeps DB pagination — less tolerant than the in-memory matcher, flagged). `req.user` already carries
  `institutes/courses/branches` ([auth.ts](docs/silveroak_backend/src/middleware/auth.ts)). Backward-compatible
  (department-only faculty still match, now case-tolerant). **No migration.** ⚠ If Semester options still don't
  populate, `academic_profiles.semester` is unpopulated for those students (data may live in
  `Student.current_semester`) — a separate data fix. [[working-preferences]]
- **Events have institute/course/branch "pipeline" targeting that AUTO-ASSIGNS students (not a visibility
  filter).** (Added 2026-06-11.) `Event` gained `target_institutes/target_courses/target_branches String[]`
  (⚠ additive migration). Events are visible to a student **only** via an `EventStudent` row
  (`applyVisibilityScope` → `assigned_students.some({student_id})`) — there is **no** targeting-based visibility
  path, by design. So the Create/Edit Event "Pipeline" scope card (reuses `UserScopeSelector`,
  institute/course/branch only — no semester) works by **resolving the pipeline → matching students →
  `eventStudent.createMany({…, skipDuplicates})`** in `event.service.ts` (`resolvePipelineStudentIds` +
  `assignPipelineStudents`, called from `createEvent` and `updateEvent`, best-effort try/catch + logger).
  Matching reuses **`matchesStudentTargetingForMaster`** (branch falls back to course). **Empty pipeline →
  assigns nobody** (preserves manual assignment — the guard early-returns `[]`; do NOT let it resolve to the
  whole tenant). **Edit is ADD-ONLY** (`skipDuplicates`, never deletes) so attendance/panels/manual assignments
  survive a pipeline change. No notify at assign time — events are created **draft** and the existing
  `updateEventStatus`→`published` flow notifies the assigned set. `updateEventSchema = createEventSchema.partial()`
  so the three fields are covered on update; the event detail/list mappers spread `{...event}` so the fields
  flow to the client for edit-prefill. Don't add a targeting-based `applyVisibilityScope` branch — assignment is
  the mechanism. [[working-preferences]]
- **Posting-type policy gate — students must accept a posting-type's linked policy before Show Interest /
  Apply.** (Added 2026-07-02.) TPO admins can link a policy to a posting type in the Policy Repository
  (`/admin/policies`, `Policy.posting_type_master_id` + rich `content`); previously these "linked" policies
  were surfaced to no student. Now clicking **Apply** (`OpportunityDetail.tsx`, the 3 Apply buttons) or
  **Register** interest (`Dashboard.tsx`) opens `components/policies/PostingTypePolicyDialog.tsx`, which
  fetches the linked policies (`usePolicies({ posting_type_master_id })`), shows one `GlobalPolicyCard` per
  policy (I-Agree + Accept via `useAcceptPolicy`), and proceeds only after **ALL** are accepted; **transparent
  no-op** (proceeds without a modal) when the type has no linked policy or all are already accepted.
  Backend: `policy.service.buildPolicyWhere` returns a type's linked policies when `posting_type_master_id`
  is passed (students too), else the global-only clamp stays; `getPolicyById` lets a student read an
  audience-visible LINKED policy's content. `student.service.acceptPolicy` accepts a linked policy (new
  `buildAudiencePolicyWhere`, no global clamp) and **only recomputes the global `student.policy_accepted`
  boolean for GLOBAL policies** — a linked acceptance NEVER flips it (the placement-gate deadlock the code
  repeatedly warns about). Enforcement: **`assertPostingTypePolicyAccepted(studentId, postingTypeMasterId)`**
  in `shared/utils/posting-type-policy.ts` (mirrors `placement-interest.ts`; throws 422
  `POSTING_TYPE_POLICY_NOT_ACCEPTED` unless every audience-visible linked policy is currently accepted) is
  wired into `application.service.apply()` (after the per-type guards) + `student.service.registerInterests()`
  (per requested type). **No migration** — `PolicyAcceptance` already keys on
  `(student_id, policy_id, policy_updated_at)`. Keep the per-type check strictly OUT of
  `areAllVisiblePoliciesAccepted` / `buildVisiblePolicyWhere` (global-only). [[posting-type-policy-gate]] [[working-preferences]]
- **Rejected students are excluded from the Posting Type sections (but NOT from Student Management).**
  (Added 2026-07-02.) Any "students by posting type" listing filters out `verification_status = 'rejected'`:
  admin Interest Lists (`admin.service.getInterestRegistrations` list + `getInterestSummary` counts) and
  faculty My Programs (`faculty.service.getAssignedPrograms` + `getProgramStudents`) all add
  `verification_status: { not: VerificationStatus.rejected }`. Pending + verified stay. Student Management
  lists (admin/faculty `getStudents`) and Selection Database are unchanged (rejected must stay visible there).
  No migration. [[working-preferences]]
- **Student Management → Verification tab is status-filterable + supports re-verify after rejection.**
  (Added 2026-07-02, `components/admin/VerificationTab.tsx`.) The Pending/Verified/Rejected count cards are
  now **clickable status filters** (the list was hard-coded to `pending`). Per-row + Review-dialog actions
  are gated by status: **Verify** shows unless already verified, **Reject** shows unless already rejected
  (pending: both; **rejected: Verify to re-verify**; verified: Reject). Bulk Verify + selection checkboxes
  show only for pending/rejected. Backend `verifyStudent` has **no state-machine guard** (sets whatever
  status is passed), and `verifyStudentMutation` already supports verified/rejected — so this was a pure UI
  gap, no backend change. [[working-preferences]]
- **Faculty "My Programs" (`/faculty/programs`) — posting types under a faculty's scope, students
  enrolled OR interested + CSV.** (Added 2026-07-02.) There is **no explicit posting-type→faculty assignment**;
  a faculty's programs are **derived** = active `posting_type` masters whose `target_institutes/courses/
  branches` (set by TPO admin at `/admin/masters`) **overlap** the faculty's institute/course/branch scope
  (`facultyMatchesPostingTypeMaster` in `shared/utils/faculty-scope.ts`). Under each, students = the faculty's
  already-scoped students (`studentMatchesFacultyScope`, unchanged) who have an **explicit signal** for that
  specific posting type — **registered interest** (interest_registration value == master value, normalized) OR
  an **application/offer** whose `posting.posting_type_master_id === master.id` — de-duped, tagged
  `interest|applied|both`. Endpoints `GET /faculty/programs` +
  `GET /faculty/programs/students?posting_type=<value>` (faculty-module only; a type not mapped to the faculty
  → 403 `PROGRAM_NOT_ASSIGNED`). No migration. [[faculty-my-programs]] [[working-preferences]]
  ⚠ **CHANGED 2026-08-04 — the "enrolled" whole-cohort rule was REMOVED (don't reintroduce it).** It used to
  ALSO include every student whose course/branch merely fell under the type's targeting
  (`matchesStudentTargetingForMaster`), which listed the **entire cohort under every program** — every program
  showed the same people (bug: "common records instead of only the relevant program records"; verified on the
  dev DB — Mayuresh's "NEW STIPEND" was 23 = his whole scope, only 7 had registered interest → now 8 =
  interest ∪ applied). Membership is now interest/application/offer only; a student with none of those does not
  appear. `matchesStudentTargetingForMaster` is no longer imported by `faculty.service.ts`. The **program
  MAPPING** (`facultyMatchesPostingTypeMaster` — which programs appear at all, incl. untargeted "Test
  Placement" mapping to everyone) is deliberately **unchanged**; the fix was to the student records, not the
  program list.
- **Admin Interest Lists (`/admin/interests`) — program **dropdown** filter, full academic CSV export, dept
  filter fix.** (Added 2026-06-23.) The program selector is a `<Select>` (not count-cards); export is a
  proper `.csv` via the new **`downloadCsvTable`** in `lib/spreadsheetExport.ts` (quotes commas/quotes,
  neutralises formula injection, UTF-8 BOM) with the full academic column set. The Department filter now
  derives options from a program-only query (the old unfiltered query always returned `[]` because the
  backend requires a `posting_type`). Reuse `downloadCsvTable` for other admin CSV exports.
- **Internal-staff official email domain accepts `@silveroakuni.ac.in` OR `@socet.edu.in`** (a two-domain
  allowlist since 2026-08-04; was single `@silveroakuni.ac.in` from 2026-07-02, itself changed from
  `@silveroak.ac.in`). CRM-fetched staff carry `@socet.edu.in` (their `officialEmail`), which the single-domain
  gate wrongly rejected. Enforced ONLY at user **creation** for
  `tpo_admin/tpo_employee/faculty_coordinator/management` in `admin.schema.createUserSchema.superRefine` (BE,
  `INSTITUTE_EMAIL_DOMAINS` array + `.some(endsWith)`) + `INSTITUTE_EMAIL_DOMAINS` in `UserManagementTab.tsx`
  (FE, drives the pre-submit check, toast, placeholder, helper text). ⚠ The allowlist is **mirrored FE/BE**
  (no shared package) — keep both in sync; the server is authoritative. **Login and Edit User are NOT
  domain-gated**, so any legacy-domain account still works; the dev `prisma/seed.ts` and login-based tests
  stay on `@silveroakuni.ac.in` (still valid). Verified by parsing `createUserSchema` over a case table:
  both domains pass (case-insensitive) for the four staff roles; other domains + lookalikes fail;
  student/recruiter unaffected.
- **`useUsers` uses `placeholderData: keepPreviousData`** (`hooks/use-admin-api.ts`, fixed 2026-06-23) so the
  Super Admin "All Users" search box keeps focus while typing — the tab's early
  `if (isLoading && !data) return <PageLoader/>` was unmounting the input on every keystroke (new query key →
  `data` undefined). When a list has an early loader-return, give its query `keepPreviousData`.
- **Posting visibility + apply are gated on ENROLLED interest.** (Added 2026-07-06.) A published posting is
  only shown to / appliable by a student who has **registered interest (Show Interest)** in that Posting Type —
  or already has an application/offer for it (so in-flight work isn't hidden). `shared/utils/posting-type-interest.ts`
  (NEW): `getRegisteredInterestValues`, `getVisiblePostingTypeValues` (enrolled ∪ applied/offered),
  `assertInterestRegistered` (apply-path guard, `POSTING_TYPE_NOT_ENROLLED` 422 — mirrors the other per-type
  guards). `posting.service.getPostings`/`getPostingById` student branches filter by the visible set;
  `application.service.apply()` asserts it. Matches on the master **value** (trim+lowercase). No migration.
  This is the posting-**visibility** layer; posting-**type master** visibility is separate (targeting — see
  the master-visibility findings above). [[working-preferences]]
- **Create Event is driven by Posting Type; audience is inherited (no manual pipeline).** (Added 2026-07-06,
  FE-only.) `EventEditorDialog` now cascades **Posting Type → Company → Linked Posting(s)**: Company options =
  distinct companies from `usePostings({ posting_type_master_id })`; Linked Posting filtered by company. The
  old `UserScopeSelector` "Pipeline" is **removed** — Institute/Course/Branch are **inherited** from the
  selected posting-type master (`usePostingTypeOptions` now carries the master `target_*`) into the event's
  `target_*` (which still drives the existing pipeline auto-assign); Semester/Academic-Year shown read-only.
  Event Type stays a separate required field. No backend change (Event already had `company_id`/`posting_id`/
  `target_*`). [[events-posting-type]]
- **An Event links to MULTIPLE postings (roles).** (Added 2026-07-06, ⚠ additive migration
  `Event.posting_ids String[]`.) Legacy-mirror pattern: `posting_ids` holds all linked roles; the old single
  `posting_id`/`posting` relation is KEPT as a back-compat mirror = `posting_ids[0]`, so every single-`posting`
  consumer (DrivesManagement badge, EventAssignmentDialog candidate source, GenerateCircularDialog,
  posting_type filter) still works. `event.service` `attachEventPostings` adds `postings:[{id,title,type}]` to
  list/detail (keeps legacy `posting`). FE Linked Posting = `SearchableMultiSelect`; DrivesManagement +
  EventDetailDialog render all roles. Visibility unchanged (EventStudent assignment, not posting). Run
  `prisma migrate deploy`. [[events-posting-type]]
- **Faculty event visibility is scoped by `Event.faculty_coordinator_ids` (USER ids), NOT the free-typed
  `faculty_coordinators` names.** (Added 2026-08-07. ⚠ additive migration `Event.faculty_coordinator_ids
  String[] @default([])`.) `applyVisibilityScope` (`event.service.ts`) for `faculty_coordinator` now filters
  `where.faculty_coordinator_ids = { has: user.id }` (was `faculty_coordinators has user.name` — an exact
  name match that almost never matched the admin's free-typed "Prof. X" against the faculty's `User.name`, so
  assigned faculty saw **no** events; the `markAttendance` guard used the same `.includes(user.name)` and is now
  `.includes(user.id)`). ⚠ `GET /events` already faculty-scopes via `applyVisibilityScope`, so `FacultyDrives`
  using `useEvents` was fine — the break was the NAME match, not the endpoint (don't switch it to `/events/my`).
  `faculty_coordinators String[]` (names) is **KEPT as a legacy-mirror** for display (EventDetailDialog badges,
  DrivesManagement export). FE: the EventEditorDialog "Faculty Coordinators" free-text `<Input>` is replaced by a
  **`SearchableMultiSelect` of real faculty accounts** (`useUsers({role:'faculty_coordinator',is_active:'true'})`
  → value=id/label=name); `EventFormValues` holds `faculty_coordinator_ids` (ids), and `handleSubmit` resolves
  ids→names so the payload carries **both** (`buildCreateEventPayload(values, coordinatorNames)`). `createEvent`
  persists ids; `updateEvent` spreads `{...data}`; list/detail use `include:` (all scalars) so the field flows
  automatically. ⚠ **Legacy events (names only, no ids) still won't appear for faculty until re-saved through the
  picker** — no backfill (free-typed names can't be reliably mapped to user accounts). [[events-posting-type]]
- **NOC "University Placement Drive" → renamed field "Released Offers by TPO"; Program list is per-source.**
  (Added 2026-07-06.) The wizard's placement selector (`NOCRequestWizard.tsx`) renamed "Assigned University
  Drive" → **"Released Offers by TPO"** and now lists **only the student's own released offers** (`useMyOffers()`
  filtered to `pending_student_action`+`accepted`, i.e. released-not-rejected); the "University Drives"
  (Events) group was removed. The **Placement Source radio moved to step 1, ABOVE Program** (`NOC_STEP_FIELDS[1]
  = ['placement_source','program']`) so the **Program/Category list is per placement source**: University Drive
  → only posting types the student has an **offer** for; Self-Sourced → ~~**all active** posting types
  (**targeting bypassed** via `?all_targets=true`)~~ — **⚠ SUPERSEDED 2026-07-21, see the next entry.**
  The masters `?all_targets=true` flag itself still exists (`useMasterValues(cat, enabled, allTargets)`;
  backend `getMasters` skips student targeting only when the flag is set — opt-in, everything else keeps
  targeting), but the wizard no longer uses it to populate the list. No migration. [[noc-flow]]
- **NOC Self-Sourced Program list = posting types the student is ELIGIBLE for ∪ has REGISTERED INTEREST in.**
  (Added 2026-07-21 — **reverses** the Self-Sourced half of the 2026-07-06 entry above; don't "restore"
  `all_targets` there.) The wizard showed every active posting type in the tenant for Self-Sourced.
  `NOCRequestWizard.tsx` now builds that list from **two** halves, deduped by `normalizeMasterValue`:
  (a) **eligible** = `useMasterValues('posting_type')` **without** `all_targets`, so the server applies
  `matchesStudentTargetingForMaster` — note an **untargeted** posting type (all `target_*` empty) matches
  **every** student (`matchesTargetValue` returns true on an empty array), which is what keeps the list
  non-empty in practice; (b) **interest** = `useStudentInterests()` (`GET /students/me/interests`, a hook
  that existed but was **unused** until now) **intersected with the full active catalogue** — the
  `all_targets=true` query is retained *solely* for that intersection. That intersection is **required**:
  `interest_registrations.interest_type` is a free string and holds legacy values (`job`,
  `summer_internship`, `OJT - 2026 HONOURS NEP INTERNSHIP`, …) that are no longer posting types; offering
  one would pass the dropdown and then fail the wizard's own "valid posting type from masters" check at
  submit. The master's spelling is returned so the submitted value is canonical. **The University-Drive
  branch is untouched** (offer-derived types bypass the filter entirely — a student placed in an
  out-of-scope type can still raise their NOC). Empty list → the student is blocked with "register interest
  from your Dashboard first" (no fallback to all types); `program` is already required so no extra guard is
  needed. Validation follows the dropdown automatically (`validateNocForm` is fed
  `postingTypeOptions`) — **don't** point it at the unfiltered master list or the drive path breaks.
  Frontend-only, no migration. [[noc-flow]]
- **A NOC's new company auto-creates a linked Recruiter on TPO approval; contact person required for
  self-sourced.** (Added 2026-07-06.) `noc.service.createRecruiterForApprovedNoc(noc, userId)` (best-effort,
  mirrors `markLinkedCompanyVerified`; wired after it in **both** `tpoApprove` and `issueNoc`) creates a
  **Recruiter record — NO login User/password** (no email transport; provision a login later via the admin
  recruiter flow, which re-links a `user_id`-null recruiter) from the NOC's `contact_person_*`, linked to the
  company, verified. Guards: only `Company.source='student'` + company has **no recruiter yet** + name/email
  present (idempotent, `@@unique([tenant_id,email])`-safe). To guarantee the link, `contact_person_name`+`email`
  are now **required for self_sourced** (`createNocSchema.superRefine` + wizard `validateNocForm`/RequiredLabel).
  No migration. [[noc-flow]]
- **Placed Students Database (Selection Database) fetches released offers + shows a NOC Status label.**
  (Added 2026-07-06.) `admin.service.getSelectionDatabase` placements query was `type:'job'` AND `OR[accepted,
  joined, did_not_join]` — so **released** offers (`pending_student_action`) returned zero rows; now filters
  `status NOT IN (rejected_by_admin, rejected_by_student)` (all released, non-rejected). Each record gains a
  computed `noc_status` ('issued' when the student has an issued `NocRequest`, else 'pending'), rendered as a
  **NOC Issued / NOC Pending** badge column (FE `SelectionDatabaseTab.tsx`; bump colSpan). No migration.
  [[noc-flow]]
- **Uploaded file links (`/uploads/...`) must be resolved through the API base, not the frontend origin.**
  (Added 2026-07-06.) Every upload endpoint stores a root-relative `/uploads/<subdir>/<file>` path (No Dues
  proof, NOC letters, policy docs, internships, portfolio, resumes, announcement attachments, profile photos).
  The shared `resolveBackendAssetUrl` (`src/lib/studentModule.ts`) used to return `/uploads/...` **unchanged**,
  so the browser resolved it against the **frontend** origin. In single-origin reverse-proxy prod (frontend +
  `/api`→backend on one host) only `/api` is forwarded, so `/uploads/x` 404s → "attachment uploaded but link
  opens blank/404". The `proof_url` persist/return/render chain is correct — the break was purely URL
  resolution + static serving. **Fix (2 files, no migration, backward compatible):** (1) backend `app.ts` adds
  a **second PUBLIC** static mount `app.use('/api/uploads', express.static(uploadDir))` placed **ABOVE** the
  `app.use('/api', authenticate, resolveTenant)` line (so it's not auth-gated — `<img>`/`window.open` can't
  send a bearer token); the original `/uploads` mount stays. (2) `resolveBackendAssetUrl` now prefixes
  `/uploads/...` paths with the API base (origin **+** `/api` prefix) so they route through the same proxied
  path in every topology; external `http(s)` URLs + non-upload values are untouched. Since it's the shared
  resolver (68 call sites), this fixed **all** attachment types at once. **Deploy backend-first** (the FE points
  at `/api/uploads`).
- **Posting Operations (`PostingsManagement.tsx`): the "Type" filter was non-functional; use the master-based
  Posting Type filter + `keepPreviousData`.** (Added 2026-07-06.) Two bugs: (1) the hardcoded Type dropdown
  sent `?type=job|internship|stipend_internship`, but the backend `queryPostingsSchema` only accepts
  `posting_type_master_id` (Zod strips `type`; `getPostings` never filters on it) → the filter did nothing.
  Replaced it with a working **Posting Type** `<Select>` driven by `usePostingTypeOptions()`, binding
  `SelectItem value={option.id}` (**id = the UUID**, not value) → sends `posting_type_master_id`. (2) The search
  box lost focus after one char: `usePostings` had no `placeholderData: keepPreviousData`, so each keystroke →
  new query key → `postingsQuery.isLoading` true → the page's early `<PostingsManagementSkeleton/>` return
  unmounted the `<Input>`. Added `placeholderData: keepPreviousData` to `usePostings` (`use-posting-api.ts`) —
  same fix as `useUsers`. Frontend-only, no migration.
- **`NotificationsDropdown` per-notification-type icon map must cover ALL `NotificationType` values, or the bell
  crashes with React #130.** (Added 2026-07-06.) `notificationIcons` mapped only 4 of the 13 `NotificationType`
  values; any modern notification (`offer`/`application`/`interest`/`noc`/`event`/`announcement`/`circular`/
  `no_dues`/`recruiter`) made `const Icon = notificationIcons[type]` **undefined** → `<Icon/>` threw
  **minified React #130** ("Element type is undefined"), crashing the whole dropdown. Fix: completed the map for
  all 13 types, typed as `Record<NotificationType, LucideIcon>` (a missing key is now a **compile error** — this
  is the guard; keep it typed), plus a `?? Bell` runtime fallback for any unknown/future backend type. When the
  backend adds a `NotificationType`, add its icon here or tsc fails.
- **shadcn/Radix `ScrollArea` does NOT scroll with only `max-h-*` (no fixed height) — use a native
  `overflow-y-auto` div instead.** (Added 2026-07-06, notification window.) Radix's ScrollArea Viewport is
  `h-full` (height:100%), which only resolves against a parent with a **definite** height; a ScrollArea root
  with only `max-h-[420px]` (height:auto) leaves the viewport at full content height and the root just clips it
  (`overflow-hidden`) → no scrollbar, no wheel scroll. The notification panel was swapped from
  `<ScrollArea className="max-h-[420px]">` to `<div className="max-h-[420px] overflow-y-auto">`. For any
  max-height-bounded scroll region (dropdowns, popovers), prefer a native `overflow-y-auto` div over ScrollArea.
- **A posting-type master CANNOT be deleted while any posting references it; the other dependants
  disappear silently.** (Added 2026-07-21.) `Posting.posting_type_master_id` is **`onDelete: Restrict`**
  ([schema.prisma](docs/silveroak_backend/prisma/schema.prisma)), so Postgres blocks the delete when a
  posting of ANY status (draft/published/closed) uses the type — which is why *some* posting types delete
  and others don't. `deleteMaster` (`masters.service.ts`) now **pre-counts postings for `category ===
  'posting_type'` and throws `ConflictError` 409 `MASTER_OPTION_IN_USE`** naming the count; without it the
  raw Prisma **P2003** reached the generic error-handler branch, whose message was the misleading
  *"Referenced record does not exist"* (worded for create-with-bad-FK — now reworded to cover both
  directions; status 400 + code `FOREIGN_KEY_VIOLATION` unchanged). The **other three dependants cascade
  silently on a successful delete**: `NocTemplate` (Cascade — templates destroyed),
  `StudentPostingTypePreference` (Cascade — opt-in/out rows destroyed), `Policy` (SetNull — a linked
  policy silently becomes **global**, which interacts with the global-policy gate). `getAdminMasters` now
  returns `usage{postings,noc_templates,student_preferences,policies}` per posting type via **4 `groupBy`
  queries scoped to the posting-type ids** — mirror the existing `companies[]` pass; do **not** switch it
  to a per-row `include: { _count }`, the endpoint returns every category (hundreds of skill/technology
  rows) for a field only posting types use. `usage` is **admin-only** — the student `getMasters` path
  passes no counts. Note `MasterOption.is_active` does **not** gate posting visibility for students (that's
  `InterestRegistration`, see `posting-type-interest.ts`), so "deactivate instead" only stops *new*
  Show-Interest and hides the type from admin dropdowns. [[working-preferences]]
- **Announcement targeting is a 4-level AND-ed scope (Institute → Course → Branch → Semester), and
  semester options are DERIVED FROM STUDENTS.** (Added 2026-07-21.) All four `Announcement.target_*`
  columns already existed; the bugs were elsewhere. **(a)** `announcement.schema.ts` capped
  institutes/courses/branches at **`.max(1)`** — removed, they're now unbounded multi-selects.
  **(b)** `target_semesters` used to apply **only** inside `case 'semester':` of
  `studentMatchesAnnouncement`; the new **`studentMatchesAnnouncementScope()`** AND-s all four levels
  for **every** audience type (empty level = all). ⚠ That is a real behaviour change for any row with
  semesters set under a non-`'semester'` type. **(c)** Branch now **falls back to the parent course**
  (`matchesAllowedValue(department) || matchesAllowedValue(course)`) — students carry no branch
  attribute (`department` is course-derived), so strict branch targeting reached **nobody**; same
  fallback as `matchesStudentTargetingForMaster` / `studentMatchesFacultyScope`. **There is no
  course→semester mapping anywhere** (not CRM, not Master Data — `AcademicProfile.semester` is a bare
  `Int?`), so `GET /announcements/audience/semesters` (`getAudienceSemesterOptions`, mirrors
  `faculty.service.getStudentFilterOptions`) returns the **distinct semesters present among students in
  the selected scope** + per-semester counts. That's what makes cross-selection impossible — **don't
  "fix" an empty list by falling back to a static 1–8 list**, an empty result means "no such students".
  The endpoint reuses the *same* scope predicate as delivery, so picker and recipients can't diverge;
  it is registered **above** both `GET /:announcementId` and the `router.use(requireRole('student'))`
  line. FE: new `AnnouncementAudienceSelector` (child options = **union** over selected parents via
  `useQueries` on the existing `policyKeys.courses/branches` cache keys; invalid child selections
  pruned, valid ones kept). **`PolicyAudienceSelector` is deliberately left single-select** — the policy
  dialogs still reference it in commented-out code. "Specific Semester" was removed from the audience
  dropdown (semester is scope, not a mode); legacy rows load as `'all'` with semesters preserved —
  identical recipients. **No migration.** [[working-preferences]]
- **The NOC certificate exists as TWO independent renderers, and its "To," block is HARDCODED (not
  placeholder-driven).** (Added 2026-07-21.) The letter is drawn twice: the **PDF** by
  `noc-certificate.renderer.ts` (hand-rolled PDF content stream at **absolute Y coordinates** — title
  684, recipient block from 650, `Sub:` **fixed at 588**, body from 558, no layout engine and no text
  wrapping outside `wrapBlock`) and **on screen** by `src/components/noc/NocTemplatePreview.tsx`, which
  is shared by **four** surfaces (Master Data → NOC Template live preview, student `NocCertificate.tsx`,
  `NOCRequestDetailSheet`, `NOCReviewDialog`). **Any change to the letter must be made in both or they
  drift** — that drift was the bug: the recipient block emitted only name + designation, so the
  **company name was never printed anywhere** and no template edit could add it (the block ignores the
  template body). Now both render `To,` + name + designation + `company_name`, **skipping empty values**
  (the old `'____________________'` fallback is gone). ⚠ `buildNocCertificateSnapshot`
  (`noc.service.ts`) stores `contact_person_name || '—'` — an **em dash** — so anything treating "no
  contact person" as empty must also treat `'—'` as empty (`hasValue()` in the preview does).
  Certificates re-render from the stored snapshot, but **issued PDF files are never regenerated**, so a
  historical NOC's screen view and its stored PDF can legitimately differ.
- **⚠ KNOWN, UNFIXED: NOC template placeholder vocabularies diverge between the PDF and the
  snapshot/preview.** (Recorded 2026-07-21 — deliberately left alone, don't re-diagnose.) The PDF token
  map (`generateNocCertificatePdf.replacements`) understands **`start_date`/`end_date`** but **not**
  `duration_from`/`duration_to`; the snapshot values + `NocTemplatePreviewValues` +
  `buildDefaultNocTemplatePreviewValues` have **`duration_from`/`duration_to`** but **not**
  `start_date`/`end_date`. Since `resolveTemplateTokens` maps an unknown token to **`''` silently**, a
  template body using either name renders correctly in ONE surface and **blank in the other**. The
  editor's "Available placeholders" list (`NocTemplateManager.tsx`) advertises `start_date`/`end_date`
  and **omits `contact_person_designation`** (which the PDF does support). Fixing it means adding
  aliases on both sides + correcting that list. [[working-preferences]]
- **⚠ PAGINATION IS SILENTLY DEAD ON MOST ADMIN LISTS — snake_case wire vs camelCase type.** (Added
  2026-07-21.) The backend's `paginate()` (`shared/utils/pagination.ts`) returns
  **`{page, limit, total, total_pages, has_next, has_prev}`**, but the FE paginated types declare
  **`totalPages`/`hasNext`**. Any service that returns the response **raw** (cast through
  `apiClient.get<Paginated…>`) therefore yields `pagination.totalPages === undefined` at runtime, so
  the near-universal render guard `(data?.pagination.totalPages ?? 1) > 1` is **always false and the
  pager never renders** — the list looks like it has one page forever. **TypeScript cannot catch this**
  (the payload is cast, never validated), which is why it survived so long.
  **Fixed so far: `offerService`** (Offer Records + Faculty Offers). **Still broken — verified reading
  camelCase against a raw service**: `nocService` → AdminNOCManagement, `applicationService` →
  ApplicationsManagement + ApplicationPipeline, `driveService` → DrivesManagement, `employerService` →
  CompanyListTab/RecruiterListTab, `facultyService` → DepartmentStudents, `securityService` →
  AuditLogTab, plus `postingService`/`recruiterService`/`studentService`/`masterService`/
  `portfolioService`/`reportService`/`nocTemplateService`. **Already correct** (they normalize):
  `adminService`, `announcementService`, `circularService`, `internshipService`, `noDuesService`,
  `notificationService`, `policyService` — 8 private copies of the same `normalizePagination` helper
  now, with **no shared util in `src/lib`**; extracting one is the obvious cleanup when someone fixes
  the rest. Accept **both** spellings when normalizing.
- **The id-vs-value trap 400s the WHOLE list, and two screens still have it.** (Confirmed + partly
  fixed 2026-07-21.) Binding a posting-type `<SelectItem>` to `option.value` while sending it as
  **`posting_type_master_id`** (declared `z.string().uuid()`) makes Zod reject the request → `validate()`
  → **400 `VALIDATION_ERROR`, message "One or more fields have validation errors"**. Because these
  tables are a single query, the rejected filter **takes the entire list down** — it reads to users as
  "unable to load", not "filter broken". Verified by parsing `queryOffersSchema`: `"Test Placement"`,
  `"job"` → *Invalid uuid*; a master UUID → OK. **Fixed in `OffersManagement.tsx`; and `DrivesManagement.tsx`
  + `InternshipsManagement.tsx` (1st dropdown) fixed 2026-08-04** (flipped to `option.id` during the
  "Posting Type" filter-label standardization). Already correct: `ApplicationsManagement`,
  `PostingsManagement`, `PostingForm`, `MultiPostingForm`, `StudentListTab`, `VerificationTab`,
  Add/EditPolicyDialog. **Never blanket-sweep to `option.id`** — `SelectionDatabaseTab` correctly binds
  `option.value` because its endpoint filters on `posting_type` (the value string). Match the param.
- **Most existing offers/postings point at INACTIVE posting types**, so a posting-type filter can look
  broken when it isn't. (Observed 2026-07-21 on the dev DB: of 30 offers, 28 belong to types that are no
  longer active masters — `job` (17), `internship` (4), `Placement 2026` (3), `OJT - 2026 HONOURS NEP
  INTERNSHIP` (3), `BCA Posting 1` (1) — leaving 1 offer each under the two active types.) Since the
  dropdown only lists **active** masters, filtering by any of them legitimately returns very few rows.
  Check the data before treating an empty filtered list as a bug.
- **Panel assignment lives in `EventAssignmentDialog` — `SlotAllocationDialog` is DEAD CODE.** (Added
  2026-07-21.) `SlotAllocationDialog.tsx` (599 lines, per-student panel + slot) has **no imports
  anywhere** and is local-state only (`panel-${Date.now()}` ids) — don't "fix" panel behaviour there.
  `DrivesManagement` opens `EventAssignmentDialog` ("Assign Students" + panel select), which is the
  only live surface. Its candidate list used to be **applicants to `event.posting_id` only** (the legacy
  mirror = `posting_ids[0]`), **hard-gated on that id existing**, and it **excluded already-assigned
  students** — so it was empty whenever the drive had no linked role (Linked Posting is optional),
  had several roles, or had no applications, and an existing attendee could never be put on a panel.
  Now: assigned students (from `event.assigned_students`, which already carries `panel_id` + full
  student details — **no extra request needed**) ∪ applicants across **all** `posting_ids` (via
  `useQueries` on the existing `applicationKeys.listAll` cache) ∪ a **full student-directory fallback**
  (`useAdminStudents`, server-side search) when there are no applicants. ⚠ `assignStudents`
  **upserts** (`update: { panel_id }`), so re-submitting an assigned student MOVES them — and sending
  `panel_id: null` (the "No panel" option) **clears** their panel. It also fires `notifyManyUsers` on
  every assign, so moving someone between panels re-notifies them. `ApiAdminStudent.student_id` is
  `Student.id` (verified in `mapAdminStudent`), which is what the assign endpoint expects — don't pass
  `user_id`. Frontend-only, no migration. [[events-posting-type]]
- **`Student.policy_accepted_at` is a GLOBAL-policy timestamp — never let it satisfy a LINKED policy.**
  (Added 2026-07-21.) Acceptance is checked as "explicit `PolicyAcceptance` row whose
  `policy_updated_at` equals the policy's current `updated_at`, **else** `policy_accepted_at >=
  policy.updated_at`". That second (legacy) clause is only meaningful for **global** policies —
  `student.service.acceptPolicy` writes `policy_accepted_at` **only** when the accepted policy is
  global (it explicitly skips the update for linked ones). Applying it to a **posting-type-linked**
  policy silently marked a policy the student had never seen as accepted, which **both** hid the
  `PostingTypePolicyDialog` (it engages only when some policy has `accepted_current !== true`) **and**
  disabled `assertPostingTypePolicyAccepted` — so the gate appeared only when a student's global
  acceptance happened to *predate* the policy's last edit, i.e. seemingly at random. **Fixed:**
  `isPolicyAcceptedCurrent` (`policy.service.ts`) applies the legacy clause only when
  `posting_type_master_id === null`, and `posting-type-policy.ts` dropped it entirely (every policy it
  loads is linked by construction). ⚠ **`hasCurrentAcceptance` in `student.service.ts` is a
  same-shaped twin that must NOT be changed** — its only caller pairs it with `buildVisiblePolicyWhere`,
  hard-clamped to `posting_type_master_id: null`, so it governs the **global** gate that controls
  dashboard access and the documented placement-gate deadlock. Frontend needed no change. No migration.
  [[posting-type-policy-gate]]
- **Company names are deduped in the SERVICE, not the DB — there is no unique constraint.** (Added
  2026-07-21.) `Company` has only `@@index([tenant_id, name])`, so nothing at the DB level stops
  duplicates. Dedupe now lives in **`shared/utils/company-name.ts`**: `normalizeCompanyName` (lowercase
  + drop every non-`\p{L}\p{N}` char, i.e. punctuation **and all whitespace**, so `TechCorp` /
  `Tech Corp` / `Tech-Corp` share one key) and `findDuplicateCompany(tenantId, name, excludeCompanyId?)`,
  which compares **in memory** — Prisma's `mode:'insensitive'` covers case but **not** spacing or
  punctuation, which is exactly what this catches, so don't "optimize" it into a `where`. Wired into
  `createCompany` **and** `updateCompany` (only when `data.name` is present, always excluding the edited
  row) → `ConflictError` 409 **`COMPANY_ALREADY_EXISTS`**. Legal suffixes are deliberately **not**
  stripped (that would collide "Acme Ltd" with "Acme Inc"). ⚠ `normalizeCompanyName` is **mirrored** in
  `src/lib/employerModule.ts` (no shared package) — keep both in sync; the server is authoritative.
  Note the other two company-create paths already deduped (`importCompanies`' `knownNames` set,
  `noc.service.createNoc`'s find-or-create) — manual create was the gap. **A `@@unique([tenant_id,
  name])` was rejected on purpose**: it can't apply where duplicates already exist (dev DB has 5×
  "Test Corp") and still wouldn't catch case/spacing variants. In the UI, `AddCompanyDialog` sends
  **`buildCompanySearchTerm()` = the longest alphanumeric token**, NOT the raw input, to
  `GET /companies?search` — that endpoint matches with a raw `contains`, so searching `"Info-sys"`
  returns nothing and the warning would never render. Exact match disables Save; near matches only warn
  (per product decision). `useCompanies(params, enabled)` gained an optional `enabled` flag for this.
- **Posting-type labels: NEVER write a fixed job/internship/stipend_internship branch — always call
  `formatPostingTypeLabel`.** (Added 2026-07-21.) `posting.type` is the linked master's **value**
  (`flattenPostingType`), i.e. any admin-created string, and `ApiPostingType = string`. A 3-branch
  renderer therefore mislabels every custom type as whatever its catch-all says. Fixed on **All
  Postings** (`PostingsManagement.tsx`), which labelled all 8 custom-type postings "Stipend
  Internship" — reuse **`PostingTypeBadge`** (`components/ui/status-badge.tsx`, already
  `status: string` + `formatPostingTypeLabel`) rather than a local badge helper. ⚠ Guard the empty
  case: `flattenPostingType` yields `''` when no master is linked, and `formatPostingTypeLabel('')`
  is `''` → an empty badge. **Don't resolve the label via `usePostingTypeOptions()`** — it lists only
  **active** masters, and most in-use types are inactive (6 of 7 on the dev DB), so those rows would
  render blank; `posting.type` comes from the DB join and already reflects renames.
  **⚠ STILL BROKEN, same root cause (left out of scope by the user on 2026-07-21, don't re-diagnose):**
  (a) **`getPostingTypeLabel`** (`src/data/mockPostingsData.ts`) is a 3-case switch with **no default**
  → returns **`undefined`** for a custom type, so the badge renders **EMPTY** on the student
  `OpportunityCard`, `OpportunityDetail` and admin `PostingDetail`, and the opt-out reason reads
  *"You have opted out of **undefined** placements"*. One-line fix when revisited: delegate to
  `formatPostingTypeLabel` and widen the param to `string` (this clears 5 of the 100 baseline TS
  errors). (b) `PostingsManagement`'s **"Placements"/"Internships" count cards** are `type === 'job'`
  vs everything else, so custom types all count as Internships. (c) `RecruitmentPipeline.tsx`
  (raw value) and `OfferToJoinFunnelReport.tsx` (wrong "Stipend Internship" fallback) still branch by hand.
- **Faculty student-portfolio view (`GET /portfolio/:studentId`) had a router-wide student gate + a stale
  exact-department scope.** (Fixed 2026-08-04.) `portfolio.routes.ts` did
  `router.use(requireRole('student'))` at the TOP, so it ran for **every** route including the staff
  `/:studentId` one that declares `requireRole('tpo_admin','tpo_employee','faculty_coordinator','super_admin')`
  below it — faculty 403'd (`ROLE_NOT_ALLOWED`) before reaching their own allowance, and the default
  `QueryClient` (retry=3 backoff) turned the 403 into a multi-second **stuck "Loading portfolio…"** spinner on
  Faculty → Department Students → View → Portfolio. **Fix pattern:** scope the student-only gate to the prefix
  its routes share — `router.use('/me', requireRole('student'), requireStudentProfileAccess)` (all student
  routes are under `/me`; `/:studentId` skips it). Watch for this any time a router mixes a `router.use(role)`
  gate with a later route for a *different* role — the `router.use` wins. **Second, deeper bug:** even past the
  403, `getStudentPortfolio` (`portfolio.service.ts`) scoped faculty by
  `student.department === scope.department` (from the legacy `scopeToDepartment` middleware) — the exact match
  the faculty-scope fix replaced everywhere else; on the dev DB it matched 0-1 of the 6-23 students the
  Directory shows. Now it fetches by id+tenant and, for faculty, checks
  `studentMatchesFacultyScope(student, resolveFacultyScope(user))` (needs `course`+`institute` in the select) —
  the SAME tolerant matcher as Directory/NOC/My Programs. **Any faculty-scoped student lookup must use that util,
  never `req.scope.department`.** tpo/super paths were department-filter-free and are unchanged. ⚠ The
  **recruiter** Candidate Detail portfolio tab (`CandidateDetailSheet.tsx`) hits the same endpoint but
  `recruiter` isn't in its role list → 403 (pre-existing, left as a separate access-control call). [[working-preferences]]
- **Posting-type "Application Receiving" toggle (`MasterOption.accepting_applications`) is SEPARATE from
  `is_active`.** (Added 2026-08-04. ⚠ additive migration `accepting_applications Boolean @default(true)`.)
  `is_active=false` **hides** the type from `getMasters` entirely; `accepting_applications=false` keeps it
  **visible** to students but blocks **register-interest AND apply** for it. Enforcement mirrors the other
  per-type guards: **`assertPostingTypeAcceptingApplications(masterId)`** in
  `shared/utils/posting-type-accepting.ts` → `BusinessRuleError 'POSTING_TYPE_NOT_RECEIVING'` (422), wired
  into `application.service.apply()` (blocks even already-enrolled students — a deliberate product choice)
  and inline in `student.service.registerInterests()` (the masterOptions query selects
  `accepting_applications` and rejects OFF types with a combined message). `mapMasterOption` exposes the
  field **only for `posting_type`** (like `companies`), so `ApiMasterOption.accepting_applications?` is
  posting-type-only; **`getMasters` is NOT filtered by it** (the type must stay listed). FE: admin `Switch`
  in `MasterDataManagement` (posting_type rows only, no confirm dialog, `useUpdateAdminMaster`); the student
  Dashboard Register button reads `usePostingTypeOptions().acceptingApplications` (default-true via
  `!== false` for pre-migration rows) keyed by `getPostingTypeInterestComparisonKey`, disables + shows an
  "Applications closed" badge. Posting **visibility** (registered-interest gate) is unchanged. [[working-preferences]]
- **Password policy (set-password only): ≥8 + ≥1 uppercase + ≥1 special (any non-alphanumeric).** (Added
  2026-08-04.) One shared validator per side: BE **`strongPasswordSchema`** in `shared/schemas/common.ts`
  (used by `auth.schema` signup/reset/change `*password` fields + `admin.schema` `createUserSchema.password`);
  FE **`src/lib/passwordPolicy.ts`** (`getPasswordPolicyError` + `PASSWORD_POLICY_HINT` +
  `strongPasswordFieldSchema`). ⚠ **Mirrored** FE/BE (no shared package) — keep in sync; server authoritative.
  **LOGIN is deliberately NOT gated** (`loginSchema.password` stays `min(1)`) so pre-policy passwords still
  sign in — never add the strength check to login or you lock out existing users. **Confirm-password fields
  validate presence + equality only** (the equality `superRefine`), not the full regex, to avoid duplicate
  errors. `generateTemporaryPassword` (`shared/utils/password.ts`) now GUARANTEES ≥1 uppercase + ≥1 special
  (from `@#$%&*`) so generated credentials are themselves policy-compliant. All the inline FE
  `password.length < 8` checks were replaced with `getPasswordPolicyError` (ChangePasswordDialog, MyProfile,
  Login signup+reset, Profile, UserManagementTab). No migration.
- **No Dues: exactly ONE approved record per student — the process locks on approval.** (Added 2026-08-04.)
  There was no per-student guard: `createNoDues` only checked `no_dues_enabled` (so a direct `POST /no-dues`
  made a second request even after approval — the student *page* gate `hasBlockingNoDuesRequest` was
  API-bypassable), and `reviewNoDues` (the **single** `PUT /:id/review` endpoint behind Approve / Reject /
  Return / the free-form **Change Status** dialog) only checked tenant — so an admin could approve/reject a
  *different* pending/rejected request for an already-approved student (two approved records) or flip the
  approved one. **Fix:** new **`shared/utils/no-dues-block.ts`** → `assertNoApprovedNoDues(studentId, tenantId)`
  (locked set = **`approved` + `issued`**; throws `BusinessRuleError 'NO_DUES_ALREADY_APPROVED'` HTTP 422),
  mirroring `self-placed-noc-block.ts`. Wired as a **PRE-CHECK** (before the mutation, so the FIRST approval
  still passes — no approved record exists yet at that instant) into **four** `no-dues.service.ts` functions:
  `createNoDues`, `resubmitNoDues`, `updateNoDues`, and `reviewNoDues`. **`issueNoDues` is deliberately NOT
  guarded** — approved→issued is the legitimate completion (separate `PUT /:id/issue`, already requires
  `status==='approved'`). FE: the admin detail sheet ([NoDuesManagement.tsx](src/pages/admin/NoDuesManagement.tsx))
  now hides the **Actions** card (Edit Form / Change Status) when `status === 'approved'` (was only `'issued'`);
  `openStatusDialog`/`openEditDialog` also early-return on `approved`. The sibling-request case (a pending
  request for an already-approved student) relies on the backend 422 → `getNoDuesErrorMessage` toast. Note
  `handleIssue` exists but is **wired to no button**, so `approved` is the de-facto terminal admin state.
  **No `@@unique` on `student_id`** (rejected requests legitimately create multiple historical rows; the
  guard enforces "one *approved*"). No schema change, **no migration**. [[working-preferences]]
- **⚠ REVERTED 2026-08-06 — approved No Dues NO LONGER closes the placement/internship process.** The
  2026-08-04 enhancement (below, kept for history) made an `approved`/`issued` No Dues record block apply /
  register-interest / new-NOC. The user reverted that behavior. **`assertPlacementOpenForNoDues` +
  `NO_DUES_PROCESS_CLOSED` were deleted** from `no-dues-block.ts` and unwired from `application.service.apply()`,
  `student.service.registerInterests()`, `noc.service.createNoc()`; **`getMyProfile` no longer returns
  `no_dues_closed`** and the FE field/UX (`OpportunityDetail` readiness reason, `Dashboard` `noDuesBlockReason`
  + amber banner — `interestBlockReason` reverted to plain `offerBlockReason`, `NOCDashboard` `noDuesClosed`
  Alert + button gating, `noDuesModule.hasApprovedNoDues(requests)` helper) were all removed. ⚠ **The SEPARATE
  "one approved No Dues record per student" guard STAYS** — `hasApprovedNoDues` + `assertNoApprovedNoDues`
  (no-dues-block.ts) and its 4 call sites in `no-dues.service.ts` are untouched (still blocks a 2nd submission /
  admin re-review of an approved record). Surgical revert (files also carry later filter/interest-approval
  work), BE tsc 0 / FE tsc 91, no migration. The historical entry below documents what was removed. [[working-preferences]]
- **(HISTORICAL — reverted 2026-08-06, see entry above) Approved No Dues CLOSES the student's placement & internship process (apply / interest / new NOC blocked).**
  (Added 2026-08-04, extends the entry above.) Once a student has an `approved`/`issued` No Dues record, three
  placement/internship actions are hard-blocked. `no-dues-block.ts` gained **`hasApprovedNoDues(studentId,
  tenantId)`** (boolean; `assertNoApprovedNoDues` now calls it — one query definition) and
  **`assertPlacementOpenForNoDues(studentId, tenantId)`** → `BusinessRuleError 'NO_DUES_PROCESS_CLOSED'` (422).
  Wired as an **early pre-check** (mirrors the `assertNoExistingOffer` slot) into **`application.service.apply()`**
  (`tenantId` param), **`student.service.registerInterests()`** (`student.tenant_id` — no `tenantId` param), and
  **`noc.service.createNoc()`** (`tenantId` param). **`getMyProfile` now returns `no_dues_closed: boolean`**
  (`hasApprovedNoDues(student.id, student.tenant_id)`) — added to FE `ApiStudentProfile` ([types/student.ts](src/types/student.ts)).
  FE (UX only; backend is authoritative): `OpportunityDetail` pushes a `readinessReasons` entry (disables all 3
  Apply buttons via `canApply`); `Dashboard` adds `noDuesBlockReason` → combined `interestBlockReason =
  offerBlockReason ?? noDuesBlockReason`, OR'd into the Register button `disabled`/`title` + `openInterestGate`/
  `handleRegisterInterest` guards + an amber banner; `NOCDashboard` disables both "Request New NOC" entry points
  (button + EmptyState action) and shows an `Alert`. Convenience `hasApprovedNoDues(requests)` added to
  `noDuesModule.ts` (prefer the `no_dues_closed` profile flag). **Deliberately left OPEN:** offer accept/reject
  (not a "new" action) and all view-only placement pages/sidebar nav (user chose "disable actions + banner", not
  page/nav hiding). No schema change, **no migration**. [[working-preferences]]
- **Interest registration is now an APPROVAL workflow (pending → approved), with a soft TPO withdraw.**
  (Added 2026-08-04. ⚠ MIGRATION + one-time permission backfill.) `InterestRegistration` gained
  `status InterestRegistrationStatus {pending approved withdrawn} @default(approved)` (+ `reviewed_by`,
  `reviewed_at`, `status_reason`, `@@index([student_id,status])`). The `@default(approved)` **grandfathers
  every existing row** so current students keep their access; `student.service.registerInterests()` now
  **creates rows as `pending`** (and reactivates a `withdrawn` row back to `pending`; leaves pending/approved
  untouched). **Visibility vs apply split** in `shared/utils/posting-type-interest.ts`:
  `getRegisteredInterestValues` = `{pending,approved}` (drives VISIBILITY — pending stays visible, per
  product decision "visible but can't apply"); new `getApprovedInterestValues` = `approved` only, used by
  `assertInterestRegistered` (apply gate) which throws **`POSTING_TYPE_PENDING_APPROVAL`** (422) when a
  registration exists but isn't approved, else the old `POSTING_TYPE_NOT_ENROLLED`. New TPO endpoints
  **`PUT /admin/interests/registrations/:id/approve|withdraw`** (`admin.service.approveInterestRegistration`/
  `withdrawInterestRegistration`, gated `requirePermission('interest_lists','approve')`, notify the student).
  Withdraw is **soft** (`status=withdrawn`, keeps history, revokes apply); **withdrawn rows are excluded**
  from the admin summary/list, faculty My-Programs, offer/posting notification targeting, and reports —
  pending still counts as "interested" as before. The admin list (`getInterestRegistrations`) takes an
  optional `status` filter (default excludes withdrawn) and `mapAdminStudent` interests now carry `id` +
  `status`. ⚠ **Two ops steps:** (1) `npx prisma migrate dev` (user); (2) existing tenants need
  `tsx scripts/backfill-interest-lists-approve.ts --apply` because `interest_lists` RolePermission rows are
  already seeded (`ensureTenantRolePermissions` only inserts MISSING combos), so the new
  `interest_lists:{can_approve}` default only reaches NEW tenants — the middleware reads flags from the DB.
  FE: student Dashboard shows Registered/**Pending approval** badges + disabled Register; `OpportunityDetail`
  pushes a pending-approval `readinessReasons` entry; admin `InterestLists.tsx` has a status filter +
  per-row Approve/Withdraw (withdraw dialog with optional reason). `ApiInterest`/`ApiAdminStudentInterest`
  gained `status` (+ `id` on the admin one). ~~Re-registering a withdrawn program → back to pending.~~
  [[working-preferences]]
- **⚠ Interest WITHDRAWAL — audit (admin name), student message, and LOCK (2026-08-06, extends + AMENDS the
  entry above; ⚠ MIGRATION `InterestRegistration.reviewed_by_name String?`).** Three changes to the withdraw
  workflow, two of which **reverse documented decisions** of the entry above:
  (1) **Admin NAME is now snapshotted.** `reviewed_by` was an id-only string (no User relation); added denormalized
  `reviewed_by_name String?` (snapshot pattern, survives rename/delete). Controllers pass `req.user.name` into
  `approveInterestRegistration`/`withdrawInterestRegistration`; the service writes it. `adminStudentInclude` selects
  `reviewed_at`/`reviewed_by_name`/`status_reason`; `mapAdminStudent` emits them; student `getInterests` returns the
  full row already. FE `ApiInterest` + `ApiAdminStudentInterest` gained those 3 fields.
  (2) **✏️ Withdrawn is now TERMINAL for the student** (reverses "re-register → pending"). `registerInterests` THROWS
  `BusinessRuleError 'INTEREST_WITHDRAWN'` (422) when a withdrawn row exists — only a TPO admin reinstates (approve).
  (3) **✏️ Admin Interest List DEFAULT shows withdrawn** (was excluded). `getInterestRegistrations` default status
  filter `{not:'withdrawn'}` → `undefined` (all). ⚠ **`getInterestSummary` counts + faculty My Programs +
  notifications + reports STILL exclude withdrawn** — those services are untouched; don't "sync" them.
  FE: `InterestLists` default filter `'active'`→`'all'`; a withdrawn/approved row shows the review date/time + admin
  name (+ reason) under the badge. Student `Dashboard` no longer filters withdrawn — a withdrawn posting type shows a
  red **Withdrawn** badge + message **"You have been withdrawn from this Posting Type by TPO Admin on [Date] by
  [Admin Name]."** and a disabled Register button (server-side backstop = the `INTEREST_WITHDRAWN` throw).
  **Preserved:** visibility = pending∪approved + apply-gate = approved (`posting-type-interest.ts` untouched), the
  approve/withdraw endpoints + `interest_lists:approve`. **OUT OF SCOPE (user-deferred):** events/drives gating for a
  withdrawn posting type — events are `EventStudent`-assignment gated only, so a withdrawn student still sees assigned
  events; a separate follow-up. [[working-preferences]]
- **Forms scroll/focus the first validation error on submit — via `aria-invalid`, not RHF refs.** (Added
  2026-08-04.) There was no scroll/focus-to-error anywhere; RHF's default `shouldFocusError` silently
  no-ops on Select/custom controls because shadcn `FormControl` never forwards `field.ref`. Fix keys off
  the **`aria-invalid="true"`** attribute `FormControl` ([form.tsx](src/components/ui/form.tsx)) already
  stamps on every errored control (native inputs **and** the Radix `SelectTrigger`, both focusable). New
  **`src/lib/formErrors.ts`**: `scrollToFirstError(container?)` (rAF → first `[aria-invalid="true"]` →
  `scrollIntoView({block:'center'})` + `focus({preventScroll:true})`) and `focusFirstFormError` (a
  `SubmitErrorHandler` that scopes to the submitted `<form>` via the event). Wired as the **2nd arg of
  `handleSubmit`** in ~14 RHF forms (`form.handleSubmit(onValid, focusFirstFormError)`) — no ref-forwarding
  changes needed. The **NOC wizard** (`NOCRequestWizard.tsx`, manual state) already navigated to the first
  error's step (`getStepForField`/`NOC_STEP_FIELDS`); its `FieldError` now renders a `data-field-error`
  anchor and a local `focusFirstStepError()` (setTimeout 60 for the step re-render) scrolls+focuses the
  field inside the `stepContentRef` container after each `setCurrentStep`. **Out of scope (deferred):**
  manual-state forms Profile (9 tabs), MultiPostingForm/PostingForm (indexed role rows), UserManagementTab
  — they'd need bespoke tab/section mapping. Frontend-only, no migration. Baseline FE tsc unchanged at 100.
- **All posting-type FILTER dropdowns are standardized to the label "Posting Type" / "All Posting Types".**
  (Added 2026-08-04.) `OpportunityFilters.tsx` was the last "Type"/"All Types"; seven others read lowercase
  "Posting type" (Offers/Applications/Drives/Internships-1st/StudentListTab/VerificationTab/SelectionDatabaseTab)
  — all now "Posting Type". The 8 shared-`PostingTypeFilter.tsx` reports + PostingsManagement + ReportsAnalytics
  were already correct. **Binding rule (unchanged, don't blanket-sweep):** the five list endpoints that take
  `posting_type_master_id` (uuid) bind **`option.id`** (Drives + Internships were the two still binding
  `option.value` → 400, now fixed); `SelectionDatabaseTab` binds **`option.value`** because its param is the
  value-string enum `posting_type`; `OpportunityFilters` binds `option.value` (client-side match, no server
  param). **Non-posting "Type" filters were deliberately NOT renamed** — Event Type, NOC Type, and the
  internship *payment* Type (paid/unpaid/stipend, InternshipsManagement's 2nd dropdown) are different
  attributes. FE-only, no migration.
- **`SearchableSelect` supports `pinnedOptions` — always-visible top entries that dodge cmdk's filter.**
  (Added 2026-08-04.) [SearchableSelect.tsx](src/components/shared/SearchableSelect.tsx) is the
  Command+Popover single-select combobox; its cmdk filter hides any option whose value doesn't match the
  query — which meant an appended "Other — add new" sentinel **vanished exactly when the user searched for
  something not in the list**. New optional `pinnedOptions?: SearchableSelectOption[]` renders in a
  **top** CommandGroup, and each pinned `CommandItem`'s cmdk `value` **appends the live search term**
  (the input is now controlled internally: `search` state + `CommandInput value/onValueChange`, reset on
  close) so it always matches and stays visible. `selectedOption` now looks across `[...pinnedOptions,
  ...options]`. Backward-compatible (default `[]` → unchanged for existing callers like the NOC State
  field). First consumer: the NOC wizard **self-sourced Company Name** field
  ([NOCRequestWizard.tsx](src/components/noc/NOCRequestWizard.tsx)) moved its `OTHER_OPTION_VALUE` entry
  ("Other – Enter New Company") from an appended `companyOptions.push` into `pinnedOptions`; the existing
  `companyNameOther` free-text swap + validation + `company_name.trim()` submit (backend find-or-creates
  the Company by name) were already wired. Reuse `pinnedOptions` for any "add new / other" escape in a
  searchable list.
- **NOC apply form has an "Internship Type" (internship/placement) field, stored on `NocRequest`.**
  (Added 2026-08-04. ⚠ additive migration.) New nullable column `NocRequest.internship_type String?
  @db.VarChar(20)` (grandfathers existing rows). `createNocSchema.internship_type` is
  `z.enum(['internship','placement']).optional().nullable()` — **optional at the API on purpose** (so
  existing NOC-create tests/seed don't break); the **wizard enforces it as required** (RequiredLabel +
  `validateNocForm` + it's in `NOC_STEP_FIELDS[3]` so step-nav/first-error focus work). It's a
  single-choice **RadioGroup** (values `internship`/`placement`, labels "Internship"/"Placement")
  rendered in `NOCRequestWizard.tsx` step 3 right after the Start/End Date grid, and added to
  `FormState`/`createInitialState`/the submit payload. `noc.service.createNoc` writes
  `internship_type: data.internship_type ?? null`; NOC list/detail (`getMyNocs`/`getNocs`/`getNocById`)
  return the raw row so it reaches the FE with no mapper change. FE types: added to `NOCRequest`,
  `ApiNocRecord`, `CreateNocInput` in [types/noc.ts](src/types/noc.ts). Shown read-only (CSS
  `capitalize`, hidden when null) on `NOCRequestDetailSheet.tsx` (student) + `NOCReviewDialog.tsx`
  (admin). **NOT on the generated certificate** (program-label driven). The field name is
  `internship_type` per the requested label even though one value is "Placement".
- **TPO → Reports is ONE page with a `reportModules` registry; removing a report = deleting its registry
  entry (render guards/components are separate).** (Added 2026-08-04.) [ReportsAnalytics.tsx](src/pages/admin/ReportsAnalytics.tsx)
  holds `reportModules` (array of `{id,name,icon}` grouped by module) that drives the two-level sidebar; each
  report renders via an `activeModule===… && activeReport===… && (…)` guard block — some **inline** JSX, some
  delegating to `src/components/reports/*.tsx`. **Unregistering** a report (delete its `reportModules` entry) makes
  it unreachable without touching the guard/component (dead code). ⚠ If you drop the entry that the initial
  `activeReport` state points at, update that default too. **Print & PDF are a single shared control** in
  [ReportToolbar.tsx](src/components/reports/ReportToolbar.tsx) (used by ~22 delegated reports **and**
  `superadmin/AuditLogTab.tsx` — check that consumer when changing the toolbar's props). The inline
  Student/Employer/Postings reports render their own CSV/Excel buttons (no ReportToolbar). Department filters,
  CSV header strings ("Roll Number"), and the Registration-Summary/NOC-by-Dept dropdowns are **per-file**, not
  shared. Applying the "EXISTING REPORTS REMARK" sheet was split: **Pass 1 (done 2026-08-04)** = 25 removals +
  global Print/PDF removal + CSV "Roll Number"→"Enrollment Number" + drop dept dropdowns (Shortlist/Offer
  Acceptance) + Posting-History year-boxes removal (all FE-only); **Pass 2 (done 2026-08-05)** — see below.
  Note in the participation report the FE `roll_number` field already holds the **enrollment number** (backend
  maps `roll_number: student.enrollment_number`).
- **Reports "EXISTING REPORTS REMARK" Pass 2 (done 2026-08-05, NO migration).** Backend edits all live in
  `docs/silveroak_backend/src/modules/reports/report.analytics.service.ts`; that module has **NO Zod schema** —
  query params are parsed ad hoc (`getQueryString`/`getPostingTypeQuery`/`parseDateRange`) and every rollup is
  **in-JS** (`countBy`/manual Maps), so a new filter is just a new `getQueryString` + a `where`/in-memory clause,
  and a new field is just a mapper addition (the FE `reportService` passes any param through and casts responses
  to `any`, so no FE type wiring). **(7) Registration Summary** `getRegistrationSummaryReport` now groups
  registrations by the **distinct `interest_type` value** (= posting-type master value; `INTEREST_REPORT_TYPES`
  constant deleted) and returns a humanized `label`; FE prefers `reg.label`. **(8) NOC by Dept**
  `getNocByDepartmentReport` filters by **`program`** (normalized-equals, the posting-type value) instead of
  `noc_type`; FE `NOCByDepartmentReport` sends `posting_type` from `usePostingTypeOptions()` binding
  **`option.value`** (NOC.program stores the value string, NOT the uuid — do not bind `option.id` here).
  **(9) Posting History** is **FE-only**: a "Posting Type Summary" card in `ReportsAnalytics.tsx` computes
  draft/published/closed per `posting.type` from `filteredPostingHistory` (the backend `by_year` job-vs-internship
  hardcode was left alone — it only feeds the removed posting-summary). **(10) Student Participation**
  `getStudentParticipationReport` select now pulls `institute`/`course`, `where` filters `institute`/`course`/
  `branch`(→`department`), mapper returns `institute`/`course`; FE adds those 3 filters+columns (colSpan 9→11).
  **(11) Unplaced Students** `getUnplacedStudentsReport` `where` filters `institute`/`course`/`branch`(→`department`),
  semester filtered **in-memory** (`current_semester ?? academic_profile.semester`), mapper appends
  `institute`/`course`/`semester`, and returns `branch_breakdown` alongside legacy `dept_breakdown`; FE removes
  the Department filter/column, adds Institute/Course/Branch/Semester (colSpan 7→10) — ⚠ its `data` is `any`, so
  type the derived source `const students: any[] = data?.students ?? []` or the `new Set(...)` memos infer
  `unknown[]` and error. **(12) Eligibility** is **FE-only** — the student table is replaced by a dept-wise
  `eligibilityByDept` breakdown (mirrors Profile Completion). **"Branch" == the course-derived `department`
  column everywhere** (no separate student branch attribute; branch filters map to `department`). FE tsc dropped
  100→94 (the removed Eligibility table carried baseline errors); backend tsc clean. [[working-preferences]]
- **8 reports from the NEW REPORTS meeting sheet (added 2026-08-05).** Registered in
  [ReportsAnalytics.tsx](src/pages/admin/ReportsAnalytics.tsx) **distributed under existing branches** (not a
  standalone group — that was the first cut, then moved on request): `placement-count`/`placement-listing` under
  **Placement Analytics**, `noc-count`/`noc-listing` under **NOC & Documents**, `company-count`/`company-stage`
  under **Applications & ATS**, and `no-dues-count`/`no-dues-listing` under a **new `id:'no-dues'` "No Dues"**
  module. The render guards key on those module ids (`placement-analytics`/`noc`/`ats`/`no-dues`). **Backend** = 8 fns appended to
  [report.analytics.service.ts](docs/silveroak_backend/src/modules/reports/report.analytics.service.ts)
  (`getPlacementCountReport`/`getPlacementListingReport`/`getInternshipNocCountReport`/`getInternshipNocListingReport`/
  `getNoDuesCountReport`/`getNoDuesListingReport`/`getCompanyCountReport`/`getCompanyStageReport`), each wired into
  BOTH `report.controller.ts` (`reportHandlers` + destructure) AND `report.routes.ts` — the module enumerates every
  handler by hand, so a new report needs all three. Added `median`/`minPositive` helpers next to `average`. **Count
  reports** group by posting-type master **value** × institute/course/`department`(branch)/semester via the shared
  `NewReportScope`/`studentInReportScope`/`groupKeyForStudent` helpers + `matchesStudentTargetingForMaster` for the
  per-type cohort; **eligible = `AcademicProfile.cgpa >= 6.5`** (`ELIGIBLE_MIN_CGPA`). **FE** shares two new
  components: `ReportScopeFilters.tsx` (multi-select Posting Type by **value** via `SearchableMultiSelect` +
  `usePostingTypeOptions`, single-selects for institute/course/branch/semester **derived from returned rows**,
  academic-year from `useMasterValues('academic_year')` — note there's **no `semester` MasterCategory**, so semester
  options come from rows) and `ReportExportHeader.tsx` (CSV+Excel via `downloadCsvTable`/`downloadExcelTable`).
  Posting-type filter sends repeated `posting_type` **values** (NOT ids — placement/company match
  `posting_type_master.value.in`, NOC matches `program`); the array flows through `reportService.toQueryString`.
  **Read-only data gaps (deliberate, no schema):** NOC completion cert = 0/`—` (no column on NocRequest, no FK to
  Internship — but completion-cert COUNT reuses `Internship.certificate_uploaded` per student), placement
  offer-letter sourced from a matching `NocRequest.offer_letter_url` else `—`, "internship+placement status" derived
  (accepted offer OR issued NOC), No-Due "Passing Year" = `Student.batch`. **⚠ The ONE migration:** `enum ExitReason`
  gained `planning_studies` + `competitive_exam` (existing 3 kept, no backfill) for the No-Due 5-way breakdown —
  mirrored across `no-dues.schema.ts`, FE `src/lib/schemas.ts` `exitReasonEnum`, `src/types/noDues.ts` (type +
  `EXIT_REASON_LABELS`, now sheet-worded: Job/Business/Planning/Admission-Taken/Competitive-Exam), the student form
  `NoDuesCertificate.tsx` (2 new discriminated-union branches — declaration-only, no detail fields — + options +
  payload builder rewritten to a `base` spread + `buildFormValuesFromRequest` + title map), and
  `noDuesModule.getNoDuesSummary` fallback. **User runs `npx prisma migrate dev`.** FE tsc unchanged at 94, backend
  tsc 0. [[working-preferences]]
- **FILTER COUNTER EXPORT sheet — TPO Admin Phase 0 (shared infra) + Phase 1 (Student Management) (2026-08-05).**
  Two reusable pieces underpin all the sheet's "institute/course/branch dropdown + date range" rows:
  **FE `AdminListScopeFilters`** ([src/components/admin/AdminListScopeFilters.tsx](src/components/admin/AdminListScopeFilters.tsx))
  — a config-driven filter bar; cascading **Institute→Course→Branch** via `usePolicyInstituteOptions/Course/Branch`
  (child gated on parent, emits the CRM **name** string), **Semester** as a static 1–8 list (there is **no `semester`
  MasterCategory**), Academic-Year/Passing-Year via `useMasterValues('academic_year')`, Posting-Type **id-bound**, and
  a date-range popover (two single Calendars). **BE `shared/utils/student-scope-filter.ts`** — `buildStudentScopeConditions`
  (institute/course/`department`(branch)/`current_semester`(semester)/`batch`(academic_year|passing_year), all
  case-insensitive `contains`), `buildStudentScopeRelation` (nests under `{student:...}` for non-student lists), and
  `buildDateRangeCondition`. Phase-1 wiring: **All Students** (`getStudents`+`queryStudentsSchema`+`buildStudentWhere`
  extended with institute/course/branch/semester/academic_year/company_id/date_from/date_to; FE export loops
  `adminService.getStudents` all pages → `downloadCsvTable`/`downloadExcelTable` with the sheet's 18-column set, resume
  link via `resolveBackendAssetUrl`), **Verification** (academic_year filter, reuses getStudents), **Portfolio**
  (`getPortfolios`+`queryPortfoliosSchema` + `buildPortfolioMonitoringStudentWhere` scope conditions; export button
  REMOVED), **Selection Database** (`getSelectionDatabase` richer student `select` + `selectionStudentFields` spread +
  `applySelectionFilters` institute/course/branch/semester/academic_year + schema; FE export widened). ⚠ **Bind
  Posting-Type by `option.id`** in these filters (sent as `posting_type_master_id` uuid). No schema change, no migration.
  **DEFERRED: Eligibility-Rules institute/course** (needs a scope-vs-persist decision — would add rule columns). Phases
  2–3 (Employer/Posting/Applications/Offers; NOC/Events/Announcements/NoDues/Policy/Interest) are planned but not yet
  built — reuse `AdminListScopeFilters` + `buildStudentScopeRelation` for those. [[working-preferences]]
- **FILTER COUNTER EXPORT sheet — TPO Admin Phase 2 (Employer / Posting / Applications / Offers) (2026-08-05, NO
  migration).** Reuses Phase 0's `AdminListScopeFilters` (FE) + `student-scope-filter.ts` (BE). Wiring pattern per
  screen = extend the module's Zod query schema with the new keys, apply them in the service `where`, add the FE
  `*QueryParams` keys, and drop `AdminListScopeFilters` into the filter card (empty `''`/`'all'` → omit). **Every
  BE list `where` merges student-scope via `buildStudentScopeConditions({institute,course,branch,semester,academic_year})`
  into `where.student = { is: { AND: [...] } }`** (offers/applications) or directly (student lists), plus
  `buildDateRangeCondition(date_from,date_to)` on the screen's date field. **Offers** (`offer.service.buildOfferWhere`):
  scope merged with the existing faculty student clause into one `studentAnd`; date on **`offer_date`**; FE adds a
  **"Rejected by student"** counter (grid 4→5), moves Export+Create into the card header, min-width search (the
  documented search-box sizing fix). **Applications** (`getApplicationsByPosting`): scope + date on **`applied_at`**;
  the list `select` now includes `resume: { file_url }` exposing **`resume_url`** on the item → `applicationExport.ts`
  "Resume Link" field (`resolveBackendAssetUrl`); FE adds an **"Applied"** counter (grid 6→7) + a **separate**
  Academic-Year filter beside Posting Type (user chose "two filters side by side", NOT a merged dropdown). **Application
  Pipeline**: replaced the client-side page-derived Branch `<Select>` with server-side ICB + date (the count-badge
  tabs stay posting/stage totals, unaffected by scope filters — acceptable). **Postings** (`posting.service.getPostings`,
  admin path only): ICB filters hit the **`target_institutes/courses/branches` arrays via Prisma `has`** (exact match;
  these arrays are **empty in practice** since the posting "Student Visibility" UI is commented out, so ICB returns few/no
  rows until that targeting is re-enabled — user explicitly accepted this), `academic_year` = the Posting **scalar**
  (`contains`), date on `created_at`; FE adds CSV+Excel **Export** over all matching postings (fetch `limit:1000`, not a
  page loop — `postingService` pagination is in the "silently-dead" camelCase list). `ApiPostingListItem` gained
  `academic_year` + `bond_details` (already in the payload — `flattenPostingType` spreads the row). **Companies**
  (`employer.service.getCompanies`): `industry` (`contains`) + `created_at` date range; FE Industry dropdown options =
  **distinct industries from a `useCompanies({limit:100})` fetch** (no industry-master endpoint), an **"Inactive"**
  counter (grid 4→5), and a **recruiter-aware Export** = one row per recruiter (companies with none get a blank-recruiter
  row) built by `collectAll`-looping `getCompanies` + `getRecruiters` and joining on `company_id` — the loop computes
  `totalPages` as `Math.ceil(total/limit)` because `employerService` pagination is snake/camel-broken. **Recruiters**
  (`RecruiterListTab`): a **"Rejected"** counter (grid 3→4) + Export looping `getRecruiters`. ⚠ **`option.id`-binding rule
  unchanged** — the posting-type filters here still send `posting_type_master_id` (uuid). FE tsc **92** (≤94 baseline; the
  lone Phase-2-file error, `OffersManagement:231` `.replaceAll`, is pre-existing baseline in the untouched CSV
  `handleExport`), BE tsc 0. **Phase 3 (NOC/Events/Announcements/NoDues/Policy/Interest) not yet built.** [[working-preferences]]
- **FILTER COUNTER EXPORT sheet — TPO Admin Phase 3 (NOC / Events / Announcements / No-Dues / Policy / Interest)
  (2026-08-05, NO migration). This COMPLETES the TPO Admin role of the sheet.** Same wiring pattern as Phase 2
  (extend Zod query schema → apply in service `where` via `buildStudentScopeConditions`/`buildStudentScopeRelation`
  + `buildDateRangeCondition` → extend FE `*QueryParams` → drop `AdminListScopeFilters` into the filter card). Per
  user decisions at the checkpoint: **NOC "Ready to Issue" tab REMOVED** (issuance was never a separate button — the
  row **Review** button opens `NOCReviewDialog` which issues an approved NOC; approved NOCs now surface in **All
  Requests** with Status=Approved, and the description says so), **"Completion Certificate" tab SKIPPED** (NOC has no
  completion-cert field), **event attendance import/export SKIPPED**. **NOC** (`noc.service.getNocs`): `posting_type`
  → `where.program = { equals, insensitive }` (NOC.program stores the posting-type **value** string, so the FE
  Posting-Type `<Select>` binds **`option.value`**, NOT `option.id` — same rule as `NOCByDepartmentReport`) + student
  scope (`where.student.is.AND`) + `created_at` range; tabs are now **Pending by Faculty · Pending TPO · Issued ·
  Rejected · All Requests** (default `pending_faculty`; `tabStatus` maps each). **Events** (`event.service.getEvents`):
  ICB filters the **`target_*` arrays** via `has`, date on the event **`date`** column (Event has **no
  `academic_year`** column, so academic-year was skipped); FE adds **Ongoing** + **Cancelled** counters (grid 4→6),
  renames the `cancelled` status-action label to **"Event Cancel"** (`getStatusActionLabel`), and a CSV+Excel event
  Export (`driveService.getEvents` `limit:1000`). **Announcements** (`announcement.service` admin branch): ICB via
  `target_*` `has` + `created_at` range. **No Dues** (`no-dues.service.getNoDuesRequests`): `buildStudentScopeRelation`
  (branch=department, passing_year=batch) + `created_at`; FE adds **Returned** + **Rejected** counters (grid 5→7) +
  ICB + Passing-Year filters (threaded through Export All). **Interest Lists** (`admin.service.getInterestRegistrations`):
  scope conditions pushed into the student `conditions[]`, and the **date range filters the matching registration's
  `created_at`** inside the existing `interest_registrations.some` (not the student). **Policy Repository**: category
  badge-pill filters + `categoryFilter` state + `policyCategoryOptions` + the `useMasterValues('policy_category')`
  query all removed (FE-only). FE tsc **91** (≤94 baseline; the only Phase-3-file errors are two **pre-existing**
  NoDuesManagement baseline errors — `NoDuesRequest` unimported at :400 and an `=== 'issued'` narrowing at :1034, both
  present in the backup), BE tsc 0. **All three TPO-Admin phases (0–3) are now done; remaining sheet roles — Faculty
  Coordinator, Student, Super Admin — are not built.** [[working-preferences]]
- **FILTER COUNTER EXPORT sheet — Faculty Coordinator role (2026-08-05, NO migration). Second role done.** Six
  faculty screens under `src/pages/faculty/`; reuses `AdminListScopeFilters` + `student-scope-filter.ts`. ⚠ Key
  discovery: the faculty **NOC** (`FacultyNOCApprovals.tsx`) and **Offers** (`FacultyOffers.tsx`) pages use the SHARED
  `useNocs`/`useOffers` hooks (same as admin), so the posting_type/academic_year/date filters were already backed by the
  TPO phases — no new backend for them. Screens: **Dashboard** — `faculty.service.getDashboard` now tallies
  `offersReleased`/`accepted`/`joined` over the already-loaded `student.offers` (added to `FacultyDashboardStats` BE+FE);
  FE renames "Placed Students"→"Accepted" + 2 new cards. **Department Students** — replaced the Institute/Branch
  multi-selects with `AdminListScopeFilters` (single-value ERP cascade); BE `queryFacultyStudentsSchema` gained
  `course`+`date_from`/`date_to`, `buildStudentWhere` applies course(ci-contains)+created_at; `FacultyStudentsQueryParams`
  widened to accept single-OR-array institute/branch/semester (the shared bar emits single strings; the Zod
  `stringArray`/`intArray` coerce them). Column "Roll Number"→"Enrollment No" now shows `enrollment_number`. **My
  Programs** — `mapProgramStudent` returns `gender` (Student scalar, already on the row); FE export gains Gender +
  renames "Registered On"→"Interested On Date", listing "Source"→"Status". **NOC Approvals** — ⚠ `ApiNocListItem`
  extends **`ApiNocRecord`**, which has NO `faculty_decision`/`tpo_decision`/`stipend_currency` (those live on the
  unrelated FE-domain `NOCRequest` type). So the 3 new counters derive the reject stage from **`status` +
  `faculty_approved_at`** (rejected & faculty-approved ⇒ by-TPO; rejected & not ⇒ by-Department; approved/issued ⇒
  approved-by-TPO); counters come from an UNFILTERED dept fetch, the table from a FILTERED `useNocs`; added a "NOC
  Number" column (issued only) + a CSV/Excel export (Completion-Cert link is blank — no field). Posting-Type here binds
  **`option.value`** (NOC.program is the value string). **Offers** — swap Joined/Blocked→Pending/Rejected counters,
  add academic_year/date/posting-type(id-bound) filters + `'rejected_by_student'` status option + export; BE
  `offer.service.getOffers` student `select` gained institute/course/current_semester (additive; `ApiOfferListItem.student`
  widened) so export columns aren't blank. **Department Events** (`FacultyDrives.tsx`) — client-side search box (EventQueryParams
  has no `search`). FE tsc 91 (baseline), BE tsc 0. **Remaining sheet roles: Student, Super Admin.** [[working-preferences]]
- **FILTER COUNTER EXPORT sheet — STUDENT role (2026-08-06, FE-ONLY, no BE/schema/migration). Third role
  done.** All four student list endpoints (`/applications/my`, `/noc/my`, `/events/my`, `/announcements`)
  return the full set with **no server filter params**, so every change here is **client-side** (mirrors the
  existing `stageFilter`/search memos). ⚠ **Posting-type binding differs from the admin lists**: student
  records carry the posting-type **VALUE string** (`ApiMyApplication.posting.type`, `ApiNocRecord.program`),
  NOT the master uuid, so both new posting-type `<Select>`s bind **`option.value`** (not `option.id`) — same
  as `OpportunityFilters`. **My Applications** (`src/pages/MyApplications.tsx`): the **Internships tab was
  REMOVED** (TabsTrigger + TabsContent gone; the `StudentInternshipsTab` + `useStudentProfile` imports and
  `profileQuery` were dropped as newly-unused — but `Loader2` stays, still used by the accept-offer buttons),
  and a **Posting Type single-select** was added beside the Applications-tab search (predicate extended in
  `filteredApplications`). **NOC Requests** (`src/pages/NOCDashboard.tsx`): a **Posting Type** filter
  pre-filters `requests` by `request.program` **before** the active/completed split, so the stat cards + tabs
  all narrow together. **Drives** (`src/pages/StudentDrives.tsx`) + **Announcements**
  (`src/pages/StudentAnnouncements.tsx`): client-side **Search** boxes (direct port of the `FacultyDrives`
  `useDeferredValue`+`filtered…` memo). ⚠ In `StudentAnnouncements` the search hooks are declared **above**
  its early loading/error returns (Rules of Hooks). FE tsc 91 (baseline, zero net-new). [[working-preferences]]
- **Super Admin Audit Logs filters by ROLE (server-side); the specific-user dropdown was REMOVED (2026-08-06,
  additive BE, no migration).** The audit filter row (`src/components/superadmin/AuditLogTab.tsx`) had Action /
  Module / **specific-user** (`user_id`) dropdowns but no role filter. ⚠ `ApiAuditLog.user` carries only
  `{name,email}` (no role), so a client-side role filter was impossible AND would be wrong across pages — the
  filter is **server-side**: `queryAuditLogsSchema` gained `role: z.enum([7 UserRole values]).optional()` and
  `getAuditLogs` (`admin.service.ts`) adds `if (role) where.user = { role };` — a Prisma relation filter on the
  **already-included** `user` relation (`User.role` is the `UserRole` enum). FE `AuditLogQueryParams.role?:
  UserRole`; the tab renders a **Role** `<Select>` from `SYSTEM_ROLE_ORDER`/`SYSTEM_ROLE_CONFIG`
  (`securityModule.ts` — `SYSTEM_ROLE_CONFIG` was already imported-but-unused). **The individual-user dropdown
  was then removed** on user request (it was the erroring/redundant control) — deleting it also retired the
  screen's separate `useUsers` query (and its error branch in the shared "Unable to load audit data" Alert).
  ⚠ **The `role` param is `.optional().catch(undefined)`**: filtering was throwing a Zod 400 ("One or more
  fields have validation errors") because a non-enum value (the FE `'all'` sentinel from a stale bundle, or the
  `useUsers` query itself) was reaching validation; `.catch(undefined)` makes any stray/`'all'`/empty value
  fall back to no-filter instead of a 400 — apply this pattern to any enum query-param bound to a `<Select>`
  that uses an `'all'` sentinel. Controller/routes unchanged. Print & PDF stays gone (removed globally from
  `ReportToolbar`, Pass 1). If a schema-only change like this seems not to take effect, **hard-restart the BE**
  (`tsx watch` can miss a schema reload) + hard-refresh the browser. Completes the Super Admin row of the sheet.
  [[working-preferences]]
- **Faculty Department Students export must PAGE the list endpoint (limit 100), not one big fetch.** (Added
  2026-08-07.) `DepartmentStudents.tsx` `handleExport` used a single `getStudents({ page:1, limit:5000 })`,
  but the backend caps `limit` at `.max(100)` in the shared `paginationSchema`
  ([common.ts](docs/silveroak_backend/src/shared/schemas/common.ts)) — merged into every list schema — so
  Zod 400'd the request and the user saw an "export limit" error (`formatApiErrorMessage(…, 'Unable to
  export student list.')`). Fixed FE-only: loop pages at `EXPORT_PAGE_SIZE=100`, accumulating `response.data`
  until done, deriving the page count from **`pagination.total`** (⚠ `facultyService` is in the
  snake/camel-broken pagination camp — `pagination.totalPages` is `undefined` at runtime, don't read it) +
  a 0-row runaway break. **Don't raise the shared `.max(100)` cap** — it governs every list endpoint. The
  **Date Range filter was already wired** (`dateRange` → `sharedFilters` → both list + export; BE
  `buildStudentWhere` applies `date_from`/`date_to` on `created_at`) — no change needed there. Same
  loop-all-pages export convention as No Dues "Export All" / Phase-2 Company export. No migration.
  [[working-preferences]]
- **Print buttons are removed app-wide; there is NO client-side PDF export.** (Added 2026-08-07.) An
  app-wide sweep confirmed the project has **no** `jspdf`/`html2canvas`/`react-to-print` and no PDF report
  handlers — "PDF export" as a report feature never existed. The shared `ReportToolbar` /
  `ReportExportHeader` are CSV/Excel-only (Print/PDF were removed in a prior pass). Print survived only as
  **4 inline `window.print()` buttons**, now all removed (+ their unused `Printer`/`Eye` icon imports):
  `PortfolioCompletionReport.tsx`, `CompanyInternshipSummary.tsx`, `CertificatePendingReport.tsx` (each next
  to a CSV/Export button that stays), and `PolicyRepository.tsx`'s policy-detail-sheet **"Print Preview"**.
  ⚠ **Do NOT touch the two certificate "Download" buttons** — NOC `Download PDF`
  ([NocCertificate.tsx](src/pages/NocCertificate.tsx)) + No-Dues `Download NDC`
  ([NoDuesCertificate.tsx](src/pages/NoDuesCertificate.tsx)) download the real generated certificate file
  (the page's purpose), not a table export; they are intentionally kept. `print:hidden`/`print:bg-white`
  Tailwind utilities are print-media CSS, not buttons — leave them. FE-only, no migration.
- **Table column sorting is server-side + whitelisted; wire it with `SortableTableHead` + `useServerSort`.**
  (Added 2026-08-07, Phase 1.) Two shared FE primitives: **`src/components/shared/SortableTableHead.tsx`** (a
  clickable `<TableHead>` — neutral `ArrowUpDown` inactive, `ArrowUp`/`ArrowDown` active; `className`
  passthrough for `text-right`/`hidden md:table-cell`/width; sets `aria-sort`) and
  **`src/hooks/use-server-sort.ts`** (`useServerSort<TKey>(defaultSortBy, defaultSortOrder, onChange?)` →
  `{ sort_by, sort_order, onSort }`; two-state asc↔desc toggle, never "off"; `onChange` = `() => setPage(1)`).
  Wire a page: `useServerSort` seeded with the page's existing default sort, thread `sort_by`/`sort_order` into
  the list hook's params (hooks spread `params` into the query key, so cache-busting is automatic — **no hook
  edits**), and swap sortable `<TableHead>`s for `<SortableTableHead …>`. Tables with a child table component
  (both `NocTable`s) take `sortBy`/`sortOrder`/`onSort` props threaded from the parent.
  ⚠ **Backend: NEVER inject `sort_by` raw into Prisma `orderBy`.** Each Phase-1 service now has a
  **`getXOrderBy(sort_by, sort_order)` whitelist** (mirror `faculty.service.ts` `getStudentOrderBy`) mapping
  display column → real orderBy, incl. relational (`{ student: { full_name } }`, `{ company: { name } }`),
  `_count` (`{ panels: { _count } }`), and `{ posting_type_master: { value } }`. The old
  `orderBy: { [sort_by || default]: sort_order }` was a Prisma-injection/runtime-error surface — don't
  reintroduce it. FE `*QueryParams.sort_by` are now **exact unions** mirroring each BE whitelist (not `string`);
  keep FE union ⇄ BE whitelist in lockstep, and `useServerSort<TKey>` parameterized to the same union (its
  default seed must be a member of TKey). ⚠ Inline objects passed to a list service that are NOT directly
  contextually typed (e.g. a `useMemo` return, or a `const params = {...}`) widen `sort_by` to `string` → add
  `as const` (see `VerificationTab`, `EventAssignmentDialog`). **Deferred to Phase 2** (endpoints without
  server sort/pagination): PortfolioMonitoringTab, InterestLists, FacultyPrograms, EligibleStudentsTab,
  SelectionDatabaseTab, Circulars, and all 32 reports. **Excluded:** RolesPermissionsTab (matrix). No migration.
  [[working-preferences]]
- **Phase 2 column sorting is CLIENT-side via `useClientSort` (for tables that load their full set in memory).**
  (Added 2026-08-07.) **`src/hooks/use-client-sort.ts`** — `useClientSort<T>(rows, accessors, defaultSortBy?,
  defaultSortOrder?)` → `{ sort_by, sort_order, onSort, sorted }`. Each sortable column gets an **accessor**
  `(row) => value`; two-state toggle, empties (`null`/`''`) sort last, numeric-aware locale compare. Accessors
  are read through a ref so `sorted` only recomputes on `rows`/`sort_by`/`sort_order`. Render `sorted` instead
  of the raw array; pair with the same `SortableTableHead`. ⚠ If the accessors call component helper functions
  (e.g. InterestLists' `interestFor`/`registeredAtFor`/`semesterFor`), place the `useClientSort` call **after**
  those `const` definitions — its memo runs at call time and would hit a TDZ otherwise. Client-sorted so far:
  PortfolioMonitoringTab, EligibleStudentsTab, SelectionDatabaseTab, InterestLists, CircularsManagement,
  FacultyPrograms (Status→`source`), FacultyCirculars, StudentCirculars. **RecruitmentPipeline**: the applicants
  table lives inside a per-posting `.map`, so it was extracted into a `PostingApplicantsTable` child (a hook
  can't be called in a loop). **RecruiterInternships uses SERVER sort** (`useServerSort` + `useInternships`) —
  it's genuinely server-paginated, not client. **Reports remain excluded per request.** FE-only, no migration.
  [[working-preferences]]
- **NOC wizard City is a state-scoped dropdown that cascades from State (curated map, "Other" free-text
  escape).** (Added 2026-08-10.) Fixes "selecting a State doesn't filter City" — the cascade was never built:
  State was a `SearchableSelect` over `INDIAN_STATES` but City was a free-text `<Input>`+`<datalist>` fed by
  the FLAT global `cities[]` from `/noc/field-suggestions` (never scoped by state), and no state→city data
  existed. NEW **[indianCities.ts](src/lib/indianCities.ts)** `INDIAN_STATE_CITIES` (⚠ keys MUST match
  `INDIAN_STATES` spelling exactly) + `getCitiesForState()`. In `NOCRequestWizard.tsx`, City mirrors the State
  field's `stateOther` pattern via a new `cityOther` flag: when the selected state is **mapped** (and not the
  free-typed "Other" state) City is a `SearchableSelect` scoped to `cityOptions` (= state's cities, with the
  current `company_city` merged in for edit-safety) + an "Other → free-text" pinned option; otherwise it falls
  back to the old free-text `<Input>` ("Select a state first"). Changing State clears `company_city` + resets
  `cityOther` (`updateField` is functional, so the paired clears don't clobber); `cityOther` also reset in the
  full form reset and the placement-source change. The map is **curated/non-exhaustive by design** — the
  "Other" escape is required; don't try to make it complete. FE-only, no migration. [[noc-flow]]
- **NOC Internship Completion Certificate is a SEPARATE lifecycle on `NocRequest` (`completion_*` columns),
  independent of the NOC issuance status.** (Added 2026-08-10. ⚠ MIGRATION — enum `CompletionCertStatus
  {pending,approved,rejected}` + `NocRequest.completion_certificate_url/_name/_mime_type/_size`,
  `completion_status` (null=not submitted), `completion_submitted_at`, `completion_reviewed_by/_by_name/_at`
  (snapshot name, mirrors interest-withdrawal), `completion_remarks`, `completion_due_notified_at`.) The NOC
  stays `issued`; `completion_status` tracks the uploaded certificate. **Student** (`NOCRequestCard` on the
  Completed tab + `NOCRequestDetailSheet`): issued NOCs get an "Upload Completion Certificate" button
  (`CompletionCertificateDialog` → `POST /noc/:nocId/completion-certificate`, PDF, upload+attach in one call;
  re-upload allowed when rejected) + status badge + view link. **No cron exists** → `getMyNocs` fires a
  **lazy one-time** "completion due" notification per issued NOC whose `end_date` has passed with no cert
  (`completion_due_notified_at` idempotency guard; best-effort, must not break the list). **TPO**
  (`AdminNOCManagement`): new **"Completion Certificates"** tab (drives `useNocs({completion_status:'pending'})`,
  status undefined) → `CompletionRequestsTable` → `CompletionReviewDialog` Approve/Reject
  (`PUT /noc/:nocId/completion-certificate/approve|reject`, `noc_requests:approve`; **reject remark mandatory**
  via `rejectCompletionCertificateSchema`). **Approval** creates a student `Certification` (portfolio) +
  `recalcProfileCompletion` (now **exported** from `student.service`) — best-effort, idempotent by
  `document_url` — and notifies the student. The **Issued tab** passes `showCompletion` to the shared `NocTable`
  to consolidate per student: Offer Letter + NOC Certificate + Completion Certificate links + completion
  status/approval-date/remarks (faculty's `NocTable` usage leaves `showCompletion` false → unchanged). Every
  submit/approve/reject writes an `auditLog` row (the "history"). `getNocs` honours a `completion_status`
  filter; new columns flow to list/detail automatically (service returns raw rows). [[noc-flow]]
- **Event eligibility can be gated by APPLICATION PIPELINE STAGE, and the listing shows a live Eligible
  Student Count.** (Added 2026-08-12. ⚠ additive migration `Event.application_stage ApplicationStage?`.)
  Event auto-assignment was already **application-based** — `resolveApplicantStudentIds` (`event.service.ts`)
  assigns every distinct student with an `Application` on any `posting_ids` (or the company's postings). It now
  takes a `stage?: ApplicationStage` and adds `where.current_stage = stage` when set, so only students at that
  stage on a linked posting are assigned. `Event.application_stage` (null = "All" = no stage filter, grandfathers
  existing events) is persisted in `createEvent` and re-resolved in `updateEvent` when
  `posting_ids`/`company_id`/**`application_stage`** change. Assignment stays **snapshot + add-only**
  (`assignPipelineStudents` `skipDuplicates`, never deletes) — a stage change ADDS newly-matching students but
  never removes already-assigned/marked/paneled ones, so **Attendance = the assigned snapshot** (no separate
  filtering was added to `EventAttendanceDialog`). The **"Eligible Students"** listing column is a **LIVE**
  distinct count (`countEligibleStudents`, batched via `Promise.all` in `getEvents`, exposed as
  `eligible_student_count`) — independent of what's assigned/marked. FE: dropdown in `EventEditorDialog` (options
  = `['all', ...PIPELINE_STAGES, 'rejected']` via `APPLICATION_STAGE_CONFIG`); `EventFormValues.application_stage`
  is `ApplicationStage | 'all'` (`'all'` → `null` in `buildCreateEventPayload`); column + export in
  `DrivesManagement`. The `target_institutes/courses/branches` arrays are unrelated (list filters only, not
  assignment). Don't reintroduce removal into `assignPipelineStudents`. [[events-posting-type]] [[working-preferences]]
- **Student No Dues create form is a per-exit-reason DYNAMIC form (5 reasons), reusing generic columns + 7
  new ones.** (Added 2026-08-12. ⚠ additive migration — `NoDuesRequest` gains `sou_passing_year` VarChar(20),
  `company_sector` VarChar(200), `company_address` Text, `language_test` VarChar(200), `university_address`
  Text, `examination_name` VarChar(300), `additional_details` Text; all nullable, grandfathers existing rows.)
  The `ExitReason` enum already had all 5 (`employment`, `family_business`, `planning_studies`,
  `higher_studies`, `competitive_exam`). Exit Reason is now a **dropdown** (was radio cards). Field→column
  mapping **reuses** `program_name` (Intended Course / Course-Program), `institution_name` (Preferred
  University / University Name), `country`, `business_*`, `company_name/designation/package_lpa/joining_date`;
  the 7 new columns cover the rest. **One `proof_url` per request** (each reason has exactly one attachment;
  upload-first `POST /no-dues/proof`, PDF-only). **Backend is deliberately LENIENT** — `createNoDuesSchema`
  keeps every reason field `.optional().nullable()`; the **FE Zod discriminated union**
  (`NoDuesCertificate.tsx`) enforces per-reason requiredness, incl. a `.superRefine` making `language_test`
  required only when `country !== 'India'` (Planning). ⚠ **`buildNoDuesFormData`** (`no-dues.service.ts`) is a
  hardcoded whitelist — a field added only to the Zod schema is silently dropped; add new columns there too.
  ⚠ **`normalizeNoDuesRequest`** (`noDuesModule.ts`) must copy new fields or the resubmit-prefill + admin
  detail lose them. Country list = new `src/lib/countries.ts` (`isAbroadCountry`, India first). SOU Passing
  Year = generated year range (prefilled from `student.batch`). Admin **NoDuesManagement** detail sheet "Exit
  Specific Information" card renders all reasons incl. the previously-missing planning/exam branches; its
  admin **edit form** doesn't send the new fields, but Prisma ignores `undefined` so they're preserved (not
  wiped). No enum change. [[working-preferences]]
- File size watch: this `CLAUDE.md` is **~760 lines — WELL past the ~300 split threshold** (Set Instruction 7).
  Next substantial addition: promote domain conventions into `TPOADMIN.md` / `FACULTY.md` / `STUDENT.md` /
  `RECRUITER.md` and keep `CLAUDE.md` as the index. The `[[name]]` links point at memory files under
  `.claude/projects/-Users-…-souheptanesia-main-fe/memory/`.

---

## Open Questions / To-Clarify (none yet)

_None as of session start. Add here whenever ambiguity surfaces._
