import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NpcCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    race: str = Field(..., min_length=1, max_length=100)
    npc_class: str | None = Field(default=None, max_length=100)
    description: str | None = None
    personality: str | None = None
    secrets: str | None = None
    motivation: str | None = None
    stats: dict | None = None  # e.g. {"str": 10, "dex": 14, ...}
    location_id: uuid.UUID | None = None
    is_alive: bool = True


class NpcUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    race: str | None = Field(default=None, min_length=1, max_length=100)
    npc_class: str | None = Field(default=None, max_length=100)
    description: str | None = None
    personality: str | None = None
    secrets: str | None = None
    motivation: str | None = None
    stats: dict | None = None
    location_id: uuid.UUID | None = None
    is_alive: bool | None = None


class NpcResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    location_id: uuid.UUID | None
    name: str
    race: str
    npc_class: str | None
    description: str | None
    personality: str | None
    secrets: str | None
    motivation: str | None
    stats: dict | None
    is_alive: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
