from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # doctor, nurse, admin
    department = Column(String, nullable=True)
    staff_code = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
