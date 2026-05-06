from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.patients.models import Patient
from app.incidents.models import DowntimeIncident
from app.users.models import User
from app.triage.models import ProtocolChecklistItem, TriageCase, VitalsEntry
from app.triage.schemas import (
    CaseStatus,
    ProtocolChecklistCreate,
    ProtocolChecklistUpdate,
    TriageCaseCreate,
    TriageCaseUpdate,
    VitalsEntryCreate,
)
from app.events.crud import create_event


def create_triage_case(db: Session, triage_case: TriageCaseCreate, created_by: int):
    patient = db.query(Patient).filter(Patient.id == triage_case.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = db.query(User).filter(User.id == created_by).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    active_incident = (
        db.query(DowntimeIncident)
        .filter(DowntimeIncident.status == "active")
        .order_by(DowntimeIncident.started_at.desc())
        .first()
    )

    db_case = TriageCase(
        incident_id=triage_case.incident_id or patient.incident_id or (active_incident.id if active_incident else None),
        patient_id=triage_case.patient_id,
        created_by=created_by,
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
        actor_id=created_by,
        case_id=db_case.id,
        event_data={
            "patient_id": triage_case.patient_id,
            "incident_id": db_case.incident_id,
            "chief_complaint": triage_case.chief_complaint,
            "symptoms": triage_case.symptoms,
            "vitals": triage_case.vitals,
            "urgency_level": triage_case.urgency_level.value,
            "status": triage_case.status.value,
        },
    )
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


def create_vitals_entry(db: Session, case_id: int, payload: VitalsEntryCreate, recorded_by: int):
    db_case = get_triage_case(db, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    entry = VitalsEntry(
        case_id=case_id,
        recorded_by=recorded_by,
        temperature_c=payload.temperature_c,
        heart_rate=payload.heart_rate,
        blood_pressure=payload.blood_pressure,
        respiratory_rate=payload.respiratory_rate,
        oxygen_saturation=payload.oxygen_saturation,
        pain_score=payload.pain_score,
        trend=payload.trend.value,
        notes=payload.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    create_event(
        db=db,
        event_type="VITALS_ENTRY_CREATED",
        actor_id=recorded_by,
        case_id=case_id,
        event_data={
            "trend": payload.trend.value,
            "heart_rate": payload.heart_rate,
            "blood_pressure": payload.blood_pressure,
            "oxygen_saturation": payload.oxygen_saturation,
        },
    )
    return entry


def get_vitals_entries(db: Session, case_id: int):
    if not get_triage_case(db, case_id):
        raise HTTPException(status_code=404, detail="Triage case not found")
    return (
        db.query(VitalsEntry)
        .filter(VitalsEntry.case_id == case_id)
        .order_by(VitalsEntry.created_at.asc())
        .all()
    )


def create_checklist_item(db: Session, case_id: int, payload: ProtocolChecklistCreate, created_by: int):
    if not get_triage_case(db, case_id):
        raise HTTPException(status_code=404, detail="Triage case not found")

    item = ProtocolChecklistItem(
        case_id=case_id,
        protocol_id=payload.protocol_id,
        label=payload.label,
        created_by=created_by,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    create_event(
        db=db,
        event_type="PROTOCOL_CHECKLIST_ITEM_CREATED",
        actor_id=created_by,
        case_id=case_id,
        event_data={"protocol_id": payload.protocol_id, "label": payload.label},
    )
    return item


def get_checklist_items(db: Session, case_id: int):
    if not get_triage_case(db, case_id):
        raise HTTPException(status_code=404, detail="Triage case not found")
    return (
        db.query(ProtocolChecklistItem)
        .filter(ProtocolChecklistItem.case_id == case_id)
        .order_by(ProtocolChecklistItem.created_at.asc())
        .all()
    )


def update_checklist_item(db: Session, item_id: int, payload: ProtocolChecklistUpdate, actor_id: int):
    item = db.query(ProtocolChecklistItem).filter(ProtocolChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(value, "value"):
            value = value.value
        setattr(item, field, value)
    item.updated_by = actor_id
    db.commit()
    db.refresh(item)
    create_event(
        db=db,
        event_type="PROTOCOL_CHECKLIST_ITEM_UPDATED",
        actor_id=actor_id,
        case_id=item.case_id,
        event_data={"item_id": item.id, **update_data},
    )
    return item
