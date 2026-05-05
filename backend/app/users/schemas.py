from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator, field_serializer


class UserRole(str, Enum):
    doctor = "doctor"
    nurse = "nurse"
    admin = "admin"
    coordinator = "coordinator"


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    department: str | None = Field(default=None, max_length=100)
    staff_code: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6, max_length=100)
    is_active: bool = True
    must_change_password: bool = False

    @field_validator("staff_code")
    @classmethod
    def normalize_staff_code(cls, value: str) -> str:
        return value.strip().upper()


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    role: UserRole | None = None
    department: str | None = Field(default=None, max_length=100)
    staff_code: str | None = Field(default=None, min_length=3, max_length=30)
    password: str | None = Field(default=None, min_length=6, max_length=100)
    is_active: bool | None = None
    must_change_password: bool | None = None

    @field_validator("staff_code")
    @classmethod
    def normalize_optional_staff_code(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    role: UserRole
    department: str | None = None
    staff_code: str
    is_active: bool
    must_change_password: bool
    created_at: datetime

    @field_serializer("is_active", "must_change_password")
    def serialize_string_bool(self, value):
        if isinstance(value, bool):
            return value
        return str(value).lower() == "true"
