import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    in_game_time: str = "Day 1, Morning"
    party_level: int = Field(default=1, ge=1, le=20)


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    current_location_id: uuid.UUID | None = None
    in_game_time: str | None = None
    party_level: int | None = Field(default=None, ge=1, le=20)
    notes: str | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    current_location_id: uuid.UUID | None
    in_game_time: str
    party_level: int
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
