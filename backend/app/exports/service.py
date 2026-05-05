import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.models import AIRecommendation
from app.events.models import Event
from app.patients.models import Patient
from app.triage.models import TriageCase
from app.users.models import User


def export_triage_case_report(db: Session, case_id: int) -> dict | None:
    triage_case = db.query(TriageCase).filter(TriageCase.id == case_id).first()
    if not triage_case:
        return None

    patient = db.query(Patient).filter(Patient.id == triage_case.patient_id).first()
    recommendations = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.case_id == case_id)
        .order_by(AIRecommendation.created_at.desc())
        .all()
    )
    events = (
        db.query(Event)
        .filter(Event.case_id == case_id)
        .order_by(Event.created_at.asc())
        .all()
    )

    return {
        "export_type": "triage_case_downtime_report",
        "case_id": case_id,
        "patient": _serialize_patient(patient),
        "triage_case": _serialize_triage_case(triage_case),
        "ai_recommendations": [_serialize_recommendation(rec) for rec in recommendations],
        "event_timeline": [_serialize_event(event) for event in events],
    }


def build_full_downtime_report(db: Session) -> dict:
    patients = db.query(Patient).all()
    triage_cases = db.query(TriageCase).order_by(TriageCase.created_at.asc()).all()
    recommendations = db.query(AIRecommendation).order_by(AIRecommendation.created_at.asc()).all()
    events = db.query(Event).order_by(Event.created_at.asc()).all()
    users_by_id = {user.id: user for user in db.query(User).all()}

    return {
        "export_type": "full_hospital_downtime_report",
        "generated_at": datetime.now(timezone.utc),
        "hospital_name": "BlackoutCare Demo Hospital",
        "summary": {
            "total_patients": len(patients),
            "total_triage_cases": len(triage_cases),
            "total_ai_recommendations": len(recommendations),
            "total_events": len(events),
            "critical_triage_cases": sum(
                1 for case in triage_cases if case.urgency_level == "critical"
            ),
        },
        "patients": [_serialize_patient(patient) for patient in patients],
        "triage_cases": [_serialize_triage_case(case) for case in triage_cases],
        "ai_recommendations": [
            _serialize_recommendation(rec, include_case_id=True)
            for rec in recommendations
        ],
        "event_timeline": [
            _serialize_event(event, actor=users_by_id.get(event.actor_id))
            for event in events
        ],
    }


def _serialize_patient(patient: Patient | None) -> dict:
    return {
        "id": patient.id if patient else None,
        "patient_code": patient.patient_code if patient else None,
        "full_name": patient.full_name if patient else None,
        "age": patient.age if patient else None,
        "gender": patient.gender if patient else None,
        "allergy_status": patient.allergy_status if patient else None,
        "known_conditions": patient.known_conditions if patient else None,
        "current_medications": patient.current_medications if patient else None,
        "created_at": patient.created_at if patient else None,
    }


def _serialize_triage_case(case: TriageCase) -> dict:
    return {
        "id": case.id,
        "patient_id": case.patient_id,
        "created_by": case.created_by,
        "chief_complaint": case.chief_complaint,
        "symptoms": case.symptoms,
        "vitals": case.vitals,
        "urgency_level": case.urgency_level,
        "status": case.status,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


def _serialize_recommendation(
    rec: AIRecommendation,
    include_case_id: bool = False,
) -> dict:
    data = {
        "id": rec.id,
        "urgency": rec.urgency,
        "risk_summary": rec.risk_summary,
        "recommended_actions": json.loads(rec.recommended_actions or "[]"),
        "warnings": json.loads(rec.warnings or "[]"),
        "confidence": rec.confidence,
        "source": rec.source,
        "created_at": rec.created_at,
    }
    if include_case_id:
        data["case_id"] = rec.case_id
    return data


def _serialize_event(event: Event, actor: User | None = None) -> dict:
    data = {
        "id": event.id,
        "case_id": event.case_id,
        "actor_id": event.actor_id,
        "event_type": event.event_type,
        "event_data": json.loads(event.event_data or "{}"),
        "created_at": event.created_at,
    }
    if actor is not None:
        data["actor"] = {
            "id": actor.id,
            "full_name": actor.full_name,
            "role": actor.role,
            "department": actor.department,
            "staff_code": actor.staff_code,
        }
    return data
