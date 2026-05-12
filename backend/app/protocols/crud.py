from sqlalchemy import text
from sqlalchemy.orm import Session

from app.protocols.embeddings import (
    cosine_similarity,
    embed_text,
    parse_vector,
    protocol_embedding_text,
    vector_literal,
)
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
    db_protocol.embedding = embed_text(protocol_embedding_text(db_protocol))

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

    if {"title", "category", "trigger_keywords", "content", "version"} & set(update_data):
        db_protocol.embedding = embed_text(protocol_embedding_text(db_protocol))

    db.commit()
    db.refresh(db_protocol)
    return db_protocol


def search_protocols(db: Session, query: str, limit: int = 10):
    query_lower = query.lower()
    protocols = db.query(Protocol).all()
    embeddings_changed = _ensure_protocol_embeddings(protocols)
    if embeddings_changed:
        db.commit()

    query_embedding = embed_text(query)
    semantic_scores = _semantic_scores(db, query_embedding, protocols, limit)

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

        keyword_score = len(matched_keywords) / len(keywords) if keywords else 0.0
        semantic_score = semantic_scores.get(protocol.id, 0.0)
        confidence_score = round(max(keyword_score, semantic_score), 2)

        if matched_keywords or semantic_score >= 0.25:
            results.append({
                "protocol": protocol,
                "matched_keywords": matched_keywords,
                "confidence_score": confidence_score,
                "semantic_score": round(semantic_score, 2),
                "search_strategy": "keyword+semantic" if matched_keywords and semantic_score else "keyword" if matched_keywords else "semantic",
                "confidence_label": (
                    "high" if confidence_score >= 0.6
                    else "medium" if confidence_score >= 0.3
                    else "low"
                )
            })

    results.sort(key=lambda item: item["confidence_score"], reverse=True)

    return results[:limit]


def _ensure_protocol_embeddings(protocols: list[Protocol]) -> bool:
    changed = False
    for protocol in protocols:
        if protocol.embedding is None:
            protocol.embedding = embed_text(protocol_embedding_text(protocol))
            changed = True
    return changed


def _semantic_scores(
    db: Session,
    query_embedding: list[float],
    protocols: list[Protocol],
    limit: int,
) -> dict[int, float]:
    if not query_embedding:
        return {}

    if db.bind and db.bind.dialect.name == "postgresql":
        return _postgres_semantic_scores(db, query_embedding, limit)

    scores = {}
    for protocol in protocols:
        protocol_embedding = parse_vector(protocol.embedding)
        if not protocol_embedding:
            protocol_embedding = embed_text(protocol_embedding_text(protocol))
        scores[protocol.id] = cosine_similarity(query_embedding, protocol_embedding)
    return scores


def _postgres_semantic_scores(
    db: Session,
    query_embedding: list[float],
    limit: int,
) -> dict[int, float]:
    rows = db.execute(
        text(
            """
            SELECT id, 1 - (embedding <=> CAST(:embedding AS vector)) AS semantic_score
            FROM protocols
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """
        ),
        {"embedding": vector_literal(query_embedding), "limit": limit},
    ).mappings()

    return {
        int(row["id"]): max(0.0, float(row["semantic_score"] or 0.0))
        for row in rows
    }
