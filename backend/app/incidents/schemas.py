from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class IncidentStatus(str, Enum):
    active = "active"
    resolved = "resolved"


class IncidentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    hospital_unit: str | None = Field(default=None, max_length=120)
    summary: str | None = Field(default=None, max_length=1000)


class IncidentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    hospital_unit: str | None = Field(default=None, max_length=120)
    status: IncidentStatus | None = None
    summary: str | None = Field(default=None, max_length=1000)


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    hospital_unit: str | None = None
    status: IncidentStatus
    commander_id: int | None = None
    summary: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    created_at: datetime
