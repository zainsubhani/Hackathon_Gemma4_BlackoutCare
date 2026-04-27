import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.patients.models import Patient
from app.triage.models import TriageCase
from app.ai.model import AIRecommendation
from app.events.models import Event
from app.exports.pdf_generators import generate_downtime_pdf
from datetime import datetime

from app.users.models import User

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/triage-case/{case_id}")
def export_triage_case(case_id: int, db: Session = Depends(get_db)):
    triage_case = db.query(TriageCase).filter(TriageCase.id == case_id).first()

    if not triage_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

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
        "patient": {
            "id": patient.id if patient else None,
            "patient_code": patient.patient_code if patient else None,
            "full_name": patient.full_name if patient else None,
            "age": patient.age if patient else None,
            "gender": patient.gender if patient else None,
            "allergy_status": patient.allergy_status if patient else None,
            "known_conditions": patient.known_conditions if patient else None,
            "current_medications": patient.current_medications if patient else None,
        },
        "triage_case": {
            "id": triage_case.id,
            "chief_complaint": triage_case.chief_complaint,
            "symptoms": triage_case.symptoms,
            "vitals": triage_case.vitals,
            "urgency_level": triage_case.urgency_level,
            "status": triage_case.status,
            "created_by": triage_case.created_by,
            "created_at": triage_case.created_at,
            "updated_at": triage_case.updated_at,
        },
        "ai_recommendations": [
            {
                "id": rec.id,
                "urgency": rec.urgency,
                "risk_summary": rec.risk_summary,
                "recommended_actions": json.loads(rec.recommended_actions or "[]"),
                "warnings": json.loads(rec.warnings or "[]"),
                "confidence": rec.confidence,
                "source": rec.source,
                "created_at": rec.created_at,
            }
            for rec in recommendations
        ],
        "event_timeline": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "actor_id": event.actor_id,
                "event_data": json.loads(event.event_data or "{}"),
                "created_at": event.created_at,
            }
            for event in events
        ],
    }

@router.get("/downtime-report")
def export_full_downtime_report(db: Session = Depends(get_db)):
    
    return build_full_downtime_report(db)


@router.get("/downtime-report/pdf")
def export_full_downtime_report_pdf(db: Session = Depends(get_db)):
    report = build_full_downtime_report(db)
    pdf_buffer = generate_downtime_pdf(report)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename = f"carecontinuum-downtime-report_{timestamp}.pdf"

    
    

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


def build_full_downtime_report(db: Session):
    patients = db.query(Patient).all()
    triage_cases = db.query(TriageCase).order_by(TriageCase.created_at.asc()).all()
    recommendations = db.query(AIRecommendation).order_by(AIRecommendation.created_at.asc()).all()
    events = db.query(Event).order_by(Event.created_at.asc()).all()
    users = db.query(User).all()
    users_by_id = {user.id: user for user in users}

    return {
        "export_type": "full_hospital_downtime_report",
        "summary": {
            "total_patients": len(patients),
            "total_triage_cases": len(triage_cases),
            "total_ai_recommendations": len(recommendations),
            "total_events": len(events),
        },
        "patients": [
            {
                "id": patient.id,
                "patient_code": patient.patient_code,
                "full_name": patient.full_name,
                "age": patient.age,
                "gender": patient.gender,
                "allergy_status": patient.allergy_status,
                "known_conditions": patient.known_conditions,
                "current_medications": patient.current_medications,
                "created_at": patient.created_at,
            }
            for patient in patients
        ],
        "triage_cases": [
            {
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
            for case in triage_cases
        ],
        "ai_recommendations": [
            {
                "id": rec.id,
                "case_id": rec.case_id,
                "urgency": rec.urgency,
                "risk_summary": rec.risk_summary,
                "recommended_actions": json.loads(rec.recommended_actions or "[]"),
                "warnings": json.loads(rec.warnings or "[]"),
                "confidence": rec.confidence,
                "source": rec.source,
                "created_at": rec.created_at,
            }
            for rec in recommendations
        ],
        "event_timeline": [
    {
        "id": event.id,
        "case_id": event.case_id,
        "actor": {
            "id": event.actor_id,
            "full_name": users_by_id[event.actor_id].full_name if event.actor_id in users_by_id else None,
            "role": users_by_id[event.actor_id].role if event.actor_id in users_by_id else None,
            "department": users_by_id[event.actor_id].department if event.actor_id in users_by_id else None,
            "staff_code": users_by_id[event.actor_id].staff_code if event.actor_id in users_by_id else None,
        },
        "event_type": event.event_type,
        "event_data": json.loads(event.event_data or "{}"),
        "created_at": event.created_at,
    }
    for event in events
]
    }

@router.get("/triage-case/{case_id}/pdf")
def export_case_pdf(case_id: int, db: Session = Depends(get_db)):
    report = export_triage_case(case_id, db)
    pdf_buffer = generate_downtime_pdf(report)

    patient_code = report["patient"]["patient_code"] or "unknown"
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")

    filename = f"case-{case_id}_{patient_code}_{timestamp}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )
