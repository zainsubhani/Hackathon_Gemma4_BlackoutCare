# BlackoutCare Frontend

BlackoutCare frontend is a Next.js clinical downtime dashboard for operating during hospital IT outages. It connects to the FastAPI backend for authentication, patient registration, triage workflow management, protocol lookup, audit review, staff administration, and downtime report exports.

The interface is intentionally operational rather than marketing-focused: clinicians and coordinators should be able to sign in, register patients, create triage cases, analyze risk, review audit history, and export recovery documentation quickly.

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

## Frontend Structure

```text
frontend/src/
  app/
    page.tsx              Landing page
    login/page.tsx        Staff login
    dashboard/page.tsx    Operations overview
    patients/page.tsx     Patient registry
    triage/page.tsx       Triage workflow
    protocols/page.tsx    Protocol library
    audit/page.tsx        Audit log
    exports/page.tsx      Report downloads
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

3. On success, the returned JWT is stored in `localStorage` as `access_token`.
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

Backend endpoints:

```text
GET /dashboard/summary
GET /patients/
GET /triage/cases/
GET /events/
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
- Runs AI analysis for a case.
- Downloads per-case JSON/PDF exports.

Backend endpoints:

```text
GET   /triage/cases/
POST  /triage/cases/
GET   /triage/cases/{case_id}
PATCH /triage/cases/{case_id}/status
POST  /triage/cases/{case_id}/analyze
GET   /exports/triage-case/{case_id}
GET   /exports/triage-case/{case_id}/pdf
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

Backend endpoints:

```text
GET /patients/
GET /triage/cases/
GET /exports/downtime-report
GET /exports/downtime-report/pdf
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

when a token is available.

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
/patients
/protocols
/staff
/triage
```

## Known Production Follow-Ups

- Move JWT storage from `localStorage` to secure httpOnly cookies.
- Add logout endpoint or token revocation strategy.
- Add route middleware for authenticated dashboard routes.
- Hide Staff Admin navigation for non-admin/non-coordinator users.
- Add frontend integration tests for login, patient registration, triage, and export flows.
- Generate frontend TypeScript types from the backend OpenAPI schema.
