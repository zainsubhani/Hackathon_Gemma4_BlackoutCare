from datetime import datetime
from pydantic import BaseModel


class EventResponse(BaseModel):
    id: int
    case_id: int | None = None
    actor_id: int | None = None
    event_type: str
    event_data: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True