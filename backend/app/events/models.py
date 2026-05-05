from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(Integer, ForeignKey("triage_cases.id"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    event_type = Column(String, nullable=False)
    event_data = Column(Text, nullable=True)
    previous_hash = Column(String, nullable=True)
    event_hash = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
