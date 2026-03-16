import uuid

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class GenerateEncounterRequest(BaseModel):
    difficulty: str = Field(default="medium", description="Encounter difficulty: easy, medium, hard, or deadly")


class GenerateNpcRequest(BaseModel):
    location_id: uuid.UUID | None = Field(default=None, description="Optional location to anchor the NPC to")
    role: str | None = Field(default=None, description="Optional role or archetype hint, e.g. 'blacksmith' or 'bandit captain'")


class GenerateLootRequest(BaseModel):
    context: str | None = Field(default=None, description="Optional narrative context for the loot, e.g. 'dragon hoard' or 'bandit chest'")


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
