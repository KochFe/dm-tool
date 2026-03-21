import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"

MINIMAL_QUEST = {
    "title": "Find the Lost Sword",
}

FULL_QUEST = {
    "title": "Retrieve the Arcane Tome",
    "description": "An ancient tome of forbidden spells has been stolen from the Arcane Library.",
    "status": "in_progress",
    "reward": "500 gold pieces and a spell scroll of your choice.",
    "level": 5,
}


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Quest Test Campaign"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_location(client: AsyncClient, campaign_id: str, auth_headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/locations",
        json={"name": "Arcane Library", "biome": "dungeon"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_quest(client: AsyncClient, campaign_id: str, data: dict, auth_headers: dict) -> dict:
    resp = await client.post(f"/api/v1/campaigns/{campaign_id}/quests", json=data, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def test_create_quest_minimal(client: AsyncClient, auth_headers):
    """Creating a quest with only the required title field returns 201."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(f"/api/v1/campaigns/{cid}/quests", json=MINIMAL_QUEST, headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None
    data = body["data"]
    assert data["title"] == "Find the Lost Sword"
    assert data["campaign_id"] == cid
    assert data["status"] == "not_started"
    assert data["description"] is None
    assert data["reward"] is None
    assert data["level"] is None
    assert data["location_id"] is None


async def test_create_quest_all_fields(client: AsyncClient, auth_headers):
    """Creating a quest with all optional fields persists them correctly."""
    cid = await _create_campaign(client, auth_headers)
    lid = await _create_location(client, cid, auth_headers)
    payload = {**FULL_QUEST, "location_id": lid}
    resp = await client.post(f"/api/v1/campaigns/{cid}/quests", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["title"] == "Retrieve the Arcane Tome"
    assert data["description"] == FULL_QUEST["description"]
    assert data["status"] == "in_progress"
    assert data["reward"] == FULL_QUEST["reward"]
    assert data["level"] == 5
    assert data["location_id"] == lid


async def test_create_quest_invalid_campaign_returns_404(client: AsyncClient, auth_headers):
    """Creating a quest under a non-existent campaign returns 404."""
    resp = await client.post(
        f"/api/v1/campaigns/{NULL_UUID}/quests", json=MINIMAL_QUEST, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_create_quest_invalid_location_returns_404(client: AsyncClient, auth_headers):
    """Creating a quest with a non-existent location_id returns 404."""
    cid = await _create_campaign(client, auth_headers)
    payload = {**MINIMAL_QUEST, "location_id": NULL_UUID}
    resp = await client.post(f"/api/v1/campaigns/{cid}/quests", json=payload, headers=auth_headers)
    assert resp.status_code == 404


async def test_create_quest_invalid_status_returns_422(client: AsyncClient, auth_headers):
    """Creating a quest with an invalid status value returns 422 validation error."""
    cid = await _create_campaign(client, auth_headers)
    payload = {**MINIMAL_QUEST, "status": "abandoned"}
    resp = await client.post(f"/api/v1/campaigns/{cid}/quests", json=payload, headers=auth_headers)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


async def test_list_quests_for_campaign(client: AsyncClient, auth_headers):
    """Listing quests returns all quests scoped to that campaign."""
    cid = await _create_campaign(client, auth_headers)
    await _create_quest(client, cid, MINIMAL_QUEST, auth_headers)
    await _create_quest(client, cid, FULL_QUEST, auth_headers)
    resp = await client.get(f"/api/v1/campaigns/{cid}/quests", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert len(body["data"]) == 2


async def test_list_quests_filtered_by_location(client: AsyncClient, auth_headers):
    """Listing quests with location_id filter returns only quests at that location."""
    cid = await _create_campaign(client, auth_headers)
    lid = await _create_location(client, cid, auth_headers)

    # One quest linked to the location, one without
    await _create_quest(client, cid, {**MINIMAL_QUEST, "location_id": lid}, auth_headers)
    await _create_quest(client, cid, {"title": "Roaming Quest"}, auth_headers)

    resp = await client.get(
        f"/api/v1/campaigns/{cid}/quests", params={"location_id": lid}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["title"] == "Find the Lost Sword"
    assert data[0]["location_id"] == lid


async def test_list_quests_empty_campaign(client: AsyncClient, auth_headers):
    """Listing quests for a campaign with no quests returns an empty list."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.get(f"/api/v1/campaigns/{cid}/quests", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"] == []


async def test_list_quests_campaign_not_found(client: AsyncClient, auth_headers):
    """Listing quests for a non-existent campaign returns 404."""
    resp = await client.get(f"/api/v1/campaigns/{NULL_UUID}/quests", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------


async def test_get_quest(client: AsyncClient, auth_headers):
    """Retrieving a quest by ID returns the correct quest with envelope."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_quest(client, cid, MINIMAL_QUEST, auth_headers)
    quest_id = created["id"]

    resp = await client.get(f"/api/v1/quests/{quest_id}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["id"] == quest_id
    assert body["data"]["title"] == "Find the Lost Sword"


async def test_get_quest_not_found(client: AsyncClient, auth_headers):
    """Retrieving a non-existent quest by ID returns 404."""
    resp = await client.get(f"/api/v1/quests/{NULL_UUID}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def test_update_quest_partial_status(client: AsyncClient, auth_headers):
    """PATCH with only status updates status; all other fields remain unchanged."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_quest(client, cid, FULL_QUEST, auth_headers)
    quest_id = created["id"]

    resp = await client.patch(
        f"/api/v1/quests/{quest_id}", json={"status": "completed"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "completed"
    # All other fields must be unchanged
    assert data["title"] == "Retrieve the Arcane Tome"
    assert data["description"] == FULL_QUEST["description"]
    assert data["reward"] == FULL_QUEST["reward"]
    assert data["level"] == 5


async def test_update_quest_set_location(client: AsyncClient, auth_headers):
    """PATCH with location_id links the quest to that location."""
    cid = await _create_campaign(client, auth_headers)
    lid = await _create_location(client, cid, auth_headers)
    created = await _create_quest(client, cid, MINIMAL_QUEST, auth_headers)
    quest_id = created["id"]
    assert created["location_id"] is None

    resp = await client.patch(
        f"/api/v1/quests/{quest_id}", json={"location_id": lid}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["location_id"] == lid


async def test_update_quest_invalid_location_returns_404(client: AsyncClient, auth_headers):
    """PATCH with a non-existent location_id returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_quest(client, cid, MINIMAL_QUEST, auth_headers)
    quest_id = created["id"]

    resp = await client.patch(
        f"/api/v1/quests/{quest_id}", json={"location_id": NULL_UUID}, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_update_quest_not_found(client: AsyncClient, auth_headers):
    """PATCH on a non-existent quest returns 404."""
    resp = await client.patch(
        f"/api/v1/quests/{NULL_UUID}", json={"status": "completed"}, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_update_quest_title_only(client: AsyncClient, auth_headers):
    """PATCH with only title leaves all other fields untouched."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_quest(client, cid, {**FULL_QUEST, "status": "not_started"}, auth_headers)
    quest_id = created["id"]

    resp = await client.patch(
        f"/api/v1/quests/{quest_id}", json={"title": "Recover the Stolen Tome"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["title"] == "Recover the Stolen Tome"
    assert data["status"] == "not_started"
    assert data["level"] == 5


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def test_delete_quest(client: AsyncClient, auth_headers):
    """Deleting a quest returns 204 and subsequent GET returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_quest(client, cid, MINIMAL_QUEST, auth_headers)
    quest_id = created["id"]

    resp = await client.delete(f"/api/v1/quests/{quest_id}", headers=auth_headers)
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/quests/{quest_id}", headers=auth_headers)
    assert get_resp.status_code == 404


async def test_delete_quest_not_found(client: AsyncClient, auth_headers):
    """Deleting a non-existent quest returns 404."""
    resp = await client.delete(f"/api/v1/quests/{NULL_UUID}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Response envelope structure
# ---------------------------------------------------------------------------


async def test_quest_response_envelope_structure(client: AsyncClient, auth_headers):
    """Every quest response contains the data/error/meta envelope keys."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_quest(client, cid, MINIMAL_QUEST, auth_headers)
    quest_id = created["id"]

    resp = await client.get(f"/api/v1/quests/{quest_id}", headers=auth_headers)
    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None


# ---------------------------------------------------------------------------
# Valid status transitions
# ---------------------------------------------------------------------------


async def test_quest_all_valid_statuses(client: AsyncClient, auth_headers):
    """All four valid status values are accepted by the create endpoint."""
    cid = await _create_campaign(client, auth_headers)
    for status in ("not_started", "in_progress", "completed", "failed"):
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/quests",
            json={"title": f"Quest ({status})", "status": status},
            headers=auth_headers,
        )
        assert resp.status_code == 201, f"Expected 201 for status={status!r}"
        assert resp.json()["data"]["status"] == status
