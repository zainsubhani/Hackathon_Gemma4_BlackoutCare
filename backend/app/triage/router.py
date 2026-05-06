from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.database import get_db
from app.triage import crud, schemas
from app.triage.service import analyze_triage_case as analyze_triage_case_service
from app.users.models import User

router = APIRouter(prefix="/triage/cases", tags=["triage"])


@router.post("/", response_model=schemas.TriageCaseResponse)
def create_triage_case(
    triage_case: schemas.TriageCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_triage_case(db, triage_case, created_by=current_user.id)


@router.get("/", response_model=list[schemas.TriageCaseResponse])
def get_triage_cases(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    status: str | None = Query(default=None),
    urgency_level: str | None = Query(default=None),
    patient_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_triage_cases(
        db,
        skip=skip,
        limit=limit,
        status=status,
        urgency_level=urgency_level,
        patient_id=patient_id,
    )


@router.get("/{case_id}", response_model=schemas.TriageCaseResponse)
def get_triage_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    triage_case = crud.get_triage_case(db, case_id)

    if not triage_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    return triage_case

@router.post("/{case_id}/analyze")
def analyze_triage_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin", "coordinator")),
):
    return analyze_triage_case_service(db, case_id)

@router.patch("/{case_id}/status", response_model=schemas.TriageCaseResponse)
def update_triage_case_status(
    case_id: int,
    payload: schemas.TriageCaseUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.update_triage_case_status(
        db,
        case_id,
        payload.status,
        actor_id=current_user.id,
    )


@router.patch("/{case_id}", response_model=schemas.TriageCaseResponse)
def update_triage_case(
    case_id: int,
    payload: schemas.TriageCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin", "coordinator")),
):
    return crud.update_triage_case(
        db,
        case_id,
        payload,
        actor_id=current_user.id,
    )


@router.post("/{case_id}/vitals", response_model=schemas.VitalsEntryResponse)
def create_vitals_entry(
    case_id: int,
    payload: schemas.VitalsEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_vitals_entry(db, case_id, payload, recorded_by=current_user.id)


@router.get("/{case_id}/vitals", response_model=list[schemas.VitalsEntryResponse])
def get_vitals_entries(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_vitals_entries(db, case_id)


@router.post("/{case_id}/checklist", response_model=schemas.ProtocolChecklistResponse)
def create_checklist_item(
    case_id: int,
    payload: schemas.ProtocolChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_checklist_item(db, case_id, payload, created_by=current_user.id)


@router.get("/{case_id}/checklist", response_model=list[schemas.ProtocolChecklistResponse])
def get_checklist_items(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_checklist_items(db, case_id)


@router.patch("/checklist/{item_id}", response_model=schemas.ProtocolChecklistResponse)
def update_checklist_item(
    item_id: int,
    payload: schemas.ProtocolChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "nurse", "admin", "coordinator")),
):
    return crud.update_checklist_item(db, item_id, payload, actor_id=current_user.id)
