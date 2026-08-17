# 7. Campus Events

## Overview

Events represent campus drives, PPTs, workshops, etc. Admins create events, add interview panels, assign students, and mark attendance.

**Roles Required:** `tpo_admin`, `tpo_employee` (all endpoints)

### Event Lifecycle

```
draft → published → ongoing → completed
                       │
                       └──→ cancelled
```

---

## 7.1 List Events

```
GET /api/events
```

### Query Parameters

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | `draft`, `published`, `ongoing`, `completed`, `cancelled` |
| `type` | string | No | `campus_drive`, `ppt`, `test_assessment`, `internship_drive`, `workshop` |
| `company_id` | string (uuid) | No | Filter by company |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | Default 20 |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "TechCorp Campus Drive 2026",
      "type": "campus_drive",
      "status": "published",
      "date": "2026-03-15T00:00:00.000Z",
      "start_time": "09:00",
      "end_time": "17:00",
      "venue": "Auditorium Hall A",
      "company": { "id": "uuid", "name": "TechCorp Solutions" },
      "_count": { "panels": 3, "assigned_students": 120 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

---

## 7.2 Get Event Detail

```
GET /api/events/:eventId
```

### Success Response — `200 OK`

```json
{
  "id": "uuid",
  "title": "TechCorp Campus Drive 2026",
  "type": "campus_drive",
  "status": "published",
  "date": "2026-03-15T00:00:00.000Z",
  "start_time": "09:00",
  "end_time": "17:00",
  "venue": "Auditorium Hall A",
  "reporting_time": "08:30",
  "dress_code": "Formal",
  "instructions": "Bring laptop and 2 copies of resume...",
  "documents_required": ["Resume", "ID Card", "Marksheet"],
  "faculty_coordinators": ["Dr. Patel", "Prof. Shah"],
  "company": { "id": "uuid", "name": "TechCorp Solutions" },
  "panels": [
    {
      "id": "uuid",
      "panel_name": "Panel A - Technical",
      "room": "Room 301",
      "start_time": "10:00",
      "end_time": "13:00",
      "recruiters": ["John Smith", "Jane Doe"]
    }
  ],
  "assigned_students": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "panel_id": "uuid",
      "attendance": "present",
      "marked_at": "2026-03-15T09:15:00.000Z"
    }
  ]
}
```

---

## 7.3 Create Event

```
POST /api/events
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `company_id` | string (uuid) | **Yes** | Must exist |
| `posting_id` | string (uuid) | No | Link to posting, nullable |
| `title` | string | **Yes** | 1–300 chars |
| `type` | string | **Yes** | `campus_drive`, `ppt`, `test_assessment`, `internship_drive`, `workshop` |
| `date` | string (date) | **Yes** | ISO date |
| `start_time` | string | **Yes** | Max 10 chars (e.g., "09:00") |
| `end_time` | string | **Yes** | Max 10 chars (e.g., "17:00") |
| `venue` | string | **Yes** | 1–300 chars |
| `reporting_time` | string | No | Max 10 chars, nullable |
| `dress_code` | string | No | Max 200 chars, nullable |
| `instructions` | string | No | Max 5000 chars, nullable |
| `documents_required` | string[] | No | Default `[]` |
| `faculty_coordinators` | string[] | No | Default `[]` |

### Success Response — `201 Created`

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Company not found |

---

## 7.4 Update Event

```
PUT /api/events/:eventId
```

Same fields as create, all optional.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 422 | `EVENT_FINALIZED` | Cannot update completed or cancelled events |

---

## 7.5 Update Event Status

```
PUT /api/events/:eventId/status
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | **Yes** | `draft`, `published`, `ongoing`, `completed`, `cancelled` |

```json
{
  "status": "ongoing"
}
```

### Frontend Notes

- Creates an audit log entry for each status change.
- Show status transitions as buttons: "Publish", "Start", "Complete", "Cancel".

---

## 7.6 Create Panel

```
POST /api/events/:eventId/panels
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `panel_name` | string | **Yes** | 1–100 chars |
| `room` | string | **Yes** | 1–100 chars |
| `start_time` | string | No | Max 10 chars, nullable |
| `end_time` | string | No | Max 10 chars, nullable |
| `recruiters` | string[] | No | Default `[]` |

```json
{
  "panel_name": "Panel A - Technical",
  "room": "Room 301",
  "start_time": "10:00",
  "end_time": "13:00",
  "recruiters": ["John Smith", "Jane Doe"]
}
```

### Success Response — `201 Created`

---

## 7.7 Assign Students

```
POST /api/events/:eventId/students
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `student_ids` | string[] (uuids) | **Yes** | 1–200 items |
| `panel_id` | string (uuid) | No | Optional panel assignment, nullable |

```json
{
  "student_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "panel_id": "uuid-of-panel"
}
```

### Success Response — `200 OK`

```json
{
  "results": [
    { "student_id": "uuid-1", "status": "assigned", "id": "uuid" },
    { "student_id": "uuid-2", "status": "assigned", "id": "uuid" },
    { "student_id": "uuid-3", "status": "error", "message": "Student not found" }
  ]
}
```

### Frontend Notes

- **Upsert behavior:** If a student is already assigned, their `panel_id` is updated.
- Results are per-student — check each item's status.
- Max 200 students per assignment call.
- Use a student search/selection UI for bulk assignment.

---

## 7.8 Mark Attendance

```
PUT /api/events/:eventId/attendance
```

### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `student_id` | string (uuid) | **Yes** | Must be assigned to event |
| `attendance` | string | **Yes** | `present`, `absent`, `late` |

```json
{
  "student_id": "uuid",
  "attendance": "present"
}
```

### Success Response — `200 OK`

Returns the updated student assignment with attendance info.

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 404 | `RESOURCE_NOT_FOUND` | Student not assigned to this event |

### Frontend Notes

- Student must be assigned to the event first.
- Show a list of assigned students with attendance toggles (Present / Absent / Late).
- `marked_by` and `marked_at` are set automatically.
