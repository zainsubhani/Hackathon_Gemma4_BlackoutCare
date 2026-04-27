from datetime import datetime
from pydantic import BaseModel


class AIRecommendationResponse(BaseModel):
    id: int
    case_id: int
    urgency: str
    risk_summary: str
    recommended_actions: str
    warnings: str | None = None
    confidence: str
    source: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
