from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProtocolCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field(..., min_length=2, max_length=100)
    trigger_keywords: str = Field(..., min_length=2, max_length=500)
    content: str = Field(..., min_length=10)
    version: str = "v1"


class ProtocolUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    trigger_keywords: str | None = Field(default=None, min_length=2, max_length=500)
    content: str | None = Field(default=None, min_length=10)
    version: str | None = None


class ProtocolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    trigger_keywords: str
    content: str
    version: str
    created_at: datetime



class ProtocolSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
