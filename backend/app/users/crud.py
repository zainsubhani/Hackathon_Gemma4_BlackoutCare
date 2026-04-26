from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.users.models import User
from app.users.schemas import UserCreate


def get_user_by_staff_code(db: Session, staff_code: str):
    return db.query(User).filter(User.staff_code == staff_code).first()


def create_user(db: Session, user: UserCreate):
    existing_user = get_user_by_staff_code(db, user.staff_code)

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail=f"User with staff_code '{user.staff_code}' already exists",
        )

    db_user = User(
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        staff_code=user.staff_code,
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"User with staff_code '{user.staff_code}' already exists",
        )