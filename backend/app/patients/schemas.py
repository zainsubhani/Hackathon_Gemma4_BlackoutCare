from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"
    unknown = "unknown"


class AllergyStatus(str, Enum):
    unknown = "unknown"
    none = "none"
    known = "known"


class PatientCreate(BaseModel):
    patient_code: str = Field(..., min_length=3, max_length=50)
    full_name: str | None = Field(default=None, max_length=100)
    age: int | None = Field(default=None, ge=0, le=130)
    gender: Gender = Gender.unknown

    allergy_status: AllergyStatus = AllergyStatus.unknown
    known_conditions: str | None = Field(default=None, max_length=500)
    current_medications: str | None = Field(default=None, max_length=500)

    @field_validator("patient_code")
    @classmethod
    def normalize_patient_code(cls, value: str) -> str:
        return value.strip().upper()


class PatientUpdate(BaseModel):
    patient_code: str | None = Field(default=None, min_length=3, max_length=50)
    full_name: str | None = Field(default=None, max_length=100)
    age: int | None = Field(default=None, ge=0, le=130)
    gender: Gender | None = None
    allergy_status: AllergyStatus | None = None
    known_conditions: str | None = Field(default=None, max_length=500)
    current_medications: str | None = Field(default=None, max_length=500)

    @field_validator("patient_code")
    @classmethod
    def normalize_optional_patient_code(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_code: str
    full_name: str | None = None
    age: int | None = None
    gender: Gender
    allergy_status: AllergyStatus
    known_conditions: str | None = None
    current_medications: str | None = None
    created_at: datetime
