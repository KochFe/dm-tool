import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    biome: str = Field(default="urban", min_length=1, max_length=100)


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    biome: str | None = Field(default=None, min_length=1, max_length=100)


class LocationResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    name: str
    description: str | None
    biome: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
