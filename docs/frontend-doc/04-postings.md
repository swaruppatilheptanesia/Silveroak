# 4. Job/Internship Postings

## Overview

Postings represent job or internship opportunities from companies. They follow a lifecycle: **draft → published → closed**. Only published postings are visible to students for applications.

**Roles Required:** `tpo_admin`, `tpo_employee` (all endpoints)

---

## Posting Lifecycle

```
draft ──→ published ──→ closed
  │                       ▲
  │   (can update)        │ (cannot update after close)
  ▼                       │
 edit freely         final state
```

---

## 4.1 List Postings

```
GET /api/postings
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `page` | integer | No | Default 1 |
| `limit` | integer | No | Default 20 |
| `search` | string | No | Searches `title` and `role_name` |
| `sort_by` | string | No | Default `created_at` |
| `sort_order` | string | No | `asc` or `desc` |
| `status` | string | No | `draft`, `published`, `closed` |
| `type` | string | No | `job`, `internship`, `stipend_internship` |
| `company_id` | string (uuid) | No | Filter by company |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Software Engineer - Full Stack",
      "type": "job",
      "status": "published",
      "role_name": "Software Engineer",
      "location": "Bangalore",
      "work_mode": "hybrid",
      "ctc": "8-12 LPA",
      "stipend": null,
      "min_cgpa": 7.0,
      "max_backlogs": 0,
      "eligible_branches": ["CSE", "IT", "ECE"],
      "eligible_batches": ["2022-2026"],
      "application_start_date": "2026-03-01",
      "application_end_date": "2026-03-31",
      "published_at": "2026-03-01T00:00:00.000Z",
      "company": {
        "id": "uuid",
        "name": "TechCorp Solutions",
        "industry": "IT Services"
      },
      "created_at": "2026-02-15T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 30, "totalPages": 2 }
}
```

---

## 4.2 Get Posting Detail

```
GET /api/postings/:postingId
```

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "title": "Software Engineer - Full Stack",
  "type": "job",
  "status": "published",
  "academic_year": "2025-26",
  "role_name": "Software Engineer",
  "role_description": "Build and maintain web applications...",
  "location": "Bangalore",
  "work_mode": "hybrid",
  "ctc": "8-12 LPA",
  "stipend": null,
  "duration": null,
  "bond_details": "No bond",
  "eligible_branches": ["CSE", "IT", "ECE"],
  "eligible_batches": ["2022-2026"],
  "min_cgpa": 7.0,
  "max_backlogs": 0,
  "skill_requirements": "JavaScript, React, Node.js, SQL",
  "has_written_test": true,
  "written_test_details": "90 min MCQ on aptitude + coding",
  "has_gd": false,
  "gd_details": null,
  "technical_rounds": 2,
  "hr_rounds": 1,
  "additional_info": "Bring laptop for coding round",
  "application_start_date": "2026-03-01",
  "application_end_date": "2026-03-31",
  "published_at": "2026-03-01T00:00:00.000Z",
  "closed_at": null,
  "company": {
    "id": "uuid",
    "name": "TechCorp Solutions",
    "industry": "IT Services"
  },
  "_count": {
    "applications": 150,
    "offers": 12
  }
}
```

### Frontend Notes

- Use `_count.applications` and `_count.offers` for analytics on the posting detail page.
- Show eligibility criteria prominently: branches, batches, min CGPA, max backlogs.

---

## 4.3 Create Posting

```
POST /api/postings
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `company_id` | string (uuid) | **Yes** | Must reference existing company |
| `title` | string | **Yes** | 1–200 chars |
| `type` | string | **Yes** | `job`, `internship`, `stipend_internship` |
| `academic_year` | string | **Yes** | Max 20 chars |
| `role_name` | string | **Yes** | 1–200 chars |
| `location` | string | **Yes** | 1–200 chars |
| `work_mode` | string | **Yes** | `onsite`, `remote`, `hybrid` |
| `ctc` | string | No | Max 100 chars |
| `stipend` | string | No | Max 100 chars |
| `duration` | string | No | Max 100 chars |
| `bond_details` | string | No | Max 2000 chars |
| `role_description` | string | No | Max 5000 chars |
| `eligible_branches` | string[] | No | Default `[]` |
| `eligible_batches` | string[] | No | Default `[]` |
| `min_cgpa` | number | No | 0–10, default 0 |
| `max_backlogs` | integer | No | >= 0, default 0 |
| `skill_requirements` | string | No | Max 2000 chars |
| `has_written_test` | boolean | No | Default false |
| `written_test_details` | string | No | Max 2000 chars |
| `has_gd` | boolean | No | Default false |
| `gd_details` | string | No | Max 2000 chars |
| `technical_rounds` | integer | No | >= 0, default 0 |
| `hr_rounds` | integer | No | >= 0, default 0 |
| `additional_info` | string | No | Max 5000 chars |
| `application_start_date` | string (date) | No | ISO date |
| `application_end_date` | string (date) | No | ISO date |

### Success Response — `201 Created`

Returns the created posting with `status: "draft"`.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 400 | `FOREIGN_KEY_VIOLATION` | Invalid `company_id` |
| 404 | `RESOURCE_NOT_FOUND` | Company not found |

### Frontend Notes

- New postings always start as `draft`.
- Use a multi-step form for this complex payload.
- `ctc` and `stipend` are free-text strings (e.g., "8-12 LPA", "25K/month").
- Use tag inputs for `eligible_branches` and `eligible_batches`.

---

## 4.4 Update Posting

```
PUT /api/postings/:postingId
```

Same fields as create except `company_id` (cannot change). All fields optional.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Posting not found |
| 422 | `POSTING_CLOSED` | Cannot update a closed posting |

### Edge Cases

- Can freely update `draft` and `published` postings.
- **Cannot update after closing** — show fields as read-only for closed postings.

---

## 4.5 Publish Posting

```
PUT /api/postings/:postingId/publish
```

### Request Body (optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `application_start_date` | string (date) | No | Override start date |
| `application_end_date` | string (date) | No | Override end date |

```json
{
  "application_start_date": "2026-03-01",
  "application_end_date": "2026-03-31"
}
```

Or send empty body `{}`.

### Success Response — `200 OK`

Returns updated posting with `status: "published"` and `published_at` timestamp.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_POSTING_STATUS` | Posting is not in `draft` status |

### Frontend Notes

- Show a "Publish" button only for `draft` postings.
- Once published, students can see and apply to this posting.
- Optionally allow setting/overriding application dates during publish.

---

## 4.6 Close Posting

```
PUT /api/postings/:postingId/close
```

### Request Body

None required.

### Success Response — `200 OK`

Returns updated posting with `status: "closed"` and `closed_at` timestamp.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `POSTING_ALREADY_CLOSED` | Already closed |

### Frontend Notes

- Show "Close" button only for `published` postings.
- Closing is **irreversible** — show a confirmation dialog.
- After closing, no more applications can be submitted.
