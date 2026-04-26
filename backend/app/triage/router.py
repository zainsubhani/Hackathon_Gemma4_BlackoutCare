from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.triage import crud, schemas

router = APIRouter(prefix="/triage/cases", tags=["triage"])


@router.post("/", response_model=schemas.TriageCaseResponse)
def create_triage_case(
    triage_case: schemas.TriageCaseCreate,
    db: Session = Depends(get_db),
):
    return crud.create_triage_case(db, triage_case)


@router.get("/", response_model=list[schemas.TriageCaseResponse])
def get_triage_cases(db: Session = Depends(get_db)):
    return crud.get_triage_cases(db)


@router.get("/{case_id}", response_model=schemas.TriageCaseResponse)
def get_triage_case(case_id: int, db: Session = Depends(get_db)):
    triage_case = crud.get_triage_case(db, case_id)

    if not triage_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    return triage_case


@router.patch("/{case_id}/status", response_model=schemas.TriageCaseResponse)
def update_triage_case_status(
    case_id: int,
    payload: schemas.TriageCaseUpdateStatus,
    db: Session = Depends(get_db),
):
    return crud.update_triage_case_status(db, case_id, payload.status)