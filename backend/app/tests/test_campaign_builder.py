import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"


async def _create_campaign(client: AsyncClient, auth_headers: dict, **kwargs) -> dict:
    payload = {"name": "Builder Test Campaign", **kwargs}
    resp = await client.post("/api/v1/campaigns", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]


async def _create_location(client: AsyncClient, campaign_id: str, auth_headers: dict, **kwargs) -> dict:
    payload = {"name": "Test Location", "biome": "urban", **kwargs}
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/locations", json=payload, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Campaign status / draft workflow
# ---------------------------------------------------------------------------


async def test_create_draft_campaign(client: AsyncClient, auth_headers):
    """Creating a campaign with status='draft' sets status=draft, campaign_length=null, world_description=null."""
    resp = await client.post(
        "/api/v1/campaigns",
        json={"name": "Draft Campaign", "status": "draft"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["error"] is None
    data = body["data"]
    assert data["status"] == "draft"
    assert data["campaign_length"] is None
    assert data["world_description"] is None


async def test_update_campaign_builder_fields(client: AsyncClient, auth_headers):
    """PATCH campaign_length and world_description persists both fields."""
    campaign = await _create_campaign(client, auth_headers, status="draft")
    cid = campaign["id"]

    resp = await client.patch(
        f"/api/v1/campaigns/{cid}",
        json={"campaign_length": "short", "world_description": "A world of endless forests."},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["campaign_length"] == "short"
    assert data["world_description"] == "A world of endless forests."
    # Name must be unchanged
    assert data["name"] == "Builder Test Campaign"


async def test_activate_draft_campaign(client: AsyncClient, auth_headers):
    """POST /campaigns/{id}/activate changes status from 'draft' to 'active'."""
    campaign = await _create_campaign(client, auth_headers, status="draft")
    cid = campaign["id"]
    assert campaign["status"] == "draft"

    resp = await client.post(f"/api/v1/campaigns/{cid}/activate", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "active"


async def test_activate_already_active_campaign(client: AsyncClient, auth_headers):
    """Activating an already-active campaign returns 400."""
    campaign = await _create_campaign(client, auth_headers, status="active")
    cid = campaign["id"]

    resp = await client.post(f"/api/v1/campaigns/{cid}/activate", headers=auth_headers)
    assert resp.status_code == 400


async def test_default_campaign_status_is_active(client: AsyncClient, auth_headers):
    """Creating a campaign without an explicit status defaults to 'active'."""
    resp = await client.post(
        "/api/v1/campaigns",
        json={"name": "Default Status Campaign"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["status"] == "active"


# ---------------------------------------------------------------------------
# Location parent_id hierarchy
# ---------------------------------------------------------------------------


async def test_location_parent_id(client: AsyncClient, auth_headers):
    """Creating a child location with parent_id links it to the parent."""
    campaign = await _create_campaign(client, auth_headers)
    cid = campaign["id"]

    parent = await _create_location(client, cid, auth_headers, name="City of Neverwinter")
    parent_id = parent["id"]

    child_resp = await client.post(
        f"/api/v1/campaigns/{cid}/locations",
        json={"name": "Market District", "biome": "urban", "parent_id": parent_id},
        headers=auth_headers,
    )
    assert child_resp.status_code == 201
    child_data = child_resp.json()["data"]
    assert child_data["parent_id"] == parent_id


async def test_location_self_parent_rejected(client: AsyncClient, auth_headers):
    """PATCH location with parent_id set to its own ID returns 400."""
    campaign = await _create_campaign(client, auth_headers)
    cid = campaign["id"]

    location = await _create_location(client, cid, auth_headers)
    lid = location["id"]

    resp = await client.patch(
        f"/api/v1/locations/{lid}",
        json={"parent_id": lid},
        headers=auth_headers,
    )
    assert resp.status_code == 400
