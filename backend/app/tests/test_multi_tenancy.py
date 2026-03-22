"""Cross-user isolation tests for multi-tenancy.

Verifies that User B cannot access, modify, or delete User A's campaigns
or any entities nested under them.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _create_campaign_with_entities(client: AsyncClient, headers: dict) -> dict:
    """Helper: create a campaign with one character, location, NPC, quest, and combat session."""
    camp = await client.post("/api/v1/campaigns", json={"name": "User A Campaign"}, headers=headers)
    cid = camp.json()["data"]["id"]

    char = await client.post(
        f"/api/v1/campaigns/{cid}/characters",
        json={
            "name": "Fighter",
            "race": "Human",
            "character_class": "Fighter",
            "level": 5,
            "hp_current": 45,
            "hp_max": 52,
            "armor_class": 16,
        },
        headers=headers,
    )
    loc = await client.post(
        f"/api/v1/campaigns/{cid}/locations",
        json={"name": "Tavern", "biome": "urban"},
        headers=headers,
    )
    npc = await client.post(
        f"/api/v1/campaigns/{cid}/npcs",
        json={"name": "Bartender", "race": "Dwarf"},
        headers=headers,
    )
    quest = await client.post(
        f"/api/v1/campaigns/{cid}/quests",
        json={"title": "Find the Key"},
        headers=headers,
    )
    combat = await client.post(
        f"/api/v1/campaigns/{cid}/combat-sessions",
        json={
            "name": "Tavern Brawl",
            "combatants": [
                {
                    "name": "Goblin",
                    "initiative": 15,
                    "hp_current": 7,
                    "hp_max": 7,
                    "armor_class": 13,
                    "type": "monster",
                }
            ],
        },
        headers=headers,
    )

    return {
        "campaign_id": cid,
        "character_id": char.json()["data"]["id"],
        "location_id": loc.json()["data"]["id"],
        "npc_id": npc.json()["data"]["id"],
        "quest_id": quest.json()["data"]["id"],
        "combat_session_id": combat.json()["data"]["id"],
    }


# --- Campaign isolation ---

async def test_user_b_cannot_list_user_a_campaigns(
    client: AsyncClient, auth_headers, auth_headers_b
):
    await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    resp = await client.get("/api/v1/campaigns", headers=auth_headers_b)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 0


async def test_user_b_cannot_get_user_a_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    camp = await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    cid = camp.json()["data"]["id"]
    resp = await client.get(f"/api/v1/campaigns/{cid}", headers=auth_headers_b)
    assert resp.status_code == 404


async def test_user_b_cannot_update_user_a_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    camp = await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    cid = camp.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/campaigns/{cid}", json={"name": "Hacked"}, headers=auth_headers_b)
    assert resp.status_code == 404


async def test_user_b_cannot_delete_user_a_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    camp = await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    cid = camp.json()["data"]["id"]
    resp = await client.delete(f"/api/v1/campaigns/{cid}", headers=auth_headers_b)
    assert resp.status_code == 404


# --- Nested route isolation ---

async def test_user_b_cannot_create_in_user_a_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    camp = await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    cid = camp.json()["data"]["id"]

    resp = await client.post(
        f"/api/v1/campaigns/{cid}/characters",
        json={
            "name": "Rogue",
            "race": "Elf",
            "character_class": "Rogue",
            "level": 1,
            "hp_current": 8,
            "hp_max": 8,
            "armor_class": 13,
        },
        headers=auth_headers_b,
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/campaigns/{cid}/locations",
        json={"name": "Forest", "biome": "forest"},
        headers=auth_headers_b,
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/campaigns/{cid}/npcs",
        json={"name": "Villain", "race": "Human"},
        headers=auth_headers_b,
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/campaigns/{cid}/quests",
        json={"title": "Steal Gold"},
        headers=auth_headers_b,
    )
    assert resp.status_code == 404

    resp = await client.post(
        f"/api/v1/campaigns/{cid}/combat-sessions",
        json={"name": "Ambush", "combatants": []},
        headers=auth_headers_b,
    )
    # Empty combatants is valid; ownership check should fire first
    assert resp.status_code == 404


async def test_user_b_cannot_list_user_a_entities(
    client: AsyncClient, auth_headers, auth_headers_b
):
    ids = await _create_campaign_with_entities(client, auth_headers)
    cid = ids["campaign_id"]

    for path in ["characters", "locations", "npcs", "quests", "combat-sessions"]:
        resp = await client.get(f"/api/v1/campaigns/{cid}/{path}", headers=auth_headers_b)
        assert resp.status_code == 404, f"Expected 404 for {path}, got {resp.status_code}"


# --- Flat route isolation ---

async def test_user_b_cannot_access_user_a_character(
    client: AsyncClient, auth_headers, auth_headers_b
):
    ids = await _create_campaign_with_entities(client, auth_headers)
    char_id = ids["character_id"]

    assert (await client.get(f"/api/v1/characters/{char_id}", headers=auth_headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/characters/{char_id}", json={"name": "Hacked"}, headers=auth_headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/characters/{char_id}", headers=auth_headers_b)).status_code == 404


async def test_user_b_cannot_access_user_a_location(
    client: AsyncClient, auth_headers, auth_headers_b
):
    ids = await _create_campaign_with_entities(client, auth_headers)
    loc_id = ids["location_id"]

    assert (await client.get(f"/api/v1/locations/{loc_id}", headers=auth_headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/locations/{loc_id}", json={"name": "Hacked"}, headers=auth_headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/locations/{loc_id}", headers=auth_headers_b)).status_code == 404


async def test_user_b_cannot_access_user_a_npc(
    client: AsyncClient, auth_headers, auth_headers_b
):
    ids = await _create_campaign_with_entities(client, auth_headers)
    npc_id = ids["npc_id"]

    assert (await client.get(f"/api/v1/npcs/{npc_id}", headers=auth_headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/npcs/{npc_id}", json={"name": "Hacked"}, headers=auth_headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/npcs/{npc_id}", headers=auth_headers_b)).status_code == 404


async def test_user_b_cannot_access_user_a_quest(
    client: AsyncClient, auth_headers, auth_headers_b
):
    ids = await _create_campaign_with_entities(client, auth_headers)
    quest_id = ids["quest_id"]

    assert (await client.get(f"/api/v1/quests/{quest_id}", headers=auth_headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/quests/{quest_id}", json={"title": "Hacked"}, headers=auth_headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/quests/{quest_id}", headers=auth_headers_b)).status_code == 404


async def test_user_b_cannot_access_user_a_combat_session(
    client: AsyncClient, auth_headers, auth_headers_b
):
    ids = await _create_campaign_with_entities(client, auth_headers)
    sid = ids["combat_session_id"]

    assert (await client.get(f"/api/v1/combat-sessions/{sid}", headers=auth_headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/combat-sessions/{sid}", json={"name": "Hacked"}, headers=auth_headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/combat-sessions/{sid}", headers=auth_headers_b)).status_code == 404

    # Combatant sub-routes
    assert (await client.post(
        f"/api/v1/combat-sessions/{sid}/combatants",
        json={"name": "Spy", "initiative": 20, "hp_current": 10, "hp_max": 10, "armor_class": 15, "type": "monster"},
        headers=auth_headers_b,
    )).status_code == 404
    assert (await client.post(f"/api/v1/combat-sessions/{sid}/next-turn", headers=auth_headers_b)).status_code == 404


# --- AI route isolation ---

async def test_user_b_cannot_chat_in_user_a_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    camp = await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    cid = camp.json()["data"]["id"]
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/chat",
        json={"messages": [{"role": "user", "content": "Hello"}]},
        headers=auth_headers_b,
    )
    assert resp.status_code == 404


async def test_user_b_cannot_generate_in_user_a_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    camp = await client.post("/api/v1/campaigns", json={"name": "A's Campaign"}, headers=auth_headers)
    cid = camp.json()["data"]["id"]

    for gen_type, body in [
        ("encounter", {"difficulty": "medium"}),
        ("npc", {}),
        ("loot", {}),
    ]:
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/generate/{gen_type}",
            json=body,
            headers=auth_headers_b,
        )
        assert resp.status_code == 404, f"Expected 404 for {gen_type}, got {resp.status_code}"


# --- Positive: User A can access own data ---

async def test_user_a_can_access_own_data(
    client: AsyncClient, auth_headers
):
    ids = await _create_campaign_with_entities(client, auth_headers)

    assert (await client.get(f"/api/v1/campaigns/{ids['campaign_id']}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/api/v1/characters/{ids['character_id']}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/api/v1/locations/{ids['location_id']}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/api/v1/npcs/{ids['npc_id']}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/api/v1/quests/{ids['quest_id']}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/api/v1/combat-sessions/{ids['combat_session_id']}", headers=auth_headers)).status_code == 200
