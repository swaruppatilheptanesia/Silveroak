# 8. NOC Requests

## Overview

Students request No Objection Certificates for internships/training/projects. NOCs go through a **dual approval chain**: Faculty Coordinator → TPO → Issue.

### NOC Approval Flow

```
Student creates    Faculty approves    TPO approves    Admin issues
      │                   │                  │               │
 pending_faculty → pending_tpo → approved → issued
      │                   │
      └───── rejected ←───┘  (either can reject)
```

---

## Student Endpoints

### 8.1 My NOC Requests

```
GET /api/noc/my
```

**Role:** `student`

### Success Response — `200 OK`

```json
{
  "nocs": [
    {
      "id": "uuid",
      "noc_type": "internship",
      "program": "summer_internship",
      "company_name": "Google India",
      "role_title": "SWE Intern",
      "status": "pending_faculty",
      "noc_number": null,
      "start_date": "2026-05-01",
      "end_date": "2026-07-31",
      "created_at": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### 8.2 Create NOC Request

```
POST /api/noc
```

**Role:** `student`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `noc_type` | string | **Yes** | `internship`, `training`, `project` |
| `program` | string | **Yes** | `summer_internship`, `winter_internship`, `final_semester_internship`, `nep_internship`, `stipend_internship`, `dissertation`, `industrial_training` |
| `placement_source` | string | **Yes** | `university_drive`, `self_sourced` |
| `drive_id` | string (uuid) | No | If sourced from university drive, nullable |
| `company_name` | string | **Yes** | 1–300 chars |
| `company_address` | string | No | Max 2000 chars, nullable |
| `company_city` | string | No | Max 100 chars, nullable |
| `company_state` | string | No | Max 100 chars, nullable |
| `company_pincode` | string | No | Max 10 chars, nullable |
| `contact_person_name` | string | No | Max 200 chars, nullable |
| `contact_person_designation` | string | No | Max 100 chars, nullable |
| `contact_person_phone` | string | No | Max 20 chars, nullable |
| `contact_person_email` | string | No | Valid email, max 255, nullable |
| `reference_by` | string | No | Max 50 chars, nullable |
| `reference_details` | string | No | Max 2000 chars, nullable |
| `role_title` | string | **Yes** | 1–200 chars |
| `technology_domain` | string | No | Max 200 chars, nullable |
| `job_description` | string | No | Max 5000 chars, nullable |
| `stipend_amount` | number | No | >= 0, nullable |
| `start_date` | string (date) | **Yes** | ISO date |
| `end_date` | string (date) | **Yes** | ISO date |
| `duration_weeks` | integer | No | >= 1, nullable |
| `offer_letter_url` | string | No | Max 2000 chars, nullable |

```json
{
  "noc_type": "internship",
  "program": "summer_internship",
  "placement_source": "self_sourced",
  "company_name": "Google India",
  "company_city": "Bangalore",
  "company_state": "Karnataka",
  "contact_person_name": "HR Manager",
  "contact_person_email": "hr@google.com",
  "role_title": "SWE Intern",
  "technology_domain": "Cloud Computing",
  "stipend_amount": 80000,
  "start_date": "2026-05-01",
  "end_date": "2026-07-31",
  "duration_weeks": 12
}
```

### Success Response — `201 Created`

Returns the NOC request with `status: "pending_faculty"`.

### Frontend Notes

- This is a large form — use a multi-step wizard.
- Step 1: Type, program, placement source
- Step 2: Company details (name, address, contact)
- Step 3: Role details (title, domain, stipend)
- Step 4: Duration and documents
- Show/hide `drive_id` field based on `placement_source === "university_drive"`.
- Show company address fields conditionally.

---

## Faculty Endpoints

### 8.3 Faculty Approve

```
PUT /api/noc/:nocId/faculty-approve
```

**Role:** `faculty_coordinator`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `remarks` | string | No | Max 2000 chars, nullable |

```json
{
  "remarks": "Approved - good opportunity for the student"
}
```

### Success Response — `200 OK`

Returns NOC with `status: "pending_tpo"`.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_NOC_STATUS` | NOC is not in `pending_faculty` status |

---

## Admin Endpoints

### 8.4 List All NOC Requests

```
GET /api/noc
```

**Role:** `tpo_admin`, `tpo_employee`, `faculty_coordinator`

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `pending_faculty`, `pending_tpo`, `pending_company_verification`, `approved`, `issued`, `rejected` |
| `noc_type` | string | No | `internship`, `training`, `project` |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "noc_type": "internship",
      "company_name": "Google India",
      "role_title": "SWE Intern",
      "status": "pending_tpo",
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

### 8.5 Get NOC Detail

```
GET /api/noc/:nocId
```

**Role:** `tpo_admin`, `tpo_employee`, `faculty_coordinator`

Returns full NOC with all fields and student details.

---

### 8.6 TPO Approve

```
PUT /api/noc/:nocId/tpo-approve
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `remarks` | string | No | Max 2000 chars, nullable |

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_NOC_STATUS` | NOC is not in `pending_tpo` status |

### Success Response — `200 OK`

Returns NOC with `status: "approved"`.

---

### 8.7 Reject NOC

```
PUT /api/noc/:nocId/reject
```

**Role:** `tpo_admin`, `tpo_employee`, `faculty_coordinator`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `rejection_reason` | string | **Yes** | 1–2000 chars |

```json
{
  "rejection_reason": "Company is not verified and has complaints"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_NOC_STATUS` | NOC is already `issued` or `rejected` |

### Frontend Notes

- Both faculty and TPO can reject.
- Cannot reject an already-issued or already-rejected NOC.

---

### 8.8 Issue NOC

```
PUT /api/noc/:nocId/issue
```

**Role:** `tpo_admin` **only**

### Request Body

None.

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "status": "issued",
  "noc_number": "NOC-2026-00001",
  "issued_at": "2026-03-08T10:00:00.000Z"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_NOC_STATUS` | NOC is not in `approved` status |

### Frontend Notes

- Only shows for `approved` NOCs.
- `noc_number` is auto-generated: `NOC-{year}-{5-digit-padded-count}`
- This is the final step — show the NOC number prominently after issuance.
- Consider adding a "Download NOC" or "Print NOC" button after issuance.

---

## UI Recommendations

### Student Dashboard
- Show NOC request status with color-coded badges:
  - `pending_faculty` → Yellow
  - `pending_tpo` → Orange
  - `approved` → Blue
  - `issued` → Green
  - `rejected` → Red

### Admin Dashboard
- Show pending NOCs in queues:
  - Faculty queue: `pending_faculty` NOCs
  - TPO queue: `pending_tpo` NOCs
  - Ready to issue: `approved` NOCs
- Filter by noc_type for different workflows.
