from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.patients.models import Patient
from app.users.models import User
from app.triage.models import TriageCase
from app.triage.schemas import TriageCaseCreate, CaseStatus, TriageCaseUpdate
from app.events.crud import create_event


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
    create_event(
    db=db,
    event_type="TRIAGE_CASE_CREATED",
    actor_id=triage_case.created_by,
    case_id=db_case.id,
    event_data={
        "patient_id": triage_case.patient_id,
        "chief_complaint": triage_case.chief_complaint,
        "symptoms": triage_case.symptoms,
        "vitals": triage_case.vitals,
        "urgency_level": triage_case.urgency_level.value,
        "status": triage_case.status.value,
    },)
    return db_case


def get_triage_cases(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    urgency_level: str | None = None,
    patient_id: int | None = None,
):
    query = db.query(TriageCase)
    if status:
        query = query.filter(TriageCase.status == status)
    if urgency_level:
        query = query.filter(TriageCase.urgency_level == urgency_level)
    if patient_id:
        query = query.filter(TriageCase.patient_id == patient_id)
    return query.order_by(TriageCase.created_at.desc()).offset(skip).limit(limit).all()


def get_triage_case(db: Session, case_id: int):
    return db.query(TriageCase).filter(TriageCase.id == case_id).first()


def update_triage_case_status(
    db: Session,
    case_id: int,
    status: CaseStatus,
    actor_id: int | None = None,
):
    db_case = get_triage_case(db, case_id)
    
    

    if not db_case:
        raise HTTPException(status_code=404, detail="Triage case not found")


    db_case.status = status.value
    db.commit()
    db.refresh(db_case)
    create_event(
    db=db,
    event_type="TRIAGE_STATUS_UPDATED",
    actor_id=actor_id,
    case_id=db_case.id,
    event_data={
        "new_status": status.value,
    },
)
    return db_case


def update_triage_case(
    db: Session,
    case_id: int,
    payload: TriageCaseUpdate,
    actor_id: int | None = None,
):
    db_case = get_triage_case(db, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(value, "value"):
            value = value.value
        setattr(db_case, field, value)

    db.commit()
    db.refresh(db_case)
    create_event(
        db=db,
        event_type="TRIAGE_CASE_UPDATED",
        actor_id=actor_id,
        case_id=db_case.id,
        event_data=update_data,
    )
    return db_case
