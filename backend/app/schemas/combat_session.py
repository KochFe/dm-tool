import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CombatantData(BaseModel):
    name: str = Field(..., description="Combatant name")
    initiative: int = Field(..., description="Initiative roll result")
    hp_current: int = Field(..., description="Current hit points")
    hp_max: int = Field(..., ge=1, description="Maximum hit points")
    armor_class: int = Field(..., ge=0, description="Armor class")
    type: Literal["pc", "monster"] = Field(..., description="Combatant type")
    player_character_id: uuid.UUID | None = Field(
        default=None, description="Linked player character ID, if type is 'pc'"
    )
    conditions: list[str] = Field(default_factory=list, description="Active conditions (e.g. Poisoned, Stunned)")


class CombatSessionCreate(BaseModel):
    name: str | None = Field(default=None, description="Optional session name")
    combatants: list[CombatantData] = Field(
        default_factory=list, description="Initial combatants to add"
    )


class CombatSessionUpdate(BaseModel):
    name: str | None = Field(default=None, description="New session name")
    status: Literal["active", "completed"] | None = Field(
        default=None, description="New session status"
    )


class AddCombatantRequest(BaseModel):
    name: str = Field(..., description="Combatant name")
    initiative: int = Field(..., description="Initiative roll result")
    hp_current: int = Field(..., description="Current hit points")
    hp_max: int = Field(..., ge=1, description="Maximum hit points")
    armor_class: int = Field(..., ge=0, description="Armor class")
    type: Literal["pc", "monster"] = Field(..., description="Combatant type")
    player_character_id: uuid.UUID | None = Field(
        default=None, description="Linked player character ID, if type is 'pc'"
    )


class UpdateCombatantRequest(BaseModel):
    name: str | None = Field(default=None, description="New combatant name")
    initiative: int | None = Field(default=None, description="New initiative value")
    hp_current: int | None = Field(default=None, description="New current hit points")
    hp_max: int | None = Field(default=None, description="New maximum hit points")
    armor_class: int | None = Field(default=None, description="New armor class")
    conditions: list[str] | None = Field(default=None, description="Updated conditions list")


class CombatSessionResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    name: str | None
    combatants: list[CombatantData]
    current_turn_index: int
    round_number: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
