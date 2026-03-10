import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class QuestCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Quest title")
    description: str | None = Field(default=None, description="Quest description and details")
    status: Literal["not_started", "in_progress", "completed", "failed"] = Field(
        default="not_started", description="Current quest status"
    )
    reward: str | None = Field(default=None, description="Quest reward description")
    level: int | None = Field(default=None, ge=1, le=20, description="Recommended party level (1-20)")
    location_id: uuid.UUID | None = Field(default=None, description="Associated location ID")


class QuestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, description="Quest title")
    description: str | None = Field(default=None, description="Quest description and details")
    status: Literal["not_started", "in_progress", "completed", "failed"] | None = Field(
        default=None, description="Current quest status"
    )
    reward: str | None = Field(default=None, description="Quest reward description")
    level: int | None = Field(default=None, ge=1, le=20, description="Recommended party level (1-20)")
    location_id: uuid.UUID | None = Field(default=None, description="Associated location ID")


class QuestResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    location_id: uuid.UUID | None
    title: str
    description: str | None
    status: str
    reward: str | None
    level: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
