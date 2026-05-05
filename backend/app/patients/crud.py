from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.patients.models import Patient
from app.patients.schemas import PatientCreate, PatientUpdate
from app.events.crud import create_event
from app.incidents.models import DowntimeIncident


def get_patient_by_code(db: Session, patient_code: str):
    return db.query(Patient).filter(Patient.patient_code == patient_code).first()


def create_patient(db: Session, patient: PatientCreate, actor_id: int | None = None):
    existing_patient = get_patient_by_code(db, patient.patient_code)

    if existing_patient:
        raise HTTPException(
            status_code=409,
            detail=f"Patient with code '{patient.patient_code}' already exists",
        )

    active_incident = (
        db.query(DowntimeIncident)
        .filter(DowntimeIncident.status == "active")
        .order_by(DowntimeIncident.started_at.desc())
        .first()
    )

    db_patient = Patient(
        incident_id=patient.incident_id or (active_incident.id if active_incident else None),
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
                "incident_id": db_patient.incident_id,
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


def update_patient(
    db: Session,
    patient_id: int,
    payload: PatientUpdate,
    actor_id: int | None = None,
):
    db_patient = get_patient(db, patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = payload.model_dump(exclude_unset=True)
    if (
        "patient_code" in update_data
        and update_data["patient_code"] != db_patient.patient_code
        and get_patient_by_code(db, update_data["patient_code"])
    ):
        raise HTTPException(
            status_code=409,
            detail=f"Patient with code '{update_data['patient_code']}' already exists",
        )

    for field, value in update_data.items():
        if hasattr(value, "value"):
            value = value.value
        setattr(db_patient, field, value)

    db.commit()
    db.refresh(db_patient)
    create_event(
        db=db,
        event_type="PATIENT_UPDATED",
        actor_id=actor_id,
        event_data={
            "patient_id": db_patient.id,
            "patient_code": db_patient.patient_code,
        },
    )
    return db_patient
