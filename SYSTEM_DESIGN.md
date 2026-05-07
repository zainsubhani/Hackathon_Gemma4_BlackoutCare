# BlackoutCare System Design

This document gives judges a fast technical map of how BlackoutCare works during a hospital downtime event.

## High-Level Architecture

```mermaid
flowchart TB
  subgraph Users["Hospital Downtime Team"]
    Clinician["Doctor / Nurse"]
    Coordinator["Coordinator / Admin"]
  end

  subgraph Web["Next.js Frontend"]
    Login["Login + Session Check"]
    Dashboard["Command Dashboard"]
    Triage["Triage Workspace"]
    Safety["Safety Board"]
    Operations["Operations Cockpit"]
    Recovery["Recovery Sync Center"]
    Staff["Staff Admin"]
  end

  subgraph API["FastAPI Backend"]
    Auth["Auth Router"]
    PatientAPI["Patient Router"]
    TriageAPI["Triage Router"]
    ProtocolAPI["Protocol Router"]
    AIRouter["AI Router"]
    OpsAPI["Operations Router"]
    RecoveryAPI["Recovery Router"]
    ExportAPI["Export Router"]
    EventAPI["Audit Event Router"]
  end

  subgraph Services["Backend Services"]
    TriageService["Triage Service"]
    AIService["Protocol-Grounded AI Service"]
    RecoveryService["Recovery Validation Service"]
    ExportService["Report + Bundle Service"]
    AuditService["Tamper-Evident Event Hashing"]
  end

  subgraph Data["Local Downtime Data Plane"]
    DB[("PostgreSQL")]
    Ollama["Ollama Gemma Model"]
    Artifacts["PDF, JSON, FHIR-like Exports"]
  end

  Clinician --> Login
  Coordinator --> Login
  Login --> Dashboard
  Dashboard --> Triage
  Dashboard --> Safety
  Dashboard --> Operations
  Dashboard --> Recovery
  Dashboard --> Staff

  Web -->|JWT cookie| API
  Auth --> DB
  PatientAPI --> DB
  TriageAPI --> TriageService
  ProtocolAPI --> DB
  AIRouter --> AIService
  OpsAPI --> DB
  RecoveryAPI --> RecoveryService
  ExportAPI --> ExportService
  EventAPI --> DB

  TriageService --> DB
  TriageService --> AuditService
  AIService --> ProtocolAPI
  AIService --> Ollama
  AIService --> DB
  AIService --> AuditService
  RecoveryService --> DB
  RecoveryService --> AuditService
  ExportService --> DB
  ExportService --> Artifacts
  ExportService --> AuditService
  AuditService --> DB
```

## Critical Design Choices

- Local-first operation: the application, database, and AI model can run on local hospital infrastructure through Docker Compose.
- Protected clinical workflows: dashboard routes call `/auth/me`; backend routes enforce JWT authentication and role-aware access where needed.
- Protocol-grounded AI: triage analysis includes local protocol matches so recommendations are tied to downtime policy context.
- Safe AI degradation: if Ollama is unavailable or returns invalid output, the backend returns fallback guidance instead of breaking the workflow.
- Auditability: important actions write audit events with previous/current hashes to help detect tampering.
- Recovery readiness: records carry sync status and can be exported as downtime reports or FHIR-like recovery bundles.

## Main Runtime Sequence

```mermaid
sequenceDiagram
  actor Staff as Clinical Staff
  participant UI as Next.js Console
  participant API as FastAPI Backend
  participant DB as PostgreSQL
  participant AI as Ollama/Gemma
  participant Audit as Audit Hash Chain

  Staff->>UI: Sign in with staff code
  UI->>API: POST /auth/login
  API->>DB: Validate user and password hash
  API-->>UI: httpOnly JWT cookie

  Staff->>UI: Create patient and triage case
  UI->>API: POST /patients and POST /triage/cases
  API->>DB: Store downtime records
  API->>Audit: Record patient/case events

  Staff->>UI: Request AI triage support
  UI->>API: POST /triage/cases/{id}/analyze
  API->>DB: Load case and matched protocols
  API->>AI: Local protocol-grounded prompt
  AI-->>API: Structured recommendation
  API->>DB: Store recommendation for clinician review
  API->>Audit: Record AI success or failure
  API-->>UI: Recommendation or safe fallback

  Staff->>UI: Review recovery readiness
  UI->>API: GET /recovery/incidents/{id}/sync-preview
  API->>DB: Validate pending records
  API-->>UI: Sync queue and conflict status

  Staff->>UI: Export downtime documentation
  UI->>API: GET /exports/downtime-report/pdf
  API->>DB: Read patients, cases, notes, events
  API->>Audit: Record export event
  API-->>UI: PDF / JSON / FHIR-like artifact
```

## Deployment View

```mermaid
flowchart LR
  Browser["Browser at nurse station"] --> Frontend["Next.js container :3000"]
  Frontend --> Backend["FastAPI container :8000"]
  Backend --> Postgres["PostgreSQL container :5432"]
  Backend --> Ollama["Ollama container :11434"]
  Backend --> ExportFiles["Generated response artifacts"]
```

Docker Compose exposes local host ports `3000`, `8000`, `5433`, and `11434` for the demo environment.
