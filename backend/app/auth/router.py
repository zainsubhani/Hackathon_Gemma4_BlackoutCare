import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.schemas import ForgotPasswordRequest, ForgotPasswordResponse, LoginRequest, TokenResponse
from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.events.crud import create_event
from app.users.schemas import UserResponse
from app.users.crud import get_user_by_staff_code
from app.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _temporary_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_staff_code(db, payload.staff_code)

    if (
        not user
        or not user.hashed_password
        or not verify_password(payload.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff code or password",
        )

    token = create_access_token(
        {
            "sub": str(user.id),
            "staff_code": user.staff_code,
            "role": user.role,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_staff_code(db, payload.staff_code)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found for that staff code",
        )

    temporary_password = _temporary_password()
    user.hashed_password = hash_password(temporary_password)

    create_event(
        db=db,
        event_type="PASSWORD_RESET_REQUESTED",
        actor_id=user.id,
        event_data={
            "user_id": user.id,
            "staff_code": user.staff_code,
            "reset_method": "temporary_password",
        },
    )

    return {
        "staff_code": user.staff_code,
        "temporary_password": temporary_password,
        "message": "Temporary password generated. Use it to sign in, then ask an admin to set a permanent password.",
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
