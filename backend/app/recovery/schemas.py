from enum import Enum

from pydantic import BaseModel, Field


class RecoveryItemType(str, Enum):
    patient = "patient"
    triage_case = "triage_case"
    case_note = "case_note"
    ai_recommendation = "ai_recommendation"


class SyncStatus(str, Enum):
    pending = "pending"
    reviewed = "reviewed"
    synced = "synced"
    failed = "failed"
    manual_entry_required = "manual_entry_required"


class RecoveryStatusUpdate(BaseModel):
    item_type: RecoveryItemType
    item_id: int
    sync_status: SyncStatus
    sync_error: str | None = Field(default=None, max_length=1000)
