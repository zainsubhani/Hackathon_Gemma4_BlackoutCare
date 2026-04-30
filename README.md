# CareContinuum

CareContinuum is a full-stack offline hospital downtime copilot. It is designed for scenarios where clinical teams lose access to normal hospital systems during outages, cyberattacks, or degraded network conditions.

The project includes a FastAPI backend and a Next.js frontend for structured downtime workflows: users, patients, triage cases, clinical protocols, AI-assisted recommendations, audit events, staff administration, and recovery exports.

## Problem

Hospitals depend heavily on EHRs, decision-support systems, and connected workflows. During ransomware events or IT outages, clinicians may lose access to patient records, protocol guidance, and normal documentation tools.

CareContinuum addresses this gap by providing a local-first API that supports:

- Downtime patient registration
- Clinical triage workflow continuity
- Protocol-aware AI decision support
- Structured audit logging
- Exportable recovery reports
- PDF downtime documentation

This project does not replace clinicians, hospital policy, or EHR systems. It is decision-support software for maintaining structure under uncertainty.

## Core Capabilities

### Frontend Operations Console

- Protected dashboard routes with JWT session checks
- Shared clinical dashboard shell with sidebar, topbar, system status, and sign out
- Patient registry and patient creation
- Triage case creation, status updates, AI analysis, and per-case exports
- Protocol creation and protocol keyword search
- Audit event review and case-specific audit lookup
- Full downtime report exports in JSON and PDF
- Staff administration for user listing and creation

### Authentication

- JWT login via staff code and password
- Password hashing with Passlib and bcrypt
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
- Analyze cases using local AI support
- Automatically associate new triage cases with the authenticated user

### Protocols

- Store local clinical downtime protocols
- Search protocols by trigger keywords
- Attach matched protocol context to AI triage prompts

### AI Decision Support

- Calls a local Ollama/Gemma endpoint
- Builds protocol-grounded prompts
- Parses structured JSON recommendations
- Returns safe fallback guidance if Ollama is down or returns invalid output

### Audit Events

The backend records audit events for important actions, including:

- User creation
- Patient creation
- Triage case creation
- Triage status updates
- Protocol creation
- AI recommendation success or failure
- Report exports

### Exports

- JSON downtime reports
- PDF downtime reports
- Single triage case exports
- Full hospital downtime report exports
- Generated timestamps, hospital label, summary metrics, and critical case counts

## Architecture

The project is split into backend and frontend applications:

```text
frontend/
  src/
    app/
      login/
      dashboard/
      patients/
      triage/
      protocols/
      audit/
      exports/
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
    protocols/
      models.py
      schemas.py
      crud.py
      router.py
    ai/
      models.py
      schemas.py
      crud.py
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/carecontinuum
APP_ENV=development
SECRET_KEY=carecontinuum-dev-secret-change-before-production
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=gemma:7b
OLLAMA_TIMEOUT_SECONDS=30
```

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

Use the returned token as:

```text
Authorization: Bearer <access_token>
```

The frontend stores this token as `access_token` and validates protected routes through:

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
GET    /protocols/
POST   /protocols/
GET    /protocols/{protocol_id}
POST   /protocols/search
GET    /events/
GET    /events/case/{case_id}
GET    /exports/downtime-report
GET    /exports/downtime-report/pdf
GET    /exports/triage-case/{case_id}
GET    /exports/triage-case/{case_id}/pdf
```

List endpoints support basic pagination with `skip` and `limit`. Several routes also support lightweight filters:

```text
GET /patients/?skip=0&limit=50&patient_code=P-1001
GET /triage/cases/?status=active&urgency_level=critical
GET /protocols/?category=emergency
GET /events/?event_type=PATIENT_CREATED
GET /users/?role=doctor
```

## Safety and Clinical Boundaries

CareContinuum intentionally frames AI responses as decision support:

- It does not diagnose.
- It does not replace clinicians.
- It uses local protocol context when available.
- It highlights uncertainty when patient data is missing.
- It returns safe fallback guidance if AI inference is unavailable.

## Current Engineering Status

CareContinuum is hackathon-demo ready. It includes authentication, protected frontend workflows, local AI integration, audit logging, exports, Dockerized backend infrastructure, and a focused pytest suite.

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
- Expand pytest coverage for invalid tokens, pagination, and report contents.
- Add request/response examples for every endpoint.
- Move JWT storage from `localStorage` to secure httpOnly cookies.
- Add route middleware for server-side frontend auth checks.
- Generate frontend TypeScript types from the backend OpenAPI schema.

## Project Positioning

CareContinuum demonstrates a full-stack approach to resilient healthcare workflows under downtime conditions. It combines a protected clinical operations UI, local-first backend infrastructure, structured workflow modeling, auditability, and protocol-grounded AI assistance in a way that is practical for a hackathon demo and extensible toward a production-grade system.
