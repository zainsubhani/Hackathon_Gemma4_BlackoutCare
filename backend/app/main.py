import logging
from contextlib import asynccontextmanager

import requests
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import Base, engine
from app.ai import models as ai_models  # noqa: F401
from app.ai.router import router as ai_router
from app.events import models as events_models  # noqa: F401
from app.events.router import router as events_router
from app.exports.router import router as exports_router
from app.incidents import models as incidents_models  # noqa: F401
from app.incidents.router import router as incidents_router
from app.notes import models as notes_models  # noqa: F401
from app.notes.router import router as notes_router
from app.operations.router import router as operations_router
from app.patients.router import router as patients_router
from app.recovery.router import router as recovery_router
from app.protocols import models as protocols_models  # noqa: F401
from app.protocols.router import router as protocols_router
from app.triage import models as triage_models  # noqa: F401
from app.triage.router import router as triage_router
from app.users import models as users_models  # noqa: F401
from app.users.router import router as users_router
from app.auth.router import router as auth_router
from app.dashboard.router import router as dashboard_router
from fastapi.middleware.cors import CORSMiddleware


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        ensure_development_schema()
    except SQLAlchemyError:
        logger.exception("Database table creation failed during startup")
        raise

    yield


def ensure_development_schema():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.execute(
            text("ALTER TABLE protocols ADD COLUMN IF NOT EXISTS embedding vector")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active VARCHAR DEFAULT 'true' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password VARCHAR DEFAULT 'false' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE events ADD COLUMN IF NOT EXISTS previous_hash VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_hash VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS incident_id INTEGER REFERENCES downtime_incidents(id)")
        )
        connection.execute(
            text("ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS incident_id INTEGER REFERENCES downtime_incidents(id)")
        )
        connection.execute(
            text("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS review_status VARCHAR DEFAULT 'pending' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id)")
        )
        connection.execute(
            text("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE")
        )
        connection.execute(
            text("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS review_note TEXT")
        )
        connection.execute(
            text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'pending' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS sync_error VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'pending' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS sync_error TEXT")
        )
        connection.execute(
            text("ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'pending' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS sync_error TEXT")
        )
        connection.execute(
            text("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'pending' NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS sync_error TEXT")
        )


app = FastAPI(
    title="BlackoutCare API",
    description="Offline AI downtime OS for hospital clinical workflows",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(patients_router)
app.include_router(triage_router)
app.include_router(events_router)
app.include_router(protocols_router)
app.include_router(exports_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(incidents_router)
app.include_router(notes_router)
app.include_router(ai_router)
app.include_router(operations_router)
app.include_router(recovery_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "blackoutcare-backend",
        "mode": "downtime-ready",
    }


@app.get("/status")
def status_check():
    ollama_status = _ollama_status()
    return {
        "api": "ok",
        "database": _database_status(),
        "ollama": ollama_status,
        "ollama_model": settings.OLLAMA_MODEL,
        "mode": "downtime-ready",
    }


def _database_status() -> str:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok"
    except SQLAlchemyError:
        logger.exception("Database status check failed")
        return "unavailable"


def _ollama_status() -> str:
    try:
        tags_url = settings.OLLAMA_URL.replace("/api/generate", "/api/tags")
        response = requests.get(tags_url, timeout=2)
        response.raise_for_status()
        models = response.json().get("models", [])
        model_names = {model.get("name") for model in models}
        if settings.OLLAMA_MODEL not in model_names:
            return "model_missing"
        return "ok"
    except (ValueError, requests.RequestException):
        logger.info("Ollama status check failed")
        return "unavailable"
