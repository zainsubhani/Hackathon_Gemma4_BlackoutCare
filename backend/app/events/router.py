from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.events import crud, schemas

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[schemas.EventResponse])
def get_events(db: Session = Depends(get_db)):
    return crud.get_events(db)


@router.get("/case/{case_id}", response_model=list[schemas.EventResponse])
def get_events_by_case(case_id: int, db: Session = Depends(get_db)):
    return crud.get_events_by_case(db, case_id)