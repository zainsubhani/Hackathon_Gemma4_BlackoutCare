# BlackoutCare

BlackoutCare is a full-stack offline hospital downtime copilot. It is designed for scenarios where clinical teams lose access to normal hospital systems during outages, cyberattacks, or degraded network conditions.

The project includes a FastAPI backend and a Next.js frontend for structured downtime workflows: users, patients, triage cases, vitals tracking, clinical protocols, protocol action checklists, AI-assisted recommendations, handoff summaries, audit events, staff administration, recovery review, and exports.

## Problem

Hospitals depend heavily on EHRs, decision-support systems, and connected workflows. During ransomware events or IT outages, clinicians may lose access to patient records, protocol guidance, and normal documentation tools.

BlackoutCare addresses this gap by providing a local-first API that supports:

- Downtime patient registration
- Clinical triage workflow continuity
- Vitals timeline and case note documentation
- Protocol-aware AI decision support
- Protocol-to-action checklists
- Shift handoff and operations readiness summaries
- Structured audit logging
- Recovery conflict review
- Exportable recovery reports
- PDF downtime documentation

This project does not replace clinicians, hospital policy, or EHR systems. It is decision-support software for maintaining structure under uncertainty.

## Core Capabilities

### Frontend Operations Console

- Protected dashboard routes with JWT session checks
- Shared clinical dashboard shell with sidebar, topbar, system status, and sign out
- Patient registry and patient creation
- Triage case creation, status updates, vitals timeline, protocol checklist, AI analysis, notes, and per-case exports
- Protocol creation and protocol keyword search
- Operations cockpit for handoff, readiness, incident timeline, recovery review, and AI oversight
- Patient Safety Board for critical cases, unknown allergies, stale notes, unassigned urgency, pending AI reviews, and recovery gaps
- Audit event review and case-specific audit lookup
- Full downtime report exports in JSON and PDF
- Staff administration for user listing and creation

### Authentication

- JWT login via staff code and password
- Password hashing with Passlib and bcrypt
- Offline password reset using a configured master reset secret
- Role-aware authorization helpers
- Protected clinical, protocol, event, and export routes

### Users

- Create clinical users such as doctors, nurses, admins, and coordinators
- Staff-code based login identity
- Hashed password storage

### Patients

- Register downtime patient records
- Store limited clinical context available during an outage
- Normalize patient codes for reliable lookup

### Triage

- Create and update triage cases
- Track urgency and status
- Record repeated vitals entries and trend direction
- Add clinical, vitals, handoff, and escalation notes
- Manage per-case protocol action checklist items
- Analyze cases using local AI support
- Automatically associate new triage cases with the authenticated user

### Protocols

- Store local clinical downtime protocols
- Search protocols by trigger keywords and pgvector-backed semantic similarity
- Attach matched protocol context to AI triage prompts
- Track protocol actions as pending, done, or skipped inside a case workflow

### AI Decision Support

- Calls a local Ollama/Gemma endpoint
- Builds protocol-grounded prompts
- Parses structured JSON recommendations
- Stores clinician review status, reviewer, timestamp, and review note
- Supports oversight reporting across accepted, rejected, pending, and needs-review recommendations
- Returns safe fallback guidance if Ollama is down or returns invalid output

### Operations and Safety

- Global search across patients, triage cases, protocols, and incidents
- Alert feed for critical cases, escalated cases, pending AI reviews, and failed events
- Offline readiness checks for local database, protocol library, staff access, local AI, and exports
- Shift handoff summary for active cases, latest notes, latest vitals, open protocol actions, and priority scoring
- Incident timeline built from audit events
- Recovery conflict review for missing patient details, unknown allergies, open cases, and unreviewed AI output
- Patient Safety Board for dangerous clinical and recovery gaps

### Recovery Sync

- Incident-specific sync preview
- Patient, triage case, note, and AI recommendation sync status tracking
- FHIR-like recovery bundle export
- Recovery item validation so records cannot be marked synced against the wrong incident

### Audit Events

The backend records audit events for important actions, including:

- User creation
- Patient creation
- Triage case creation
- Triage status updates
- Triage case edits
- Vitals entry creation
- Protocol checklist item creation and updates
- Case note creation
- Protocol creation
- AI recommendation success or failure
- AI recommendation review
- Report exports
- Recovery sync status updates
- Password reset and password changes

Audit events include tamper-evident hash chaining with previous and current event hashes. This does not make the database impossible to alter, but it helps detect unauthorized modification because changing one event breaks the chain.

### Exports

- JSON downtime reports
- PDF downtime reports
- Single triage case exports
- Full hospital downtime report exports
- Incident PDF exports
- FHIR-like recovery bundle exports
- Generated timestamps, hospital label, summary metrics, and critical case counts

## Architecture

The project is split into backend and frontend applications:

### System Design Diagram

```mermaid
flowchart LR
  subgraph Clinicians["Clinical Users"]
    Doctor["Doctor / Nurse / Coordinator"]
    Admin["Admin"]
  end

  subgraph Frontend["Next.js Operations Console"]
    Shell["Protected Dashboard Shell"]
    TriageUI["Triage, Vitals, Notes"]
    OpsUI["Safety, Operations, Recovery"]
    ExportUI["JSON / PDF Exports"]
  end

  subgraph Backend["FastAPI Backend"]
    Auth["Auth + Role Checks"]
    Patients["Patients"]
    Triage["Triage Cases + Checklists"]
    Protocols["Protocol Library"]
    AI["AI Triage Service"]
    Operations["Safety + Handoff + Readiness"]
    Recovery["Recovery Sync"]
    Exports["Export Service"]
    Audit["Audit Hash Chain"]
  end

  subgraph LocalInfra["Local Downtime Infrastructure"]
    Postgres[("PostgreSQL / pgvector")]
    Ollama["Ollama + Gemma"]
    Files["PDF / JSON / FHIR-like Bundles"]
  end

  Doctor --> Shell
  Admin --> Shell
  Shell --> TriageUI
  Shell --> OpsUI
  Shell --> ExportUI

  Frontend -->|httpOnly cookie / JWT| Auth
  Auth --> Patients
  Auth --> Triage
  Auth --> Protocols
  Auth --> Operations
  Auth --> Recovery
  Auth --> Exports

  Patients --> Postgres
  Triage --> Postgres
  Protocols --> Postgres
  Operations --> Postgres
  Recovery --> Postgres
  Audit --> Postgres

  Triage -->|matched protocol context| Protocols
  Triage --> AI
  AI -->|local inference| Ollama
  AI -->|safe fallback if unavailable| Triage
  AI --> Postgres

  Patients --> Audit
  Triage --> Audit
  Protocols --> Audit
  AI --> Audit
  Recovery --> Audit
  Exports --> Audit

  Exports --> Files
  Recovery --> Files
```

The fuller judge-facing architecture notes are in [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).

### Runtime Flow

1. Staff sign in with a local staff code and password; the backend sets an httpOnly JWT cookie for protected workflows.
2. Clinicians register patients, open triage cases, record vitals, add notes, and manage protocol checklist actions from the Next.js console.
3. The backend stores downtime records locally in PostgreSQL and writes tamper-evident audit events for important clinical, admin, export, and recovery actions.
4. AI recommendations are grounded with matched local protocol context and sent to a local Ollama/Gemma model. If local inference is unavailable, the API returns safe fallback guidance instead of crashing the clinical workflow.
5. Operations views aggregate active cases, alerts, handoff priorities, safety gaps, incident timeline, AI review status, and recovery conflicts from the same local record system.
6. Recovery mode previews records that need reconciliation and exports JSON, PDF, and FHIR-like bundles when hospital systems come back online.

```text
frontend/
  src/
    app/
      login/
      dashboard/
      safety/
      patients/
      triage/
      operations/
      protocols/
      audit/
      exports/
      recovery/
      staff/
    components/
      DashboardShell.tsx
    lib/
      api.ts

backend/
  app/
    auth/
      router.py
      schemas.py
    core/
      auth.py
      config.py
      database.py
      security.py
    users/
      models.py
      schemas.py
      crud.py
      router.py
    patients/
      models.py
      schemas.py
      crud.py
      router.py
    triage/
      models.py
      schemas.py
      crud.py
      service.py
      router.py
    notes/
      models.py
      schemas.py
      crud.py
      router.py
    protocols/
      models.py
      schemas.py
      crud.py
      router.py
    incidents/
      models.py
      schemas.py
      crud.py
      router.py
    ai/
      models.py
      schemas.py
      crud.py
      router.py
      service.py
    events/
      models.py
      schemas.py
      crud.py
      router.py
    exports/
      router.py
      service.py
      pdf_generators.py
    recovery/
      router.py
      schemas.py
      service.py
    operations/
      router.py
    dashboard/
      router.py
    main.py
  scripts/
    seed_demo.py
  Dockerfile
```

### Layer Responsibilities

- `router.py`: HTTP request and response handling.
- `schemas.py`: Pydantic request and response models.
- `models.py`: SQLAlchemy database models.
- `crud.py`: database persistence operations.
- `service.py`: business or integration logic that does not belong directly in route handlers.
- `core/`: shared configuration, database, security, and authentication helpers.

## Technology Stack

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL with pgvector image
- pgvector protocol embeddings for semantic protocol search
- Pydantic Settings
- Uvicorn
- Ollama/Gemma for local AI inference
- ReportLab for PDF generation
- python-jose for JWT handling
- Passlib and bcrypt for password hashing
- Docker Compose for local infrastructure
- Next.js App Router
- React
- Tailwind CSS
- lucide-react icons

## Environment Variables

Create a `.env` file at the project root:

```env
POSTGRES_PASSWORD=replace-with-a-local-db-password
DATABASE_URL=postgresql://postgres:replace-with-a-local-db-password@localhost:5433/blackoutcare
APP_ENV=development
SECRET_KEY=replace-with-a-long-random-secret
PASSWORD_RESET_MASTER_PASSWORD=replace-with-an-offline-admin-reset-secret
BOOTSTRAP_ADMIN_TOKEN=replace-with-a-one-time-local-setup-token
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=gemma:7b
OLLAMA_TIMEOUT_SECONDS=30
OLLAMA_EMBEDDING_URL=http://localhost:11434/api/embeddings
OLLAMA_EMBEDDING_MODEL=
PROTOCOL_EMBEDDING_DIMENSIONS=384
```

Protocol search stores an embedding on each protocol and uses pgvector cosine distance on PostgreSQL. If `OLLAMA_EMBEDDING_MODEL` is not configured, the app uses a deterministic local embedding fallback so offline demos and tests still work.

## Local Setup

### Backend

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
python -m uvicorn app.main:app --reload
```

API documentation will be available at:

```text
http://127.0.0.1:8000/docs
```

### Frontend

From the repository root:

```bash
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1
```

The frontend will be available at:

```text
http://127.0.0.1:3000
```

The frontend uses the following backend URL by default:

```text
http://127.0.0.1:8000
```

To override it, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Docker Setup

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on host port `5433`
- Ollama on host port `11434`
- Backend on host port `8000`
- Frontend on host port `3000`
- A helper service that pulls the configured Gemma model

Run migrations manually from `backend/` when you want to manage schema changes through Alembic:

```bash
./.venv/bin/alembic upgrade head
```

## Seed Demo Data

After dependencies and the database are running:

```bash
cd backend
./.venv/bin/python scripts/seed_demo.py
```

Demo credentials:

```text
staff_code: DOC-900
password: password123
```

Full-access demo admin:

```text
staff_code: ADMIN-900
password: password123
```

The seed script creates:

- A demo doctor
- A demo patient
- A chest pain downtime protocol
- A critical triage case

## Authentication Flow

Create or seed a user, then log in:

```http
POST /auth/login
```

Example body:

```json
{
  "staff_code": "DOC-900",
  "password": "password123"
}
```

API clients may use the returned token as:

```text
Authorization: Bearer <access_token>
```

The browser frontend uses an httpOnly `access_token` cookie and validates protected routes through:

```text
GET /auth/me
```

## Important Endpoints

```text
GET    /health
GET    /status
POST   /auth/login
GET    /auth/me
POST   /users/
GET    /users/
GET    /users/{user_id}
GET    /dashboard/summary
GET    /patients/
POST   /patients/
GET    /patients/{patient_id}
GET    /triage/cases/
POST   /triage/cases/
GET    /triage/cases/{case_id}
POST   /triage/cases/{case_id}/analyze
PATCH  /triage/cases/{case_id}/status
PATCH  /triage/cases/{case_id}
GET    /triage/cases/{case_id}/notes/
POST   /triage/cases/{case_id}/notes/
GET    /triage/cases/{case_id}/vitals
POST   /triage/cases/{case_id}/vitals
GET    /triage/cases/{case_id}/checklist
POST   /triage/cases/{case_id}/checklist
PATCH  /triage/cases/checklist/{item_id}
GET    /protocols/
POST   /protocols/
GET    /protocols/{protocol_id}
POST   /protocols/search
GET    /operations/search
GET    /operations/alerts
GET    /operations/safety-board
GET    /operations/readiness
GET    /operations/handoff
GET    /operations/timeline
GET    /operations/recovery-conflicts
GET    /operations/ai-oversight
GET    /incidents/active
POST   /incidents/
PATCH  /incidents/{incident_id}
GET    /events/
GET    /events/case/{case_id}
GET    /exports/downtime-report
GET    /exports/downtime-report/pdf
GET    /exports/triage-case/{case_id}
GET    /exports/triage-case/{case_id}/pdf
GET    /recovery/incidents/{incident_id}/sync-preview
GET    /recovery/incidents/{incident_id}/fhir-bundle
PATCH  /recovery/sync-status
PATCH  /ai/recommendations/{recommendation_id}/review
```

List endpoints support basic pagination with `skip` and `limit`. Several routes also support lightweight filters:

```text
GET /patients/?skip=0&limit=50&patient_code=P-1001
GET /triage/cases/?status=active&urgency_level=critical
GET /protocols/?category=emergency
GET /events/?event_type=PATIENT_CREATED
GET /users/?role=doctor
GET /operations/timeline?incident_id=1
GET /operations/recovery-conflicts?incident_id=1
```

## Main Frontend Routes

```text
/login       Staff login and offline password reset
/dashboard   Command center and downtime incident mode
/safety      Patient Safety Board
/patients    Downtime patient registry
/triage      Triage workflow, vitals, notes, protocol actions, AI review, case exports
/operations  Readiness, shift handoff, timeline, recovery conflicts, and AI oversight
/protocols   Local clinical protocol library
/audit       Audit log and case-specific event lookup
/exports     Downtime report downloads
/recovery    Recovery Sync Center and FHIR-like bundle export
/staff       Staff administration
```

## Typical Demo Flow

1. Start Docker or run Postgres/Ollama/backend/frontend locally.
2. Run the demo seed script.
3. Log in as `ADMIN-900` or `DOC-900`.
4. Open `/dashboard` and start or inspect downtime incident mode.
5. Register or inspect a patient in `/patients`.
6. Create or open a triage case in `/triage`.
7. Record vitals and add a clinical note.
8. Add protocol checklist actions and mark actions pending, done, or skipped.
9. Run AI analysis, then accept, reject, or mark the recommendation as needing review.
10. Open `/safety` to show clinical risk gaps.
11. Open `/operations` to show readiness, shift handoff, incident timeline, recovery conflicts, and AI oversight.
12. Open `/recovery` to review sync readiness and export a FHIR-like bundle.
13. Export JSON or PDF downtime reports from `/exports`.
14. Review audit events in `/audit`.

## Safety and Clinical Boundaries

BlackoutCare intentionally frames AI responses as decision support:

- It does not diagnose.
- It does not replace clinicians.
- It uses local protocol context when available.
- It highlights uncertainty when patient data is missing.
- It requires clinician review for stored recommendations.
- It returns safe fallback guidance if AI inference is unavailable.

## Current Engineering Status

BlackoutCare is hackathon-demo ready. It includes authentication, protected frontend workflows, local AI integration, triage vitals tracking, protocol action checklists, shift handoff, operations readiness, recovery conflict review, AI oversight, audit logging, exports, Dockerized backend infrastructure, and a focused pytest suite.

Latest local verification run:

```text
backend:  ./.venv/bin/python -m pytest  -> 23 passed
frontend: npm run build                 -> passed
frontend: npm run lint                  -> passed
```

Frontend workflow documentation is available in:

```text
frontend/README.md
```

Testing documentation is available in:

```text
TESTING_README.md
```

Recommended next engineering improvements:

- Replace startup `Base.metadata.create_all()` fallback with Alembic-only startup.
- Expand pytest coverage for invalid tokens, authorization edge cases, operations endpoints, pagination, and report contents.
- Add request/response examples for every endpoint.
- Add route middleware for server-side frontend auth checks.
- Generate frontend TypeScript types from the backend OpenAPI schema.
- Add print-friendly patient wristbands or chart labels.
- Add realtime updates through polling or websockets.
- Make FHIR exports fully standards-compliant before production use.
- Add assignment-, department-, and incident-scoped authorization for clinical records before production use.

## Project Positioning

BlackoutCare demonstrates a full-stack approach to resilient healthcare workflows under downtime conditions. It combines a protected clinical operations UI, local-first backend infrastructure, structured workflow modeling, shift handoff, recovery planning, auditability, and protocol-grounded AI assistance in a way that is practical for a hackathon demo and extensible toward a production-grade system.
