import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from app.schemas.generators import (
    GeneratedEncounter,
    GeneratedMonster,
    GeneratedNpc,
    GeneratedLoot,
    GeneratedLootItem,
)

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"

ENCOUNTER_URL = "/api/v1/campaigns/{campaign_id}/generate/encounter"
NPC_URL = "/api/v1/campaigns/{campaign_id}/generate/npc"
LOOT_URL = "/api/v1/campaigns/{campaign_id}/generate/loot"

# ---------------------------------------------------------------------------
# Shared mock return values
# ---------------------------------------------------------------------------

MOCK_ENCOUNTER = GeneratedEncounter(
    description="A pack of wolves emerges from the forest.",
    monsters=[GeneratedMonster(name="Wolf", cr="1/4", hp=11, ac=13, count=4)],
    tactical_notes="Wolves use pack tactics.",
    difficulty="medium",
)

MOCK_NPC = GeneratedNpc(
    name="Garrick Ironforge",
    race="Dwarf",
    npc_class="Fighter",
    description="A stocky dwarf with a braided beard.",
    personality="Gruff but fair.",
    secrets="He owes a debt to the thieves' guild.",
    motivation="Seeking redemption.",
    stats={"str": 16, "dex": 10, "con": 14, "int": 12, "wis": 13, "cha": 8},
)

MOCK_LOOT = GeneratedLoot(
    items=[
        GeneratedLootItem(
            name="Potion of Healing",
            description="Restores 2d4+2 HP",
            rarity="common",
            value="50 gp",
        )
    ],
    total_value="50 gp",
    context="Found in a bandit's knapsack.",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_campaign(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Generator Test Campaign"})
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


async def test_generate_encounter_happy_path(client: AsyncClient):
    """Valid campaign returns 200 with a GeneratedEncounter in the data envelope."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_ENCOUNTER
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "medium"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["description"] == MOCK_ENCOUNTER.description
    assert body["data"]["difficulty"] == "medium"
    assert len(body["data"]["monsters"]) == 1
    assert body["data"]["monsters"][0]["name"] == "Wolf"
    mock_gen.assert_awaited_once()


async def test_generate_npc_happy_path(client: AsyncClient):
    """Valid campaign returns 200 with a GeneratedNpc in the data envelope."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_npc", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_NPC
        resp = await client.post(
            NPC_URL.format(campaign_id=cid),
            json={"role": "blacksmith"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["name"] == MOCK_NPC.name
    assert body["data"]["race"] == "Dwarf"
    assert body["data"]["npc_class"] == "Fighter"
    mock_gen.assert_awaited_once()


async def test_generate_loot_happy_path(client: AsyncClient):
    """Valid campaign returns 200 with a GeneratedLoot in the data envelope."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_loot", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_LOOT
        resp = await client.post(
            LOOT_URL.format(campaign_id=cid),
            json={"context": "dragon hoard"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["total_value"] == "50 gp"
    assert len(body["data"]["items"]) == 1
    assert body["data"]["items"][0]["name"] == "Potion of Healing"
    mock_gen.assert_awaited_once()


# ---------------------------------------------------------------------------
# Campaign not found (404)
# ---------------------------------------------------------------------------


async def test_generate_encounter_campaign_not_found(client: AsyncClient):
    """Non-existent campaign_id returns 404 for the encounter generator."""
    resp = await client.post(
        ENCOUNTER_URL.format(campaign_id=NULL_UUID),
        json={"difficulty": "hard"},
    )
    assert resp.status_code == 404


async def test_generate_npc_campaign_not_found(client: AsyncClient):
    """Non-existent campaign_id returns 404 for the NPC generator."""
    resp = await client.post(
        NPC_URL.format(campaign_id=NULL_UUID),
        json={"role": "wizard"},
    )
    assert resp.status_code == 404


async def test_generate_loot_campaign_not_found(client: AsyncClient):
    """Non-existent campaign_id returns 404 for the loot generator."""
    resp = await client.post(
        LOOT_URL.format(campaign_id=NULL_UUID),
        json={"context": "treasure chest"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# AI service failure (503)
# ---------------------------------------------------------------------------


async def test_generate_encounter_ai_failure(client: AsyncClient):
    """A RuntimeError from the generator service propagates as 503."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.side_effect = RuntimeError("AI service unavailable")
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "easy"},
        )

    assert resp.status_code == 503
    assert resp.json()["detail"] == "AI generation failed"


async def test_generate_npc_ai_failure(client: AsyncClient):
    """A RuntimeError from the NPC generator propagates as 503."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_npc", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.side_effect = RuntimeError("GROQ_API_KEY is not configured")
        resp = await client.post(
            NPC_URL.format(campaign_id=cid),
            json={"role": "innkeeper"},
        )

    assert resp.status_code == 503
    assert "GROQ_API_KEY" in resp.json()["detail"]


async def test_generate_loot_ai_failure(client: AsyncClient):
    """A RuntimeError from the loot generator propagates as 503."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_loot", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.side_effect = RuntimeError("connection timeout")
        resp = await client.post(
            LOOT_URL.format(campaign_id=cid),
            json={"context": "dungeon chest"},
        )

    assert resp.status_code == 503
    assert "connection timeout" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Response envelope structure
# ---------------------------------------------------------------------------


async def test_generate_encounter_response_envelope(client: AsyncClient):
    """The encounter response always contains data/error/meta keys; error is None on success."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_ENCOUNTER
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "deadly"},
        )

    assert resp.status_code == 200
    body = resp.json()

    # Envelope keys must be present
    assert "data" in body
    assert "error" in body
    assert "meta" in body

    # error must be null on success
    assert body["error"] is None

    # data shape
    data = body["data"]
    assert "description" in data
    assert "monsters" in data
    assert "tactical_notes" in data
    assert "difficulty" in data
