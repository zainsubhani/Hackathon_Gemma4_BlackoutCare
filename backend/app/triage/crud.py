from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.patients.models import Patient
from app.users.models import User
from app.triage.models import TriageCase
from app.triage.schemas import TriageCaseCreate, CaseStatus

from app.patients.models import Patient
from app.ai.service import build_triage_prompt, call_gemma, parse_gemma_json
from app.ai.crud import create_ai_recommendation


def create_triage_case(db: Session, triage_case: TriageCaseCreate):
    patient = db.query(Patient).filter(Patient.id == triage_case.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = db.query(User).filter(User.id == triage_case.created_by).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_case = TriageCase(
        patient_id=triage_case.patient_id,
        created_by=triage_case.created_by,
        chief_complaint=triage_case.chief_complaint,
        symptoms=triage_case.symptoms,
        vitals=triage_case.vitals,
        urgency_level=triage_case.urgency_level.value,
        status=triage_case.status.value,
    )

    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case


def get_triage_cases(db: Session):
    return db.query(TriageCase).all()


def get_triage_case(db: Session, case_id: int):
    return db.query(TriageCase).filter(TriageCase.id == case_id).first()


def update_triage_case_status(db: Session, case_id: int, status: CaseStatus):
    db_case = get_triage_case(db, case_id)
    
    

    if not db_case:
        raise HTTPException(status_code=404, detail="Triage case not found")


    db_case.status = status.value
    db.commit()
    db.refresh(db_case)
    return db_case



def analyze_triage_case(db: Session, case_id: int):
    db_case = get_triage_case(db, case_id)

    if not db_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    patient = db.query(Patient).filter(Patient.id == db_case.patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    case_data = {
        "age": patient.age,
        "gender": patient.gender,
        "allergy_status": patient.allergy_status,
        "known_conditions": patient.known_conditions,
        "current_medications": patient.current_medications,
        "chief_complaint": db_case.chief_complaint,
        "symptoms": db_case.symptoms,
        "vitals": db_case.vitals,
    }

    prompt = build_triage_prompt(case_data)
    raw_response = call_gemma(prompt)
    parsed_response = parse_gemma_json(raw_response)
    saved_recommendation = create_ai_recommendation(
    db=db,
    case_id=case_id,
    recommendation=parsed_response,
    )
    return {
    "recommendation_id": saved_recommendation.id,
    "case_id": case_id,
    "ai_output": parsed_response,
}