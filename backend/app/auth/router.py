from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.schemas import LoginRequest, TokenResponse
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.users.crud import get_user_by_staff_code

router = APIRouter(prefix="/auth", tags=["auth"])


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
