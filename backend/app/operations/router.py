import json
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.ai.models import AIRecommendation
from app.core.auth import get_current_user, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.events.models import Event
from app.incidents.models import DowntimeIncident
from app.notes.models import CaseNote
from app.patients.models import Patient
from app.protocols.models import Protocol
from app.triage.models import ProtocolChecklistItem, TriageCase, VitalsEntry
from app.users.models import User

router = APIRouter(prefix="/operations", tags=["operations"])


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = f"%{q.strip()}%"
    patients = (
        db.query(Patient)
        .filter(or_(Patient.patient_code.ilike(query), Patient.full_name.ilike(query)))
        .limit(8)
        .all()
    )
    cases = (
        db.query(TriageCase)
        .filter(or_(TriageCase.chief_complaint.ilike(query), TriageCase.symptoms.ilike(query), TriageCase.vitals.ilike(query)))
        .limit(8)
        .all()
    )
    protocols = (
        db.query(Protocol)
        .filter(or_(Protocol.title.ilike(query), Protocol.category.ilike(query), Protocol.trigger_keywords.ilike(query), Protocol.content.ilike(query)))
        .limit(8)
        .all()
    )
    incidents = (
        db.query(DowntimeIncident)
        .filter(or_(DowntimeIncident.name.ilike(query), DowntimeIncident.hospital_unit.ilike(query), DowntimeIncident.summary.ilike(query)))
        .limit(8)
        .all()
    )

    return {
        "patients": [
            {"id": item.id, "label": item.patient_code, "description": item.full_name, "href": "/patients"}
            for item in patients
        ],
        "triage_cases": [
            {"id": item.id, "label": f"Case {item.id}", "description": item.chief_complaint, "href": "/triage"}
            for item in cases
        ],
        "protocols": [
            {"id": item.id, "label": item.title, "description": item.category, "href": "/protocols"}
            for item in protocols
        ],
        "incidents": [
            {"id": item.id, "label": item.name, "description": item.status, "href": "/dashboard"}
            for item in incidents
        ],
    }


@router.get("/alerts")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    critical_cases = (
        db.query(TriageCase)
        .filter(TriageCase.urgency_level == "critical", TriageCase.status != "closed")
        .order_by(TriageCase.created_at.desc())
        .limit(10)
        .all()
    )
    escalated_cases = (
        db.query(TriageCase)
        .filter(TriageCase.status == "escalated")
        .order_by(TriageCase.created_at.desc())
        .limit(10)
        .all()
    )
    pending_reviews = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.review_status == "pending")
        .order_by(AIRecommendation.created_at.desc())
        .limit(10)
        .all()
    )
    failed_events = (
        db.query(Event)
        .filter(Event.event_type.ilike("%FAILED%"))
        .order_by(Event.created_at.desc())
        .limit(10)
        .all()
    )

    alerts = []
    alerts.extend(
        {
            "type": "critical_case",
            "severity": "critical",
            "title": f"Critical case #{case.id}",
            "description": case.chief_complaint,
            "href": "/triage",
            "created_at": case.created_at,
        }
        for case in critical_cases
    )
    alerts.extend(
        {
            "type": "escalated_case",
            "severity": "warning",
            "title": f"Escalated case #{case.id}",
            "description": case.chief_complaint,
            "href": "/triage",
            "created_at": case.created_at,
        }
        for case in escalated_cases
    )
    alerts.extend(
        {
            "type": "ai_review",
            "severity": "info",
            "title": f"AI review pending #{rec.id}",
            "description": f"Case {rec.case_id}",
            "href": "/triage",
            "created_at": rec.created_at,
        }
        for rec in pending_reviews
    )
    alerts.extend(
        {
            "type": "failed_event",
            "severity": "warning",
            "title": event.event_type,
            "description": f"Event {event.id}",
            "href": "/audit",
            "created_at": event.created_at,
        }
        for event in failed_events
    )

    alerts.sort(key=lambda item: item["created_at"], reverse=True)
    return alerts[:20]


@router.get("/readiness")
def readiness_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    protocol_count = db.query(Protocol).count()
    active_users = db.query(User).filter(User.is_active == "true").count()
    open_cases = db.query(TriageCase).filter(TriageCase.status != "closed").count()
    pending_reviews = db.query(AIRecommendation).filter(AIRecommendation.review_status == "pending").count()
    database_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        database_status = "unavailable"

    checks = [
        {
            "key": "database",
            "label": "Local database",
            "status": database_status,
            "detail": "Downtime records can be written locally" if database_status == "ok" else "Database is unavailable",
        },
        {
            "key": "protocols",
            "label": "Protocol library",
            "status": "ok" if protocol_count > 0 else "warning",
            "detail": f"{protocol_count} protocols loaded",
        },
        {
            "key": "staff",
            "label": "Staff access",
            "status": "ok" if active_users > 0 else "warning",
            "detail": f"{active_users} active users",
        },
        {
            "key": "ai",
            "label": "Local AI endpoint",
            "status": _ollama_readiness(),
            "detail": settings.OLLAMA_MODEL,
        },
        {
            "key": "exports",
            "label": "Recovery exports",
            "status": "ok",
            "detail": "JSON, PDF, and FHIR recovery outputs available",
        },
    ]

    return {
        "mode": "downtime-ready",
        "open_cases": open_cases,
        "pending_ai_reviews": pending_reviews,
        "checks": checks,
    }


@router.get("/handoff")
def shift_handoff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_cases = (
        db.query(TriageCase)
        .filter(TriageCase.status != "closed")
        .order_by(TriageCase.urgency_level.asc(), TriageCase.updated_at.desc())
        .limit(50)
        .all()
    )
    case_ids = [case.id for case in active_cases]
    patient_ids = [case.patient_id for case in active_cases]
    patients = {
        patient.id: patient
        for patient in db.query(Patient).filter(Patient.id.in_(patient_ids) if patient_ids else Patient.id == -1).all()
    }
    latest_notes = _latest_by_case(db.query(CaseNote).filter(CaseNote.case_id.in_(case_ids) if case_ids else CaseNote.id == -1).order_by(CaseNote.created_at.desc()).all())
    latest_vitals = _latest_by_case(db.query(VitalsEntry).filter(VitalsEntry.case_id.in_(case_ids) if case_ids else VitalsEntry.id == -1).order_by(VitalsEntry.created_at.desc()).all())
    checklist_items = db.query(ProtocolChecklistItem).filter(ProtocolChecklistItem.case_id.in_(case_ids) if case_ids else ProtocolChecklistItem.id == -1).all()
    checklist_by_case: dict[int, list[ProtocolChecklistItem]] = {}
    for item in checklist_items:
        checklist_by_case.setdefault(item.case_id, []).append(item)

    cases = []
    for case in active_cases:
        patient = patients.get(case.patient_id)
        open_actions = [item for item in checklist_by_case.get(case.id, []) if item.status == "pending"]
        cases.append(
            {
                **_case_summary(case, patient),
                "last_note": latest_notes.get(case.id).content if latest_notes.get(case.id) else None,
                "last_note_at": latest_notes.get(case.id).created_at if latest_notes.get(case.id) else None,
                "last_vitals": _vitals_summary(latest_vitals.get(case.id)),
                "open_protocol_actions": len(open_actions),
                "handoff_priority": _handoff_priority(case, open_actions, latest_vitals.get(case.id)),
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc),
        "summary": {
            "active_cases": len(active_cases),
            "critical": sum(1 for case in active_cases if case.urgency_level == "critical"),
            "escalated": sum(1 for case in active_cases if case.status == "escalated"),
            "open_protocol_actions": sum(item["open_protocol_actions"] for item in cases),
        },
        "cases": sorted(cases, key=lambda item: item["handoff_priority"], reverse=True),
    }


@router.get("/timeline")
def incident_timeline(
    incident_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    if incident_id is None:
        incident = (
            db.query(DowntimeIncident)
            .filter(DowntimeIncident.status == "active")
            .order_by(DowntimeIncident.started_at.desc())
            .first()
        )
        incident_id = incident.id if incident else None

    case_ids: set[int] = set()
    patient_ids: set[int] = set()
    if incident_id is not None:
        patient_ids = {patient.id for patient in db.query(Patient).filter(Patient.incident_id == incident_id).all()}
        case_query = db.query(TriageCase).filter(TriageCase.incident_id == incident_id)
        if patient_ids:
            case_query = db.query(TriageCase).filter(or_(TriageCase.incident_id == incident_id, TriageCase.patient_id.in_(patient_ids)))
        case_ids = {case.id for case in case_query.all()}

    query = db.query(Event)
    if incident_id is not None:
        query = query.filter(or_(Event.case_id.in_(case_ids) if case_ids else Event.case_id == -1, Event.event_data.ilike(f'%"incident_id": {incident_id}%')))

    events = query.order_by(Event.created_at.desc()).limit(limit).all()
    return [
        {
            "id": event.id,
            "event_type": event.event_type,
            "case_id": event.case_id,
            "actor_id": event.actor_id,
            "description": _event_description(event),
            "created_at": event.created_at,
        }
        for event in events
    ]


@router.get("/recovery-conflicts")
def recovery_conflicts(
    incident_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    patient_query = db.query(Patient)
    case_query = db.query(TriageCase)
    patient_query = patient_query.filter(Patient.incident_id == incident_id)
    case_query = case_query.filter(TriageCase.incident_id == incident_id)

    patients = patient_query.all()
    cases = case_query.all()
    case_ids = [case.id for case in cases]
    recommendations = db.query(AIRecommendation).filter(AIRecommendation.case_id.in_(case_ids) if case_ids else AIRecommendation.id == -1).all()

    conflicts = []
    conflicts.extend(
        {
            "type": "patient_identity",
            "severity": "warning",
            "label": patient.patient_code,
            "description": "Patient is missing name or age for recovery reconciliation",
            "href": "/patients",
        }
        for patient in patients
        if not patient.full_name or patient.age is None
    )
    conflicts.extend(
        {
            "type": "unknown_allergy",
            "severity": "critical",
            "label": patient.patient_code,
            "description": "Allergy status is unknown",
            "href": "/patients",
        }
        for patient in patients
        if patient.allergy_status == "unknown"
    )
    conflicts.extend(
        {
            "type": "open_case",
            "severity": "warning",
            "label": f"Case {case.id}",
            "description": f"{case.status} case should be reviewed before final sync",
            "href": "/triage",
        }
        for case in cases
        if case.status != "closed"
    )
    conflicts.extend(
        {
            "type": "ai_review",
            "severity": "warning",
            "label": f"AI recommendation {rec.id}",
            "description": "AI recommendation is pending clinician review",
            "href": "/triage",
        }
        for rec in recommendations
        if rec.review_status == "pending"
    )
    return {"incident_id": incident_id, "total": len(conflicts), "items": conflicts[:100]}


@router.get("/ai-oversight")
def ai_oversight(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    recommendations = db.query(AIRecommendation).order_by(AIRecommendation.created_at.desc()).limit(200).all()
    counts = {"pending": 0, "accepted": 0, "rejected": 0, "needs_review": 0}
    confidence = {"low": 0, "medium": 0, "high": 0}
    for rec in recommendations:
        counts[rec.review_status] = counts.get(rec.review_status, 0) + 1
        confidence[rec.confidence] = confidence.get(rec.confidence, 0) + 1
    return {
        "summary": counts,
        "confidence": confidence,
        "recent": [
            {
                "id": rec.id,
                "case_id": rec.case_id,
                "urgency": rec.urgency,
                "confidence": rec.confidence,
                "review_status": rec.review_status,
                "risk_summary": rec.risk_summary,
                "created_at": rec.created_at,
            }
            for rec in recommendations[:20]
        ],
    }


@router.get("/safety-board")
def safety_board(
    stale_minutes: int = Query(default=30, ge=5, le=240),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    open_cases = (
        db.query(TriageCase)
        .filter(TriageCase.status != "closed")
        .order_by(TriageCase.created_at.desc())
        .all()
    )
    patient_ids = {case.patient_id for case in open_cases}
    patients_by_id = {
        patient.id: patient
        for patient in db.query(Patient).filter(Patient.id.in_(patient_ids) if patient_ids else Patient.id == -1).all()
    }
    latest_notes = {}
    if open_cases:
        case_ids = [case.id for case in open_cases]
        for note in (
            db.query(CaseNote)
            .filter(CaseNote.case_id.in_(case_ids))
            .order_by(CaseNote.created_at.desc())
            .all()
        ):
            latest_notes.setdefault(note.case_id, note)

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    critical_cases = []
    unknown_allergies = []
    stale_note_cases = []
    unassigned_cases = []

    for case in open_cases:
        patient = patients_by_id.get(case.patient_id)
        item = _case_summary(case, patient)
        if case.urgency_level == "critical":
            critical_cases.append(item)
        if patient and patient.allergy_status == "unknown":
            unknown_allergies.append(item)
        if case.urgency_level == "unassigned":
            unassigned_cases.append(item)
        latest_note = latest_notes.get(case.id)
        latest_at = latest_note.created_at if latest_note else None
        if latest_at is None or latest_at < cutoff:
            stale_note_cases.append({**item, "last_note_at": latest_at})

    pending_ai_reviews = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.review_status == "pending")
        .order_by(AIRecommendation.created_at.desc())
        .limit(20)
        .all()
    )
    recovery_pending = (
        db.query(TriageCase)
        .filter(TriageCase.sync_status.in_(["pending", "failed", "manual_entry_required"]))
        .count()
        + db.query(Patient)
        .filter(Patient.sync_status.in_(["pending", "failed", "manual_entry_required"]))
        .count()
    )

    return {
        "summary": {
            "open_cases": len(open_cases),
            "critical_cases": len(critical_cases),
            "unknown_allergies": len(unknown_allergies),
            "stale_note_cases": len(stale_note_cases),
            "pending_ai_reviews": len(pending_ai_reviews),
            "recovery_pending": recovery_pending,
        },
        "critical_cases": critical_cases[:20],
        "unknown_allergies": unknown_allergies[:20],
        "stale_note_cases": stale_note_cases[:20],
        "unassigned_cases": unassigned_cases[:20],
        "pending_ai_reviews": [
            {
                "id": rec.id,
                "case_id": rec.case_id,
                "risk_summary": rec.risk_summary,
                "confidence": rec.confidence,
                "created_at": rec.created_at,
            }
            for rec in pending_ai_reviews
        ],
    }


def _case_summary(case: TriageCase, patient: Patient | None) -> dict:
    return {
        "id": case.id,
        "patient_id": case.patient_id,
        "patient_label": patient.patient_code if patient else f"Patient {case.patient_id}",
        "patient_name": patient.full_name if patient else None,
        "chief_complaint": case.chief_complaint,
        "urgency_level": case.urgency_level,
        "status": case.status,
        "created_at": case.created_at,
    }


def _ollama_readiness() -> str:
    try:
        tags_url = settings.OLLAMA_URL.replace("/api/generate", "/api/tags")
        response = requests.get(tags_url, timeout=2)
        response.raise_for_status()
        model_names = {model.get("name") for model in response.json().get("models", [])}
        return "ok" if settings.OLLAMA_MODEL in model_names else "warning"
    except (ValueError, requests.RequestException):
        return "warning"


def _latest_by_case(items) -> dict:
    latest = {}
    for item in items:
        latest.setdefault(item.case_id, item)
    return latest


def _vitals_summary(entry: VitalsEntry | None) -> dict | None:
    if not entry:
        return None
    values = [
        f"BP {entry.blood_pressure}" if entry.blood_pressure else None,
        f"HR {entry.heart_rate}" if entry.heart_rate else None,
        f"SpO2 {entry.oxygen_saturation}" if entry.oxygen_saturation else None,
        f"RR {entry.respiratory_rate}" if entry.respiratory_rate else None,
        f"Temp {entry.temperature_c}C" if entry.temperature_c else None,
    ]
    return {
        "summary": ", ".join(value for value in values if value) or entry.notes or "Vitals recorded",
        "trend": entry.trend,
        "created_at": entry.created_at,
    }


def _handoff_priority(case: TriageCase, open_actions: list[ProtocolChecklistItem], latest_vitals: VitalsEntry | None) -> int:
    score = 0
    score += {"critical": 40, "urgent": 25, "stable": 10, "unassigned": 15}.get(case.urgency_level, 0)
    score += {"escalated": 20, "active": 10, "monitoring": 5}.get(case.status, 0)
    score += min(len(open_actions) * 4, 20)
    if latest_vitals and latest_vitals.trend == "worsening":
        score += 25
    if not latest_vitals:
        score += 8
    return score


def _event_description(event: Event) -> str:
    try:
        data = json.loads(event.event_data or "{}")
    except json.JSONDecodeError:
        data = {}

    if event.event_type == "TRIAGE_CASE_CREATED":
        return f"Created triage case for patient {data.get('patient_id', 'unknown')}"
    if event.event_type == "TRIAGE_STATUS_UPDATED":
        return f"Updated case status to {data.get('new_status', 'unknown')}"
    if event.event_type == "VITALS_ENTRY_CREATED":
        return f"Recorded vitals with {data.get('trend', 'unknown')} trend"
    if event.event_type == "PROTOCOL_CHECKLIST_ITEM_UPDATED":
        return f"Updated protocol action {data.get('item_id', '')}"
    if event.event_type == "AI_RECOMMENDATION_CREATED":
        return "Generated AI recommendation"
    if event.event_type == "RECOVERY_SYNC_STATUS_UPDATED":
        return f"Marked {data.get('item_type', 'item')} as {data.get('sync_status', 'updated')}"
    return event.event_type.replace("_", " ").title()
