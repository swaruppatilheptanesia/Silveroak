# 6. Offer Management

## Overview

Offers are created by admins after a student clears the hiring pipeline. Students accept/reject, then admins track joining and compliance status.

### Offer Lifecycle

```
pending_student_action ──→ accepted ──→ joining tracked ──→ compliance tracked
         │
         └──────────────→ rejected_by_admin
```

---

## Student Endpoints

### 6.1 My Offers

```
GET /api/offers/my
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "offers": [
    {
      "id": "uuid",
      "type": "job",
      "role": "Software Engineer",
      "ctc": "8 LPA",
      "stipend": null,
      "location": "Bangalore",
      "status": "pending_student_action",
      "offer_date": "2026-03-01",
      "is_locked": false,
      "company": { "name": "TechCorp Solutions" },
      "posting": { "title": "Software Engineer - Full Stack" }
    }
  ]
}
```

---

### 6.2 Accept Offer

```
PUT /api/offers/:offerId/accept
```

**Role:** `student`

### Request Body

None.

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "status": "accepted",
  "is_locked": true,
  "accepted_at": "2026-03-08T10:00:00.000Z"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Offer not found or not owned by student |
| 422 | `OFFER_NOT_PENDING` | Offer status is not `pending_student_action` |

### Frontend Notes

- Show "Accept" button only when `status === "pending_student_action"`.
- **Accepting sets `is_locked = true`** — this is a significant action. Show confirmation dialog.
- After acceptance, the offer cannot be changed by the student.

---

## Admin Endpoints

### 6.3 List All Offers

```
GET /api/offers
```

**Role:** `tpo_admin`, `tpo_employee`

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `pending_student_action`, `accepted`, `rejected_by_admin` |
| `type` | string | No | `job`, `internship` |
| `company_id` | string (uuid) | No | Filter by company |
| `student_id` | string (uuid) | No | Filter by student |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | Default 20 |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "job",
      "role": "Software Engineer",
      "ctc": "8 LPA",
      "status": "accepted",
      "offer_date": "2026-03-01",
      "is_locked": true,
      "student": { "id": "uuid", "full_name": "John Doe", "enrollment_number": "21CS001" },
      "company": { "id": "uuid", "name": "TechCorp" },
      "posting": { "id": "uuid", "title": "Software Engineer" }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

---

### 6.4 Create Offer

```
POST /api/offers
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `student_id` | string (uuid) | **Yes** | Must be existing student |
| `posting_id` | string (uuid) | **Yes** | Must be existing posting |
| `company_id` | string (uuid) | **Yes** | Must be existing company |
| `type` | string | **Yes** | `job` or `internship` |
| `role` | string | **Yes** | 1–200 chars |
| `ctc` | string | No | Max 100 chars, nullable |
| `stipend` | string | No | Max 100 chars, nullable |
| `location` | string | No | Max 200 chars, nullable |
| `offer_date` | string (date) | **Yes** | ISO date |

```json
{
  "student_id": "uuid",
  "posting_id": "uuid",
  "company_id": "uuid",
  "type": "job",
  "role": "Software Engineer",
  "ctc": "8 LPA",
  "location": "Bangalore",
  "offer_date": "2026-03-01"
}
```

### Success Response — `201 Created`

Returns the offer with `status: "pending_student_action"`.

### Frontend Notes

- Offer is created with status `pending_student_action` — student must accept.
- An audit trail entry is auto-created with action `created`.

---

### 6.5 Get Offer Detail

```
GET /api/offers/:offerId
```

**Role:** `tpo_admin`, `tpo_employee`

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "type": "job",
  "role": "Software Engineer",
  "ctc": "8 LPA",
  "status": "accepted",
  "offer_date": "2026-03-01",
  "is_locked": true,
  "accepted_at": "2026-03-05T10:00:00.000Z",
  "rejected_at": null,
  "rejection_reason": null,
  "joining_status": "joined",
  "joining_date": "2026-07-01",
  "compliance_status": "compliant",
  "student": { "id": "uuid", "full_name": "John Doe", "enrollment_number": "21CS001", "department": "CSE" },
  "company": { "id": "uuid", "name": "TechCorp" },
  "posting": { "id": "uuid", "title": "Software Engineer" },
  "audit_trail": [
    {
      "id": "uuid",
      "action": "joining_joined",
      "performed_by": "uuid",
      "details": null,
      "performed_at": "2026-07-01T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "action": "accepted",
      "performed_by": "uuid",
      "performed_at": "2026-03-05T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "action": "created",
      "performed_by": "uuid",
      "performed_at": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

### Frontend Notes

- `audit_trail` is ordered by `performed_at DESC`. Use it to show a timeline.
- Audit actions: `created`, `accepted`, `rejected`, `joining_joined`, `joining_did_not_join`, `compliance_compliant`, `compliance_blocked`, `compliance_override_enabled`

---

### 6.6 Reject Offer

```
PUT /api/offers/:offerId/reject
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `rejection_reason` | string | **Yes** | Max 50 chars |
| `rejection_remarks` | string | No | Max 2000 chars, nullable |

```json
{
  "rejection_reason": "Policy violation",
  "rejection_remarks": "Student accepted another offer from a different company"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `OFFER_ALREADY_REJECTED` | Already rejected |

---

### 6.7 Update Joining Status

```
PUT /api/offers/:offerId/joining
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `joining_status` | string | **Yes** | `joined` or `did_not_join` |
| `joining_date` | string (date) | No | ISO date, nullable |
| `dnj_reason` | string | No | Max 2000 chars, nullable |

**For joined:**
```json
{
  "joining_status": "joined",
  "joining_date": "2026-07-01"
}
```

**For did not join:**
```json
{
  "joining_status": "did_not_join",
  "dnj_reason": "Student opted for higher studies"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `OFFER_NOT_ACCEPTED` | Only accepted offers can have joining status updated |

### Frontend Notes

- Only show this section for `accepted` offers.
- `dnj_reason` is relevant only when `joining_status === "did_not_join"`.
- Conditionally show/hide fields based on the selected status.

---

### 6.8 Update Compliance

```
PUT /api/offers/:offerId/compliance
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `compliance_status` | string | **Yes** | `compliant`, `blocked`, `override_enabled` |
| `applications_blocked` | boolean | No | Default behavior based on status |

```json
{
  "compliance_status": "blocked",
  "applications_blocked": true
}
```

### Frontend Notes

- `blocked` = student violated placement rules → applications can be blocked.
- `override_enabled` = admin override to unblock a blocked student. Sets `admin_override_enabled = true`.
- `compliant` = student is in good standing.
- Use this to manage students who accept offers but don't join, or who apply to multiple companies against policy.
