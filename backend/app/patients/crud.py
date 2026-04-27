from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.patients.models import Patient
from app.patients.schemas import PatientCreate
from app.events.crud import create_event


def get_patient_by_code(db: Session, patient_code: str):
    return db.query(Patient).filter(Patient.patient_code == patient_code).first()


def create_patient(db: Session, patient: PatientCreate, actor_id: int | None = None):
    existing_patient = get_patient_by_code(db, patient.patient_code)

    if existing_patient:
        raise HTTPException(
            status_code=409,
            detail=f"Patient with code '{patient.patient_code}' already exists",
        )

    db_patient = Patient(
        patient_code=patient.patient_code,
        full_name=patient.full_name,
        age=patient.age,
        gender=patient.gender.value,
        allergy_status=patient.allergy_status.value,
        known_conditions=patient.known_conditions,
        current_medications=patient.current_medications,
    )

    try:
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        create_event(
            db=db,
            event_type="PATIENT_CREATED",
            actor_id=actor_id,
            event_data={
                "patient_id": db_patient.id,
                "patient_code": db_patient.patient_code,
            },
        )
        return db_patient

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Patient with code '{patient.patient_code}' already exists",
        )


def get_patients(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    patient_code: str | None = None,
):
    query = db.query(Patient)
    if patient_code:
        query = query.filter(Patient.patient_code.ilike(f"%{patient_code.upper()}%"))
    return query.offset(skip).limit(limit).all()


def get_patient(db: Session, patient_id: int):
    return db.query(Patient).filter(Patient.id == patient_id).first()
