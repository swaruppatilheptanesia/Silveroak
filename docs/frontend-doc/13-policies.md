# 13. Policies

## Overview

Simple CRUD for placement policies. These are the policy documents that students accept in the policy acceptance flow.

**Roles Required:** `tpo_admin` (all endpoints)

---

## 13.1 List Policies

```
GET /api/policies
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `category` | string | No | Max 50 chars |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

### Success Response — `200 OK`

Paginated list of policies.

---

## 13.2 Get Policy Detail

```
GET /api/policies/:id
```

---

## 13.3 Create Policy

```
POST /api/policies
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | **Yes** | 1–200 chars |
| `category` | string | **Yes** | 1–50 chars |
| `content` | string | **Yes** | Min 1 char |
| `description` | string | No | Max 5000 chars, nullable |
| `version` | string | No | Max 20 chars, default `"1.0"` |
| `effective_date` | string (date) | No | ISO date, nullable |

```json
{
  "title": "Placement Policy 2026-27",
  "category": "placement",
  "content": "1. Students must maintain minimum 7.0 CGPA...",
  "description": "Official placement rules and guidelines",
  "version": "2.0",
  "effective_date": "2026-06-01"
}
```

### Success Response — `201 Created`

---

## 13.4 Update Policy

```
PUT /api/policies/:id
```

Same fields as create, all optional.

---

## 13.5 Delete Policy

```
DELETE /api/policies/:id
```

### Success Response — `200 OK`

```json
{
  "message": "Policy deleted"
}
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Policy not found |

### Frontend Notes

- Show policies in a categorized list.
- Use a rich text editor for `content`.
- Version tracking helps manage policy updates.
- `updated_by` is auto-set to the current admin user.
