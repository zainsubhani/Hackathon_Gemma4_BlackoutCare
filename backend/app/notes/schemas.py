from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class NoteType(str, Enum):
    clinical = "clinical"
    vitals = "vitals"
    handoff = "handoff"
    escalation = "escalation"


class CaseNoteCreate(BaseModel):
    note_type: NoteType = NoteType.clinical
    content: str = Field(..., min_length=2, max_length=2000)


class CaseNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    author_id: int
    note_type: NoteType
    content: str
    sync_status: str = "pending"
    sync_error: str | None = None
    created_at: datetime
