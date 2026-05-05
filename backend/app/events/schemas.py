from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int | None = None
    actor_id: int | None = None
    event_type: str
    event_data: str | None = None
    previous_hash: str | None = None
    event_hash: str | None = None
    created_at: datetime
