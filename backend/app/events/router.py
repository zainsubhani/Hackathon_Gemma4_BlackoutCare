from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.events import crud, schemas
from app.users.models import User

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[schemas.EventResponse])
def get_events(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    event_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return crud.get_events(db, skip=skip, limit=limit, event_type=event_type)


@router.get("/case/{case_id}", response_model=list[schemas.EventResponse])
def get_events_by_case(
    case_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return crud.get_events_by_case(db, case_id, skip=skip, limit=limit)
