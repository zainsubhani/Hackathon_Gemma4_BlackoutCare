import json
from sqlalchemy.orm import Session

from app.ai.model import AIRecommendation


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