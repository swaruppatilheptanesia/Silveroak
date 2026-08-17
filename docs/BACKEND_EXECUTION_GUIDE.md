# SOU Placement Portal - Backend Build Execution Guide

## How to Use This Document

This is a step-by-step guide for building the entire Node.js + PostgreSQL backend using Claude (AI assistant). Each step is a self-contained prompt you paste into Claude. Every prompt follows a strict pattern:

1. **Claude explains** what it will build (architecture, files, logic)
2. **Claude writes** the actual production code
3. **You verify** the output before moving to the next step

### Rules for Every Prompt

- Always paste the prompt exactly as written
- Wait for Claude to finish before moving to the next step
- If a step produces errors, tell Claude the error and let it fix before continuing
- Steps are sequential - do not skip steps
- Each step builds on top of the previous one

### Reference Document

All prompts reference `docs/BACKEND_ENGINEERING_REQUIREMENTS.md` in the project root. Make sure Claude has access to it.

---

## PHASE 1: PROJECT FOUNDATION

---

### Step 1.1 - Project Initialization

```
I am building the backend for the SOU Training & Placement Portal.
The full requirements are in docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing any code, read the requirements document (Sections 1, 14, and 15) and explain:
1. The project folder structure you will create
2. Every npm package you will install and why
3. The TypeScript configuration approach
4. The environment variable structure

Then initialize the project:
- Create a new Node.js + TypeScript project in a folder called `backend/` at the project root
- Use Express.js as the framework
- Use Prisma as the ORM
- Use Zod for validation
- Use pino for logging
- Set up tsconfig.json for strict TypeScript
- Set up .env.example with all required environment variables
- Set up package.json with dev, build, start, migrate, seed scripts
- Create the folder structure (do NOT create empty files - only create files that have real content)
- Create src/app.ts with Express setup (cors, helmet, json parser, error handler, health check route)
- Create src/server.ts as the entry point
- Install all dependencies

Do not build any modules yet. Only the foundation.
```

---

### Step 1.2 - Database Schema (Core Tables)

```
Read Section 5.1 (entities 5.1.1 through 5.1.11) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. Which tables you are creating in this step
2. The relationships between them
3. Any Prisma-specific decisions (enum handling, relation strategy, index strategy)

Then create the Prisma schema file (prisma/schema.prisma) with these tables:
- tenants
- users
- students
- academic_profiles
- skills_profiles
- student_projects
- certifications
- resumes
- current_employment
- policy_acceptances
- interest_registrations

Include:
- All columns exactly as specified in the requirements
- All constraints, defaults, and CHECK equivalents
- All indexes listed in the requirements
- All foreign key relationships
- UUID primary keys using @default(uuid())
- Timestamp fields with @default(now())
- Proper Prisma enums for all status/type fields

Also create the Prisma client initialization file at src/config/database.ts.
Do not create migration yet - just the schema file.
```

---

### Step 1.3 - Database Schema (Business Tables)

```
Read Section 5.1 (entities 5.1.12 through 5.1.25) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. Which tables you are adding
2. How they relate to the tables from Step 1.2
3. Any complex relationship patterns (e.g., event_students junction table)

Then add these tables to prisma/schema.prisma:
- companies
- recruiters
- company_engagements
- postings
- applications
- application_stage_history
- recruiter_feedback
- offers
- offer_audit
- events
- event_panels
- event_students
- noc_requests
- internships

Include all columns, constraints, indexes, foreign keys, and enums exactly as specified.
Make sure all cross-references to tables from Step 1.2 are correct.
```

---

### Step 1.4 - Database Schema (Support Tables)

```
Read Section 5.1 (entities 5.1.26 through 5.1.40) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain which tables you are adding and their purpose.

Then add these remaining tables to prisma/schema.prisma:
- internship_issues
- announcements
- announcement_receipts
- circular_templates
- generated_circulars
- no_dues_requests
- portfolios
- portfolio_projects
- internship_showcases
- policies
- eligibility_rules
- export_records
- audit_logs
- role_permissions
- notifications

After adding all tables, review the complete schema for:
- Missing relationships
- Missing indexes
- Enum consistency
- Naming consistency

Then run the Prisma migration to create all tables:
npx prisma migrate dev --name init
```

---

### Step 1.5 - Seed Data

```
Read the requirements document Sections 1.3 (User Roles) and the tenant config.

Create prisma/seed.ts that:
1. Creates a default tenant (SOU - Silver Oak University) with full config JSON
2. Creates a super_admin user (email: admin@sou.edu.in, password: hashed with bcrypt)
3. Creates one sample user for each role (tpo_admin, tpo_employee, faculty_coordinator, recruiter, student, management)
4. Creates 3 sample companies (TechCorp - preferred, InnovateTech - normal, GlobalFinance - normal)
5. Creates the default permission matrix from Section 8.2 of the requirements
6. Creates 3 sample departments for the tenant

Before writing code, explain:
1. The seed data structure
2. Password hashing approach
3. How you will structure the tenant config JSON

Then write the seed file and update package.json with the seed command.
Run: npx prisma db seed
```

---

## PHASE 2: CORE MIDDLEWARE & UTILITIES

---

### Step 2.1 - Error Handling System

```
Read Section 13 (Error Handling Contract) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. The error class hierarchy you will create
2. How the global error handler middleware works
3. The standard error response format

Then create:
1. src/shared/errors/app-error.ts - Base AppError class with code, statusCode, details array
2. src/shared/errors/index.ts - Specific error classes:
   - ValidationError (400)
   - AuthenticationError (401)
   - AuthorizationError (403)
   - NotFoundError (404)
   - ConflictError (409)
   - BusinessRuleError (422)
3. src/middleware/error-handler.ts - Global error handling middleware that:
   - Catches all errors
   - Formats them into the standard response format from Section 13.1
   - Logs errors with pino
   - Handles Prisma errors (unique constraint, not found, etc.)
   - Handles Zod validation errors
   - Returns generic message for unexpected errors in production
4. Update src/app.ts to use the error handler as the last middleware
```

---

### Step 2.2 - Authentication Middleware

```
Read Section 8 (Authentication, Authorization, and Session Handling) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. JWT token structure and payload
2. Refresh token strategy
3. How the auth middleware attaches user to request
4. TypeScript request augmentation approach

Then create:
1. src/config/auth.ts - JWT config (secret, expiry from env)
2. src/shared/types/express.d.ts - Augment Express Request with user and tenant objects
3. src/shared/utils/jwt.ts - Functions: generateAccessToken, generateRefreshToken, verifyToken
4. src/shared/utils/password.ts - Functions: hashPassword, comparePassword
5. src/middleware/auth.ts - Authentication middleware that:
   - Extracts Bearer token from Authorization header
   - Verifies JWT
   - Fetches user from database
   - Attaches user (id, tenant_id, role, email, department) to req.user
   - Returns 401 if token missing, expired, or invalid
6. src/middleware/tenant.ts - Tenant resolution middleware that:
   - Reads tenant_id from req.user (after auth)
   - Fetches tenant config from database (with caching)
   - Attaches tenant config to req.tenant
```

---

### Step 2.3 - Authorization Middleware

```
Read Sections 8.2 (RBAC) and 8.3 (Middleware Stack) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. How role checking works
2. How the permission matrix is queried
3. How scope restrictions (department, company, own records) are enforced
4. The middleware composition pattern

Then create:
1. src/middleware/role.ts - Role checking middleware:
   - Function: requireRole(...roles: UserRole[]) returns middleware
   - Checks if req.user.role is in the allowed roles list
   - Returns 403 with ROLE_NOT_ALLOWED if not
2. src/middleware/permission.ts - Permission matrix middleware:
   - Function: requirePermission(module: string, action: 'view'|'create'|'edit'|'delete'|'export'|'approve') returns middleware
   - Queries role_permissions table for req.user.role + module + action
   - Returns 403 with INSUFFICIENT_PERMISSIONS if not allowed
3. src/middleware/scope.ts - Scope restriction middleware:
   - Function: scopeToDepartment() - for faculty, adds department filter
   - Function: scopeToCompany() - for recruiter, adds company filter
   - Function: scopeToOwn() - for student, adds student_id filter
   - Attaches scope filters to req.scope for services to use
4. src/middleware/audit.ts - Audit logging middleware:
   - Function: auditLog(action: string, module: string) returns middleware
   - Creates audit_logs entry after successful request
   - Captures user_id, action, module, target info, IP address
```

---

### Step 2.4 - PII Protection & Validation Middleware

```
Read Sections 7 (Validation and Business Rules) and the PII protection requirements (BR-05) from docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. How PII filtering works for recruiter responses
2. How Zod validation integrates as middleware
3. Which fields are blocked

Then create:
1. src/middleware/pii-filter.ts - PII protection middleware:
   - Applied to recruiter-facing routes
   - Strips fields: email, mobile, phone, personal_address, alternate_phone, date_of_birth
   - Works as response interceptor (overrides res.json)
   - Recursively strips PII from nested objects and arrays
2. src/middleware/validate.ts - Request validation middleware:
   - Function: validate(schema: ZodSchema, source: 'body'|'query'|'params') returns middleware
   - Parses request data against Zod schema
   - Returns ValidationError with field-level details on failure
   - Attaches validated data to req.validated
3. src/shared/schemas/common.ts - Common Zod schemas:
   - uuidSchema, emailSchema, phoneSchema, urlSchema
   - paginationSchema (page, limit with defaults)
   - dateRangeSchema (date_from, date_to)
   - searchSchema (search string)
4. src/shared/utils/pagination.ts - Pagination helper:
   - Function: paginate(page, limit, total) returns pagination metadata
   - Function: buildPrismaQuery(page, limit) returns skip/take
```

---

### Step 2.5 - Rate Limiting & Request Logging

```
Before writing code, explain the rate limiting strategy and logging approach.

Then create:
1. src/middleware/rate-limiter.ts - Rate limiting:
   - Use express-rate-limit package
   - Default: 100 requests per 15 minutes per IP
   - Auth endpoints: 10 requests per 15 minutes per IP
   - Export endpoints: 5 requests per minute per user
   - Export the limiters as named functions
2. src/middleware/request-logger.ts - Request logging:
   - Use pino-http for structured request logging
   - Log request method, url, status code, response time
   - Redact authorization headers and password fields
   - Different log levels for different status codes
3. src/config/logger.ts - Logger configuration:
   - Create pino logger instance
   - Pretty print in development, JSON in production
   - Log level from environment variable
4. Update src/app.ts to add all new middleware in correct order:
   request-logger -> rate-limiter -> cors -> helmet -> json -> auth routes (no auth) -> auth middleware -> tenant middleware -> protected routes -> error handler
```

---

## PHASE 3: AUTHENTICATION MODULE

---

### Step 3.1 - Auth Module

```
Read Section 6.1 (Authentication & Session APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. The login flow (credential check, token generation, audit log)
2. The refresh flow (token rotation)
3. The logout flow (token invalidation approach)
4. How you will store refresh tokens

Then create the complete auth module:
1. src/modules/auth/auth.schema.ts - Zod schemas for:
   - loginSchema (email, password, tenant_slug optional)
   - refreshSchema (refresh_token)
   - forgotPasswordSchema (email)
   - resetPasswordSchema (token, new_password)
2. src/modules/auth/auth.service.ts - Service functions:
   - login(email, password, tenantSlug?) - verify credentials, generate tokens, log audit
   - refreshToken(refreshToken) - validate, rotate, return new pair
   - logout(userId, refreshToken) - invalidate token
   - forgotPassword(email) - generate reset token (placeholder for email sending)
   - resetPassword(token, newPassword) - validate token, update password
3. src/modules/auth/auth.controller.ts - Route handlers calling service
4. src/modules/auth/auth.routes.ts - Express router:
   - POST /api/auth/login (rate limited)
   - POST /api/auth/refresh
   - POST /api/auth/logout (authenticated)
   - POST /api/auth/forgot-password (rate limited)
   - POST /api/auth/reset-password (rate limited)
5. Register auth routes in src/app.ts (before auth middleware since these are public)

Note: You may need to add a refresh_tokens table to the Prisma schema. If so, add it and create a migration.
```

---

## PHASE 4: STUDENT MODULE

---

### Step 4.1 - Student Profile APIs

```
Read Section 6.2 (Student APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - specifically the profile-related endpoints (GET /api/students/me through PUT /api/students/me/skills).

Before writing code, explain:
1. Which endpoints you will create in this step
2. The profile completion calculation logic
3. How the "locked after policy acceptance" rule works for full_name
4. The validation rules per field

Then create:
1. src/modules/students/student.schema.ts - Zod schemas for:
   - updatePersonalSchema (all personal fields with their validations)
   - updateAcademicSchema (CGPA 0-10, percentages 0-100, etc.)
   - updateSkillsSchema (arrays of strings)
2. src/modules/students/student.service.ts - Service functions:
   - getMyProfile(studentId) - returns student + academic + skills
   - updatePersonal(studentId, data) - update with profile completion recalc
   - updateAcademic(studentId, data) - upsert academic profile
   - updateSkills(studentId, data) - upsert skills profile
   - calculateProfileCompletion(student) - calculate percentage based on filled fields
3. src/modules/students/student.controller.ts - Route handlers
4. src/modules/students/student.routes.ts - Express router:
   - GET /api/students/me
   - PUT /api/students/me/personal
   - PUT /api/students/me/academic
   - PUT /api/students/me/skills
5. Register routes in src/app.ts with auth + role('student') middleware
```

---

### Step 4.2 - Student Projects, Certifications & Employment

```
Read Section 6.2 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - the projects, certifications, and employment endpoints.

Before writing code, list every endpoint you will create and the validation rules.

Then add to the student module:
1. Update student.schema.ts with schemas for:
   - createProjectSchema, updateProjectSchema
   - createCertificationSchema
   - updateEmploymentSchema
2. Update student.service.ts with:
   - getProjects(studentId), createProject, updateProject, deleteProject
   - getCertifications(studentId), createCertification, deleteCertification
   - getEmployment(studentId), updateEmployment
   - Each mutation should recalculate profile completion
3. Update student.controller.ts with handlers for each endpoint
4. Update student.routes.ts with:
   - GET/POST /api/students/me/projects
   - PUT/DELETE /api/students/me/projects/:projectId
   - GET/POST /api/students/me/certifications
   - DELETE /api/students/me/certifications/:certId
   - GET/PUT /api/students/me/employment
   - All with auth + role('student') + scopeToOwn()
```

---

### Step 4.3 - Resume Management

```
Read Section 6.2 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - resume endpoints.
Read Section 10 (File and Media Handling) for upload approach.

Before writing code, explain:
1. File upload strategy (multer + S3 or local storage for dev)
2. How the "only one default resume" constraint works
3. The AI scoring placeholder approach

Then create:
1. src/config/storage.ts - File storage configuration:
   - S3 client setup (or local filesystem fallback for dev)
   - Upload function, delete function, generate presigned URL
2. src/middleware/upload.ts - Multer middleware:
   - File type validation (PDF, DOC, DOCX)
   - File size limit (5MB)
   - Memory storage for S3 upload
3. Add to student.schema.ts: resumeUploadSchema
4. Add to student.service.ts:
   - getResumes(studentId)
   - uploadResume(studentId, file, name) - store file, create metadata
   - setDefaultResume(studentId, resumeId) - transaction: unset old, set new
   - deleteResume(studentId, resumeId) - delete file + record
5. Add routes:
   - GET /api/students/me/resumes
   - POST /api/students/me/resumes (multipart)
   - PUT /api/students/me/resumes/:resumeId/default
   - DELETE /api/students/me/resumes/:resumeId
```

---

### Step 4.4 - Policy Acceptance & Interest Registration

```
Read Section 6.2 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - policy and interest endpoints.
Read Section 7.2 (Business Rules BR-01, BR-02) for enforcement logic.

Before writing code, explain:
1. Policy acceptance validation (all 6 checkboxes)
2. Interest registration prerequisites (profile >= 80%, policy accepted)
3. How these gates affect other features

Then add to the student module:
1. Update student.schema.ts with:
   - policyAcceptanceSchema (all boolean fields must be true)
   - interestRegistrationSchema (array of interest_type strings)
2. Update student.service.ts with:
   - acceptPolicy(studentId, data) - validate all true, create record, update student.policy_accepted
   - getInterests(studentId)
   - registerInterests(studentId, interestTypes) - check prerequisites, upsert
   - getEligibilityChecks(studentId) - evaluate against active eligibility rules
   - getReadinessChecklist(studentId) - calculate readiness items
   - getDashboardData(studentId) - aggregate all dashboard data
3. Add routes:
   - POST /api/students/me/policy-acceptance
   - GET/POST /api/students/me/interests
   - GET /api/students/me/eligibility
   - GET /api/students/me/readiness
   - GET /api/students/me/dashboard
4. Create src/shared/utils/business-rules.ts with:
   - checkProfileCompletion(student) - returns boolean + percentage
   - checkPolicyAccepted(student) - returns boolean
   - These will be reused across modules
```

---

## PHASE 5: EMPLOYER MODULE

---

### Step 5.1 - Company Management

```
Read Section 6.6 (Company & Employer APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - company endpoints only.

Before writing code, explain:
1. Which endpoints you will create
2. The company classification logic and its impact (blacklist blocking)
3. The audit logging points

Then create the complete employer module:
1. src/modules/employers/employer.schema.ts - Zod schemas for:
   - createCompanySchema
   - updateCompanySchema
   - classifyCompanySchema (classification + internal_remarks)
   - queryCompaniesSchema (search, status, classification, pagination)
2. src/modules/employers/company.service.ts - Service functions:
   - getCompanies(tenantId, filters) - with search, pagination
   - getCompanyById(companyId) - with stats (recruiter count, drives, hired)
   - createCompany(tenantId, data)
   - updateCompany(companyId, data)
   - classifyCompany(companyId, classification, remarks) - with audit
3. src/modules/employers/employer.controller.ts
4. src/modules/employers/employer.routes.ts:
   - GET /api/companies
   - POST /api/companies
   - GET /api/companies/:companyId
   - PUT /api/companies/:companyId
   - PUT /api/companies/:companyId/classification
   - All with auth + requireRole('tpo_admin', 'tpo_employee') except GET which allows faculty
```

---

### Step 5.2 - Recruiter & Engagement Management

```
Read Section 6.6 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - recruiter and engagement endpoints.

Before writing code, list every endpoint and its access control rules.

Then add to the employer module:
1. Update employer.schema.ts with:
   - createRecruiterSchema, updateRecruiterSchema, verifyRecruiterSchema
   - createEngagementSchema
2. Create src/modules/employers/recruiter.service.ts:
   - getRecruitersByCompany(companyId)
   - createRecruiter(companyId, tenantId, data)
   - updateRecruiter(recruiterId, data) - with ownership check for recruiter role
   - verifyRecruiter(recruiterId, status) - with audit
   - deleteRecruiter(recruiterId) - with audit
3. Create src/modules/employers/engagement.service.ts:
   - getEngagementsByCompany(companyId)
   - createEngagement(companyId, tenantId, data)
4. Update controller and routes:
   - GET/POST /api/companies/:companyId/recruiters
   - PUT /api/recruiters/:recruiterId
   - PUT /api/recruiters/:recruiterId/verify
   - DELETE /api/recruiters/:recruiterId
   - GET/POST /api/companies/:companyId/engagements
```

---

## PHASE 6: POSTING MODULE

---

### Step 6.1 - Posting CRUD & Lifecycle

```
Read Section 6.7 (Posting APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.
Read Section 7.2 (BR-07: Posting Status Lifecycle, BR-10: Company Blacklist Impact).

Before writing code, explain:
1. The posting lifecycle (draft -> published -> closed)
2. The 5-step creation validation
3. How blacklisted company blocking works
4. The eligible students calculation logic

Then create the complete posting module:
1. src/modules/postings/posting.schema.ts - Zod schemas for:
   - createPostingSchema (all fields from the 5-step wizard with validation rules)
   - updatePostingSchema
   - queryPostingsSchema (search, status, type, academic_year, pagination)
2. src/modules/postings/posting.service.ts:
   - getPostings(tenantId, filters) - with search, pagination, company join
   - getPostingById(postingId) - full detail with company
   - createPosting(tenantId, userId, data) - check company not blacklisted
   - updatePosting(postingId, data) - check not closed
   - publishPosting(postingId) - validate all required fields, set status + published_at
   - closePosting(postingId) - set status + closed_at
   - getPostingStats(tenantId) - aggregate counts by status and type
   - getEligibleStudents(postingId, filters) - filter students by posting criteria, calculate match %
3. src/modules/postings/posting.controller.ts
4. src/modules/postings/posting.routes.ts:
   - GET /api/postings
   - POST /api/postings
   - GET /api/postings/:postingId
   - PUT /api/postings/:postingId
   - PUT /api/postings/:postingId/publish
   - PUT /api/postings/:postingId/close
   - GET /api/postings/:postingId/eligible-students
   - GET /api/postings/stats
```

---

## PHASE 7: APPLICATION & ATS MODULE

---

### Step 7.1 - Application Submission & Listing

```
Read Section 6.4 (Application APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - POST /api/applications and GET endpoints.
Read Business Rules BR-01, BR-02, BR-03, BR-09.

Before writing code, explain:
1. All prerequisite checks before application submission
2. The duplicate protection mechanism
3. How the single-offer-policy blocking works
4. The stage history creation on apply

Then create:
1. src/modules/applications/application.schema.ts:
   - createApplicationSchema (posting_id, resume_id)
   - queryApplicationsSchema (stage, search, posting, pagination)
2. src/modules/applications/application.service.ts:
   - applyToPosting(studentId, postingId, resumeId) - with all prerequisite checks:
     * Student exists and profile >= 80%
     * Policy accepted
     * Posting exists, is published, within application window
     * No existing application (UNIQUE constraint)
     * No blocking active offer (if single_active_offer enabled)
     * Student is eligible (branch, batch, CGPA, backlogs)
   - getMyApplications(studentId, filters) - with stage history (last 4)
   - getApplicationsByPosting(postingId, filters) - for admin pipeline, with student+academic data
   - getApplicationStats(tenantId) - counts by stage
3. src/modules/applications/application.controller.ts
4. src/modules/applications/application.routes.ts:
   - POST /api/applications (student)
   - GET /api/applications/my (student)
   - GET /api/applications/by-posting/:postingId (admin)
   - GET /api/applications/stats (admin)
```

---

### Step 7.2 - Pipeline Operations (Bulk Move, Mock Round, Reject)

```
Read Section 6.4 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - bulk operation endpoints.
Read Business Rule BR-04 (Mock Round Gatekeeping).

Before writing code, explain:
1. Valid stage transitions (the state machine)
2. How mock round auto-transitions work (passed -> shortlisted, failed -> rejected)
3. The bulk operation transaction pattern
4. How stage history is recorded for each application

Then add to the application module:
1. Update application.schema.ts:
   - bulkMoveSchema (application_ids[], target_stage, remarks?)
   - bulkMockResultSchema (application_ids[], result, remarks?)
   - bulkRejectSchema (application_ids[], reason)
2. Add to application.service.ts:
   - validateStageTransition(fromStage, toStage) - returns boolean
   - bulkMoveStage(applicationIds, targetStage, remarks, userId) - in transaction:
     * Validate all transitions
     * Update current_stage for all
     * Create stage_history for each
     * Audit log
   - bulkSetMockResult(applicationIds, result, remarks, userId) - in transaction:
     * Set mock_round_result
     * If passed: auto-move to shortlisted
     * If failed: auto-move to rejected
     * Create stage_history for each
   - bulkReject(applicationIds, reason, userId) - in transaction
3. Add routes:
   - PUT /api/applications/bulk-move (admin)
   - PUT /api/applications/bulk-mock-result (admin)
   - PUT /api/applications/bulk-reject (admin)
```

---

### Step 7.3 - Export Candidates & Recruiter Feedback

```
Read Section 6.4 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - export and feedback endpoints.
Read Business Rule BR-05 (PII Protection).

Before writing code, explain:
1. How the export works (field selection, PII blocking, format generation)
2. How the exchange log tracks exports
3. How recruiter feedback is stored

Then add to the application module:
1. Update application.schema.ts:
   - exportCandidatesSchema (posting_id, application_ids?, fields[], format)
   - recruiterFeedbackSchema (decision, remarks?)
2. Add to application.service.ts:
   - exportCandidates(postingId, applicationIds, fields, format, userId) -
     * Filter out PII fields (email, phone, address)
     * Generate CSV/Excel data
     * Create export_records entry
     * Return file buffer
   - getExchangeLog(postingId) - list export_records
   - submitFeedback(applicationId, recruiterId, decision, remarks) - create recruiter_feedback
3. Add routes:
   - POST /api/applications/export (admin)
   - GET /api/applications/:postingId/exchange-log (admin)
   - POST /api/applications/:applicationId/feedback (recruiter, with PII filter middleware)
```

---

## PHASE 8: OFFER MODULE

---

### Step 8.1 - Offer CRUD & Lifecycle

```
Read Section 6.5 (Offer APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.
Read Business Rules BR-03 (Single Active Offer), BR-08 (Record Locking).

Before writing code, explain:
1. The complete offer lifecycle (create -> accept/reject -> joining -> lock)
2. How single-active-offer blocking works end-to-end
3. The compliance status tracking
4. The audit trail pattern

Then create the complete offer module:
1. src/modules/offers/offer.schema.ts:
   - createOfferSchema
   - rejectOfferSchema (reason, remarks)
   - joiningSchema (status, joining_date?, reason?)
   - queryOffersSchema (status, company, search, pagination)
2. src/modules/offers/offer.service.ts:
   - createOffer(tenantId, data, userId) - check no duplicate, check single-active-offer policy
   - getOffers(tenantId, filters) - with student, company, posting joins
   - getMyOffers(studentId) - student's offers
   - acceptOffer(offerId, studentId) - set status, set applications_blocked if policy enabled
   - rejectOffer(offerId, reason, remarks, userId) - set status, unblock if was blocking
   - confirmJoining(offerId, status, joiningDate?, reason?, userId) - if joined: lock record
   - getOfferStats(tenantId) - compliance counts
   - getOfferAudit(offerId) - audit trail
   - Each mutation creates offer_audit entry
3. src/modules/offers/offer.controller.ts
4. src/modules/offers/offer.routes.ts:
   - POST /api/offers (admin)
   - GET /api/offers (admin, faculty)
   - GET /api/offers/my (student)
   - PUT /api/offers/:offerId/accept (student)
   - PUT /api/offers/:offerId/reject (admin)
   - PUT /api/offers/:offerId/joining (admin)
   - GET /api/offers/stats (admin)
   - GET /api/offers/:offerId/audit (admin)
```

---

## PHASE 9: EVENT & DRIVE MODULE

---

### Step 9.1 - Event CRUD, Panels & Slot Allocation

```
Read Section 6.8 (Event & Drive APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. The event lifecycle (draft -> published -> ongoing -> completed)
2. The slot allocation process (add students, create panels, assign slots)
3. The bulk attendance marking approach

Then create the complete event module:
1. src/modules/events/event.schema.ts:
   - createEventSchema
   - updateEventSchema
   - addStudentsSchema (student_ids[])
   - assignSlotsSchema (assignments[])
   - createPanelSchema
   - bulkAttendanceSchema (attendance[])
2. src/modules/events/event.service.ts:
   - createEvent, getEvents, getEventById, updateEvent
   - publishEvent, completeEvent
   - addStudents(eventId, studentIds)
   - removeStudent(eventId, studentId)
   - assignSlots(eventId, assignments)
   - createPanel(eventId, data)
   - deletePanel(eventId, panelId) - unassign students first
   - markAttendance(eventId, attendance, userId)
   - getEventsForStudent(studentId) - with slot/panel info
   - getEventsForRecruiter(recruiterId) - by company
   - getEventStats(tenantId)
3. src/modules/events/event.controller.ts
4. src/modules/events/event.routes.ts:
   All endpoints from Section 6.8 with proper auth and role guards
```

---

## PHASE 10: NOC MODULE

---

### Step 10.1 - NOC Request, Approval Chain & Certificate

```
Read Section 6.9 (NOC APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.
Read Business Rule BR-06 (NOC Dual Approval Chain).

Before writing code, explain:
1. The 4-step request wizard data structure
2. The approval chain: pending_faculty -> pending_tpo -> issued
3. Faculty department scoping for approvals
4. Company verification within the NOC flow
5. NOC number generation format

Then create the complete NOC module:
1. src/modules/noc/noc.schema.ts:
   - createNocRequestSchema (all 4-step fields)
   - facultyReviewSchema (action, remarks)
   - tpoReviewSchema (action, remarks)
   - verifyCompanySchema (status)
   - queryNocRequestsSchema (status, department, search, pagination)
2. src/modules/noc/noc.service.ts:
   - createRequest(studentId, data) - set status pending_faculty
   - getMyRequests(studentId)
   - getAllRequests(tenantId, filters) - admin view
   - getFacultyPendingApprovals(department) - scoped
   - facultyReview(requestId, action, remarks, userId) - validate transition
   - tpoReview(requestId, action, remarks, userId) - generate NOC number if approve
   - verifyCompany(requestId, status, userId)
   - getVerifiedCompanies(tenantId) - for autocomplete
   - getUniversityDrives(tenantId) - for source selection
   - getNocStats(tenantId)
   - generateNocNumber(tenantId) - format from tenant config
3. src/modules/noc/noc.controller.ts
4. src/modules/noc/noc.routes.ts:
   All endpoints from Section 6.9 with proper auth, role, and scope guards
```

---

## PHASE 11: INTERNSHIP MODULE

---

### Step 11.1 - Internship Administration

```
Read Section 6.10 (Internship APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain the endpoints and bulk operation patterns.

Then create the complete internship module:
1. src/modules/internships/internship.schema.ts
2. src/modules/internships/internship.service.ts:
   - CRUD operations
   - bulkStatusChange(ids, status)
   - getMyInternships(studentId)
   - getInternshipsByCompany(companyId) - for recruiter
   - getInternshipsByDepartment(department) - for faculty
   - getIssues(internshipId)
   - getStats(tenantId)
   - getCertificateAlerts(tenantId)
3. src/modules/internships/internship.controller.ts
4. src/modules/internships/internship.routes.ts
```

---

## PHASE 12: COMMUNICATION MODULES

---

### Step 12.1 - Announcements with Consent Tracking

```
Read Section 6.11 (Announcement APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. How target audience matching works (all/batch/department)
2. How receipt generation works on publish
3. The consent tracking mechanism

Then create the complete announcement module:
1. src/modules/announcements/announcement.schema.ts
2. src/modules/announcements/announcement.service.ts:
   - createAnnouncement, updateAnnouncement
   - publishAnnouncement(id) - calculate recipients, bulk create receipts
   - archiveAnnouncement(id)
   - getStudentAnnouncements(studentId) - with read/consent status
   - markAsRead(announcementId, studentId) - update receipt + increment count
   - giveConsent(announcementId, studentId)
   - getReceipts(announcementId) - delivery report
   - getStats(tenantId)
3. src/modules/announcements/announcement.controller.ts
4. src/modules/announcements/announcement.routes.ts
```

---

### Step 12.2 - Circular Templates & Generation

```
Read Section 6.12 (Circular APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain the template structure (JSONB sections with fields).

Then create the complete circular module:
1. src/modules/circulars/circular.schema.ts
2. src/modules/circulars/circular.service.ts:
   - CRUD templates
   - archiveTemplate, reactivateTemplate, duplicateTemplate
   - generateCircular(templateId, companyId, roleName, fieldValues)
   - getGeneratedCirculars(tenantId, filters)
3. src/modules/circulars/circular.controller.ts
4. src/modules/circulars/circular.routes.ts
```

---

## PHASE 13: REMAINING MODULES

---

### Step 13.1 - No Dues Certificate Module

```
Read Section 6.13 (No Dues Certificate APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain the conditional field logic by exit reason.

Then create the complete no-dues module:
1. src/modules/no-dues/no-dues.schema.ts - with conditional validation per exit_reason
2. src/modules/no-dues/no-dues.service.ts:
   - submitRequest(studentId, data)
   - getMyRequests(studentId)
   - getAllRequests(tenantId, filters)
   - reviewRequest(requestId, action, remarks, userId) - approve/return/reject with NDC number generation
3. src/modules/no-dues/no-dues.controller.ts
4. src/modules/no-dues/no-dues.routes.ts
```

---

### Step 13.2 - Policy Repository Module

```
Read Section 6.14 (Policy APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Create the complete policy module:
1. src/modules/policies/policy.schema.ts
2. src/modules/policies/policy.service.ts - CRUD for policy documents
3. src/modules/policies/policy.controller.ts
4. src/modules/policies/policy.routes.ts
```

---

### Step 13.3 - Portfolio Module

```
Read Section 6.15 (Portfolio APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. The portfolio visibility model (published = visible to recruiters)
2. How project/internship counts are maintained

Then create the complete portfolio module:
1. src/modules/portfolios/portfolio.schema.ts
2. src/modules/portfolios/portfolio.service.ts:
   - getMyPortfolio(studentId) - with projects and showcases
   - updateVisibility(studentId, status)
   - CRUD projects (update counts on create/delete)
   - CRUD internship showcases (update counts on create/delete)
   - getAllPortfolios(tenantId) - admin view
   - getPortfolioByStudent(studentId) - recruiter view (only if published)
3. src/modules/portfolios/portfolio.controller.ts
4. src/modules/portfolios/portfolio.routes.ts
```

---

### Step 13.4 - Notification Module

```
Read Section 6.19 (Notification APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.
Read Section 11 (Notifications, Alerts, and Messaging).

Create the complete notification module:
1. src/modules/notifications/notification.schema.ts
2. src/modules/notifications/notification.service.ts:
   - getNotifications(userId, filters) - paginated
   - markAsRead(notificationId, userId)
   - markAllAsRead(userId)
   - dismissNotification(notificationId, userId)
   - createNotification(userId, type, title, description, priority) - internal helper
3. src/modules/notifications/notification.controller.ts
4. src/modules/notifications/notification.routes.ts
```

---

## PHASE 14: OPPORTUNITY & RECRUITER VIEWS

---

### Step 14.1 - Student Opportunity Browsing APIs

```
Read Section 6.3 (Opportunity APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. The eligibility checking algorithm (branch, batch, CGPA, backlogs)
2. The match percentage calculation (skills overlap, location match, domain match)
3. How the "eligible" vs "all" tab filtering works

Then create:
1. src/modules/opportunities/opportunity.schema.ts:
   - queryOpportunitiesSchema (type, work_mode, locations[], domains[], min_stipend, max_ctc, search, tab, pagination)
2. src/modules/opportunities/opportunity.service.ts:
   - getOpportunities(studentId, filters) - for each posting:
     * Check eligibility (branch, batch, CGPA, backlogs)
     * Calculate match percentage
     * Check if already applied
     * Return enriched posting list
   - getOpportunityDetail(postingId, studentId) - full detail with eligibility + match + applied status + is_open
   - calculateMatchPercentage(student, posting) - based on skills, domains, locations overlap
   - checkEligibility(student, academic, posting) - returns { eligible, checks[] }
3. src/modules/opportunities/opportunity.controller.ts
4. src/modules/opportunities/opportunity.routes.ts:
   - GET /api/opportunities (student)
   - GET /api/opportunities/:postingId (student)
```

---

### Step 14.2 - Recruiter-Facing APIs

```
Read Section 6.21 (Recruiter-Facing APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.
Read Section 6.22 (Faculty-Scoped APIs).

Before writing code, explain:
1. How PII stripping works for the recruiter pipeline endpoint
2. How faculty department scoping works

Then create:
1. src/modules/recruiter/recruiter-view.schema.ts
2. src/modules/recruiter/recruiter-view.service.ts:
   - getMyProfile(recruiterId) - with company
   - updateMyProfile(recruiterId, phone, designation)
   - getMyCompany(recruiterId) - with team and engagement timeline
   - getPipeline(recruiterId, filters) - postings with candidates, PII STRIPPED
   - getMyDrives(recruiterId) - events by company
   - getMyInternships(recruiterId) - by company
3. src/modules/recruiter/recruiter-view.controller.ts
4. src/modules/recruiter/recruiter-view.routes.ts with PII filter middleware on pipeline
5. src/modules/faculty/faculty-view.schema.ts
6. src/modules/faculty/faculty-view.service.ts:
   - getDashboard(department) - department stats
   - getStudents(department, filters)
   - getOffers(department, filters) - read-only
   - getInternships(department, filters) - read-only
7. src/modules/faculty/faculty-view.controller.ts
8. src/modules/faculty/faculty-view.routes.ts with scopeToDepartment middleware
```

---

## PHASE 15: ADMIN & SUPER ADMIN

---

### Step 15.1 - Admin Dashboard & Student Management APIs

```
Read Sections 6.17 (Security & Admin APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain the admin hub structure and student verification flow.

Then create:
1. src/modules/admin/admin.schema.ts:
   - queryAllStudentsSchema
   - verifyStudentSchema
   - createEligibilityRuleSchema, updateEligibilityRuleSchema
   - querySelectionDatabaseSchema
   - queryInterestListsSchema
2. src/modules/admin/admin.service.ts:
   - getAdminStats(tenantId) - placement KPIs
   - getAllStudents(tenantId, filters) - with academic data
   - verifyStudent(studentId, status, userId) - with audit
   - getInterestSummary(tenantId) - counts by type
   - getInterestList(tenantId, interestType, filters)
   - CRUD eligibilityRules
   - getSelectionDatabase(tenantId, filters) - combined offers+internships view
3. src/modules/admin/admin.controller.ts
4. src/modules/admin/admin.routes.ts
```

---

### Step 15.2 - Super Admin Module

```
Read Section 6.18 (Super Admin APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain the permission matrix CRUD and audit log query patterns.

Then create:
1. src/modules/super-admin/super-admin.schema.ts:
   - createUserSchema, updateUserSchema
   - updatePermissionMatrixSchema
   - queryAuditLogsSchema (action, module, date_from, date_to, search, pagination)
2. src/modules/super-admin/super-admin.service.ts:
   - CRUD users (with password hashing on create)
   - getPermissionMatrix(tenantId)
   - updatePermissionMatrix(tenantId, permissions) - bulk upsert
   - getAuditLogs(tenantId, filters) - paginated
   - exportAuditLogs(tenantId, filters) - CSV generation
3. src/modules/super-admin/super-admin.controller.ts
4. src/modules/super-admin/super-admin.routes.ts:
   - All with requireRole('super_admin')
```

---

### Step 15.3 - Tenant Configuration API

```
Read Section 6.20 (Tenant Configuration API) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Create:
1. src/modules/tenant/tenant.service.ts:
   - getConfigBySlug(slug) - public endpoint for frontend to load tenant config
2. src/modules/tenant/tenant.controller.ts
3. src/modules/tenant/tenant.routes.ts:
   - GET /api/tenant/config?slug=sou (public, no auth)
```

---

## PHASE 16: REPORTS MODULE

---

### Step 16.1 - Report Framework & Student/Employer Reports

```
Read Section 6.16 (Report APIs) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Before writing code, explain:
1. The report framework pattern (each report type is a query function)
2. The CSV export approach
3. How filters are passed as query params

Then create:
1. src/modules/reports/report.schema.ts - query schemas per report type
2. src/modules/reports/report.service.ts - framework:
   - A registry mapping report type to query function
   - Common CSV generation helper
3. src/modules/reports/generators/student-reports.ts:
   - interestedStudents(tenantId, filters)
   - eligibilityReport(tenantId, filters)
   - profileCompletion(tenantId, filters)
   - registrationSummary(tenantId, filters)
4. src/modules/reports/generators/employer-reports.ts:
   - companyMaster(tenantId, filters)
   - recruiterList(tenantId, filters)
   - engagementHistory(tenantId, filters)
   - companyClassification(tenantId, filters)
5. src/modules/reports/report.controller.ts
6. src/modules/reports/report.routes.ts:
   - GET /api/reports/:reportType with auth + requireRole('tpo_admin', 'tpo_employee', 'management')
```

---

### Step 16.2 - Remaining Report Generators

```
Read Section 6.16 of docs/BACKEND_ENGINEERING_REQUIREMENTS.md - all remaining report types.

Create the remaining report generator files:
1. src/modules/reports/generators/posting-reports.ts:
   - activePostings, postingHistory, postingSummary
2. src/modules/reports/generators/event-reports.ts:
   - eventAttendance, driveCompletion, studentParticipation
3. src/modules/reports/generators/noc-reports.ts:
   - pendingNoc, issuedNocRegister, nocByDepartment
4. src/modules/reports/generators/application-reports.ts:
   - applicantList, stageWise, shortlistRejection
5. src/modules/reports/generators/offer-reports.ts:
   - offerAcceptance, joiningStatus, compliance
6. src/modules/reports/generators/internship-reports.ts:
   - internshipStatus, certificatePending, companyInternship
7. src/modules/reports/generators/portfolio-reports.ts:
   - portfolioCompletion, publishedPortfolios
8. src/modules/reports/generators/communication-reports.ts:
   - announcementHistory, consentTracking
9. src/modules/reports/generators/placement-reports.ts:
   - placementSummary, companyPerformance, offerToJoinFunnel, unplacedStudents

Register all generators in the report service registry.
```

---

## PHASE 17: ROUTE REGISTRATION & INTEGRATION

---

### Step 17.1 - Register All Routes

```
Now that all modules are created, update src/app.ts to register every route file in the correct order.

Before writing code, explain:
1. The complete middleware chain order
2. Which routes are public (no auth)
3. Which routes need specific middleware (PII filter, rate limit)

Then update src/app.ts:
1. Public routes (before auth middleware):
   - /api/auth/* (auth routes)
   - /api/tenant/config (tenant config)
2. Protected routes (after auth + tenant middleware):
   - /api/students/*
   - /api/opportunities/*
   - /api/applications/*
   - /api/offers/*
   - /api/companies/*
   - /api/recruiters/*
   - /api/postings/*
   - /api/events/*
   - /api/noc-requests/*
   - /api/internships/*
   - /api/announcements/*
   - /api/circular-templates/*
   - /api/circulars/*
   - /api/no-dues-requests/*
   - /api/policies/*
   - /api/portfolios/*
   - /api/notifications/*
   - /api/reports/*
   - /api/admin/*
   - /api/super-admin/*
   - /api/recruiter/*
   - /api/faculty/*
3. Error handler (last)

Also create:
- GET /api/health - health check (public)
- GET /api/me - get current user info (authenticated)
```

---

## PHASE 18: TESTING

---

### Step 18.1 - Test Setup & Auth Tests

```
Set up the testing framework and write the first test suite.

Before writing code, explain:
1. The testing strategy (unit + integration)
2. Test database approach (separate test DB or transactions)
3. Test utility helpers needed

Then create:
1. jest.config.ts - Jest configuration for TypeScript
2. src/__tests__/setup.ts - Test setup:
   - Create test database connection
   - Seed helper function
   - Cleanup helper function
   - Auth helper (generate test tokens)
3. src/__tests__/helpers/test-utils.ts:
   - createTestUser, createTestStudent, createTestCompany, etc.
   - makeAuthRequest (supertest with auth header)
4. src/__tests__/modules/auth.test.ts:
   - Test login with valid credentials
   - Test login with invalid credentials
   - Test token refresh
   - Test logout
   - Test protected route without token
   - Test protected route with expired token
```

---

### Step 18.2 - Business Rule Tests

```
Read Section 7.2 (Business Rules BR-01 through BR-10) and the test cases from the requirements doc (Section covering 60+ test cases in docs/TECHNICAL_HANDOVER_API_INTEGRATION_GUIDE.md).

Write integration tests for all 10 business rules:

1. src/__tests__/business-rules/profile-completion.test.ts:
   - Cannot register interest with < 80% profile
   - Cannot apply with < 80% profile
   - Can apply with >= 80% profile

2. src/__tests__/business-rules/policy-acceptance.test.ts:
   - Cannot apply without policy acceptance
   - Cannot register interest without policy acceptance
   - Can accept policy with all checkboxes true
   - Cannot accept with any checkbox false

3. src/__tests__/business-rules/single-active-offer.test.ts:
   - Cannot create second offer when policy enabled
   - Applications blocked after offer acceptance
   - Applications unblocked after offer rejection

4. src/__tests__/business-rules/mock-round.test.ts:
   - Passed mock auto-transitions to shortlisted
   - Failed mock auto-transitions to rejected
   - Cannot shortlist without passing mock (when enabled)

5. src/__tests__/business-rules/pii-protection.test.ts:
   - Recruiter pipeline response has no email
   - Recruiter pipeline response has no phone
   - Export blocks PII fields
   - Admin pipeline response includes all fields

6. src/__tests__/business-rules/noc-chain.test.ts:
   - Faculty can only approve own department
   - Cannot skip faculty approval
   - TPO approval generates NOC number

7. src/__tests__/business-rules/posting-lifecycle.test.ts:
   - draft -> published allowed
   - published -> closed allowed
   - closed -> published not allowed
   - Cannot edit closed posting

8. src/__tests__/business-rules/offer-locking.test.ts:
   - Joined offer is locked
   - Locked offer cannot be modified

9. src/__tests__/business-rules/application-uniqueness.test.ts:
   - Cannot apply twice to same posting

10. src/__tests__/business-rules/company-blacklist.test.ts:
    - Cannot create posting for blacklisted company
```

---

### Step 18.3 - Module Integration Tests

```
Write integration tests for core module APIs:

1. src/__tests__/modules/students.test.ts:
   - GET /api/students/me returns profile
   - PUT personal updates profile and recalculates completion
   - PUT academic validates CGPA range
   - Resume upload creates record
   - Set default resume unsets previous

2. src/__tests__/modules/postings.test.ts:
   - Create posting validates required fields
   - Publish posting changes status
   - Close posting prevents new applications
   - Eligible students filtered correctly

3. src/__tests__/modules/applications.test.ts:
   - Apply creates application at 'applied' stage
   - Bulk move updates stages
   - Stage history recorded

4. src/__tests__/modules/offers.test.ts:
   - Create offer records correctly
   - Accept changes status
   - Joining confirmation locks record

5. src/__tests__/modules/noc.test.ts:
   - Submit creates pending_faculty request
   - Faculty approve moves to pending_tpo
   - TPO approve generates NOC number

Write at least 5 test cases per test file covering the happy path and key error cases.
```

---

## PHASE 19: API DOCUMENTATION

---

### Step 19.1 - Swagger/OpenAPI Documentation

```
Set up Swagger documentation for all APIs.

Before writing code, explain the swagger setup approach.

Then:
1. Install swagger-jsdoc and swagger-ui-express
2. Create src/config/swagger.ts with OpenAPI 3.0 spec:
   - Info (title, version, description)
   - Server URLs
   - Security schemes (Bearer JWT)
   - Tag groups matching modules
3. Add JSDoc swagger comments to every route file:
   - Each endpoint gets @swagger annotation
   - Request body schemas
   - Response schemas with examples
   - Error responses
   - Auth requirements
   - Query parameter documentation
4. Mount swagger UI at /api/docs in src/app.ts
5. Focus on these modules first (most important):
   - Auth, Students, Postings, Applications, Offers

The remaining modules can follow the same pattern you establish here.
```

---

## PHASE 20: PRODUCTION READINESS

---

### Step 20.1 - Docker & Deployment Setup

```
Create production deployment configuration.

Before writing code, explain the deployment architecture.

Then create:
1. Dockerfile (multi-stage build: build + production)
2. docker-compose.yml (backend + postgres + redis)
3. docker-compose.dev.yml (with hot reload, debug ports)
4. .dockerignore
5. src/config/index.ts - Centralized config validation:
   - Validate all required env vars on startup
   - Throw clear errors for missing config
6. Update src/server.ts with:
   - Graceful shutdown handling (SIGTERM, SIGINT)
   - Database connection management
   - Uncaught exception handling
7. Create scripts/healthcheck.sh for Docker health checks
```

---

### Step 20.2 - Final Review & Checklist Verification

```
Read Section 17 (Final Backend Delivery Checklist) of docs/BACKEND_ENGINEERING_REQUIREMENTS.md.

Go through every item in the checklist and report:
1. Which items are DONE (implemented in previous steps)
2. Which items are PARTIALLY done (need minor additions)
3. Which items are NOT done (need separate implementation)

For PARTIALLY done items, implement the missing pieces.

For NOT done items, create a prioritized list of what should be built next.

Also perform a final review of:
- All routes are registered and accessible
- All middleware is applied correctly
- All business rules are enforced
- All validation schemas match the requirements
- All database indexes are in place
- Environment variables are documented
- Error responses follow the standard format

Output a final status report.
```

---

## QUICK REFERENCE: PHASE SUMMARY

| Phase | Steps | What Gets Built |
|-------|-------|----------------|
| 1 | 1.1-1.5 | Project init, full DB schema, seed data |
| 2 | 2.1-2.5 | Error handling, auth/role/permission middleware, PII filter, validation, logging |
| 3 | 3.1 | Login, refresh, logout, password reset APIs |
| 4 | 4.1-4.4 | Student profile, projects, certs, resumes, policy, interests, eligibility |
| 5 | 5.1-5.2 | Company CRUD, recruiter CRUD, engagement tracking |
| 6 | 6.1 | Posting CRUD, publish/close lifecycle, eligible students |
| 7 | 7.1-7.3 | Application submission, ATS pipeline, bulk ops, export, feedback |
| 8 | 8.1 | Offer CRUD, accept/reject, joining, compliance, audit |
| 9 | 9.1 | Events, panels, slot allocation, attendance |
| 10 | 10.1 | NOC request, faculty/TPO approval chain, certificate |
| 11 | 11.1 | Internship CRUD, bulk status, issues, certificates |
| 12 | 12.1-12.2 | Announcements with consent, circular templates |
| 13 | 13.1-13.4 | No dues, policies, portfolios, notifications |
| 14 | 14.1-14.2 | Student opportunity browsing, recruiter/faculty views |
| 15 | 15.1-15.3 | Admin dashboard, super admin, tenant config |
| 16 | 16.1-16.2 | 25+ report types with export |
| 17 | 17.1 | Route registration, final wiring |
| 18 | 18.1-18.3 | Test setup, business rule tests, integration tests |
| 19 | 19.1 | Swagger/OpenAPI documentation |
| 20 | 20.1-20.2 | Docker, deployment, final review |

**Total: 20 phases, 35 steps**

---

## TIPS FOR BEST RESULTS

1. **One step at a time.** Do not combine steps. Each prompt is designed to produce a focused, reviewable output.

2. **Verify before proceeding.** After each step, check that the code compiles and makes sense before moving on.

3. **Share errors.** If a step produces TypeScript errors or runtime errors, paste the error back to Claude and ask it to fix.

4. **Context window.** If the conversation gets long, start a new conversation for the next phase. Paste the requirements doc link and say "Continue from Phase X, Step X.Y. The previous phases are already complete."

5. **Customization.** If you want to modify a feature (e.g., add email notifications, change auth to OAuth), mention it in the relevant step's prompt.

6. **Database changes.** If a later step needs schema changes, Claude will create a new migration. Always run `npx prisma migrate dev` after schema changes.

7. **The requirements doc is the source of truth.** Every prompt references it. Keep it accessible in the project.
