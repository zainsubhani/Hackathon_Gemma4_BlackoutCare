from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.patients.models import Patient
from app.patients.schemas import PatientCreate


def get_patient_by_code(db: Session, patient_code: str):
    return db.query(Patient).filter(Patient.patient_code == patient_code).first()


def create_patient(db: Session, patient: PatientCreate):
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
        return db_patient

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Patient with code '{patient.patient_code}' already exists",
        )


def get_patients(db: Session):
    return db.query(Patient).all()


def get_patient(db: Session, patient_id: int):
    return db.query(Patient).filter(Patient.id == patient_id).first()