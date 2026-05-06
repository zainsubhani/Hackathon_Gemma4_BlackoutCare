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


class VitalsTrend(str, Enum):
    improving = "improving"
    unchanged = "unchanged"
    worsening = "worsening"
    unknown = "unknown"


class ChecklistStatus(str, Enum):
    pending = "pending"
    done = "done"
    skipped = "skipped"


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


class VitalsEntryCreate(BaseModel):
    temperature_c: str | None = Field(default=None, max_length=20)
    heart_rate: str | None = Field(default=None, max_length=20)
    blood_pressure: str | None = Field(default=None, max_length=40)
    respiratory_rate: str | None = Field(default=None, max_length=20)
    oxygen_saturation: str | None = Field(default=None, max_length=20)
    pain_score: str | None = Field(default=None, max_length=20)
    trend: VitalsTrend = VitalsTrend.unknown
    notes: str | None = Field(default=None, max_length=1000)


class VitalsEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    recorded_by: int
    temperature_c: str | None = None
    heart_rate: str | None = None
    blood_pressure: str | None = None
    respiratory_rate: str | None = None
    oxygen_saturation: str | None = None
    pain_score: str | None = None
    trend: VitalsTrend
    notes: str | None = None
    created_at: datetime


class ProtocolChecklistCreate(BaseModel):
    protocol_id: int | None = None
    label: str = Field(..., min_length=2, max_length=500)


class ProtocolChecklistUpdate(BaseModel):
    status: ChecklistStatus | None = None
    clinician_note: str | None = Field(default=None, max_length=1000)


class ProtocolChecklistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    protocol_id: int | None = None
    label: str
    status: ChecklistStatus
    clinician_note: str | None = None
    created_by: int
    updated_by: int | None = None
    created_at: datetime
    updated_at: datetime
