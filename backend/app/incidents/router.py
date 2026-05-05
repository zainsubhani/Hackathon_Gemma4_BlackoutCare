from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.database import get_db
from app.incidents import crud, schemas
from app.users.models import User

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.post("/", response_model=schemas.IncidentResponse)
def create_incident(
    payload: schemas.IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return crud.create_incident(db, payload, actor_id=current_user.id)


@router.get("/", response_model=list[schemas.IncidentResponse])
def get_incidents(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_incidents(db, status=status)


@router.get("/active", response_model=schemas.IncidentResponse | None)
def get_active_incident(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_active_incident(db)


@router.get("/{incident_id}", response_model=schemas.IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = crud.get_incident(db, incident_id)
    if not incident:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=schemas.IncidentResponse)
def update_incident(
    incident_id: int,
    payload: schemas.IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return crud.update_incident(db, incident_id, payload, actor_id=current_user.id)
