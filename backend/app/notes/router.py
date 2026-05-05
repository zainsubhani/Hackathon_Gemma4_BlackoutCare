from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.notes import crud, schemas
from app.users.models import User

router = APIRouter(prefix="/triage/cases/{case_id}/notes", tags=["case-notes"])


@router.post("/", response_model=schemas.CaseNoteResponse)
def create_case_note(
    case_id: int,
    payload: schemas.CaseNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_case_note(db, case_id, payload, author_id=current_user.id)


@router.get("/", response_model=list[schemas.CaseNoteResponse])
def get_case_notes(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_case_notes(db, case_id)
