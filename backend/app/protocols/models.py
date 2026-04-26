from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Protocol(Base):
    __tablename__ = "protocols"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    trigger_keywords = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    version = Column(String, nullable=False, default="v1")

    created_at = Column(DateTime(timezone=True), server_default=func.now())