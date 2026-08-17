# 14. Student Portfolio

## Overview

Students build a portfolio showcasing projects and internship experiences. The portfolio is auto-created on first access.

**Roles Required:** `student` (all endpoints)

---

## 14.1 Get My Portfolio

```
GET /api/portfolio/me
```

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "status": "draft",
  "project_count": 2,
  "internship_count": 1,
  "projects": [
    {
      "id": "uuid",
      "title": "E-Commerce Platform",
      "description": "Full-stack e-commerce...",
      "role": "Lead Developer",
      "technologies": ["React", "Node.js"],
      "keywords": ["web", "fullstack"],
      "github_url": "https://github.com/johndoe/ecommerce",
      "live_url": "https://myapp.com",
      "start_date": "2025-01-01",
      "end_date": "2025-06-01",
      "is_ongoing": false,
      "display_order": 0
    }
  ],
  "showcases": [
    {
      "id": "uuid",
      "company_name": "Google India",
      "role": "SWE Intern",
      "duration_months": 3,
      "start_date": "2025-05-01",
      "end_date": "2025-07-31",
      "key_outcomes": ["Built microservice", "Improved latency by 40%"],
      "proof_url": "https://...",
      "linked_internship_id": "uuid"
    }
  ]
}
```

### Frontend Notes

- Portfolio is **auto-created** on first GET call — no need to call a create endpoint.
- `project_count` and `internship_count` are auto-maintained.
- Projects are ordered by `display_order`.

---

## 14.2 Update Portfolio Status

```
PUT /api/portfolio/me/status
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | **Yes** | `draft`, `published`, `archived` |

```json
{
  "status": "published"
}
```

---

## 14.3 Add Project

```
POST /api/portfolio/me/projects
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | **Yes** | 1–200 chars |
| `description` | string | No | Max 5000 chars, nullable |
| `role` | string | No | Max 200 chars, nullable |
| `technologies` | string[] | No | Default `[]` |
| `keywords` | string[] | No | Default `[]` |
| `github_url` | string | No | Valid URL, nullable |
| `live_url` | string | No | Valid URL, nullable |
| `start_date` | string (date) | No | Nullable |
| `end_date` | string (date) | No | Nullable |
| `is_ongoing` | boolean | No | Default false |
| `display_order` | integer | No | >= 0, default 0 |

### Success Response — `201 Created`

Auto-increments `project_count`.

---

## 14.4 Update Project

```
PUT /api/portfolio/me/projects/:projectId
```

Same fields as add, all optional.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Project not found |

---

## 14.5 Delete Project

```
DELETE /api/portfolio/me/projects/:projectId
```

### Success Response — `200 OK`

```json
{
  "message": "Project deleted"
}
```

Auto-decrements `project_count`.

---

## 14.6 Add Internship Showcase

```
POST /api/portfolio/me/showcases
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `company_name` | string | **Yes** | 1–300 chars |
| `role` | string | **Yes** | 1–200 chars |
| `duration_months` | integer | No | >= 0, nullable |
| `start_date` | string (date) | No | Nullable |
| `end_date` | string (date) | No | Nullable |
| `key_outcomes` | string[] | No | Default `[]` |
| `proof_url` | string | No | Valid URL, nullable |
| `linked_internship_id` | string (uuid) | No | Link to internship record, nullable |

```json
{
  "company_name": "Google India",
  "role": "SWE Intern",
  "duration_months": 3,
  "start_date": "2025-05-01",
  "end_date": "2025-07-31",
  "key_outcomes": ["Built microservice handling 10K req/s", "Improved API latency by 40%"],
  "linked_internship_id": "uuid-of-internship"
}
```

### Success Response — `201 Created`

Auto-increments `internship_count`.

---

## 14.7 Delete Showcase

```
DELETE /api/portfolio/me/showcases/:showcaseId
```

### Success Response — `200 OK`

```json
{
  "message": "Showcase deleted"
}
```

Auto-decrements `internship_count`.

### Frontend Notes

- Use `display_order` with drag-and-drop to let students reorder projects.
- `linked_internship_id` auto-links to the internship module — show a link to the internship detail.
- `key_outcomes` is an array of achievement strings — use bullet-point inputs.
- Portfolio can be `published` to make it viewable by recruiters/admins.
