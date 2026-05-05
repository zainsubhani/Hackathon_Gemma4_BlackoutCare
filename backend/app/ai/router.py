from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai import crud, schemas
from app.core.auth import get_current_user
from app.core.database import get_db
from app.users.models import User

router = APIRouter(prefix="/ai/recommendations", tags=["ai"])


@router.patch("/{recommendation_id}/review", response_model=schemas.AIRecommendationResponse)
def review_recommendation(
    recommendation_id: int,
    payload: schemas.AIRecommendationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.review_recommendation(db, recommendation_id, payload, reviewer_id=current_user.id)
