from sqlalchemy.orm import Session

from app.protocols.models import Protocol
from app.protocols.schemas import ProtocolCreate, ProtocolUpdate


def create_protocol(db: Session, protocol: ProtocolCreate):
    db_protocol = Protocol(
        title=protocol.title,
        category=protocol.category.lower(),
        trigger_keywords=protocol.trigger_keywords.lower(),
        content=protocol.content,
        version=protocol.version,
    )

    db.add(db_protocol)
    db.commit()
    db.refresh(db_protocol)
    return db_protocol


def get_protocols(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
):
    query = db.query(Protocol)
    if category:
        query = query.filter(Protocol.category == category.lower())
    return query.order_by(Protocol.created_at.desc()).offset(skip).limit(limit).all()


def get_protocol(db: Session, protocol_id: int):
    return db.query(Protocol).filter(Protocol.id == protocol_id).first()


def update_protocol(db: Session, protocol_id: int, payload: ProtocolUpdate):
    db_protocol = get_protocol(db, protocol_id)
    if not db_protocol:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in {"category", "trigger_keywords"} and value is not None:
            value = value.lower()
        setattr(db_protocol, field, value)

    db.commit()
    db.refresh(db_protocol)
    return db_protocol


def search_protocols(db: Session, query: str):
    query_lower = query.lower()
    protocols = db.query(Protocol).all()

    results = []

    for protocol in protocols:
        keywords = [
            keyword.strip()
            for keyword in protocol.trigger_keywords.lower().split(",")
            if keyword.strip()
        ]

        matched_keywords = [
            keyword for keyword in keywords
            if keyword in query_lower
        ]

        if matched_keywords:
            confidence_score = round(len(matched_keywords) / len(keywords), 2)

            results.append({
                "protocol": protocol,
                "matched_keywords": matched_keywords,
                "confidence_score": confidence_score,
                "confidence_label": (
                    "high" if confidence_score >= 0.6
                    else "medium" if confidence_score >= 0.3
                    else "low"
                )
            })

    results.sort(key=lambda item: item["confidence_score"], reverse=True)

    return results
