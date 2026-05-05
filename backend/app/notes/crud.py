from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.events.crud import create_event
from app.notes.models import CaseNote
from app.notes.schemas import CaseNoteCreate
from app.triage.models import TriageCase


def create_case_note(db: Session, case_id: int, payload: CaseNoteCreate, author_id: int):
    triage_case = db.query(TriageCase).filter(TriageCase.id == case_id).first()
    if not triage_case:
        raise HTTPException(status_code=404, detail="Triage case not found")

    note = CaseNote(
        case_id=case_id,
        author_id=author_id,
        note_type=payload.note_type.value,
        content=payload.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    create_event(
        db=db,
        event_type="CASE_NOTE_CREATED",
        actor_id=author_id,
        case_id=case_id,
        event_data={"note_id": note.id, "note_type": note.note_type},
    )
    return note


def get_case_notes(db: Session, case_id: int):
    return (
        db.query(CaseNote)
        .filter(CaseNote.case_id == case_id)
        .order_by(CaseNote.created_at.asc())
        .all()
    )
