import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_campaign(client: AsyncClient, auth_headers):
    resp = await client.post("/api/v1/campaigns", json={"name": "Lost Mines"}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Lost Mines"
    assert data["party_level"] == 1
    assert data["in_game_time"] == "Day 1, Morning"


async def test_list_campaigns(client: AsyncClient, auth_headers):
    await client.post("/api/v1/campaigns", json={"name": "Campaign 1"}, headers=auth_headers)
    await client.post("/api/v1/campaigns", json={"name": "Campaign 2"}, headers=auth_headers)
    resp = await client.get("/api/v1/campaigns", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 2


async def test_get_campaign(client: AsyncClient, auth_headers):
    create = await client.post("/api/v1/campaigns", json={"name": "Test"}, headers=auth_headers)
    cid = create.json()["data"]["id"]
    resp = await client.get(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Test"


async def test_get_campaign_not_found(client: AsyncClient, auth_headers):
    resp = await client.get("/api/v1/campaigns/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


async def test_update_campaign(client: AsyncClient, auth_headers):
    create = await client.post("/api/v1/campaigns", json={"name": "Old"}, headers=auth_headers)
    cid = create.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/campaigns/{cid}", json={"name": "New", "party_level": 5}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "New"
    assert data["party_level"] == 5


async def test_delete_campaign(client: AsyncClient, auth_headers):
    create = await client.post("/api/v1/campaigns", json={"name": "ToDelete"}, headers=auth_headers)
    cid = create.json()["data"]["id"]
    resp = await client.delete(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.get(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert resp.status_code == 404


async def test_create_campaign_validation(client: AsyncClient, auth_headers):
    resp = await client.post("/api/v1/campaigns", json={"name": ""}, headers=auth_headers)
    assert resp.status_code == 422
    resp = await client.post("/api/v1/campaigns", json={"name": "X", "party_level": 25}, headers=auth_headers)
    assert resp.status_code == 422
