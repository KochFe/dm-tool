import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

LOCATION_DATA = {"name": "Neverwinter", "biome": "urban"}


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Test Campaign"}, headers=auth_headers)
    return resp.json()["data"]["id"]


async def test_create_location(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(f"/api/v1/campaigns/{cid}/locations", json=LOCATION_DATA, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Neverwinter"
    assert data["biome"] == "urban"


async def test_list_locations(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    await client.post(f"/api/v1/campaigns/{cid}/locations", json=LOCATION_DATA, headers=auth_headers)
    resp = await client.get(f"/api/v1/campaigns/{cid}/locations", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1


async def test_get_location(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    create = await client.post(f"/api/v1/campaigns/{cid}/locations", json=LOCATION_DATA, headers=auth_headers)
    lid = create.json()["data"]["id"]
    resp = await client.get(f"/api/v1/locations/{lid}", headers=auth_headers)
    assert resp.status_code == 200


async def test_update_location(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    create = await client.post(f"/api/v1/campaigns/{cid}/locations", json=LOCATION_DATA, headers=auth_headers)
    lid = create.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/locations/{lid}", json={"biome": "forest"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["biome"] == "forest"


async def test_delete_location(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    create = await client.post(f"/api/v1/campaigns/{cid}/locations", json=LOCATION_DATA, headers=auth_headers)
    lid = create.json()["data"]["id"]
    resp = await client.delete(f"/api/v1/locations/{lid}", headers=auth_headers)
    assert resp.status_code == 204


async def test_location_not_found(client: AsyncClient, auth_headers):
    resp = await client.get("/api/v1/locations/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


async def test_set_null_on_location_delete(client: AsyncClient, auth_headers):
    """When a location used as current_location is deleted, campaign.current_location_id should be NULL."""
    cid = await _create_campaign(client, auth_headers)
    create = await client.post(f"/api/v1/campaigns/{cid}/locations", json=LOCATION_DATA, headers=auth_headers)
    lid = create.json()["data"]["id"]
    # Set current location
    await client.patch(f"/api/v1/campaigns/{cid}", json={"current_location_id": lid}, headers=auth_headers)
    campaign = await client.get(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert campaign.json()["data"]["current_location_id"] == lid
    # Delete the location
    await client.delete(f"/api/v1/locations/{lid}", headers=auth_headers)
    # Campaign's current_location_id should now be null
    campaign = await client.get(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert campaign.json()["data"]["current_location_id"] is None
