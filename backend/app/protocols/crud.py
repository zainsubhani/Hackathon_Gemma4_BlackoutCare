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

    matched = []
    for protocol in protocols:
        keywords = [
            keyword.strip()
            for keyword in protocol.trigger_keywords.lower().split(",")
        ]

        if any(keyword in query_lower for keyword in keywords):
            matched.append(protocol)

    return matched