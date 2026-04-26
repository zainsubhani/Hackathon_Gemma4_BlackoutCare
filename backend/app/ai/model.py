from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(Integer, ForeignKey("triage_cases.id"), nullable=False)

    urgency = Column(String, nullable=False)
    risk_summary = Column(Text, nullable=False)
    recommended_actions = Column(Text, nullable=False)
    warnings = Column(Text, nullable=True)
    confidence = Column(String, nullable=False)
    source = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())