import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IdeaCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    tag: Literal["story", "location", "character"]
    is_done: bool = False
    sort_order: int = Field(default=0, ge=0)


class IdeaUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=500)
    tag: Literal["story", "location", "character"] | None = None
    is_done: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)


class IdeaResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    text: str
    tag: str
    is_done: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
