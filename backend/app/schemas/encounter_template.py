import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TemplateCombatant(BaseModel):
    name: str = Field(..., min_length=1, description="Combatant display name")
    side: Literal["enemy", "ally"] = Field(default="enemy")
    count: int = Field(default=1, ge=1, le=99, description="How many to spawn")
    hp_max: int = Field(..., ge=1, description="Max HP for each spawned row")
    armor_class: int = Field(..., ge=0)
    initiative_bonus: int = Field(..., description="Signed bonus added to d20 at start")
    notes: str | None = Field(default=None, description="Free-text attacks/abilities")


class EncounterTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1)
    location_id: uuid.UUID | None = None
    notes: str | None = None
    combatants: list[TemplateCombatant] = Field(default_factory=list)


class EncounterTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    location_id: uuid.UUID | None = None
    notes: str | None = None
    combatants: list[TemplateCombatant] | None = None


class EncounterTemplateResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    location_id: uuid.UUID | None
    name: str
    notes: str | None
    combatants: list[TemplateCombatant]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PresentPC(BaseModel):
    player_character_id: uuid.UUID
    initiative: int


class StartEncounterRequest(BaseModel):
    present_pcs: list[PresentPC] = Field(default_factory=list)
    name: str | None = None
