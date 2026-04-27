from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.events.crud import create_event
from app.users.models import User
from app.users.schemas import UserCreate


def get_user_by_staff_code(db: Session, staff_code: str):
    return db.query(User).filter(User.staff_code == staff_code.upper()).first()


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
        hashed_password=hash_password(user.password),
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        create_event(
            db=db,
            event_type="USER_CREATED",
            actor_id=db_user.id,
            event_data={
                "user_id": db_user.id,
                "staff_code": db_user.staff_code,
                "role": db_user.role,
            },
        )
        return db_user

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"User with staff_code '{user.staff_code}' already exists",
        )


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    role: str | None = None,
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.offset(skip).limit(limit).all()


def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()
