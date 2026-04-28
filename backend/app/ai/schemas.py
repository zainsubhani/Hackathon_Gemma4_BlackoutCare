from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AIRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    urgency: str
    risk_summary: str
    recommended_actions: str
    warnings: str | None = None
    confidence: str
    source: str | None = None
    created_at: datetime
