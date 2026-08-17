# Silver Oak T&P Portal — Frontend Integration Guide

## Base URL

```
http://localhost:3000
```

## Authentication

All protected endpoints require a **Bearer JWT** token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Standard Error Response Shape

Every error from the API follows this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [                          // optional, present for validation errors
      {
        "field": "field_name",
        "message": "What went wrong",
        "code": "INVALID_FORMAT"
      }
    ]
  }
}
```

### HTTP Status Code Reference

| Status | Meaning | When |
|--------|---------|------|
| 200 | OK | Successful read/update/delete |
| 201 | Created | Successful resource creation |
| 400 | Bad Request | Validation error, invalid data, foreign key violation |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (unique constraint) |
| 422 | Unprocessable Entity | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Global Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Zod schema validation failed. Check `details` array for per-field errors. |
| `TOKEN_INVALID` | 401 | JWT token is missing, malformed, or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User's role doesn't have access to this endpoint |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `DUPLICATE_ENTRY` | 409 | Unique constraint violation (e.g., duplicate email) |
| `FOREIGN_KEY_VIOLATION` | 400 | Referenced record (e.g., company_id) doesn't exist |
| `ROUTE_NOT_FOUND` | 404 | The endpoint URL is wrong |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Pagination

Paginated endpoints accept these query parameters:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 20 | Items per page |
| `sort_by` | string | varies | Field to sort by |
| `sort_order` | string | `desc` | `asc` or `desc` |

Paginated responses return:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Roles

| Role | Description |
|------|-------------|
| `student` | Student user |
| `tpo_admin` | Training & Placement Officer (full admin) |
| `tpo_employee` | TPO staff (limited admin) |
| `faculty_coordinator` | Faculty who approves NOCs |
| `recruiter` | Company recruiter (PII-filtered access) |
| `management` | Management (view reports) |
| `super_admin` | System administrator |

## Integration Order (Recommended)

1. **Authentication** — Login, token management, session handling
2. **Student Profile** — Profile completion, academic, skills, resumes
3. **Policy Acceptance** — Gate before applications/interests
4. **Interest Registration** — After profile >= 80% and policy accepted
5. **Companies & Recruiters** — Employer management (admin)
6. **Job Postings** — Create, publish, close postings (admin)
7. **Applications** — Student apply, admin pipeline management
8. **Offers** — Create, accept, reject, joining, compliance
9. **Events** — Campus drives, panels, attendance
10. **NOC** — Request, dual approval, issue
11. **Internships** — Track internships, report issues
12. **Announcements** — Publish, read receipts, consent
13. **Circulars** — Templates, generate circulars
14. **No Dues** — Request, review, issue NDC
15. **Policies** — Manage placement policies
16. **Portfolio** — Student showcase
17. **Admin Panel** — User management, audit logs, permissions
18. **Reports & Dashboard** — Statistics, analytics
19. **Recruiter Portal** — Recruiter-facing views

## File Index

| File | Module |
|------|--------|
| [01-auth.md](./01-auth.md) | Authentication |
| [02-students.md](./02-students.md) | Student Profile |
| [03-employers.md](./03-employers.md) | Companies & Recruiters |
| [04-postings.md](./04-postings.md) | Job/Internship Postings |
| [05-applications.md](./05-applications.md) | Application Pipeline |
| [06-offers.md](./06-offers.md) | Offer Management |
| [07-events.md](./07-events.md) | Campus Events |
| [08-noc.md](./08-noc.md) | NOC Requests |
| [09-internships.md](./09-internships.md) | Internship Tracking |
| [10-announcements.md](./10-announcements.md) | Announcements |
| [11-circulars.md](./11-circulars.md) | Circulars |
| [12-no-dues.md](./12-no-dues.md) | No Dues Clearance |
| [13-policies.md](./13-policies.md) | Policies |
| [14-portfolio.md](./14-portfolio.md) | Student Portfolio |
| [15-admin.md](./15-admin.md) | Admin Panel |
| [16-reports.md](./16-reports.md) | Reports & Dashboard |
| [17-recruiter-portal.md](./17-recruiter-portal.md) | Recruiter Portal |
