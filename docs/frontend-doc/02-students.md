# 2. Student Profile

## Overview

All student endpoints are under `/api/students` and require the `student` role. The student profile is split into personal info, academic profile, skills, projects, certifications, employment, resumes, policy acceptance, and interest registration.

**Profile completion** is auto-calculated and gates access to features like interest registration (requires >= 80%).

### Profile Completion Breakdown

| Section | Weight | Fields |
|---------|--------|--------|
| Personal (base) | 55% | full_name (10%), mobile (5%), dob (5%), gender (5%), department (5%), batch (5%), linkedin_url (5%), profile_photo_url (5%), residential_address (5%) |
| Academic | 20% | Any academic data exists |
| Skills | 15% | technical_skills or domain_interests exists |
| Resume | 10% | At least one resume uploaded |
| Projects | 5% | At least one project added |

---

## 2.1 Get My Profile

```
GET /api/students/me
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "student": {
    "id": "uuid",
    "user_id": "uuid",
    "enrollment_number": "21CS001",
    "full_name": "John Doe",
    "mobile": "+91-9876543210",
    "date_of_birth": "2002-05-15",
    "gender": "Male",
    "department": "Computer Science",
    "batch": "2021-2025",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "profile_photo_url": "https://...",
    "residential_address": "123 Main St",
    "permanent_address": "456 Home Ave",
    "profile_completion": 75,
    "policy_accepted": false,
    "policy_accepted_at": null,
    "tenant_id": "uuid",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "academic": {
    "id": "uuid",
    "cgpa": 8.5,
    "tenth_percentage": 92.3,
    "twelfth_percentage": 88.5,
    "diploma_percentage": null,
    "backlog_count": 0,
    "active_backlogs": 0,
    "semester": 7,
    "year_of_study": 4,
    "course_duration": 4
  },
  "skills": {
    "id": "uuid",
    "technical_skills": ["JavaScript", "React", "Node.js"],
    "domain_interests": ["Web Development", "Cloud Computing"],
    "preferred_locations": ["Bangalore", "Hyderabad"]
  },
  "employment": null
}
```

### Frontend Notes

- `academic`, `skills`, `employment` can be `null` if not yet filled.
- Use `profile_completion` to show a progress bar and guide the student.
- Check `policy_accepted` to gate access to applications/interests.

---

## 2.2 Update Personal Info

```
PUT /api/students/me/personal
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `full_name` | string | No | Max 200 chars |
| `mobile` | string | No | Phone regex: `+?[\d\s-]{7,20}`, nullable |
| `date_of_birth` | string (date) | No | ISO date, nullable |
| `gender` | string | No | Max 20 chars, nullable |
| `linkedin_url` | string | No | Valid URL, nullable |
| `alternate_phone` | string | No | Phone regex, nullable |
| `residential_address` | string | No | Max 500 chars, nullable |
| `permanent_address` | string | No | Max 500 chars, nullable |
| `profile_photo_url` | string | No | Valid URL, nullable |

```json
{
  "mobile": "+91-9876543210",
  "gender": "Male",
  "linkedin_url": "https://linkedin.com/in/johndoe"
}
```

### Success Response — `200 OK`

Returns the updated student object.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `VALIDATION_ERROR` | Invalid URL, phone format, etc. |
| 422 | `NAME_LOCKED_AFTER_POLICY` | Cannot change `full_name` after policy acceptance |

### Edge Cases

- All fields are optional — send only what changed.
- `full_name` becomes **immutable** after policy acceptance. Show this as disabled/locked in the UI once `policy_accepted = true`.
- Sending `null` for a nullable field clears it.
- Profile completion recalculates after every update.

---

## 2.3 Update Academic Profile

```
PUT /api/students/me/academic
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `cgpa` | number | No | 0–10, nullable |
| `tenth_percentage` | number | No | 0–100, nullable |
| `twelfth_percentage` | number | No | 0–100, nullable |
| `diploma_percentage` | number | No | 0–100, nullable |
| `backlog_count` | integer | No | >= 0 |
| `active_backlogs` | integer | No | >= 0 |
| `semester` | integer | No | 1–12, nullable |
| `year_of_study` | integer | No | 1–6, nullable |
| `course_duration` | integer | No | 1–6, nullable |

```json
{
  "cgpa": 8.5,
  "tenth_percentage": 92.3,
  "twelfth_percentage": 88.5,
  "semester": 7,
  "backlog_count": 0
}
```

### Success Response — `200 OK`

Returns the academic profile object (upserted).

### Frontend Notes

- This is an **upsert** — creates the record on first call, updates on subsequent calls.
- `cgpa` is used for eligibility checks when applying to postings. Emphasize its importance to the student.

---

## 2.4 Update Skills Profile

```
PUT /api/students/me/skills
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `technical_skills` | string[] | No | Max 50 items, each max 100 chars |
| `domain_interests` | string[] | No | Max 20 items, each max 100 chars |
| `preferred_locations` | string[] | No | Max 20 items, each max 100 chars |

```json
{
  "technical_skills": ["JavaScript", "React", "Node.js", "PostgreSQL"],
  "domain_interests": ["Web Development", "Cloud Computing"],
  "preferred_locations": ["Bangalore", "Hyderabad", "Pune"]
}
```

### Success Response — `200 OK`

Returns the skills profile object (upserted).

### Frontend Notes

- Use tag/chip inputs for arrays.
- This is an **upsert** — sends the complete array each time (replaces old values).

---

## 2.5 Projects

### List Projects

```
GET /api/students/me/projects
```

**Response — `200 OK`**

```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "E-Commerce Platform",
      "description": "A full-stack e-commerce app...",
      "technologies": ["React", "Node.js", "MongoDB"],
      "github_url": "https://github.com/johndoe/ecommerce",
      "demo_url": "https://myecommerce.com",
      "start_date": "2025-01-01",
      "end_date": "2025-06-01",
      "is_ongoing": false,
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### Create Project

```
POST /api/students/me/projects
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | **Yes** | 1–200 chars |
| `description` | string | No | Max 2000 chars, nullable |
| `technologies` | string[] | No | Max 20 items, each max 50 chars |
| `github_url` | string | No | Valid URL, nullable |
| `demo_url` | string | No | Valid URL, nullable |
| `start_date` | string (date) | No | ISO date, nullable |
| `end_date` | string (date) | No | ISO date, nullable |
| `is_ongoing` | boolean | No | Default false |

**Response — `201 Created`**: Returns the created project.

### Update Project

```
PUT /api/students/me/projects/:projectId
```

Same fields as create, all optional. Returns the updated project.

### Delete Project

```
DELETE /api/students/me/projects/:projectId
```

**Response — `200 OK`**

```json
{
  "message": "Project deleted"
}
```

### Error Responses (Projects)

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Project doesn't exist or doesn't belong to student |

---

## 2.6 Certifications

### List Certifications

```
GET /api/students/me/certifications
```

**Response — `200 OK`**

```json
{
  "certifications": [
    {
      "id": "uuid",
      "name": "AWS Solutions Architect",
      "issuer": "Amazon Web Services",
      "issue_date": "2025-06-15",
      "credential_url": "https://aws.amazon.com/verify/...",
      "created_at": "2025-06-20T10:00:00.000Z"
    }
  ]
}
```

### Add Certification

```
POST /api/students/me/certifications
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | **Yes** | 1–200 chars |
| `issuer` | string | **Yes** | 1–200 chars |
| `issue_date` | string (date) | No | ISO date, nullable |
| `credential_url` | string | No | Valid URL, nullable |

**Response — `201 Created`**: Returns the created certification.

### Delete Certification

```
DELETE /api/students/me/certifications/:certId
```

**Response — `200 OK`**: `{ "message": "Certification deleted" }`

---

## 2.7 Employment

### Get Employment

```
GET /api/students/me/employment
```

Returns current employment info or `null`.

### Update Employment

```
PUT /api/students/me/employment
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `is_currently_working` | boolean | **Yes** | — |
| `employment_type` | string | No | Max 50 chars, nullable |
| `company_name` | string | No | Max 200 chars, nullable |
| `designation` | string | No | Max 200 chars, nullable |
| `duration` | string | No | Max 100 chars, nullable |

**Response — `200 OK`**: Returns the employment object (upserted).

---

## 2.8 Resumes

### List Resumes

```
GET /api/students/me/resumes
```

```json
{
  "resumes": [
    {
      "id": "uuid",
      "name": "Resume_2026.pdf",
      "file_url": "/uploads/resumes/abc123.pdf",
      "file_size": 245760,
      "mime_type": "application/pdf",
      "is_default": true,
      "uploaded_at": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```

### Upload Resume

```
POST /api/students/me/resumes
```

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | **Yes** | Resume file (PDF, DOC, etc.) |
| `name` | string | No | Display name. Defaults to original filename. |

**Response — `201 Created`**: Returns the resume object.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `FILE_REQUIRED` | No file attached |
| 422 | `MAX_RESUMES_REACHED` | Already has 5 resumes |

### Set Default Resume

```
PUT /api/students/me/resumes/:resumeId/default
```

**Response — `200 OK`**: `{ "message": "Default resume updated" }`

### Delete Resume

```
DELETE /api/students/me/resumes/:resumeId
```

**Response — `200 OK`**: `{ "message": "Resume deleted" }`

### Frontend Notes

- Maximum **5 resumes** per student. Show count and disable upload when at limit.
- The **first** uploaded resume is automatically set as default.
- If you delete the default resume, the most recent remaining resume becomes the default.
- Use `is_default` to highlight the default resume in the UI.

---

## 2.9 Policy Acceptance

```
POST /api/students/me/policy-acceptance
```

**Role:** `student` — **One-time, permanent action**

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `policy_read` | boolean | **Yes** | Must be `true` |
| `rules_accepted` | boolean | **Yes** | Must be `true` |
| `profile_sharing_consent` | boolean | **Yes** | Must be `true` |
| `resume_sharing_consent` | boolean | **Yes** | Must be `true` |
| `data_storage_consent` | boolean | **Yes** | Must be `true` |
| `communication_consent` | boolean | **Yes** | Must be `true` |

```json
{
  "policy_read": true,
  "rules_accepted": true,
  "profile_sharing_consent": true,
  "resume_sharing_consent": true,
  "data_storage_consent": true,
  "communication_consent": true
}
```

### Success Response — `200 OK`

```json
{
  "message": "Policy accepted successfully"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `VALIDATION_ERROR` | Any field is `false` — each has a custom error message |
| 422 | `POLICY_ALREADY_ACCEPTED` | Policy was already accepted |

### Frontend Notes

- Display all 6 consent checkboxes. All must be checked.
- **This action is irreversible.** Show a confirmation dialog before submitting.
- After acceptance, `full_name` becomes locked (cannot be changed).
- The student's IP address is recorded automatically.
- Show the policy text/content before asking for acceptance.

### Custom Validation Messages

| Field | Error if `false` |
|-------|-----------------|
| `policy_read` | "Policy must be read" |
| `rules_accepted` | "Rules must be accepted" |
| `profile_sharing_consent` | "Profile sharing consent required" |
| `resume_sharing_consent` | "Resume sharing consent required" |
| `data_storage_consent` | "Data storage consent required" |
| `communication_consent` | "Communication consent required" |

---

## 2.10 Interest Registration

### Get Interests

```
GET /api/students/me/interests
```

```json
{
  "interests": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "interest_type": "placement",
      "registered_at": "2026-03-01T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "student_id": "uuid",
      "interest_type": "summer_internship",
      "registered_at": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

### Register Interests

```
POST /api/students/me/interests
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `interest_types` | string[] | **Yes** | Min 1 item. Enum values below. |

**Valid interest types:**
- `placement`
- `summer_internship`
- `winter_internship`
- `final_semester_internship`
- `nep_internship`
- `stipend_internship`
- `dissertation`

```json
{
  "interest_types": ["placement", "summer_internship"]
}
```

### Success Response — `200 OK`

```json
{
  "interests": [
    { "id": "uuid", "interest_type": "placement", "registered_at": "..." },
    { "id": "uuid", "interest_type": "summer_internship", "registered_at": "..." }
  ]
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `VALIDATION_ERROR` | Empty array or invalid enum values |
| 422 | `PROFILE_INCOMPLETE` | Profile completion < 80% |
| 422 | `POLICY_NOT_ACCEPTED` | Policy not yet accepted |

### Frontend Notes

- **Two gates before registration:**
  1. Profile must be >= 80% complete
  2. Policy must be accepted
- Show a checklist guiding students to complete these prerequisites.
- Use checkboxes for multi-select from the enum values.
- This is an **upsert** per interest type — re-registering the same type is idempotent.
