# Silver Oak University — Training & Placement Portal

A multi-tenant Training & Placement (T&P) portal for Silver Oak University: student
profiles → applications → offers → NOC → No-Dues → reports, across 7 roles
(student, TPO admin, TPO employee, faculty coordinator, recruiter, management, super admin)
and 16 modules.

This is a two-app monorepo:

```
.
├── frontend/     # Vite + React 18 + TypeScript + Tailwind + shadcn/ui
├── backend/      # Node.js + Express 5 + TypeScript + Prisma + PostgreSQL
└── docs/         # System, workflow, API-integration and backend-engineering docs
```

The two apps share no code — the contract between them is the frontend
`src/services/*Service.ts` layer against the backend `/api/*` routes.

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **PostgreSQL** 14+ (a reachable database for the backend)

---

## Getting started

### 1. Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env          # then fill in the values (see "Environment" below)
npx prisma migrate dev        # create/upgrade the database schema
npm run db:seed               # optional: seed baseline data
npm run dev                   # tsx watch → http://localhost:3000
```

- Health check: <http://localhost:3000/api/health>
- API docs (Swagger): <http://localhost:3000/api-docs>

### 2. Frontend (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env          # then set VITE_API_BASE_URL / VITE_TENANT_SLUG
npm run dev                   # Vite → http://localhost:8080
```

Open <http://localhost:8080>. With the defaults above the frontend calls the backend at
`http://localhost:3000/api` (CORS is preconfigured for the dev origin).

---

## Environment

**`frontend/.env`**

| Variable             | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL`  | Backend API base, e.g. `http://localhost:3000/api`  |
| `VITE_TENANT_SLUG`   | Active tenant slug                                  |

**`backend/.env`**

| Variable                     | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `DATABASE_URL`               | PostgreSQL connection string                   |
| `JWT_SECRET`                 | Secret for signing JWT bearer tokens           |
| `CRM_*` URLs + `CRM_API_KEY` | CRM lookups for student signup / staff import  |

Both `.env` files are git-ignored; commit only the `.env.example` templates.

---

## Common commands

**Frontend** (`cd frontend`)

```bash
npm run dev                              # dev server (http://localhost:8080)
npm run build                            # production build → dist/
npm run lint                             # eslint
npx tsc --noEmit -p tsconfig.app.json    # type-check (must pass -p)
```

**Backend** (`cd backend`)

```bash
npm run dev              # tsx watch (http://localhost:3000)
npm run build && npm start
npm run migrate          # prisma migrate dev
npm run migrate:deploy   # prisma migrate deploy (production, idempotent)
npm run db:seed          # seed database
npm run db:studio        # Prisma Studio
npm test                 # jest (runs serially against a live Postgres)
npm run lint             # tsc --noEmit
```

---

## Tech stack

**Frontend:** Vite 5, React 18, TypeScript, React Router v6 (lazy routes), Tailwind CSS,
shadcn/ui (Radix), TanStack Query, React Hook Form + Zod, Recharts, ExcelJS, sonner.

**Backend:** Node.js, Express 5, TypeScript, Prisma 5 + PostgreSQL, JWT auth, Zod
validation, pino logging, Swagger (swagger-jsdoc), Jest + Supertest.

---

## Deploy

Deploy **backend first** (with migrations), then the frontend, then hard-refresh:

```bash
# Backend
cd backend && npm ci && npx prisma migrate deploy && npm run build   # then start the service

# Frontend
cd frontend && npm ci && npm run build   # publish dist/
```

See the dated `RELEASE_NOTES_*.md` at the repo root for per-release migration and deploy
notes.

---

## Documentation

- `CLAUDE.md` — how the system behaves now (working reference).
- `CHANGELOG.md` — chronological functional changelog.
- `docs/SYSTEM_DOCUMENTATION.md`, `docs/TPO_FUNCTIONAL_WORKFLOW_DOCUMENTATION.md`,
  `docs/TECHNICAL_HANDOVER_API_INTEGRATION_GUIDE.md`,
  `docs/BACKEND_ENGINEERING_REQUIREMENTS.md`, and `docs/frontend-doc/` — deeper references.
