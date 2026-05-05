from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    staff_code: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    staff_code: str = Field(..., min_length=3, max_length=30)
    master_password: str = Field(..., min_length=6, max_length=100)
    new_password: str = Field(..., min_length=6, max_length=100)

    @field_validator("staff_code")
    @classmethod
    def normalize_staff_code(cls, value: str) -> str:
        return value.strip().upper()


class ForgotPasswordResponse(BaseModel):
    staff_code: str
    message: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6, max_length=100)
    new_password: str = Field(..., min_length=6, max_length=100)
