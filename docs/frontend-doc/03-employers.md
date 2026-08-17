# 3. Companies & Recruiters

## Overview

Employer management for TPO admins. Covers company CRUD, recruiter management with verification, and engagement history tracking.

**Roles Required:** `tpo_admin`, `tpo_employee` (all endpoints)

---

## 3.1 List Companies

```
GET /api/companies
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `page` | integer | No | Default 1 |
| `limit` | integer | No | Default 20 |
| `search` | string | No | Searches company name |
| `sort_by` | string | No | Default `created_at` |
| `sort_order` | string | No | `asc` or `desc` |
| `status` | string | No | `active` or `inactive` |
| `classification` | string | No | `preferred`, `normal`, or `blacklisted` |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "TechCorp Solutions",
      "industry": "IT Services",
      "website": "https://techcorp.com",
      "address": "123 Tech Park, Bangalore",
      "description": "Leading IT services company...",
      "status": "active",
      "classification": "preferred",
      "internal_remarks": "Top recruiter, 50+ hires last year",
      "tenant_id": "uuid",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 3.2 Get Company Detail

```
GET /api/companies/:companyId
```

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "name": "TechCorp Solutions",
  "industry": "IT Services",
  "website": "https://techcorp.com",
  "address": "123 Tech Park, Bangalore",
  "description": "Leading IT services company...",
  "status": "active",
  "classification": "preferred",
  "internal_remarks": "Top recruiter",
  "_count": {
    "recruiters": 3,
    "engagements": 12,
    "postings": 8,
    "offers": 25
  }
}
```

### Frontend Notes

- Use `_count` to display relationship stats on the company detail page.
- `internal_remarks` is admin-only — never shown to students/recruiters.

---

## 3.3 Create Company

```
POST /api/companies
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | **Yes** | 1–300 chars |
| `industry` | string | No | Max 100 chars |
| `website` | string | No | Valid URL |
| `address` | string | No | Max 500 chars |
| `description` | string | No | Max 2000 chars |

```json
{
  "name": "TechCorp Solutions",
  "industry": "IT Services",
  "website": "https://techcorp.com",
  "address": "123 Tech Park, Bangalore"
}
```

### Success Response — `201 Created`

Returns the created company object.

---

## 3.4 Update Company

```
PUT /api/companies/:companyId
```

Same fields as create (all optional), plus:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `active` or `inactive` |

---

## 3.5 Classify Company

```
PUT /api/companies/:companyId/classification
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `classification` | string | **Yes** | `preferred`, `normal`, or `blacklisted` |
| `internal_remarks` | string | No | Max 1000 chars |

```json
{
  "classification": "blacklisted",
  "internal_remarks": "Multiple complaints from students about work conditions"
}
```

### Frontend Notes

- Show a confirmation dialog for `blacklisted` classification.
- `internal_remarks` is private admin notes — useful for tracking classification reasons.

---

## 3.6 List Recruiters (by Company)

```
GET /api/companies/:companyId/recruiters
```

### Success Response — `200 OK`

```json
{
  "recruiters": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@techcorp.com",
      "phone": "+91-9876543210",
      "designation": "HR Manager",
      "verification_status": "verified",
      "verified_by": "uuid",
      "verified_at": "2026-01-15T10:00:00.000Z",
      "company_id": "uuid",
      "created_at": "2025-06-01T00:00:00.000Z"
    }
  ]
}
```

---

## 3.7 Create Recruiter

```
POST /api/companies/:companyId/recruiters
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | **Yes** | 1–200 chars |
| `email` | string | **Yes** | Valid email format |
| `phone` | string | No | Phone regex: `+?[\d\s-]{7,20}` |
| `designation` | string | No | Max 100 chars |

### Success Response — `201 Created`

### Edge Cases

- Duplicate email within same company → `409 DUPLICATE_ENTRY`

---

## 3.8 Update Recruiter

```
PUT /api/recruiters/:recruiterId
```

> **Note:** This endpoint is under `/api/recruiters`, not under `/api/companies`.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | No | Max 200 chars |
| `phone` | string | No | Phone regex |
| `designation` | string | No | Max 100 chars |

---

## 3.9 Verify Recruiter

```
PUT /api/recruiters/:recruiterId/verify
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | **Yes** | `verified` or `rejected` |

```json
{
  "status": "verified"
}
```

### Frontend Notes

- Sets `verified_by` and `verified_at` automatically.
- Show pending recruiters in a separate queue for verification.

---

## 3.10 Delete Recruiter

```
DELETE /api/recruiters/:recruiterId
```

**Response — `200 OK`**: `{ "message": "Recruiter deleted" }`

---

## 3.11 List Engagements

```
GET /api/companies/:companyId/engagements
```

```json
{
  "engagements": [
    {
      "id": "uuid",
      "visitor_type": "placement",
      "date": "2026-02-15T00:00:00.000Z",
      "remarks": "Annual campus drive - 15 students hired",
      "students_hired": 15,
      "packages_offered": "4.5-8 LPA",
      "academic_year": "2025-26",
      "company_id": "uuid",
      "created_at": "2026-02-20T00:00:00.000Z"
    }
  ]
}
```

---

## 3.12 Create Engagement

```
POST /api/companies/:companyId/engagements
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `visitor_type` | string | **Yes** | `placement`, `internship`, `campus_visit`, `guest_lecture`, `workshop` |
| `date` | string (date) | **Yes** | ISO date |
| `remarks` | string | No | Max 1000 chars |
| `students_hired` | integer | No | >= 0 |
| `packages_offered` | string | No | Max 500 chars |
| `academic_year` | string | No | Max 20 chars |

### Frontend Notes

- Engagements are a historical record of company visits/interactions.
- Use this to show a company's engagement timeline.
- `packages_offered` is free-text (e.g., "4.5-8 LPA") since it can represent ranges.
