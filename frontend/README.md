# BlackoutCare Frontend

BlackoutCare frontend is a Next.js clinical downtime dashboard for operating during hospital IT outages. It connects to the FastAPI backend for authentication, patient registration, triage workflow management, vitals tracking, protocol lookup, protocol action checklists, operations handoff, audit review, staff administration, recovery review, and downtime report exports.

The interface is intentionally operational rather than marketing-focused: clinicians and coordinators should be able to sign in, register patients, create triage cases, record vitals, analyze risk, review handoff gaps, inspect audit history, and export recovery documentation quickly.

## Technology

- Next.js App Router
- React client components for authenticated workflows
- Tailwind CSS utility styling
- `lucide-react` icons
- Backend API integration through `src/lib/api.ts`

## Environment

Create `frontend/.env.local` when the backend is not running on the default URL:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

If this variable is not set, the frontend uses:

```text
http://127.0.0.1:8000
```

## Running Locally

From the frontend directory:

```bash
npm install
npm run dev -- --hostname 127.0.0.1
```

Open:

```text
http://127.0.0.1:3000
```

Use seeded demo credentials when the backend seed script has been run:

```text
staff_code: DOC-900
password: password123
```

Full-access demo admin:

```text
staff_code: ADMIN-900
password: password123
```

## Frontend Structure

```text
frontend/src/
  app/
    page.tsx              Landing page
    login/page.tsx        Staff login
    dashboard/page.tsx    Operations overview
    safety/page.tsx       Patient Safety Board
    patients/page.tsx     Patient registry
    triage/page.tsx       Triage workflow
    operations/page.tsx   Readiness, handoff, timeline, recovery gaps, AI oversight
    protocols/page.tsx    Protocol library
    audit/page.tsx        Audit log
    exports/page.tsx      Report downloads
    recovery/page.tsx     Recovery Sync Center
    staff/page.tsx        Staff administration
  components/
    DashboardShell.tsx    Shared protected app shell
  lib/
    api.ts                API URL, auth token, typed fetch helpers
```

## Authentication Flow

1. The user signs in on `/login`.
2. The login page calls:

```text
POST /auth/login
```

3. On success, the backend sets an httpOnly `access_token` cookie.
4. Authenticated dashboard pages are wrapped by `DashboardShell`.
5. `DashboardShell` checks the session by calling:

```text
GET /auth/me
```

6. If the token is missing or invalid, the user is redirected to `/login`.
7. Clicking the avatar opens the account menu. Selecting `Sign out` removes the token and redirects to `/login`.

## Shared Dashboard Shell

`src/components/DashboardShell.tsx` centralizes:

- Sidebar navigation
- Mobile navigation
- Top search/status/user bar
- System status indicator from `GET /status`
- Operations alert dropdown from `GET /operations/alerts`
- Global search from `GET /operations/search`
- Current user display from `GET /auth/me`
- Protected route behavior
- Avatar dropdown and sign out

All authenticated dashboard routes use this shell, which prevents duplicated layout logic across pages.

## Page Workflows

### Dashboard

Route:

```text
/dashboard
```

Purpose:

- Gives a command-center overview of downtime operations.
- Shows patient, triage, critical case, protocol, and audit metrics.
- Lists recent triage cases and audit events.
- Starts or resolves downtime incident mode.

Backend endpoints:

```text
GET /dashboard/summary
GET /patients/
GET /triage/cases/
GET /events/
GET /incidents/active
POST /incidents/
PATCH /incidents/{incident_id}
```

### Safety Board

Route:

```text
/safety
```

Purpose:

- Surfaces critical cases, unknown allergies, stale notes, unassigned urgency, pending AI reviews, and recovery gaps.
- Helps staff find dangerous omissions during downtime.

Backend endpoint:

```text
GET /operations/safety-board
```

### Patients

Route:

```text
/patients
```

Purpose:

- Lists registered downtime patients.
- Allows patient creation.
- Shows patient details on row selection.
- Supports local name/code filtering.

Backend endpoints:

```text
GET  /patients/
POST /patients/
GET  /patients/{patient_id}
```

### Triage

Route:

```text
/triage
```

Purpose:

- Lists triage cases.
- Supports urgency/status filters.
- Creates new triage cases for existing patients.
- Opens case details.
- Updates case status.
- Records repeated vitals entries and trend direction.
- Adds clinical, vitals, handoff, and escalation notes.
- Uses quick templates for SBAR, escalation, and handoff notes.
- Manages protocol action checklist items.
- Runs AI analysis for a case.
- Reviews AI recommendations as accepted, rejected, or needs review.
- Downloads per-case JSON/PDF exports.

Backend endpoints:

```text
GET   /triage/cases/
POST  /triage/cases/
GET   /triage/cases/{case_id}
PATCH /triage/cases/{case_id}/status
PATCH /triage/cases/{case_id}
GET   /triage/cases/{case_id}/notes/
POST  /triage/cases/{case_id}/notes/
GET   /triage/cases/{case_id}/vitals
POST  /triage/cases/{case_id}/vitals
GET   /triage/cases/{case_id}/checklist
POST  /triage/cases/{case_id}/checklist
PATCH /triage/cases/checklist/{item_id}
POST  /triage/cases/{case_id}/analyze
PATCH /ai/recommendations/{recommendation_id}/review
GET   /exports/triage-case/{case_id}
GET   /exports/triage-case/{case_id}/pdf
```

### Operations Cockpit

Route:

```text
/operations
```

Purpose:

- Shows offline readiness checks for database, protocols, staff, local AI, and exports.
- Builds a shift handoff list with latest notes, latest vitals, open protocol actions, and priority.
- Displays incident timeline entries from audit events.
- Reviews recovery conflicts such as missing patient details, unknown allergies, open cases, and unreviewed AI output.
- Summarizes AI oversight by review status and confidence.

Backend endpoints:

```text
GET /operations/readiness
GET /operations/handoff
GET /operations/timeline
GET /operations/recovery-conflicts
GET /operations/ai-oversight
```

### Protocols

Route:

```text
/protocols
```

Purpose:

- Lists downtime clinical protocols.
- Creates new protocols.
- Searches protocols by title or trigger keyword.
- Opens a protocol detail panel.

Backend endpoints:

```text
GET  /protocols/
POST /protocols/
GET  /protocols/{protocol_id}
POST /protocols/search
```

### Audit Log

Route:

```text
/audit
```

Purpose:

- Displays system audit events.
- Filters by event type.
- Looks up events for a specific triage case.

Backend endpoints:

```text
GET /events/
GET /events/case/{case_id}
```

### Exports

Route:

```text
/exports
```

Purpose:

- Shows report summary counts.
- Downloads full downtime reports in JSON and PDF formats.
- Supports recovery documentation workflows after systems come back online.

Backend endpoints:

```text
GET /patients/
GET /triage/cases/
GET /exports/downtime-report
GET /exports/downtime-report/pdf
```

### Recovery Sync Center

Route:

```text
/recovery
```

Purpose:

- Previews incident-specific records that need sync or manual entry.
- Updates sync status for patients, triage cases, notes, and AI recommendations.
- Downloads a FHIR-like recovery bundle.

Backend endpoints:

```text
GET   /recovery/incidents/{incident_id}/sync-preview
GET   /recovery/incidents/{incident_id}/fhir-bundle
PATCH /recovery/sync-status
```

### Staff Admin

Route:

```text
/staff
```

Purpose:

- Lists clinical staff users.
- Filters staff by role.
- Creates new staff accounts.

Backend endpoints:

```text
GET  /users/
POST /users/
```

Access note: the backend restricts `GET /users/` to `admin` and `coordinator` roles. If a non-admin user opens this page, the backend returns a permission error.

## API Client

The shared API helper lives in:

```text
src/lib/api.ts
```

It provides:

- `API_URL`
- `getToken()`
- `apiFetch<T>()`
- Shared TypeScript response types
- Date and title formatting helpers

`apiFetch<T>()` automatically attaches:

```text
Authorization: Bearer <access_token>
```

when a token is provided by an API client. Browser requests use `credentials: "include"` so the httpOnly auth cookie is sent without exposing the token to JavaScript.

## Route Protection

Protected routes are currently enforced in `DashboardShell` on the client side. This is appropriate for the current hackathon build, but production should also add middleware or server-side auth checks so protected pages cannot briefly render before client validation.

## Validation Commands

Run frontend checks:

```bash
npm run lint
npm run build
```

Expected routes generated by the build:

```text
/
/_not-found
/audit
/dashboard
/exports
/login
/operations
/patients
/protocols
/recovery
/safety
/staff
/triage
```

## Known Production Follow-Ups

- Add logout endpoint or token revocation strategy.
- Add route middleware for authenticated dashboard routes.
- Hide Staff Admin navigation for non-admin/non-coordinator users.
- Add frontend integration tests for login, patient registration, triage, and export flows.
- Generate frontend TypeScript types from the backend OpenAPI schema.
- Add realtime updates for safety, operations, and triage views.
