# 11. Circulars

## Overview

Circular templates are reusable document structures. Admins create templates and generate circulars from them with variable substitution.

**Roles Required:** `tpo_admin`, `tpo_employee` (all endpoints)

---

## Templates

### 11.1 List Templates

```
GET /api/circulars/templates
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `draft`, `active`, `archived` |
| `type` | string | No | `placement`, `internship`, `campus_drive`, `general` |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

---

### 11.2 Get Template Detail

```
GET /api/circulars/templates/:templateId
```

---

### 11.3 Create Template

```
POST /api/circulars/templates
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | **Yes** | 1–200 chars |
| `type` | string | **Yes** | `placement`, `internship`, `campus_drive`, `general` |
| `sections` | any | No | Default `[]` — flexible JSON for template structure |

```json
{
  "name": "Campus Drive Circular",
  "type": "campus_drive",
  "sections": [
    {
      "heading": "Company Profile",
      "content": "{{company_name}} is a leading company in {{industry}}..."
    },
    {
      "heading": "Eligibility",
      "content": "Branches: {{branches}}, Min CGPA: {{min_cgpa}}"
    }
  ]
}
```

### Success Response — `201 Created`

---

### 11.4 Update Template

```
PUT /api/circulars/templates/:templateId
```

Same fields as create (all optional), plus:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `draft`, `active`, `archived` |
| `version` | string | No | Max 20 chars |

---

## Generated Circulars

### 11.5 List Generated Circulars

```
GET /api/circulars/generated
```

### Success Response — `200 OK`

```json
{
  "circulars": [
    {
      "id": "uuid",
      "company_name": "TechCorp Solutions",
      "role_name": "Software Engineer",
      "type": "campus_drive",
      "field_values": { "min_cgpa": "7.0", "branches": "CSE, IT" },
      "template": { "id": "uuid", "name": "Campus Drive Circular" },
      "company": { "id": "uuid", "name": "TechCorp Solutions" },
      "created_at": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### 11.6 Generate Circular

```
POST /api/circulars/generate
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `template_id` | string (uuid) | **Yes** | Must be existing template |
| `company_id` | string (uuid) | **Yes** | Must be existing company |
| `company_name` | string | **Yes** | 1–300 chars |
| `role_name` | string | **Yes** | 1–200 chars |
| `type` | string | No | Max 30 chars |
| `field_values` | object | No | Key-value pairs for template variables. Default `{}` |

```json
{
  "template_id": "uuid-of-template",
  "company_id": "uuid-of-company",
  "company_name": "TechCorp Solutions",
  "role_name": "Software Engineer",
  "type": "campus_drive",
  "field_values": {
    "min_cgpa": "7.0",
    "branches": "CSE, IT, ECE",
    "ctc": "8-12 LPA",
    "date": "March 15, 2026"
  }
}
```

### Success Response — `201 Created`

### Frontend Notes

- Generation **increments** the template's `used_count` (tracked via database transaction).
- `field_values` should match the variable placeholders in the template's sections.
- Show a preview before generating — substitute variables into the template content.
- Can be linked to an announcement via `linked_circular_id`.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Template not found |
