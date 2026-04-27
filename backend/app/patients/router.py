from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.patients import crud, schemas
from app.users.models import User

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_patient(db, patient, actor_id=current_user.id)


@router.get("/", response_model=list[schemas.PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_patients(db)


@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = crud.get_patient(db, patient_id)

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient
