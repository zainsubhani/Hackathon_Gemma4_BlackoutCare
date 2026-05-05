from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai.models import AIRecommendation
from app.core.auth import get_current_user
from app.core.database import get_db
from app.events.models import Event
from app.incidents.models import DowntimeIncident
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
