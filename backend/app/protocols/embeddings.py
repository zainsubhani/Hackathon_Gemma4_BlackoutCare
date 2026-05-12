import hashlib
import math
import re

import requests

from app.core.config import settings


TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "for",
    "in",
    "is",
    "of",
    "or",
    "the",
    "to",
    "with",
}
SYNONYMS = {
    "mi": ["myocardial", "infarction", "heart", "attack", "chest", "pain"],
    "myocardial": ["heart", "cardiac"],
    "infarction": ["heart", "attack"],
    "dyspnea": ["shortness", "breath", "respiratory"],
    "sob": ["shortness", "breath", "respiratory"],
    "hypotension": ["low", "blood", "pressure", "unstable"],
    "tachycardia": ["high", "heart", "rate", "unstable"],
    "stroke": ["neurological", "weakness", "speech"],
    "seizure": ["neurological", "convulsion"],
}


def protocol_embedding_text(protocol) -> str:
    return " ".join(
        [
            protocol.title or "",
            protocol.category or "",
            protocol.trigger_keywords or "",
            protocol.content or "",
            protocol.version or "",
        ]
    )


def embed_text(text: str) -> list[float]:
    if settings.OLLAMA_EMBEDDING_MODEL:
        try:
            return _embed_with_ollama(text)
        except (KeyError, TypeError, ValueError, requests.RequestException):
            pass

    return _hash_embedding(text, settings.PROTOCOL_EMBEDDING_DIMENSIONS)


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if not left_norm or not right_norm:
        return 0.0

    return dot / (left_norm * right_norm)


def parse_vector(value) -> list[float]:
    if value is None:
        return []
    if isinstance(value, list):
        return [float(item) for item in value]
    if isinstance(value, str):
        trimmed = value.strip().strip("[]")
        if not trimmed:
            return []
        return [float(item) for item in trimmed.split(",")]
    return []


def vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{item:.8f}" for item in vector) + "]"


def _embed_with_ollama(text: str) -> list[float]:
    response = requests.post(
        settings.OLLAMA_EMBEDDING_URL,
        json={
            "model": settings.OLLAMA_EMBEDDING_MODEL,
            "prompt": text,
        },
        timeout=settings.OLLAMA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    embedding = response.json()["embedding"]
    return _normalize([float(item) for item in embedding])


def _hash_embedding(text: str, dimensions: int) -> list[float]:
    vector = [0.0] * dimensions
    for token in _expanded_tokens(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    return _normalize(vector)


def _expanded_tokens(text: str) -> list[str]:
    tokens = [
        token
        for token in TOKEN_PATTERN.findall(text.lower())
        if token not in STOPWORDS and len(token) > 1
    ]
    expanded = list(tokens)
    for token in tokens:
        expanded.extend(SYNONYMS.get(token, []))
    return expanded


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(item * item for item in vector))
    if not norm:
        return vector
    return [round(item / norm, 8) for item in vector]
