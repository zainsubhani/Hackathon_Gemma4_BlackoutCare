from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai.models import AIRecommendation
from app.core.auth import get_current_user
from app.core.database import get_db
from app.events.models import Event
from app.incidents.models import DowntimeIncident
from app.notes.models import CaseNote
from app.patients.models import Patient
from app.protocols.models import Protocol
from app.triage.models import TriageCase
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
