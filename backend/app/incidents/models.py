from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class DowntimeIncident(Base):
    __tablename__ = "downtime_incidents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hospital_unit = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    commander_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    summary = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
