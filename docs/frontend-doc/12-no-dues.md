# 12. No Dues Clearance

## Overview

Students request No Dues Certificates (NDC) for clearance. Admins review, approve/reject, and issue with an auto-generated NDC number.

### NDC Flow

```
Student creates → pending_review → under_review → approved → issued
                                       │
                                       ├─→ returned (back to student)
                                       └─→ rejected
```

---

## Student Endpoints

### 12.1 My No-Dues Requests

```
GET /api/no-dues/my
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "requests": [
    {
      "id": "uuid",
      "exit_reason": "employment",
      "company_name": "TechCorp Solutions",
      "status": "approved",
      "ndc_number": null,
      "declaration_accepted": true,
      "created_at": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### 12.2 Create No-Dues Request

```
POST /api/no-dues
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `exit_reason` | string | **Yes** | `employment`, `family_business`, `higher_studies` |
| `declaration_accepted` | boolean | **Yes** | Must be `true` |
| `company_name` | string | No | Max 300 chars, nullable |
| `designation` | string | No | Max 200 chars, nullable |
| `package_lpa` | number | No | >= 0, nullable |
| `joining_date` | string (date) | No | ISO date, nullable |
| `business_name` | string | No | Max 300 chars, nullable |
| `business_nature` | string | No | Max 200 chars, nullable |
| `business_address` | string | No | Max 2000 chars, nullable |
| `institution_name` | string | No | Max 300 chars, nullable |
| `program_name` | string | No | Max 200 chars, nullable |
| `country` | string | No | Max 100 chars, nullable |

**For employment:**
```json
{
  "exit_reason": "employment",
  "declaration_accepted": true,
  "company_name": "TechCorp Solutions",
  "designation": "Software Engineer",
  "package_lpa": 8.5,
  "joining_date": "2026-07-01"
}
```

**For family business:**
```json
{
  "exit_reason": "family_business",
  "declaration_accepted": true,
  "business_name": "Doe Enterprises",
  "business_nature": "Manufacturing",
  "business_address": "Industrial Area, Ahmedabad"
}
```

**For higher studies:**
```json
{
  "exit_reason": "higher_studies",
  "declaration_accepted": true,
  "institution_name": "MIT",
  "program_name": "MS Computer Science",
  "country": "USA"
}
```

### Success Response — `201 Created`

### Frontend Notes

- `declaration_accepted` **must be true** — show a checkbox with declaration text.
- Show different form fields based on `exit_reason`:
  - `employment` → company_name, designation, package_lpa, joining_date
  - `family_business` → business_name, business_nature, business_address
  - `higher_studies` → institution_name, program_name, country

---

## Admin Endpoints

### 12.3 List All No-Dues Requests

```
GET /api/no-dues
```

**Role:** `tpo_admin`, `tpo_employee`

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `pending_review`, `under_review`, `approved`, `returned`, `rejected`, `issued` |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

---

### 12.4 Get No-Dues Detail

```
GET /api/no-dues/:id
```

**Role:** `tpo_admin`, `tpo_employee`

---

### 12.5 Review No-Dues Request

```
PUT /api/no-dues/:id/review
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | **Yes** | `under_review`, `approved`, `returned`, `rejected` |
| `admin_remarks` | string | No | Max 2000 chars, nullable |

**Start reviewing:**
```json
{
  "status": "under_review",
  "admin_remarks": "Verifying details with company"
}
```

**Approve:**
```json
{
  "status": "approved"
}
```

**Return for corrections:**
```json
{
  "status": "returned",
  "admin_remarks": "Package amount seems incorrect. Please verify."
}
```

**Reject:**
```json
{
  "status": "rejected",
  "admin_remarks": "Incomplete documentation"
}
```

### Frontend Notes

- Use status-based action buttons: "Start Review", "Approve", "Return", "Reject".
- `returned` sends it back to the student for corrections.
- Sets `reviewed_at` automatically.

---

### 12.6 Issue NDC

```
PUT /api/no-dues/:id/issue
```

**Role:** `tpo_admin` **only**

### Request Body

None.

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "status": "issued",
  "ndc_number": "NDC-2026-00001",
  "issued_at": "2026-03-08T10:00:00.000Z"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `NDC_NOT_APPROVED` | Status is not `approved` |

### Frontend Notes

- Only available for `approved` requests.
- `ndc_number` is auto-generated: `NDC-{year}-{5-digit-padded-count}`
- Show prominently after issuance — consider a download/print option.
