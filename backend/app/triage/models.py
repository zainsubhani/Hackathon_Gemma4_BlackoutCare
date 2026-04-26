from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TriageCase(Base):
    __tablename__ = "triage_cases"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    chief_complaint = Column(String, nullable=False)
    symptoms = Column(Text, nullable=True)
    vitals = Column(Text, nullable=True)

    urgency_level = Column(String, nullable=False, default="unassigned")
    status = Column(String, nullable=False, default="active")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())