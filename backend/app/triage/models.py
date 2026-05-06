from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TriageCase(Base):
    __tablename__ = "triage_cases"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("downtime_incidents.id"), nullable=True)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    chief_complaint = Column(String, nullable=False)
    symptoms = Column(Text, nullable=True)
    vitals = Column(Text, nullable=True)

    urgency_level = Column(String, nullable=False, default="unassigned")
    status = Column(String, nullable=False, default="active")
    sync_status = Column(String, nullable=False, default="pending")
    sync_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class VitalsEntry(Base):
    __tablename__ = "vitals_entries"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("triage_cases.id"), nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    temperature_c = Column(String, nullable=True)
    heart_rate = Column(String, nullable=True)
    blood_pressure = Column(String, nullable=True)
    respiratory_rate = Column(String, nullable=True)
    oxygen_saturation = Column(String, nullable=True)
    pain_score = Column(String, nullable=True)
    trend = Column(String, nullable=False, default="unknown")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProtocolChecklistItem(Base):
    __tablename__ = "protocol_checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("triage_cases.id"), nullable=False)
    protocol_id = Column(Integer, ForeignKey("protocols.id"), nullable=True)
    label = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")
    clinician_note = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
