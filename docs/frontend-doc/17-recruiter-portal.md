# 17. Recruiter Portal

## Overview

Recruiter-facing endpoints with **PII protection**. All responses have sensitive student data stripped (email, mobile, date_of_birth, residential_address are removed).

**Roles Required:** `recruiter` (all endpoints)
**Middleware:** `piiFilter()` applied to all routes

---

## 17.1 Recruiter Dashboard

```
GET /api/recruiter/dashboard
```

### Success Response — `200 OK`

```json
{
  "company": {
    "id": "uuid",
    "name": "TechCorp Solutions",
    "industry": "IT Services",
    "website": "https://techcorp.com"
  },
  "stats": {
    "active_postings": 5,
    "total_applications": 350,
    "total_offers": 25
  }
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | User or recruiter profile not found |

### Frontend Notes

- The dashboard automatically resolves the recruiter's company from their profile.
- If the recruiter profile is not linked to a company → 404 error.

---

## 17.2 Company Postings

```
GET /api/recruiter/companies/:companyId/postings
```

### Success Response — `200 OK`

```json
{
  "postings": [
    {
      "id": "uuid",
      "title": "Software Engineer - Full Stack",
      "type": "job",
      "role_name": "Software Engineer",
      "location": "Bangalore",
      "work_mode": "hybrid",
      "ctc": "8-12 LPA",
      "stipend": null,
      "status": "published",
      "application_start_date": "2026-03-01",
      "application_end_date": "2026-03-31",
      "_count": { "applications": 150 }
    }
  ]
}
```

### Frontend Notes

- Only **published** postings are returned.
- `_count.applications` shows how many students applied.

---

## 17.3 Applications for a Posting

```
GET /api/recruiter/postings/:postingId/applications
```

### Success Response — `200 OK`

```json
{
  "applications": [
    {
      "id": "uuid",
      "current_stage": "interview",
      "applied_at": "2026-03-05T10:00:00.000Z",
      "student": {
        "id": "uuid",
        "full_name": "John Doe",
        "enrollment_number": "21CS001",
        "department": "Computer Science",
        "batch": "2022-2026"
      }
    }
  ]
}
```

### PII Protection — Fields Excluded

The following student fields are **never returned** to recruiters:

| Excluded Field | Reason |
|---------------|--------|
| `email` | Personal contact |
| `mobile` | Personal contact |
| `date_of_birth` | Personal information |
| `residential_address` | Personal address |
| `permanent_address` | Personal address |
| `alternate_phone` | Personal contact |

### Frontend Notes

- Recruiters see student names, enrollment numbers, departments, and batches — but no personal contact info.
- This protects student privacy while allowing recruiters to track their hiring pipeline.
- The recruiter portal is read-only — recruiters cannot modify applications or offers through this portal.

---

## Authentication Flow for Recruiters

1. Recruiter logs in via `POST /api/auth/login` with their email/password
2. JWT token contains `role: "recruiter"`
3. All `/api/recruiter/*` endpoints require this role
4. PII filter middleware strips sensitive data from all responses

## UI Recommendations

- **Dashboard:** Company info card + stats widgets (active postings, total applications, offers)
- **Postings List:** Card or table view of active postings with application counts
- **Application Viewer:** Per-posting list of applicants with stage status. Read-only view — no actions available.
- **Styling:** Professional, minimal design. Recruiter sees a simplified view compared to the admin panel.
