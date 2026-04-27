from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator


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

    @field_validator("staff_code")
    @classmethod
    def normalize_staff_code(cls, value: str) -> str:
        return value.strip().upper()


class UserResponse(BaseModel):
    id: int
    full_name: str
    role: UserRole
    department: str | None = None
    staff_code: str
    created_at: datetime

    class Config:
        from_attributes = True
