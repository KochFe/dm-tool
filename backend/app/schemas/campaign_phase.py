import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class PhaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    sort_order: int = Field(default=0, ge=0)


class PhaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    description_rich: dict | None = None
    sort_order: int | None = Field(default=None, ge=0)


class PhaseLinksUpdate(BaseModel):
    ids: list[uuid.UUID]


class PhaseResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    title: str
    description: str | None
    description_rich: dict | None = None
    sort_order: int
    quest_ids: list[uuid.UUID] = Field(default_factory=list)
    location_ids: list[uuid.UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_ids(cls, data: object) -> object:
        # When constructing from an ORM object, convert relationship collections
        # (which hold full ORM instances) into plain UUID lists.
        if hasattr(data, "quests"):
            quests = data.quests or []
            locations = data.locations or []
            return {
                "id": data.id,
                "campaign_id": data.campaign_id,
                "title": data.title,
                "description": data.description,
                "description_rich": data.description_rich,
                "sort_order": data.sort_order,
                "quest_ids": [q.id for q in quests],
                "location_ids": [loc.id for loc in locations],
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data
