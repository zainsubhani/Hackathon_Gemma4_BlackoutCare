from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class UrgencyLevel(str, Enum):
    critical = "critical"
    urgent = "urgent"
    stable = "stable"
    unassigned = "unassigned"


class CaseStatus(str, Enum):
    active = "active"
    monitoring = "monitoring"
    escalated = "escalated"
    closed = "closed"


class TriageCaseCreate(BaseModel):
    incident_id: int | None = None
    patient_id: int

    chief_complaint: str = Field(..., min_length=2, max_length=200)
    symptoms: str | None = Field(default=None, max_length=1000)
    vitals: str | None = Field(default=None, max_length=1000)

    urgency_level: UrgencyLevel = UrgencyLevel.unassigned
    status: CaseStatus = CaseStatus.active


class TriageCaseUpdateStatus(BaseModel):
    status: CaseStatus


class TriageCaseUpdate(BaseModel):
    incident_id: int | None = None
    chief_complaint: str | None = Field(default=None, min_length=2, max_length=200)
    symptoms: str | None = Field(default=None, max_length=1000)
    vitals: str | None = Field(default=None, max_length=1000)
    urgency_level: UrgencyLevel | None = None
    status: CaseStatus | None = None


class TriageCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int | None = None
    patient_id: int
    created_by: int
    chief_complaint: str
    symptoms: str | None = None
    vitals: str | None = None
    urgency_level: UrgencyLevel
    status: CaseStatus
    sync_status: str = "pending"
    sync_error: str | None = None
    created_at: datetime
    updated_at: datetime
