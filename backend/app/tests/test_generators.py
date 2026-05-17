import itertools

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from pydantic import ValidationError

from app.schemas.generators import (
    GeneratedEncounter,
    GeneratedMonster,
    GeneratedNpc,
    GeneratedLoot,
    GeneratedLootItem,
    GenerateLootRequest,
    LootTier,
    LootAmount,
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


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Generator Test Campaign"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


async def test_generate_encounter_happy_path(client: AsyncClient, auth_headers):
    """Valid campaign returns 200 with a GeneratedEncounter in the data envelope."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_ENCOUNTER
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "medium"},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["description"] == MOCK_ENCOUNTER.description
    assert body["data"]["difficulty"] == "medium"
    assert len(body["data"]["monsters"]) == 1
    assert body["data"]["monsters"][0]["name"] == "Wolf"
    mock_gen.assert_awaited_once()


async def test_generate_npc_happy_path(client: AsyncClient, auth_headers):
    """Valid campaign returns 200 with a GeneratedNpc in the data envelope."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_npc", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_NPC
        resp = await client.post(
            NPC_URL.format(campaign_id=cid),
            json={"role": "blacksmith"},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["name"] == MOCK_NPC.name
    assert body["data"]["race"] == "Dwarf"
    assert body["data"]["npc_class"] == "Fighter"
    mock_gen.assert_awaited_once()


async def test_generate_loot_happy_path(client: AsyncClient, auth_headers):
    """Valid campaign returns 200 with a GeneratedLoot in the data envelope."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_loot", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_LOOT
        resp = await client.post(
            LOOT_URL.format(campaign_id=cid),
            json={"context": "dragon hoard"},
            headers=auth_headers,
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


async def test_generate_encounter_campaign_not_found(client: AsyncClient, auth_headers):
    """Non-existent campaign_id returns 404 for the encounter generator."""
    resp = await client.post(
        ENCOUNTER_URL.format(campaign_id=NULL_UUID),
        json={"difficulty": "hard"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


async def test_generate_npc_campaign_not_found(client: AsyncClient, auth_headers):
    """Non-existent campaign_id returns 404 for the NPC generator."""
    resp = await client.post(
        NPC_URL.format(campaign_id=NULL_UUID),
        json={"role": "wizard"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


async def test_generate_loot_campaign_not_found(client: AsyncClient, auth_headers):
    """Non-existent campaign_id returns 404 for the loot generator."""
    resp = await client.post(
        LOOT_URL.format(campaign_id=NULL_UUID),
        json={"context": "treasure chest"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# AI service failure (503)
# ---------------------------------------------------------------------------


async def test_generate_encounter_ai_failure(client: AsyncClient, auth_headers):
    """A RuntimeError from the generator service propagates as 503."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.side_effect = RuntimeError("AI service unavailable")
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "easy"},
            headers=auth_headers,
        )

    assert resp.status_code == 503
    assert resp.json()["detail"] == "AI generation failed"


async def test_generate_npc_ai_failure(client: AsyncClient, auth_headers):
    """A RuntimeError from the NPC generator propagates as 503."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_npc", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.side_effect = RuntimeError("GROQ_API_KEY is not configured")
        resp = await client.post(
            NPC_URL.format(campaign_id=cid),
            json={"role": "innkeeper"},
            headers=auth_headers,
        )

    assert resp.status_code == 503
    assert resp.json()["detail"] == "AI generation failed"


async def test_generate_loot_ai_failure(client: AsyncClient, auth_headers):
    """A RuntimeError from the loot generator propagates as 503."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_loot", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.side_effect = RuntimeError("connection timeout")
        resp = await client.post(
            LOOT_URL.format(campaign_id=cid),
            json={"context": "dungeon chest"},
            headers=auth_headers,
        )

    assert resp.status_code == 503
    assert resp.json()["detail"] == "AI generation failed"


# ---------------------------------------------------------------------------
# Response envelope structure
# ---------------------------------------------------------------------------


async def test_generate_encounter_response_envelope(client: AsyncClient, auth_headers):
    """The encounter response always contains data/error/meta keys; error is None on success."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_ENCOUNTER
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "deadly"},
            headers=auth_headers,
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


# ---------------------------------------------------------------------------
# Accept-Language header propagation
# ---------------------------------------------------------------------------


async def test_encounter_endpoint_uses_german_prompt_when_accept_language_de(
    client: AsyncClient, auth_headers
):
    """Accept-Language: de should resolve to Language.DE in the service call."""
    from app.schemas.language import Language

    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_ENCOUNTER
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "medium"},
            headers={**auth_headers, "Accept-Language": "de"},
        )

    assert resp.status_code == 200
    mock_gen.assert_awaited_once()
    assert mock_gen.await_args.kwargs.get("language") == Language.DE


async def test_encounter_endpoint_defaults_to_english_when_header_missing(
    client: AsyncClient, auth_headers
):
    """No Accept-Language header should default the service call to Language.EN."""
    from app.schemas.language import Language

    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.generators.generate_encounter", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = MOCK_ENCOUNTER
        resp = await client.post(
            ENCOUNTER_URL.format(campaign_id=cid),
            json={"difficulty": "medium"},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    assert mock_gen.await_args.kwargs.get("language") == Language.EN


# ---------------------------------------------------------------------------
# GenerateLootRequest schema unit tests
# ---------------------------------------------------------------------------


def test_generate_loot_request_defaults():
    req = GenerateLootRequest()
    assert req.tier == LootTier.standard
    assert req.amount == LootAmount.some
    assert req.context is None


def test_generate_loot_request_rejects_invalid_tier():
    with pytest.raises(ValidationError):
        GenerateLootRequest(tier="epic")


def test_tier_guidance_dicts_complete():
    from app.ai.prompts.en import TIER_GUIDANCE as TIER_GUIDANCE_EN, AMOUNT_RANGE as AMOUNT_RANGE_EN
    from app.ai.prompts.de import TIER_GUIDANCE as TIER_GUIDANCE_DE, AMOUNT_RANGE as AMOUNT_RANGE_DE

    for tier in LootTier:
        assert tier in TIER_GUIDANCE_EN, f"missing EN tier: {tier}"
        assert tier in TIER_GUIDANCE_DE, f"missing DE tier: {tier}"
        assert TIER_GUIDANCE_EN[tier].strip()
        assert TIER_GUIDANCE_DE[tier].strip()

    for amount in LootAmount:
        assert amount in AMOUNT_RANGE_EN, f"missing EN amount: {amount}"
        assert amount in AMOUNT_RANGE_DE, f"missing DE amount: {amount}"
        assert AMOUNT_RANGE_EN[amount].strip()
        assert AMOUNT_RANGE_DE[amount].strip()


@pytest.mark.parametrize(
    "tier,amount",
    list(itertools.product(
        ["mundane", "standard", "valuable", "legendary"],
        ["few", "some", "several", "hoard"],
    )),
)
def test_loot_prompt_renders_for_all_tier_amount_combos(tier, amount):
    from app.ai.prompts.en import (
        AMOUNT_RANGE as AMOUNT_RANGE_EN,
        LOOT_GENERATOR_PROMPT as PROMPT_EN,
        TIER_GUIDANCE as TIER_GUIDANCE_EN,
    )
    from app.ai.prompts.de import (
        AMOUNT_RANGE as AMOUNT_RANGE_DE,
        LOOT_GENERATOR_PROMPT as PROMPT_DE,
        TIER_GUIDANCE as TIER_GUIDANCE_DE,
    )

    t = LootTier(tier)
    a = LootAmount(amount)

    rendered_en = PROMPT_EN.format(
        party_level=5,
        location_name="Goblin Cave",
        biome="cavern",
        tier_guidance=TIER_GUIDANCE_EN[t],
        count_range=AMOUNT_RANGE_EN[a],
        context="in the goblin chief's hut",
    )
    rendered_de = PROMPT_DE.format(
        party_level=5,
        location_name="Goblin Cave",
        biome="cavern",
        tier_guidance=TIER_GUIDANCE_DE[t],
        count_range=AMOUNT_RANGE_DE[a],
        context="in the goblin chief's hut",
    )

    assert TIER_GUIDANCE_EN[t] in rendered_en
    assert AMOUNT_RANGE_EN[a] in rendered_en
    assert "in the goblin chief's hut" in rendered_en
    assert TIER_GUIDANCE_DE[t] in rendered_de
    assert AMOUNT_RANGE_DE[a] in rendered_de


async def test_generate_loot_passes_tier_and_amount_into_prompt(monkeypatch):
    from app.services import generator_service
    from app.schemas.generators import (
        GeneratedLoot,
        GeneratedLootItem,
    )

    captured_prompt: dict[str, str] = {}

    class FakeStructured:
        async def ainvoke(self, prompt: str):
            captured_prompt["text"] = prompt
            return GeneratedLoot(
                items=[GeneratedLootItem(
                    name="x", description="y", rarity="common", value="1 gp",
                )],
                total_value="1 gp",
                context="here",
            )

    class FakeLLM:
        def with_structured_output(self, _schema):
            return FakeStructured()

    monkeypatch.setattr(generator_service, "_get_llm", lambda temperature=1.0: FakeLLM())

    await generator_service.generate_loot(
        campaign_context={
            "party_level": 5,
            "location_name": "Cave",
            "biome": "cavern",
        },
        context="in the chief's hut",
        tier=LootTier.legendary,
        amount=LootAmount.hoard,
    )

    assert "legendary" in captured_prompt["text"].lower()
    assert "8–12" in captured_prompt["text"]
    assert "in the chief's hut" in captured_prompt["text"]


async def test_generate_loot_endpoint_forwards_tier_and_amount(
    client: AsyncClient,
    auth_headers,
    monkeypatch,
):
    from app.routers import generators as generators_router
    from app.schemas.generators import GeneratedLoot, GeneratedLootItem

    captured: dict = {}

    async def fake_generate_loot(campaign_context, context=None, *, tier=None, amount=None, language=None):
        captured["tier"] = tier
        captured["amount"] = amount
        captured["context"] = context
        return GeneratedLoot(
            items=[GeneratedLootItem(name="x", description="y", rarity="common", value="1 gp")],
            total_value="1 gp",
            context="here",
        )

    monkeypatch.setattr(generators_router, "generate_loot", fake_generate_loot)

    cid = await _create_campaign(client, auth_headers)

    response = await client.post(
        LOOT_URL.format(campaign_id=cid),
        json={"tier": "valuable", "amount": "hoard", "context": "in the captain's pocket"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert captured["tier"].value == "valuable"
    assert captured["amount"].value == "hoard"
    assert captured["context"] == "in the captain's pocket"
