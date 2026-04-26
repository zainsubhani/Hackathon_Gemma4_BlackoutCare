from sqlalchemy.orm import Session

from app.protocols.models import Protocol
from app.protocols.schemas import ProtocolCreate


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


def get_protocols(db: Session):
    return db.query(Protocol).order_by(Protocol.created_at.desc()).all()


def get_protocol(db: Session, protocol_id: int):
    return db.query(Protocol).filter(Protocol.id == protocol_id).first()


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