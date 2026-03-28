import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post(
        "/api/v1/campaigns", json={"name": "Phase Test Campaign"}, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_phase(client: AsyncClient, campaign_id: str, data: dict, auth_headers: dict) -> dict:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/phases", json=data, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["data"]


async def _create_quest(client: AsyncClient, campaign_id: str, auth_headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/quests",
        json={"title": "Phase Test Quest"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_location(client: AsyncClient, campaign_id: str, auth_headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/locations",
        json={"name": "Phase Test Location", "biome": "urban"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def test_create_phase(client: AsyncClient, auth_headers):
    """Creating a phase returns 201 with correct fields and empty relationship lists."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases",
        json={"title": "Act 1", "description": "The opening act"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None
    data = body["data"]
    assert data["title"] == "Act 1"
    assert data["description"] == "The opening act"
    assert data["sort_order"] == 0
    assert data["quest_ids"] == []
    assert data["location_ids"] == []
    assert data["campaign_id"] == cid


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


async def test_list_phases_ordered(client: AsyncClient, auth_headers):
    """Phases are returned ordered by sort_order ascending."""
    cid = await _create_campaign(client, auth_headers)
    await _create_phase(client, cid, {"title": "Act 2", "sort_order": 2}, auth_headers)
    await _create_phase(client, cid, {"title": "Act 1", "sort_order": 1}, auth_headers)

    resp = await client.get(f"/api/v1/campaigns/{cid}/phases", headers=auth_headers)
    assert resp.status_code == 200
    phases = resp.json()["data"]
    assert len(phases) == 2
    assert phases[0]["sort_order"] <= phases[1]["sort_order"]
    assert phases[0]["title"] == "Act 1"
    assert phases[1]["title"] == "Act 2"


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------


async def test_get_phase(client: AsyncClient, auth_headers):
    """Retrieving a phase by ID returns the correct phase."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_phase(client, cid, {"title": "Act 1"}, auth_headers)
    phase_id = created["id"]

    resp = await client.get(f"/api/v1/phases/{phase_id}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["id"] == phase_id
    assert body["data"]["title"] == "Act 1"


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def test_update_phase(client: AsyncClient, auth_headers):
    """PATCH with new title updates the title and returns the updated phase."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_phase(client, cid, {"title": "Old Title"}, auth_headers)
    phase_id = created["id"]

    resp = await client.patch(
        f"/api/v1/phases/{phase_id}", json={"title": "New Title"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["title"] == "New Title"
    # sort_order should be unchanged
    assert data["sort_order"] == 0


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def test_delete_phase(client: AsyncClient, auth_headers):
    """Deleting a phase returns 204 and subsequent GET returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_phase(client, cid, {"title": "Doomed Phase"}, auth_headers)
    phase_id = created["id"]

    resp = await client.delete(f"/api/v1/phases/{phase_id}", headers=auth_headers)
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/phases/{phase_id}", headers=auth_headers)
    assert get_resp.status_code == 404


# ---------------------------------------------------------------------------
# Not found
# ---------------------------------------------------------------------------


async def test_phase_not_found(client: AsyncClient, auth_headers):
    """GET with a non-existent phase ID returns 404."""
    resp = await client.get(f"/api/v1/phases/{NULL_UUID}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Relationship management
# ---------------------------------------------------------------------------


async def test_set_phase_quests(client: AsyncClient, auth_headers):
    """PUT /phases/{id}/quests replaces the phase's linked quest IDs."""
    cid = await _create_campaign(client, auth_headers)
    phase_id = (await _create_phase(client, cid, {"title": "Act 1"}, auth_headers))["id"]
    quest_id = await _create_quest(client, cid, auth_headers)

    resp = await client.put(
        f"/api/v1/phases/{phase_id}/quests",
        json={"ids": [quest_id]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["quest_ids"]) == 1
    assert str(data["quest_ids"][0]) == quest_id


async def test_set_phase_locations(client: AsyncClient, auth_headers):
    """PUT /phases/{id}/locations replaces the phase's linked location IDs."""
    cid = await _create_campaign(client, auth_headers)
    phase_id = (await _create_phase(client, cid, {"title": "Act 1"}, auth_headers))["id"]
    location_id = await _create_location(client, cid, auth_headers)

    resp = await client.put(
        f"/api/v1/phases/{phase_id}/locations",
        json={"ids": [location_id]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["location_ids"]) == 1
    assert str(data["location_ids"][0]) == location_id


async def test_set_phase_quests_clear(client: AsyncClient, auth_headers):
    """PUT /phases/{id}/quests with empty list clears all linked quests."""
    cid = await _create_campaign(client, auth_headers)
    phase_id = (await _create_phase(client, cid, {"title": "Act 1"}, auth_headers))["id"]
    quest_id = await _create_quest(client, cid, auth_headers)

    # First link the quest
    await client.put(
        f"/api/v1/phases/{phase_id}/quests",
        json={"ids": [quest_id]},
        headers=auth_headers,
    )

    # Then clear it
    resp = await client.put(
        f"/api/v1/phases/{phase_id}/quests",
        json={"ids": []},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["quest_ids"] == []


# ---------------------------------------------------------------------------
# Cascade delete
# ---------------------------------------------------------------------------


async def test_phase_cascade_delete(client: AsyncClient, auth_headers):
    """Deleting a campaign cascades and subsequent GET on the phase returns 404."""
    cid = await _create_campaign(client, auth_headers)
    phase_id = (await _create_phase(client, cid, {"title": "Ephemeral Phase"}, auth_headers))["id"]

    # Verify phase exists
    get_before = await client.get(f"/api/v1/phases/{phase_id}", headers=auth_headers)
    assert get_before.status_code == 200

    # Delete the campaign
    del_resp = await client.delete(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Phase should now be gone
    get_after = await client.get(f"/api/v1/phases/{phase_id}", headers=auth_headers)
    assert get_after.status_code == 404
