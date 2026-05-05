import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ai.models import AIRecommendation
from app.events.crud import create_event
from app.incidents.models import DowntimeIncident
from app.notes.models import CaseNote
from app.patients.models import Patient
from app.recovery.schemas import RecoveryStatusUpdate
from app.triage.models import TriageCase


def build_sync_preview(db: Session, incident_id: int) -> dict:
    incident, patients, cases, notes, recommendations = _incident_records(db, incident_id)

    items = []
    items.extend(_patient_item(item) for item in patients)
    items.extend(_case_item(item) for item in cases)
    items.extend(_note_item(item) for item in notes)
    items.extend(_recommendation_item(item) for item in recommendations)

    counts = {
        "pending": 0,
        "reviewed": 0,
        "synced": 0,
        "failed": 0,
        "manual_entry_required": 0,
    }
    for item in items:
        counts[item["sync_status"]] = counts.get(item["sync_status"], 0) + 1

    return {
        "incident": {
            "id": incident.id,
            "name": incident.name,
            "status": incident.status,
            "hospital_unit": incident.hospital_unit,
        },
        "summary": {
            "total_items": len(items),
            **counts,
        },
        "items": items,
    }


def build_fhir_bundle(db: Session, incident_id: int) -> dict:
    incident, patients, cases, notes, recommendations = _incident_records(db, incident_id)
    generated_at = datetime.now(timezone.utc).isoformat()

    entries = [
        {
            "fullUrl": f"urn:blackoutcare:incident:{incident.id}",
            "resource": {
                "resourceType": "Encounter",
                "id": f"incident-{incident.id}",
                "status": "finished" if incident.status == "resolved" else "in-progress",
                "class": {"code": "EMER"},
                "period": {
                    "start": _iso(incident.started_at),
                    "end": _iso(incident.ended_at),
                },
                "serviceProvider": {"display": incident.hospital_unit or "BlackoutCare downtime unit"},
                "reasonCode": [{"text": incident.name}],
            },
        }
    ]

    entries.extend(_fhir_patient(patient) for patient in patients)
    entries.extend(_fhir_encounter(case) for case in cases)
    entries.extend(_fhir_note(note) for note in notes)
    entries.extend(_fhir_recommendation(rec) for rec in recommendations)

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": generated_at,
        "identifier": {"system": "urn:blackoutcare:recovery", "value": f"incident-{incident.id}"},
        "entry": entries,
    }


def update_sync_status(
    db: Session,
    payload: RecoveryStatusUpdate,
    actor_id: int,
):
    model = {
        "patient": Patient,
        "triage_case": TriageCase,
        "case_note": CaseNote,
        "ai_recommendation": AIRecommendation,
    }[payload.item_type.value]
    item = db.query(model).filter(model.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recovery item not found")

    item.sync_status = payload.sync_status.value
    item.sync_error = payload.sync_error
    db.commit()
    db.refresh(item)
    create_event(
        db=db,
        event_type="RECOVERY_SYNC_STATUS_UPDATED",
        actor_id=actor_id,
        case_id=item.case_id if hasattr(item, "case_id") else None,
        event_data={
            "item_type": payload.item_type.value,
            "item_id": payload.item_id,
            "sync_status": payload.sync_status.value,
            "sync_error": payload.sync_error,
        },
    )
    return {
        "item_type": payload.item_type.value,
        "item_id": payload.item_id,
        "sync_status": item.sync_status,
        "sync_error": item.sync_error,
    }


def _incident_records(db: Session, incident_id: int):
    incident = db.query(DowntimeIncident).filter(DowntimeIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    patients = db.query(Patient).filter(Patient.incident_id == incident_id).all()
    patient_ids = [patient.id for patient in patients]
    case_query = db.query(TriageCase).filter(TriageCase.incident_id == incident_id)
    if patient_ids:
        from sqlalchemy import or_

        case_query = db.query(TriageCase).filter(
            or_(TriageCase.incident_id == incident_id, TriageCase.patient_id.in_(patient_ids))
        )
    cases = case_query.order_by(TriageCase.created_at.asc()).all()
    case_ids = [case.id for case in cases]
    notes = (
        db.query(CaseNote)
        .filter(CaseNote.case_id.in_(case_ids) if case_ids else CaseNote.id == -1)
        .order_by(CaseNote.created_at.asc())
        .all()
    )
    recommendations = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.case_id.in_(case_ids) if case_ids else AIRecommendation.id == -1)
        .order_by(AIRecommendation.created_at.asc())
        .all()
    )
    return incident, patients, cases, notes, recommendations


def _patient_item(patient: Patient) -> dict:
    completeness = sum(
        1
        for value in [patient.patient_code, patient.full_name, patient.age, patient.gender, patient.allergy_status]
        if value not in {None, "", "unknown"}
    )
    return {
        "item_type": "patient",
        "item_id": patient.id,
        "label": patient.patient_code,
        "description": patient.full_name or "Unnamed patient",
        "sync_status": patient.sync_status,
        "sync_error": patient.sync_error,
        "readiness": "ready" if completeness >= 4 else "needs_review",
    }


def _case_item(case: TriageCase) -> dict:
    return {
        "item_type": "triage_case",
        "item_id": case.id,
        "label": f"Case {case.id}",
        "description": case.chief_complaint,
        "sync_status": case.sync_status,
        "sync_error": case.sync_error,
        "readiness": "ready" if case.status == "closed" else "needs_review",
    }


def _note_item(note: CaseNote) -> dict:
    return {
        "item_type": "case_note",
        "item_id": note.id,
        "label": f"{note.note_type} note",
        "description": note.content[:120],
        "sync_status": note.sync_status,
        "sync_error": note.sync_error,
        "readiness": "ready",
    }


def _recommendation_item(rec: AIRecommendation) -> dict:
    return {
        "item_type": "ai_recommendation",
        "item_id": rec.id,
        "label": f"AI recommendation {rec.id}",
        "description": rec.risk_summary[:120],
        "sync_status": rec.sync_status,
        "sync_error": rec.sync_error,
        "readiness": "ready" if rec.review_status in {"accepted", "rejected"} else "needs_review",
    }


def _fhir_patient(patient: Patient) -> dict:
    return {
        "fullUrl": f"urn:blackoutcare:patient:{patient.id}",
        "resource": {
            "resourceType": "Patient",
            "id": f"patient-{patient.id}",
            "identifier": [{"system": "urn:blackoutcare:patient-code", "value": patient.patient_code}],
            "name": [{"text": patient.full_name}] if patient.full_name else [],
            "gender": patient.gender if patient.gender != "unknown" else "unknown",
            "extension": [
                {"url": "urn:blackoutcare:allergy-status", "valueString": patient.allergy_status},
                {"url": "urn:blackoutcare:known-conditions", "valueString": patient.known_conditions or ""},
                {"url": "urn:blackoutcare:current-medications", "valueString": patient.current_medications or ""},
            ],
        },
    }


def _fhir_encounter(case: TriageCase) -> dict:
    return {
        "fullUrl": f"urn:blackoutcare:triage-case:{case.id}",
        "resource": {
            "resourceType": "Encounter",
            "id": f"triage-case-{case.id}",
            "status": "finished" if case.status == "closed" else "in-progress",
            "subject": {"reference": f"Patient/patient-{case.patient_id}"},
            "reasonCode": [{"text": case.chief_complaint}],
            "priority": {"text": case.urgency_level},
            "extension": [
                {"url": "urn:blackoutcare:symptoms", "valueString": case.symptoms or ""},
                {"url": "urn:blackoutcare:vitals", "valueString": case.vitals or ""},
            ],
        },
    }


def _fhir_note(note: CaseNote) -> dict:
    return {
        "fullUrl": f"urn:blackoutcare:case-note:{note.id}",
        "resource": {
            "resourceType": "DocumentReference",
            "id": f"case-note-{note.id}",
            "status": "current",
            "type": {"text": note.note_type},
            "context": {"encounter": [{"reference": f"Encounter/triage-case-{note.case_id}"}]},
            "date": _iso(note.created_at),
            "content": [{"attachment": {"contentType": "text/plain", "data": note.content}}],
        },
    }


def _fhir_recommendation(rec: AIRecommendation) -> dict:
    return {
        "fullUrl": f"urn:blackoutcare:ai-recommendation:{rec.id}",
        "resource": {
            "resourceType": "ClinicalImpression",
            "id": f"ai-recommendation-{rec.id}",
            "status": "completed" if rec.review_status != "pending" else "in-progress",
            "encounter": {"reference": f"Encounter/triage-case-{rec.case_id}"},
            "summary": rec.risk_summary,
            "finding": [{"itemCodeableConcept": {"text": action}} for action in json.loads(rec.recommended_actions or "[]")],
            "extension": [
                {"url": "urn:blackoutcare:urgency", "valueString": rec.urgency},
                {"url": "urn:blackoutcare:confidence", "valueString": rec.confidence},
                {"url": "urn:blackoutcare:review-status", "valueString": rec.review_status},
                {"url": "urn:blackoutcare:review-note", "valueString": rec.review_note or ""},
            ],
        },
    }


def _iso(value) -> str | None:
    return value.isoformat() if value else None
