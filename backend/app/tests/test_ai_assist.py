import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from app.schemas.ai_assist import TextResult, PersonalityResult

pytestmark = pytest.mark.asyncio


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post(
        "/api/v1/campaigns",
        json={"name": "AI Assist Test Campaign"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def test_generate_world_description_happy_path(client: AsyncClient, auth_headers):
    """POST /campaigns/{id}/ai/world-description returns 200 with text in envelope."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.campaigns.generate_world_description",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = TextResult(text="A shattered realm of floating isles.")
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/ai/world-description",
            json={"steer": "floating islands, air pirates"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["text"] == "A shattered realm of floating isles."
    mock_gen.assert_awaited_once()


async def test_generate_world_description_requires_steer(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/ai/world-description",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_generate_world_description_404_for_unknown_campaign(client: AsyncClient, auth_headers):
    resp = await client.post(
        "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/ai/world-description",
        json={"steer": "anything"},
        headers=auth_headers,
    )
    assert resp.status_code == 404
