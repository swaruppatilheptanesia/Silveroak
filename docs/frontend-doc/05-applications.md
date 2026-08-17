# 5. Application Pipeline

## Overview

Students apply to published postings and move through hiring stages. Admins manage the pipeline with stage transitions, bulk operations, and mock round results.

### Application Stages

```
applied → mock_round → shortlisted → test_scheduled → interview → hr_round → offer_released
                                                                                    │
   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ (can be rejected from any stage) ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌→  rejected
```

---

## Student Endpoints

### 5.1 Apply to Posting

```
POST /api/applications/apply
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `posting_id` | string (uuid) | **Yes** | Must be published posting |
| `resume_id` | string (uuid) | No | Optional specific resume |

```json
{
  "posting_id": "uuid-of-posting",
  "resume_id": "uuid-of-resume"
}
```

### Success Response — `201 Created`

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "posting_id": "uuid",
  "current_stage": "applied",
  "resume_id": "uuid",
  "applied_at": "2026-03-08T10:00:00.000Z"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `POSTING_NOT_PUBLISHED` | Posting status is not `published` |
| 422 | `ALREADY_APPLIED` | Student already applied to this posting |
| 422 | `CGPA_NOT_MET` | Student CGPA < posting's `min_cgpa` |

### Frontend Notes

- Check posting status client-side before showing the "Apply" button.
- If student has no CGPA set in academic profile, the CGPA check may fail. Guide them to update academic info first.
- Show the student's current applications to prevent duplicate attempts.
- `resume_id` is optional — if not provided, no resume is attached.

### Edge Cases

- Applying to a `draft` or `closed` posting → `POSTING_NOT_PUBLISHED`
- Applying twice to the same posting → `ALREADY_APPLIED` (unique constraint on student_id + posting_id)
- Student CGPA is 6.8, posting requires 7.0 → `CGPA_NOT_MET`

---

### 5.2 My Applications

```
GET /api/applications/my
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "applications": [
    {
      "id": "uuid",
      "current_stage": "interview",
      "applied_at": "2026-03-01T10:00:00.000Z",
      "mock_round_result": null,
      "posting": {
        "id": "uuid",
        "title": "Software Engineer",
        "type": "job",
        "status": "published",
        "company": {
          "name": "TechCorp Solutions"
        }
      }
    }
  ]
}
```

---

### 5.3 Withdraw Application

```
DELETE /api/applications/:applicationId/withdraw
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "message": "Application withdrawn"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Application not found or not owned by student |
| 422 | `CANNOT_WITHDRAW` | Stage is `offer_released` or `rejected` |

### Frontend Notes

- Show "Withdraw" button only when stage is NOT `offer_released` or `rejected`.
- Show a confirmation dialog — withdrawal **deletes** the application permanently.

---

## Admin Endpoints

### 5.4 List All Applications

```
GET /api/applications
```

**Role:** `tpo_admin`, `tpo_employee`

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `posting_id` | string (uuid) | No | Filter by posting |
| `stage` | string | No | Filter by stage (see enum) |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | Default 20 |
| `sort_by` | string | No | Default `applied_at` |
| `sort_order` | string | No | `asc` or `desc` |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "current_stage": "shortlisted",
      "applied_at": "2026-03-01T10:00:00.000Z",
      "mock_round_result": null,
      "student": {
        "id": "uuid",
        "full_name": "John Doe",
        "enrollment_number": "21CS001",
        "department": "Computer Science"
      },
      "posting": {
        "id": "uuid",
        "title": "Software Engineer",
        "company": {
          "name": "TechCorp"
        }
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

### Frontend Notes

- Filter by `posting_id` to see all applications for a specific posting.
- Filter by `stage` to build a Kanban-style pipeline view.

---

### 5.5 Get Application Detail

```
GET /api/applications/:applicationId
```

**Role:** `tpo_admin`, `tpo_employee`

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "current_stage": "interview",
  "applied_at": "2026-03-01T10:00:00.000Z",
  "mock_round_result": "passed",
  "student": {
    "id": "uuid",
    "full_name": "John Doe",
    "enrollment_number": "21CS001",
    "department": "Computer Science",
    "batch": "2022-2026"
  },
  "posting": {
    "id": "uuid",
    "title": "Software Engineer"
  },
  "stage_history": [
    {
      "id": "uuid",
      "from_stage": "shortlisted",
      "to_stage": "interview",
      "remarks": "Cleared technical assessment",
      "changed_by": "uuid",
      "changed_at": "2026-03-05T14:00:00.000Z"
    },
    {
      "id": "uuid",
      "from_stage": "applied",
      "to_stage": "shortlisted",
      "remarks": null,
      "changed_by": "uuid",
      "changed_at": "2026-03-03T10:00:00.000Z"
    }
  ]
}
```

### Frontend Notes

- `stage_history` is ordered by `changed_at DESC` (most recent first).
- Use this to display a timeline/audit trail of stage transitions.

---

### 5.6 Move Application Stage

```
PUT /api/applications/:applicationId/stage
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `stage` | string | **Yes** | One of: `applied`, `mock_round`, `shortlisted`, `test_scheduled`, `interview`, `hr_round`, `offer_released`, `rejected` |
| `remarks` | string | No | Max 1000 chars, nullable |

```json
{
  "stage": "shortlisted",
  "remarks": "Meets all eligibility criteria"
}
```

### Success Response — `200 OK`

Returns the updated application object.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `APPLICATION_REJECTED` | Cannot move a rejected application |

### Frontend Notes

- Show a stage selector dropdown excluding `rejected` if you want a separate "Reject" button.
- Once rejected, the application is frozen — no more stage changes.
- `remarks` is optional but useful for audit trail.
- Stages can move **forward or backward** (no strict ordering enforced except rejection is final).

---

### 5.7 Bulk Move Stage

```
PUT /api/applications/bulk/stage
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `application_ids` | string[] (uuids) | **Yes** | 1–100 items |
| `stage` | string | **Yes** | Same enum as single move |
| `remarks` | string | No | Max 1000 chars, nullable |

```json
{
  "application_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "stage": "shortlisted",
  "remarks": "Batch shortlisting"
}
```

### Success Response — `200 OK`

```json
{
  "results": [
    { "id": "uuid-1", "status": "moved", "stage": "shortlisted" },
    { "id": "uuid-2", "status": "moved", "stage": "shortlisted" },
    { "id": "uuid-3", "status": "error", "message": "APPLICATION_REJECTED" }
  ]
}
```

### Frontend Notes

- Maximum **100 applications** per bulk operation.
- Results are per-item — some may succeed while others fail.
- Always check each item's `status` field to show success/failure feedback.
- Use checkboxes in the applications list for bulk selection.

---

### 5.8 Set Mock Round Result

```
PUT /api/applications/:applicationId/mock-result
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `result` | string | **Yes** | `passed` or `failed` |

```json
{
  "result": "passed"
}
```

### Success Response — `200 OK`

Returns the updated application with `mock_round_result` set.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_STAGE_FOR_MOCK` | Application is NOT in `mock_round` stage |

### Frontend Notes

- This button should only appear when `current_stage === "mock_round"`.
- Show pass/fail buttons for quick action.
- Setting mock result does **not** automatically advance the stage — admin must explicitly move to next stage.
