import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    in_game_time: str = "Day 1, Morning"
    status: str = "active"
    campaign_length: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    current_location_id: uuid.UUID | None = None
    in_game_time: str | None = None
    status: str | None = None
    campaign_length: str | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    current_location_id: uuid.UUID | None
    in_game_time: str
    status: str
    campaign_length: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
