# 9. Internship Tracking

## Overview

Students create internship records, admins manage status and resolve issues reported by students or admins.

---

## Student Endpoints

### 9.1 My Internships

```
GET /api/internships/my
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "internships": [
    {
      "id": "uuid",
      "company_name": "Google India",
      "role": "SWE Intern",
      "internship_type": "paid",
      "status": "ongoing",
      "start_date": "2026-05-01",
      "end_date": "2026-07-31",
      "stipend_amount": 80000,
      "is_receiving_stipend": true,
      "issues": [
        {
          "id": "uuid",
          "title": "Stipend delayed",
          "description": "June stipend not received",
          "status": "open",
          "created_at": "2026-06-15T10:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

### 9.2 Create Internship

```
POST /api/internships
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `company_name` | string | **Yes** | 1–300 chars |
| `role` | string | **Yes** | 1–200 chars |
| `internship_type` | string | **Yes** | `paid`, `unpaid`, `stipend_based` |
| `start_date` | string (date) | **Yes** | ISO date |
| `company_id` | string (uuid) | No | Link to registered company, nullable |
| `department` | string | No | Max 100 chars, nullable |
| `end_date` | string (date) | No | Nullable |
| `stipend_amount` | number | No | >= 0, nullable |
| `stipend_frequency` | string | No | Max 20 chars (e.g., "monthly"), nullable |
| `is_receiving_stipend` | boolean | No | Default false |
| `offer_id` | string (uuid) | No | Link to offer record, nullable |

```json
{
  "company_name": "Google India",
  "role": "SWE Intern",
  "internship_type": "paid",
  "start_date": "2026-05-01",
  "end_date": "2026-07-31",
  "stipend_amount": 80000,
  "stipend_frequency": "monthly",
  "is_receiving_stipend": true
}
```

### Success Response — `201 Created`

### Frontend Notes

- Show stipend fields conditionally when `internship_type !== "unpaid"`.
- `company_id` is optional — student types company name manually but can optionally link to a registered company.
- `offer_id` can link this internship to an existing offer record.

---

## Admin Endpoints

### 9.3 List All Internships

```
GET /api/internships
```

**Role:** `tpo_admin`, `tpo_employee`

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `ongoing`, `completed`, `discontinued` |
| `student_id` | string (uuid) | No | Filter by student |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "company_name": "Google India",
      "role": "SWE Intern",
      "status": "ongoing",
      "student": {
        "id": "uuid",
        "full_name": "John Doe",
        "enrollment_number": "21CS001",
        "department": "Computer Science"
      }
    }
  ],
  "pagination": { ... }
}
```

---

### 9.4 Get Internship Detail

```
GET /api/internships/:internshipId
```

**Role:** `tpo_admin`, `tpo_employee`, `student`

Returns full internship with student details and issues (ordered by `created_at DESC`).

---

### 9.5 Update Internship

```
PUT /api/internships/:internshipId
```

**Role:** `tpo_admin`, `tpo_employee`

Same fields as create (all optional), plus:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `ongoing`, `completed`, `discontinued` |
| `certificate_url` | string | No | Max 2000 chars, nullable |
| `certificate_uploaded` | boolean | No | — |

```json
{
  "status": "completed",
  "certificate_url": "https://storage.example.com/cert.pdf",
  "certificate_uploaded": true
}
```

---

## Issue Management

### 9.6 Create Issue

```
POST /api/internships/:internshipId/issues
```

**Role:** `student`, `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | **Yes** | 1–300 chars |
| `description` | string | No | Max 5000 chars, nullable |

```json
{
  "title": "Stipend payment delayed",
  "description": "The June stipend has not been credited as per the agreed date"
}
```

### Success Response — `201 Created`

### Frontend Notes

- Both students and admins can create issues.
- `reported_by` is automatically set to the current user.

---

### 9.7 Resolve Issue

```
PUT /api/internships/issues/:issueId/resolve
```

**Role:** `tpo_admin`, `tpo_employee`

> **Note:** This endpoint is NOT nested under `:internshipId`. It's at `/api/internships/issues/:issueId/resolve`.

### Request Body

None required (the resolve schema only accepts `status: "resolved"`).

### Success Response — `200 OK`

Returns the issue with `status: "resolved"` and `resolved_at` timestamp.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Issue not found |

### Frontend Notes

- Show a "Resolve" button next to each open issue.
- Display resolved issues in a different style (strikethrough, green check, etc.).
- The resolve action sets `resolved_at` to the current timestamp.
