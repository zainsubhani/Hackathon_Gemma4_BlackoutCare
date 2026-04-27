# CareContinuum Backend

CareContinuum is a FastAPI backend for an offline hospital downtime copilot. It is designed for scenarios where clinical teams lose access to normal hospital systems during outages, cyberattacks, or degraded network conditions.

The backend provides structured downtime workflows for users, patients, triage cases, clinical protocols, AI-assisted recommendations, audit events, and recovery exports.

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

The backend follows a feature-oriented FastAPI structure:

```text
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

## Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/carecontinuum
APP_ENV=development
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=gemma:7b
OLLAMA_TIMEOUT_SECONDS=30
```

## Local Setup

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

## Docker Setup

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on host port `5433`
- Ollama on host port `11434`
- Backend on host port `8000`
- A helper service that pulls the configured Gemma model

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

## Important Endpoints

```text
GET    /health
POST   /auth/login
POST   /users/
GET    /patients/
POST   /patients/
POST   /triage/cases/
POST   /triage/cases/{case_id}/analyze
PATCH  /triage/cases/{case_id}/status
POST   /protocols/
POST   /protocols/search
GET    /events/
GET    /exports/downtime-report
GET    /exports/downtime-report/pdf
GET    /exports/triage-case/{case_id}/pdf
```

## Safety and Clinical Boundaries

CareContinuum intentionally frames AI responses as decision support:

- It does not diagnose.
- It does not replace clinicians.
- It uses local protocol context when available.
- It highlights uncertainty when patient data is missing.
- It returns safe fallback guidance if AI inference is unavailable.

## Current Engineering Status

The backend is hackathon-demo ready. It includes authentication, local AI integration, audit logging, exports, and Dockerized infrastructure.

Recommended next engineering improvements:

- Replace `Base.metadata.create_all()` and startup schema patching with Alembic migrations.
- Add pytest coverage for users, patients, protocols, triage, AI fallback, and exports.
- Add pagination and filtering for list endpoints.
- Move more triage orchestration from `crud.py` into a dedicated `service.py`.
- Move `SECRET_KEY` into environment configuration.
- Add request/response examples for every endpoint.

## Project Positioning

CareContinuum demonstrates backend design for resilient healthcare workflows under downtime conditions. It combines local-first infrastructure, structured clinical workflow modeling, auditability, and protocol-grounded AI assistance in a way that is practical for a hackathon demo and extensible toward a production-grade system.
