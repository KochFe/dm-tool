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
    strength: int = Field(default=10, ge=1, le=30, description="Strength ability score (1–30)")
    dexterity: int = Field(default=10, ge=1, le=30, description="Dexterity ability score (1–30)")
    constitution: int = Field(default=10, ge=1, le=30, description="Constitution ability score (1–30)")
    intelligence: int = Field(default=10, ge=1, le=30, description="Intelligence ability score (1–30)")
    wisdom: int = Field(default=10, ge=1, le=30, description="Wisdom ability score (1–30)")
    charisma: int = Field(default=10, ge=1, le=30, description="Charisma ability score (1–30)")
    proficiency_bonus: int = Field(default=2, ge=2, le=6, description="Proficiency bonus (2–6 based on level)")
    speed: int = Field(default=30, ge=0, description="Movement speed in feet")
    saving_throw_proficiencies: list[str] = Field(
        default_factory=list,
        description="Ability score keys the character is proficient in for saving throws (e.g. ['str', 'con'])",
    )
    skill_proficiencies: list[str] = Field(
        default_factory=list,
        description="Skill names the character is proficient in (e.g. ['perception', 'stealth'])",
    )
    spell_slots: dict = Field(
        default_factory=dict,
        description="Spell slot counts keyed by spell level (e.g. {'1': 4, '2': 3})",
    )


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
    strength: int | None = Field(default=None, ge=1, le=30, description="Strength ability score (1–30)")
    dexterity: int | None = Field(default=None, ge=1, le=30, description="Dexterity ability score (1–30)")
    constitution: int | None = Field(default=None, ge=1, le=30, description="Constitution ability score (1–30)")
    intelligence: int | None = Field(default=None, ge=1, le=30, description="Intelligence ability score (1–30)")
    wisdom: int | None = Field(default=None, ge=1, le=30, description="Wisdom ability score (1–30)")
    charisma: int | None = Field(default=None, ge=1, le=30, description="Charisma ability score (1–30)")
    proficiency_bonus: int | None = Field(default=None, ge=2, le=6, description="Proficiency bonus (2–6 based on level)")
    speed: int | None = Field(default=None, ge=0, description="Movement speed in feet")
    saving_throw_proficiencies: list[str] | None = Field(
        default=None,
        description="Ability score keys the character is proficient in for saving throws (e.g. ['str', 'con'])",
    )
    skill_proficiencies: list[str] | None = Field(
        default=None,
        description="Skill names the character is proficient in (e.g. ['perception', 'stealth'])",
    )
    spell_slots: dict | None = Field(
        default=None,
        description="Spell slot counts keyed by spell level (e.g. {'1': 4, '2': 3})",
    )


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
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int
    proficiency_bonus: int
    speed: int
    saving_throw_proficiencies: list
    skill_proficiencies: list
    spell_slots: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
