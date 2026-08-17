# 16. Reports & Dashboard

## Overview

Dashboard statistics and analytics endpoints for placement data. All endpoints return aggregated data — no pagination.

**Roles Required:** `tpo_admin`, `tpo_employee`, `management`

---

## 16.1 Dashboard Stats

```
GET /api/reports/dashboard
```

### Success Response — `200 OK`

```json
{
  "students": { "total": 1200 },
  "companies": { "total": 85 },
  "postings": { "total": 150, "active": 45 },
  "applications": { "total": 3500 },
  "offers": { "total": 280, "accepted": 210 },
  "events": { "total": 35 }
}
```

### Frontend Notes

- Use for the main dashboard cards/widgets.
- `postings.active` = published postings.
- `offers.accepted` = offers with status `accepted`.
- Refresh on dashboard load.

---

## 16.2 Placement Stats

```
GET /api/reports/placement-stats
```

### Success Response — `200 OK`

```json
{
  "placed": 210,
  "unplaced": 990,
  "offers_by_type": [
    { "type": "job", "_count": { "_all": 180 } },
    { "type": "internship", "_count": { "_all": 100 } }
  ]
}
```

### Frontend Notes

- `placed` = students with at least one accepted offer.
- `unplaced` = total students minus placed.
- Use a pie chart for placed vs unplaced.
- Use a bar chart for offers by type.

---

## 16.3 Application Pipeline

```
GET /api/reports/application-pipeline
```

### Success Response — `200 OK`

```json
{
  "pipeline": [
    { "current_stage": "applied", "_count": { "_all": 1500 } },
    { "current_stage": "shortlisted", "_count": { "_all": 800 } },
    { "current_stage": "interview", "_count": { "_all": 400 } },
    { "current_stage": "offer_released", "_count": { "_all": 280 } },
    { "current_stage": "rejected", "_count": { "_all": 520 } }
  ]
}
```

### Frontend Notes

- Use a funnel chart or horizontal bar chart.
- Shows the hiring funnel at a glance.
- Stages: applied → mock_round → shortlisted → test_scheduled → interview → hr_round → offer_released → rejected.

---

## 16.4 Company-Wise Stats

```
GET /api/reports/company-wise
```

### Success Response — `200 OK`

```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "TechCorp Solutions",
      "classification": "preferred",
      "_count": {
        "postings": 8,
        "offers": 25,
        "engagements": 12
      }
    },
    {
      "id": "uuid",
      "name": "StartupXYZ",
      "classification": "normal",
      "_count": {
        "postings": 2,
        "offers": 5,
        "engagements": 3
      }
    }
  ]
}
```

### Frontend Notes

- Use a sortable table.
- Color-code by classification (preferred=green, normal=blue, blacklisted=red).
- Show as a leaderboard of top recruiters.

---

## 16.5 Department-Wise Stats

```
GET /api/reports/department-wise
```

### Success Response — `200 OK`

```json
{
  "departments": [
    { "department": "Computer Science", "count": 350 },
    { "department": "Information Technology", "count": 280 },
    { "department": "Electronics", "count": 200 },
    { "department": "Mechanical", "count": 150 }
  ]
}
```

### Frontend Notes

- Shows student distribution across departments.
- Use a bar chart or pie chart.

---

## 16.6 Profile Completion Stats

```
GET /api/reports/profile-completion
```

### Success Response — `200 OK`

```json
{
  "profile_completion": [
    { "range": "0-25%", "count": 120 },
    { "range": "26-50%", "count": 350 },
    { "range": "51-75%", "count": 480 },
    { "range": "76-100%", "count": 250 }
  ]
}
```

### Frontend Notes

- Use a stacked bar or donut chart.
- The `76-100%` group are students eligible for interest registration.
- Use this to track onboarding progress — how many students have completed their profiles.

---

## Dashboard Layout Suggestion

```
┌─────────────────────────────────────────────────────┐
│  Total Students │ Companies │ Active Postings │ Offers│  ← Dashboard Stats
├─────────────────┼───────────┼─────────────────┴──────┤
│  Placed vs      │ Application Pipeline               │  ← Placement + Pipeline
│  Unplaced (pie) │ (funnel chart)                     │
├─────────────────┼────────────────────────────────────┤
│  Profile        │ Department Distribution             │  ← Completion + Dept
│  Completion     │ (bar chart)                        │
├─────────────────┴────────────────────────────────────┤
│  Top Companies (sortable table)                      │  ← Company Stats
└──────────────────────────────────────────────────────┘
```
