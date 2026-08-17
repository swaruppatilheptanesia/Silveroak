# 15. Admin Panel

## Overview

User management, audit log viewing, and role permissions management.

**Roles Required:** `tpo_admin`, `super_admin` (all endpoints)

---

## User Management

### 15.1 List Users

```
GET /api/admin/users
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `role` | string | No | `student`, `tpo_admin`, `tpo_employee`, `faculty_coordinator`, `recruiter`, `management`, `super_admin` |
| `is_active` | string | No | `"true"` or `"false"` (query string) |
| `search` | string | No | Case-insensitive search on name and email |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "student@silveroak.ac.in",
      "name": "John Doe",
      "role": "student",
      "department": "Computer Science",
      "is_active": true,
      "last_login_at": "2026-03-08T10:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Frontend Notes

- `password_hash` is **never** returned in responses.
- Use the `search` param for a search bar (searches both name and email).
- `is_active` is passed as a string in query params.

---

### 15.2 Get User Detail

```
GET /api/admin/users/:userId
```

---

### 15.3 Create User

```
POST /api/admin/users
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | **Yes** | Valid email, max 255 chars |
| `password` | string | **Yes** | 8–100 chars |
| `name` | string | **Yes** | 1–200 chars |
| `role` | string | **Yes** | One of the 7 roles |
| `department` | string | No | Max 100 chars, nullable |

```json
{
  "email": "newfaculty@silveroak.ac.in",
  "password": "SecurePass@123",
  "name": "Dr. New Faculty",
  "role": "faculty_coordinator",
  "department": "Computer Science"
}
```

### Success Response — `201 Created`

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `EMAIL_EXISTS` | Email already registered (within same tenant) |

### Frontend Notes

- Password is hashed server-side. Enforce minimum 8 chars in the form.
- Email uniqueness is per-tenant (composite unique: `tenant_id + email`).

---

### 15.4 Update User

```
PUT /api/admin/users/:userId
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | No | Max 200 chars |
| `role` | string | No | One of the 7 roles |
| `department` | string | No | Max 100 chars, nullable |
| `is_active` | boolean | No | — |

```json
{
  "is_active": false
}
```

### Frontend Notes

- Setting `is_active: false` effectively **deactivates** the user — they can no longer login or refresh tokens.
- Use this for user suspension instead of deletion.

---

## Audit Logs

### 15.5 List Audit Logs

```
GET /api/admin/audit-logs
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `module` | string | No | Max 50 chars (e.g., `auth`, `postings`, `offers`) |
| `action` | string | No | Max 50 chars (e.g., `login`, `create`, `publish`) |
| `user_id` | string (uuid) | No | Filter by actor |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "module": "postings",
      "action": "publish",
      "details": "Published posting: Software Engineer at TechCorp",
      "ip_address": "192.168.1.1",
      "user": {
        "name": "TPO Admin",
        "email": "tpoadmin@silveroak.ac.in"
      },
      "created_at": "2026-03-08T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Frontend Notes

- Audit logs are **read-only** — no create/update/delete.
- Use filters to investigate specific users, modules, or actions.
- Show a timeline view for audit trail.

---

## Permissions

### 15.6 List Role Permissions

```
GET /api/admin/permissions
```

### Success Response — `200 OK`

```json
{
  "permissions": [
    {
      "id": "uuid",
      "role": "student",
      "module": "applications",
      "can_create": true,
      "can_read": true,
      "can_update": false,
      "can_delete": true,
      "can_export": false
    },
    {
      "id": "uuid",
      "role": "tpo_admin",
      "module": "postings",
      "can_create": true,
      "can_read": true,
      "can_update": true,
      "can_delete": true,
      "can_export": true
    }
  ]
}
```

---

### 15.7 Update Permission

```
PUT /api/admin/permissions/:permissionId
```

### Request Body

Toggle individual CRUD + export flags:

```json
{
  "can_create": true,
  "can_read": true,
  "can_update": true,
  "can_delete": false,
  "can_export": true
}
```

### Success Response — `200 OK`

### Frontend Notes

- Display as a matrix: rows = modules, columns = CRUD+export, grouped by role.
- Use toggle switches for each permission flag.
- Changes take effect immediately on next request.
