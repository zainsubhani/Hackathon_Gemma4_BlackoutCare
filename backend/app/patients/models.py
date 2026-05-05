from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("downtime_incidents.id"), nullable=True)

    patient_code = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)

    allergy_status = Column(String, nullable=False, default="unknown")
    known_conditions = Column(String, nullable=True)
    current_medications = Column(String, nullable=True)
    sync_status = Column(String, nullable=False, default="pending")
    sync_error = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
