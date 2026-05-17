from unittest.mock import patch

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


CHARACTER_DATA = {
    "name": "Gandalf",
    "race": "Human",
    "character_class": "Wizard",
    "level": 10,
    "hp_current": 45,
    "hp_max": 50,
    "armor_class": 12,
    "passive_perception": 14,
}


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post(
        "/api/v1/campaigns", json={"name": "Test Campaign"}, headers=auth_headers
    )
    return resp.json()["data"]["id"]


async def _create_location(client: AsyncClient, campaign_id: str, auth_headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/locations",
        json={"name": "Tomb", "biome": "dungeon"},
        headers=auth_headers,
    )
    return resp.json()["data"]["id"]


async def _create_pc(client: AsyncClient, campaign_id: str, auth_headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/characters",
        json=CHARACTER_DATA,
        headers=auth_headers,
    )
    return resp.json()["data"]["id"]


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def test_create_list_get_update_delete_template(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)

    res = await client.post(
        f"/api/v1/campaigns/{cid}/encounter-templates",
        headers=auth_headers,
        json={
            "name": "Goblin Ambush",
            "notes": "by the river",
            "combatants": [
                {
                    "name": "Goblin Archer",
                    "side": "enemy",
                    "count": 4,
                    "hp_max": 7,
                    "armor_class": 13,
                    "initiative_bonus": 2,
                    "notes": "Shortbow +3",
                }
            ],
        },
    )
    assert res.status_code == 201
    template_id = res.json()["data"]["id"]

    res = await client.get(
        f"/api/v1/campaigns/{cid}/encounter-templates", headers=auth_headers
    )
    assert res.status_code == 200
    assert len(res.json()["data"]) == 1

    res = await client.get(
        f"/api/v1/encounter-templates/{template_id}", headers=auth_headers
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Goblin Ambush"

    res = await client.patch(
        f"/api/v1/encounter-templates/{template_id}",
        headers=auth_headers,
        json={
            "name": "Goblin Ambush (revised)",
            "combatants": [
                {
                    "name": "Hobgoblin",
                    "side": "enemy",
                    "count": 1,
                    "hp_max": 11,
                    "armor_class": 18,
                    "initiative_bonus": 1,
                }
            ],
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Goblin Ambush (revised)"
    assert len(res.json()["data"]["combatants"]) == 1

    res = await client.delete(
        f"/api/v1/encounter-templates/{template_id}", headers=auth_headers
    )
    assert res.status_code == 200

    res = await client.get(
        f"/api/v1/encounter-templates/{template_id}", headers=auth_headers
    )
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Ownership
# ---------------------------------------------------------------------------


async def test_cross_tenant_404_on_create(client: AsyncClient, auth_headers, auth_headers_b):
    cid_a = await _create_campaign(client, auth_headers)
    res = await client.post(
        f"/api/v1/campaigns/{cid_a}/encounter-templates",
        headers=auth_headers_b,
        json={"name": "Sneaky", "combatants": []},
    )
    assert res.status_code == 404


async def test_cross_tenant_404_on_get(client: AsyncClient, auth_headers, auth_headers_b):
    cid = await _create_campaign(client, auth_headers)
    res = await client.post(
        f"/api/v1/campaigns/{cid}/encounter-templates",
        headers=auth_headers,
        json={"name": "Mine", "combatants": []},
    )
    template_id = res.json()["data"]["id"]
    res = await client.get(
        f"/api/v1/encounter-templates/{template_id}", headers=auth_headers_b
    )
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Location SET NULL
# ---------------------------------------------------------------------------


async def test_location_set_null_when_location_deleted(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    loc_id = await _create_location(client, cid, auth_headers)

    res = await client.post(
        f"/api/v1/campaigns/{cid}/encounter-templates",
        headers=auth_headers,
        json={
            "name": "At the Tomb",
            "location_id": loc_id,
            "combatants": [],
        },
    )
    template_id = res.json()["data"]["id"]

    res = await client.delete(
        f"/api/v1/locations/{loc_id}", headers=auth_headers
    )
    assert res.status_code in (200, 204)

    res = await client.get(
        f"/api/v1/encounter-templates/{template_id}", headers=auth_headers
    )
    assert res.json()["data"]["location_id"] is None


# ---------------------------------------------------------------------------
# Start encounter
# ---------------------------------------------------------------------------


async def test_start_encounter_expands_count_and_creates_session(
    client: AsyncClient, auth_headers
):
    cid = await _create_campaign(client, auth_headers)
    pc_id = await _create_pc(client, cid, auth_headers)

    res = await client.post(
        f"/api/v1/campaigns/{cid}/encounter-templates",
        headers=auth_headers,
        json={
            "name": "Ambush",
            "combatants": [
                {
                    "name": "Goblin",
                    "count": 3,
                    "hp_max": 7,
                    "armor_class": 13,
                    "initiative_bonus": 2,
                },
                {
                    "name": "Hobgoblin Captain",
                    "side": "ally",
                    "count": 1,
                    "hp_max": 11,
                    "armor_class": 18,
                    "initiative_bonus": 1,
                },
            ],
        },
    )
    template_id = res.json()["data"]["id"]

    with patch(
        "app.services.encounter_template_service.random.randint", return_value=10
    ):
        res = await client.post(
            f"/api/v1/encounter-templates/{template_id}/start",
            headers=auth_headers,
            json={
                "present_pcs": [
                    {"player_character_id": pc_id, "initiative": 15}
                ]
            },
        )

    assert res.status_code == 201
    data = res.json()["data"]
    assert len(data["combatants"]) == 5
    names = [c["name"] for c in data["combatants"]]
    assert "Goblin 1" in names and "Goblin 2" in names and "Goblin 3" in names
    assert "Hobgoblin Captain" in names
    sides = {c["name"]: c["side"] for c in data["combatants"]}
    assert sides["Goblin 1"] == "enemy"
    assert sides["Hobgoblin Captain"] == "ally"
    assert sides["Gandalf"] == "pc"


async def test_start_encounter_carries_notes_to_session_and_combatants(
    client: AsyncClient, auth_headers
):
    cid = await _create_campaign(client, auth_headers)
    res = await client.post(
        f"/api/v1/campaigns/{cid}/encounter-templates",
        headers=auth_headers,
        json={
            "name": "Tomb fight",
            "notes": "Set the scene: torches flicker.",
            "combatants": [
                {
                    "name": "Skeleton",
                    "count": 2,
                    "hp_max": 13,
                    "armor_class": 13,
                    "initiative_bonus": 2,
                    "notes": "Shortbow +4, Shortsword +4",
                }
            ],
        },
    )
    template_id = res.json()["data"]["id"]
    res = await client.post(
        f"/api/v1/encounter-templates/{template_id}/start",
        headers=auth_headers,
        json={"present_pcs": []},
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["notes"] == "Set the scene: torches flicker."
    for c in data["combatants"]:
        assert c["notes"] == "Shortbow +4, Shortsword +4"


async def test_start_encounter_422_when_pc_not_in_campaign(
    client: AsyncClient, auth_headers, auth_headers_b
):
    cid_a = await _create_campaign(client, auth_headers)
    cid_b = await _create_campaign(client, auth_headers_b)
    other_pc_id = await _create_pc(client, cid_b, auth_headers_b)

    res = await client.post(
        f"/api/v1/campaigns/{cid_a}/encounter-templates",
        headers=auth_headers,
        json={"name": "Ambush", "combatants": []},
    )
    template_id = res.json()["data"]["id"]

    res = await client.post(
        f"/api/v1/encounter-templates/{template_id}/start",
        headers=auth_headers,
        json={
            "present_pcs": [
                {"player_character_id": other_pc_id, "initiative": 12}
            ]
        },
    )
    assert res.status_code == 422
