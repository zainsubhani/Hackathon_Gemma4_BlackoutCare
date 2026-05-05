from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.events.crud import create_event
from app.incidents.models import DowntimeIncident
from app.incidents.schemas import IncidentCreate, IncidentUpdate


def create_incident(db: Session, payload: IncidentCreate, actor_id: int):
    incident = DowntimeIncident(
        name=payload.name,
        hospital_unit=payload.hospital_unit,
        commander_id=actor_id,
        summary=payload.summary,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    create_event(
        db=db,
        event_type="INCIDENT_CREATED",
        actor_id=actor_id,
        event_data={"incident_id": incident.id, "name": incident.name},
    )
    return incident


def get_incidents(db: Session, status: str | None = None):
    query = db.query(DowntimeIncident)
    if status:
        query = query.filter(DowntimeIncident.status == status)
    return query.order_by(DowntimeIncident.started_at.desc()).all()


def get_incident(db: Session, incident_id: int):
    return db.query(DowntimeIncident).filter(DowntimeIncident.id == incident_id).first()


def get_active_incident(db: Session):
    return (
        db.query(DowntimeIncident)
        .filter(DowntimeIncident.status == "active")
        .order_by(DowntimeIncident.started_at.desc())
        .first()
    )


def update_incident(db: Session, incident_id: int, payload: IncidentUpdate, actor_id: int):
    incident = get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and hasattr(update_data["status"], "value"):
        update_data["status"] = update_data["status"].value

    if update_data.get("status") == "resolved" and incident.ended_at is None:
        incident.ended_at = datetime.now(timezone.utc)
    if update_data.get("status") == "active":
        incident.ended_at = None

    for field, value in update_data.items():
        setattr(incident, field, value)

    db.commit()
    db.refresh(incident)
    create_event(
        db=db,
        event_type="INCIDENT_UPDATED",
        actor_id=actor_id,
        event_data={"incident_id": incident.id, "status": incident.status},
    )
    return incident
