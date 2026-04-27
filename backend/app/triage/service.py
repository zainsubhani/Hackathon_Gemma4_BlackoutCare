import requests

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ai.crud import create_ai_recommendation
from app.ai.service import build_triage_prompt, call_gemma, parse_gemma_json
from app.events.crud import create_event
from app.patients.models import Patient
from app.protocols.crud import search_protocols
from app.triage.crud import get_triage_case


def analyze_triage_case(db: Session, case_id: int):
    db_case = get_triage_case(db, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    patient = db.query(Patient).filter(Patient.id == db_case.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    case_data = _build_case_data(patient, db_case)
    protocol_data = _get_protocol_context(db, db_case)
    prompt = build_triage_prompt(case_data, protocol_data)

    try:
        raw_response = call_gemma(prompt)
        parsed_response = parse_gemma_json(raw_response)
    except (requests.RequestException, ValueError, KeyError) as exc:
        create_event(
            db=db,
            event_type="AI_RECOMMENDATION_FAILED",
            actor_id=db_case.created_by,
            case_id=case_id,
            event_data={"reason": str(exc), "protocol_count": len(protocol_data)},
        )
        raise HTTPException(
            status_code=503,
            detail={
                "message": "AI recommendation service unavailable",
                "safe_fallback": [
                    "Continue downtime protocol workflow manually.",
                    "Escalate to the responsible clinician for urgent review.",
                    "Document missing data and uncertainty in the patient record.",
                ],
            },
        )

    saved_recommendation = create_ai_recommendation(
        db=db,
        case_id=case_id,
        recommendation=parsed_response,
    )
    create_event(
        db=db,
        event_type="AI_RECOMMENDATION_GENERATED",
        actor_id=db_case.created_by,
        case_id=case_id,
        event_data={
            "recommendation_id": saved_recommendation.id,
            "protocols_used": [p["title"] for p in protocol_data],
            "protocol_count": len(protocol_data),
            "matched_keywords": [
                keyword
                for protocol in protocol_data
                for keyword in protocol["matched_keywords"]
            ],
            "protocol_confidence": (
                protocol_data[0]["confidence_label"] if protocol_data else None
            ),
            "urgency": parsed_response.get("urgency"),
            "confidence": parsed_response.get("confidence"),
        },
    )

    return {
        "recommendation_id": saved_recommendation.id,
        "case_id": case_id,
        "ai_output": parsed_response,
    }


def _build_case_data(patient: Patient, db_case) -> dict:
    return {
        "age": patient.age,
        "gender": patient.gender,
        "allergy_status": patient.allergy_status,
        "known_conditions": patient.known_conditions,
        "current_medications": patient.current_medications,
        "chief_complaint": db_case.chief_complaint,
        "symptoms": db_case.symptoms,
        "vitals": db_case.vitals,
    }


def _get_protocol_context(db: Session, db_case) -> list[dict]:
    search_query = (
        f"{db_case.chief_complaint} {db_case.symptoms or ''} {db_case.vitals or ''}"
    )
    matched_protocols = search_protocols(db, search_query)

    protocol_data = []
    for item in matched_protocols[:3]:
        protocol = item["protocol"]
        matched_keywords = item.get("matched_keywords", [])
        protocol_data.append(
            {
                "title": protocol.title,
                "content": protocol.content,
                "matched_keywords": matched_keywords,
                "confidence_label": item.get("confidence_label"),
                "why_used": (
                    f"Matched keywords: {', '.join(matched_keywords)}"
                    if matched_keywords
                    else "Matched semantically"
                ),
            }
        )

    return protocol_data
