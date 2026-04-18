import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _create_campaign_and_phase(client: AsyncClient, auth_headers: dict) -> tuple[str, str]:
    cresp = await client.post(
        "/api/v1/campaigns",
        json={"name": "Apply Test"},
        headers=auth_headers,
    )
    cid = cresp.json()["data"]["id"]
    presp = await client.post(
        f"/api/v1/campaigns/{cid}/phases",
        json={"title": "Act I", "sort_order": 0},
        headers=auth_headers,
    )
    return cid, presp.json()["data"]["id"]


async def test_apply_empty_bundle_updates_nothing(client: AsyncClient, auth_headers):
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases/{pid}/expand/apply",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["created_location_ids"] == []
    assert data["created_npc_ids"] == []
    assert data["created_quest_ids"] == []


async def test_apply_creates_location_npc_and_quest(client: AsyncClient, auth_headers):
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    payload = {
        "phase_description": "The party enters the brewery district.",
        "accepted_locations": [
            {"name": "The Foaming Stein", "description": "A cozy brewery.", "region": "Market Ward"}
        ],
        "accepted_npcs": [
            {
                "name": "Hilda",
                "role": "brewer",
                "personality": "Curt but kind.",
                "motivation": "Protect her recipes.",
                "location_index": 0,
            }
        ],
        "accepted_quests": [
            {
                "title": "The Missing Cask",
                "description": "Hilda's prize cask has vanished.",
                "npc_indices": [0],
                "location_indices": [0],
            }
        ],
    }
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases/{pid}/expand/apply",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["created_location_ids"]) == 1
    assert len(data["created_npc_ids"]) == 1
    assert len(data["created_quest_ids"]) == 1

    # Verify phase description was updated — use the flat GET /phases/{id} endpoint
    phase_resp = await client.get(
        f"/api/v1/phases/{pid}", headers=auth_headers
    )
    assert phase_resp.json()["data"]["description"] == "The party enters the brewery district."


async def test_apply_reuse_existing_location(client: AsyncClient, auth_headers):
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    # Pre-create a location
    lresp = await client.post(
        f"/api/v1/campaigns/{cid}/locations",
        json={"name": "Old Tavern", "biome": "urban"},
        headers=auth_headers,
    )
    assert lresp.status_code == 201
    existing_id = lresp.json()["data"]["id"]

    payload = {
        "accepted_locations": [
            {
                "name": "Old Tavern",
                "description": "(reused)",
                "reuse_id": existing_id,
            }
        ],
    }
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases/{pid}/expand/apply",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["created_location_ids"] == []
    assert data["linked_location_ids"] == [existing_id]
