import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PlayerCharacterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    race: str = Field(..., min_length=1, max_length=100)
    character_class: str = Field(..., min_length=1, max_length=100)
    level: int = Field(default=1, ge=1, le=20)
    hp_current: int
    hp_max: int = Field(..., ge=1)
    armor_class: int = Field(..., ge=0)
    passive_perception: int = 10
    inventory: list[Any] = Field(default_factory=list)


class PlayerCharacterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    race: str | None = Field(default=None, min_length=1, max_length=100)
    character_class: str | None = Field(default=None, min_length=1, max_length=100)
    level: int | None = Field(default=None, ge=1, le=20)
    hp_current: int | None = None
    hp_max: int | None = Field(default=None, ge=1)
    armor_class: int | None = Field(default=None, ge=0)
    passive_perception: int | None = None
    inventory: list[Any] | None = None


class PlayerCharacterResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    name: str
    race: str
    character_class: str
    level: int
    hp_current: int
    hp_max: int
    armor_class: int
    passive_perception: int
    inventory: list[Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
