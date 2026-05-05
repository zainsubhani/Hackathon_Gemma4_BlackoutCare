from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AIRecommendationPayload(BaseModel):
    urgency: Literal["critical", "urgent", "stable"]
    risk_summary: str = Field(..., min_length=1, max_length=2000)
    recommended_actions: list[str] = Field(default_factory=list, max_length=20)
    warnings: list[str] = Field(default_factory=list, max_length=20)
    confidence: Literal["low", "medium", "high"]
    source: str | None = Field(default=None, max_length=200)
    protocol_reasoning: list[str] = Field(default_factory=list, max_length=20)


class AIReviewStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    needs_review = "needs_review"


class AIRecommendationReview(BaseModel):
    review_status: AIReviewStatus
    review_note: str | None = Field(default=None, max_length=1000)


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
    review_status: AIReviewStatus = AIReviewStatus.pending
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    created_at: datetime
