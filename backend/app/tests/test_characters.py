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


async def _create_campaign(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Test Campaign"})
    return resp.json()["data"]["id"]


async def test_create_character(client: AsyncClient):
    cid = await _create_campaign(client)
    resp = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Gandalf"
    assert data["campaign_id"] == cid


async def test_list_characters(client: AsyncClient):
    cid = await _create_campaign(client)
    await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    resp = await client.get(f"/api/v1/campaigns/{cid}/characters")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1


async def test_get_character(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    resp = await client.get(f"/api/v1/characters/{pid}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Gandalf"


async def test_update_character(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/characters/{pid}", json={"hp_current": 30})
    assert resp.status_code == 200
    assert resp.json()["data"]["hp_current"] == 30
    assert resp.json()["data"]["hp_max"] == 50  # unchanged


async def test_delete_character(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    resp = await client.delete(f"/api/v1/characters/{pid}")
    assert resp.status_code == 204


async def test_character_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/characters/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_character_campaign_not_found(client: AsyncClient):
    resp = await client.post(
        "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/characters",
        json=CHARACTER_DATA,
    )
    assert resp.status_code == 404


async def test_cascade_delete(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    await client.delete(f"/api/v1/campaigns/{cid}")
    resp = await client.get(f"/api/v1/characters/{pid}")
    assert resp.status_code == 404
