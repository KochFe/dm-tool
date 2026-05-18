import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


SessionNoteStatus = Literal["open", "closed"]


class CampaignSessionNoteUpdate(BaseModel):
    title: str | None = None
    body: str | None = None


class CampaignSessionNoteResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    title: str | None
    body: str | None
    status: SessionNoteStatus
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None

    model_config = {"from_attributes": True}


class RecapRequest(BaseModel):
    provider: str = Field(..., min_length=1, description="LLMProvider id, e.g. 'groq' or 'deepseek'")
    last_n: int | None = Field(default=None, ge=1, le=10)
    entry_ids: list[uuid.UUID] | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> "RecapRequest":
        if (self.last_n is None) == (self.entry_ids is None):
            raise ValueError("Provide exactly one of last_n or entry_ids")
        return self
