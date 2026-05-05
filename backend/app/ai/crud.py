import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ai.models import AIRecommendation
from app.ai.schemas import AIRecommendationReview
from app.events.crud import create_event


def create_ai_recommendation(db: Session, case_id: int, recommendation: dict):
    db_recommendation = AIRecommendation(
        case_id=case_id,
        urgency=recommendation.get("urgency", "unknown"),
        risk_summary=recommendation.get("risk_summary", ""),
        recommended_actions=json.dumps(recommendation.get("recommended_actions", [])),
        warnings=json.dumps(recommendation.get("warnings", [])),
        confidence=recommendation.get("confidence", "low"),
        source=recommendation.get("source", "local emergency protocol"),
    )

    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation


def get_recommendations_by_case(db: Session, case_id: int):
    return (
        db.query(AIRecommendation)
        .filter(AIRecommendation.case_id == case_id)
        .order_by(AIRecommendation.created_at.desc())
        .all()
    )


def review_recommendation(
    db: Session,
    recommendation_id: int,
    payload: AIRecommendationReview,
    reviewer_id: int,
):
    recommendation = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.id == recommendation_id)
        .first()
    )
    if not recommendation:
        raise HTTPException(status_code=404, detail="AI recommendation not found")

    recommendation.review_status = payload.review_status.value
    recommendation.review_note = payload.review_note
    recommendation.reviewed_by = reviewer_id
    recommendation.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(recommendation)
    create_event(
        db=db,
        event_type="AI_RECOMMENDATION_REVIEWED",
        actor_id=reviewer_id,
        case_id=recommendation.case_id,
        event_data={
            "recommendation_id": recommendation.id,
            "review_status": recommendation.review_status,
        },
    )
    return recommendation
