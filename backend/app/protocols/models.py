from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.types import UserDefinedType
from sqlalchemy.sql import func

from app.core.database import Base


class Vector(UserDefinedType):
    cache_ok = True

    def get_col_spec(self, **kw):
        return "vector"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                return value
            return "[" + ",".join(str(float(item)) for item in value) + "]"

        return process


class Protocol(Base):
    __tablename__ = "protocols"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    trigger_keywords = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    version = Column(String, nullable=False, default="v1")
    embedding = Column(Vector, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
