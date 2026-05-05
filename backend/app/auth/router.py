import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    TokenResponse,
)
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.events.crud import create_event
from app.users.schemas import UserResponse
from app.users.crud import get_user_by_staff_code
from app.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

_failed_attempts: dict[str, list[datetime]] = {}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    staff_code = payload.staff_code.strip().upper()
    _raise_if_locked(f"login:{staff_code}")
    user = get_user_by_staff_code(db, staff_code)

    if (
        not user
        or not user.hashed_password
        or not verify_password(payload.password, user.hashed_password)
    ):
        _record_failed_attempt(f"login:{staff_code}")
        create_event(
            db=db,
            event_type="LOGIN_FAILED",
            actor_id=user.id if user else None,
            event_data={"staff_code": staff_code, "reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff code or password",
        )

    _clear_failed_attempts(f"login:{staff_code}")
    create_event(
        db=db,
        event_type="LOGIN_SUCCEEDED",
        actor_id=user.id,
        event_data={"staff_code": user.staff_code},
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
    staff_code = payload.staff_code.strip().upper()
    _raise_if_locked(f"reset:{staff_code}")

    if not secrets_compare(payload.master_password, settings.PASSWORD_RESET_MASTER_PASSWORD):
        _record_failed_attempt(f"reset:{staff_code}")
        create_event(
            db=db,
            event_type="PASSWORD_RESET_FAILED",
            event_data={"staff_code": staff_code, "reason": "invalid_master_password"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid administrator master password",
        )

    user = get_user_by_staff_code(db, staff_code)

    if not user:
        _record_failed_attempt(f"reset:{staff_code}")
        create_event(
            db=db,
            event_type="PASSWORD_RESET_FAILED",
            event_data={"staff_code": staff_code, "reason": "unknown_staff_code"},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found for that staff code",
        )

    user.hashed_password = hash_password(payload.new_password)

    create_event(
        db=db,
        event_type="PASSWORD_RESET_COMPLETED",
        actor_id=user.id,
        event_data={
            "user_id": user.id,
            "staff_code": user.staff_code,
            "reset_method": "administrator_master_password",
        },
    )
    _clear_failed_attempts(f"reset:{staff_code}")

    return {
        "staff_code": user.staff_code,
        "message": "Password reset successfully. Use the new password to sign in.",
    }


def secrets_compare(value: str, expected: str) -> bool:
    return secrets.compare_digest(value.encode("utf-8"), expected.encode("utf-8"))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (
        not current_user.hashed_password
        or not verify_password(payload.current_password, current_user.hashed_password)
    ):
        create_event(
            db=db,
            event_type="PASSWORD_CHANGE_FAILED",
            actor_id=current_user.id,
            event_data={"staff_code": current_user.staff_code, "reason": "invalid_current_password"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    create_event(
        db=db,
        event_type="PASSWORD_CHANGED",
        actor_id=current_user.id,
        event_data={"staff_code": current_user.staff_code},
    )
    return {"message": "Password changed successfully"}


def _active_attempts(key: str) -> list[datetime]:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.AUTH_LOCKOUT_SECONDS)
    attempts = [attempt for attempt in _failed_attempts.get(key, []) if attempt > cutoff]
    _failed_attempts[key] = attempts
    return attempts


def _raise_if_locked(key: str) -> None:
    if len(_active_attempts(key)) >= settings.AUTH_MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
        )


def _record_failed_attempt(key: str) -> None:
    attempts = _active_attempts(key)
    attempts.append(datetime.now(timezone.utc))
    _failed_attempts[key] = attempts


def _clear_failed_attempts(key: str) -> None:
    _failed_attempts.pop(key, None)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
