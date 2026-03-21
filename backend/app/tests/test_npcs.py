import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"

MINIMAL_NPC = {
    "name": "Aldric",
    "race": "Human",
}

FULL_NPC = {
    "name": "Zara Moonwhisper",
    "race": "Elf",
    "npc_class": "Wizard",
    "description": "A tall elven mage with silver hair and piercing blue eyes.",
    "personality": "Reserved and calculating, speaks in riddles.",
    "secrets": "She secretly works for the Thieves Guild.",
    "motivation": "To reclaim her stolen spellbook.",
    "stats": {"str": 8, "dex": 14, "con": 12, "int": 18, "wis": 14, "cha": 10},
    "is_alive": True,
}


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "NPC Test Campaign"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_location(client: AsyncClient, campaign_id: str, auth_headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/locations",
        json={"name": "Silvermoon Inn", "biome": "urban"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_npc(client: AsyncClient, campaign_id: str, data: dict, auth_headers: dict) -> dict:
    resp = await client.post(f"/api/v1/campaigns/{campaign_id}/npcs", json=data, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def test_create_npc_minimal(client: AsyncClient, auth_headers):
    """Creating an NPC with only required fields (name, race) returns 201."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(f"/api/v1/campaigns/{cid}/npcs", json=MINIMAL_NPC, headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None
    data = body["data"]
    assert data["name"] == "Aldric"
    assert data["race"] == "Human"
    assert data["campaign_id"] == cid
    assert data["location_id"] is None
    assert data["npc_class"] is None
    assert data["description"] is None
    assert data["personality"] is None
    assert data["secrets"] is None
    assert data["motivation"] is None
    assert data["stats"] is None
    assert data["is_alive"] is True


async def test_create_npc_all_fields(client: AsyncClient, auth_headers):
    """Creating an NPC with all optional fields persists them correctly."""
    cid = await _create_campaign(client, auth_headers)
    lid = await _create_location(client, cid, auth_headers)
    payload = {**FULL_NPC, "location_id": lid}
    resp = await client.post(f"/api/v1/campaigns/{cid}/npcs", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Zara Moonwhisper"
    assert data["race"] == "Elf"
    assert data["npc_class"] == "Wizard"
    assert data["description"] == FULL_NPC["description"]
    assert data["personality"] == FULL_NPC["personality"]
    assert data["secrets"] == FULL_NPC["secrets"]
    assert data["motivation"] == FULL_NPC["motivation"]
    assert data["stats"] == FULL_NPC["stats"]
    assert data["location_id"] == lid
    assert data["is_alive"] is True


async def test_create_npc_invalid_campaign_returns_404(client: AsyncClient, auth_headers):
    """Creating an NPC under a non-existent campaign returns 404."""
    resp = await client.post(
        f"/api/v1/campaigns/{NULL_UUID}/npcs", json=MINIMAL_NPC, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_create_npc_invalid_location_returns_404(client: AsyncClient, auth_headers):
    """Creating an NPC with a non-existent location_id returns 404."""
    cid = await _create_campaign(client, auth_headers)
    payload = {**MINIMAL_NPC, "location_id": NULL_UUID}
    resp = await client.post(f"/api/v1/campaigns/{cid}/npcs", json=payload, headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


async def test_list_npcs_for_campaign(client: AsyncClient, auth_headers):
    """Listing NPCs returns all NPCs scoped to that campaign."""
    cid = await _create_campaign(client, auth_headers)
    await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    await _create_npc(client, cid, {**FULL_NPC}, auth_headers)
    resp = await client.get(f"/api/v1/campaigns/{cid}/npcs", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert len(body["data"]) == 2


async def test_list_npcs_filtered_by_location(client: AsyncClient, auth_headers):
    """Listing NPCs with location_id filter returns only NPCs at that location."""
    cid = await _create_campaign(client, auth_headers)
    lid = await _create_location(client, cid, auth_headers)

    # Create one NPC at the location and one without a location
    await _create_npc(client, cid, {**MINIMAL_NPC, "location_id": lid}, auth_headers)
    await _create_npc(client, cid, {"name": "Wanderer", "race": "Dwarf"}, auth_headers)

    resp = await client.get(
        f"/api/v1/campaigns/{cid}/npcs", params={"location_id": lid}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["name"] == "Aldric"
    assert data[0]["location_id"] == lid


async def test_list_npcs_empty_campaign(client: AsyncClient, auth_headers):
    """Listing NPCs for a campaign with no NPCs returns an empty list."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.get(f"/api/v1/campaigns/{cid}/npcs", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"] == []


async def test_list_npcs_campaign_not_found(client: AsyncClient, auth_headers):
    """Listing NPCs for a non-existent campaign returns 404."""
    resp = await client.get(f"/api/v1/campaigns/{NULL_UUID}/npcs", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------


async def test_get_npc(client: AsyncClient, auth_headers):
    """Retrieving an NPC by ID returns the correct NPC with envelope."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    npc_id = created["id"]

    resp = await client.get(f"/api/v1/npcs/{npc_id}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["id"] == npc_id
    assert body["data"]["name"] == "Aldric"


async def test_get_npc_not_found(client: AsyncClient, auth_headers):
    """Retrieving a non-existent NPC by ID returns 404."""
    resp = await client.get(f"/api/v1/npcs/{NULL_UUID}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def test_update_npc_partial_name(client: AsyncClient, auth_headers):
    """PATCH with only name updates name; all other fields remain unchanged."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_npc(client, cid, FULL_NPC, auth_headers)
    npc_id = created["id"]

    resp = await client.patch(
        f"/api/v1/npcs/{npc_id}", json={"name": "Zara the Betrayer"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "Zara the Betrayer"
    # All other fields must be unchanged
    assert data["race"] == "Elf"
    assert data["npc_class"] == "Wizard"
    assert data["personality"] == FULL_NPC["personality"]
    assert data["stats"] == FULL_NPC["stats"]
    assert data["is_alive"] is True


async def test_update_npc_set_location(client: AsyncClient, auth_headers):
    """PATCH with location_id assigns the NPC to that location."""
    cid = await _create_campaign(client, auth_headers)
    lid = await _create_location(client, cid, auth_headers)
    created = await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    npc_id = created["id"]
    assert created["location_id"] is None

    resp = await client.patch(
        f"/api/v1/npcs/{npc_id}", json={"location_id": lid}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["location_id"] == lid


async def test_update_npc_invalid_location_returns_404(client: AsyncClient, auth_headers):
    """PATCH with a non-existent location_id returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    npc_id = created["id"]

    resp = await client.patch(
        f"/api/v1/npcs/{npc_id}", json={"location_id": NULL_UUID}, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_update_npc_not_found(client: AsyncClient, auth_headers):
    """PATCH on a non-existent NPC returns 404."""
    resp = await client.patch(
        f"/api/v1/npcs/{NULL_UUID}", json={"name": "Ghost NPC"}, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_update_npc_is_alive(client: AsyncClient, auth_headers):
    """PATCH can mark an NPC as dead without affecting other fields."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    npc_id = created["id"]

    resp = await client.patch(f"/api/v1/npcs/{npc_id}", json={"is_alive": False}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_alive"] is False
    assert data["name"] == "Aldric"


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def test_delete_npc(client: AsyncClient, auth_headers):
    """Deleting an NPC returns 204 and subsequent GET returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    npc_id = created["id"]

    resp = await client.delete(f"/api/v1/npcs/{npc_id}", headers=auth_headers)
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/npcs/{npc_id}", headers=auth_headers)
    assert get_resp.status_code == 404


async def test_delete_npc_not_found(client: AsyncClient, auth_headers):
    """Deleting a non-existent NPC returns 404."""
    resp = await client.delete(f"/api/v1/npcs/{NULL_UUID}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Response envelope structure
# ---------------------------------------------------------------------------


async def test_npc_response_envelope_structure(client: AsyncClient, auth_headers):
    """Every NPC response contains the data/error/meta envelope keys."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_npc(client, cid, MINIMAL_NPC, auth_headers)
    npc_id = created["id"]

    resp = await client.get(f"/api/v1/npcs/{npc_id}", headers=auth_headers)
    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None
