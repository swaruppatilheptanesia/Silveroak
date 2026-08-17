# 10. Announcements

## Overview

Admins create announcements with targeted audiences, publish/archive them, and students mark them as read or give consent.

### Announcement Lifecycle

```
draft → published → archived
```

---

## Admin Endpoints

### 10.1 List Announcements

```
GET /api/announcements
```

**Role:** `tpo_admin`, `tpo_employee`

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `draft`, `published`, `archived` |
| `priority` | string | No | `high`, `medium`, `low` |
| `page`, `limit`, `sort_by`, `sort_order` | — | No | Standard pagination |

### Success Response — `200 OK`

Paginated list of announcements.

---

### 10.2 Get Announcement Detail

```
GET /api/announcements/:announcementId
```

**Role:** `tpo_admin`, `tpo_employee`, `student`

---

### 10.3 Create Announcement

```
POST /api/announcements
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | **Yes** | 1–200 chars |
| `content` | string | **Yes** | Min 1 char |
| `priority` | string | No | `high`, `medium`, `low`. Default: `medium` |
| `target_audience_type` | string | No | `all`, `batch`, `department`, `eligible_for_posting`. Default: `all` |
| `target_batches` | string[] | No | Default `[]` |
| `target_departments` | string[] | No | Default `[]` |
| `target_posting_id` | string (uuid) | No | For `eligible_for_posting` type, nullable |
| `requires_consent` | boolean | No | Default `false` |
| `linked_circular_id` | string (uuid) | No | Link to circular, nullable |

```json
{
  "title": "Campus Drive - TechCorp on March 15",
  "content": "TechCorp Solutions will be conducting a campus drive...",
  "priority": "high",
  "target_audience_type": "batch",
  "target_batches": ["2022-2026"],
  "requires_consent": true
}
```

### Success Response — `201 Created`

### Frontend Notes

- Show `target_batches` / `target_departments` fields conditionally based on `target_audience_type`.
- If `requires_consent = true`, students must actively consent (not just read).
- `linked_circular_id` allows attaching a generated circular to the announcement.

---

### 10.4 Update Announcement

```
PUT /api/announcements/:announcementId
```

**Role:** `tpo_admin`, `tpo_employee`

Same fields as create, all optional.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `ANNOUNCEMENT_ARCHIVED` | Cannot update an archived announcement |

---

### 10.5 Publish Announcement

```
PUT /api/announcements/:announcementId/publish
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

None.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `INVALID_ANNOUNCEMENT_STATUS` | Not in `draft` status |

---

### 10.6 Archive Announcement

```
PUT /api/announcements/:announcementId/archive
```

**Role:** `tpo_admin`, `tpo_employee`

### Request Body

None.

Sets `archived_at` timestamp. After archiving, the announcement cannot be updated.

---

## Student Endpoints

### 10.7 Mark as Read

```
PUT /api/announcements/:announcementId/read
```

**Role:** `student`

### Request Body

None.

### Success Response — `200 OK`

Records a read receipt with `read_at` timestamp (upsert — idempotent).

---

### 10.8 Give Consent

```
PUT /api/announcements/:announcementId/consent
```

**Role:** `student`

### Request Body

None.

### Success Response — `200 OK`

Records consent with `consented_at` timestamp (upsert — idempotent).

### Frontend Notes

- Show a "I have read and understood" button for `requires_consent` announcements.
- Track read/consent status per announcement for the student.
- Both actions are **idempotent** — calling them multiple times is safe.
- Show unread announcement count as a badge/notification.

---

## UI Recommendations

- **Student view:** Show published announcements filtered by their batch/department. Highlight unread ones. Show consent button for announcements that require it.
- **Admin view:** Dashboard showing draft/published/archived counts. Read receipt analytics (how many students read, how many consented).
