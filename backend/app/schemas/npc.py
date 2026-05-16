import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NpcStats(BaseModel):
    """Six D&D ability scores. Bounds 1-30 (canonical range)."""

    str_: int = Field(alias="str", ge=1, le=30)
    dex: int = Field(ge=1, le=30)
    con: int = Field(ge=1, le=30)
    int_: int = Field(alias="int", ge=1, le=30)
    wis: int = Field(ge=1, le=30)
    cha: int = Field(ge=1, le=30)

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class NpcCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    race: str = Field(..., min_length=1, max_length=100)
    npc_class: str | None = Field(default=None, max_length=100)
    description: str | None = None
    personality: str | None = None
    secrets: str | None = None
    motivation: str | None = None
    stats: NpcStats | None = None
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
    stats: NpcStats | None = None
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
    stats: NpcStats | None
    is_alive: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
