from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.database import get_db
from app.events.crud import create_event
from app.protocols import crud, schemas
from app.users.models import User

router = APIRouter(prefix="/protocols", tags=["protocols"])


@router.post("/", response_model=schemas.ProtocolResponse)
def create_protocol(
    protocol: schemas.ProtocolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    db_protocol = crud.create_protocol(db, protocol)
    create_event(
        db=db,
        event_type="PROTOCOL_CREATED",
        actor_id=current_user.id,
        event_data={
            "protocol_id": db_protocol.id,
            "title": db_protocol.title,
            "category": db_protocol.category,
        },
    )
    return db_protocol


@router.get("/", response_model=list[schemas.ProtocolResponse])
def get_protocols(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_protocols(db, skip=skip, limit=limit, category=category)


@router.get("/{protocol_id}", response_model=schemas.ProtocolResponse)
def get_protocol(
    protocol_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    protocol = crud.get_protocol(db, protocol_id)

    if not protocol:
        raise HTTPException(status_code=404, detail="Protocol not found")

    return protocol


@router.patch("/{protocol_id}", response_model=schemas.ProtocolResponse)
def update_protocol(
    protocol_id: int,
    payload: schemas.ProtocolUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    protocol = crud.update_protocol(db, protocol_id, payload)
    if not protocol:
        raise HTTPException(status_code=404, detail="Protocol not found")

    create_event(
        db=db,
        event_type="PROTOCOL_UPDATED",
        actor_id=current_user.id,
        event_data={
            "protocol_id": protocol.id,
            "title": protocol.title,
            "category": protocol.category,
        },
    )
    return protocol


@router.post("/search")
def search_protocols(
    payload: schemas.ProtocolSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = crud.search_protocols(db, payload.query)

    return [
        {
            "id": item["protocol"].id,
            "title": item["protocol"].title,
            "category": item["protocol"].category,
            "matched_keywords": item["matched_keywords"],
            "confidence_score": item["confidence_score"],
            "semantic_score": item.get("semantic_score", 0),
            "search_strategy": item.get("search_strategy", "keyword"),
            "confidence_label": item["confidence_label"],
        }
        for item in results
    ]
