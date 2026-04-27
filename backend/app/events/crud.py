import json
from sqlalchemy.orm import Session

from app.events.models import Event


def create_event(
    db: Session,
    event_type: str,
    actor_id: int | None = None,
    case_id: int | None = None,
    event_data: dict | None = None,
):
    db_event = Event(
        event_type=event_type,
        actor_id=actor_id,
        case_id=case_id,
        event_data=json.dumps(event_data or {}),
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def get_events(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    event_type: str | None = None,
):
    query = db.query(Event)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    return query.order_by(Event.created_at.desc()).offset(skip).limit(limit).all()


def get_events_by_case(
    db: Session,
    case_id: int,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(Event)
        .filter(Event.case_id == case_id)
        .order_by(Event.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
