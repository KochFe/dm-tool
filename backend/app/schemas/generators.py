import uuid
from enum import Enum

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class GenerateEncounterRequest(BaseModel):
    difficulty: str = Field(default="medium", description="Encounter difficulty: easy, medium, hard, or deadly")


class GenerateNpcRequest(BaseModel):
    location_id: uuid.UUID | None = Field(default=None, description="Optional location to anchor the NPC to")
    role: str | None = Field(default=None, description="Optional role or archetype hint, e.g. 'blacksmith' or 'bandit captain'")


class LootTier(str, Enum):
    mundane = "mundane"
    standard = "standard"
    valuable = "valuable"
    legendary = "legendary"


class LootAmount(str, Enum):
    few = "few"          # 1–2 items
    some = "some"        # 3–4 items
    several = "several"  # 5–7 items
    hoard = "hoard"      # 8–12 items


class GenerateLootRequest(BaseModel):
    tier: LootTier = Field(default=LootTier.standard, description="Rarity bias for the loot")
    amount: LootAmount = Field(default=LootAmount.some, description="How many items to generate")
    context: str | None = Field(
        default=None,
        description="Free-text 'where / from whom' — e.g. 'in the bandit captain's pocket', 'corner of a damp cellar', 'dragon's hoard'.",
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class GeneratedMonster(BaseModel):
    name: str
    cr: str
    hp: int
    ac: int
    count: int


class GeneratedEncounter(BaseModel):
    description: str
    monsters: list[GeneratedMonster]
    tactical_notes: str
    difficulty: str


class GeneratedNpc(BaseModel):
    name: str
    race: str
    npc_class: str | None
    description: str
    personality: str
    secrets: str
    motivation: str
    stats: dict | None


class GeneratedLootItem(BaseModel):
    name: str
    description: str
    rarity: str
    value: str


class GeneratedLoot(BaseModel):
    items: list[GeneratedLootItem]
    total_value: str
    context: str
