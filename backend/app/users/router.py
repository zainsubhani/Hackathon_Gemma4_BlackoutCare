from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.database import get_db
from app.users import crud, schemas
from app.users.models import User

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user)


@router.get("/", response_model=list[schemas.UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return crud.get_users(db)


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = crud.get_user(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
