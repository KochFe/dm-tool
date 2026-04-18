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


async def _create_campaign_and_phase(client: AsyncClient, auth_headers: dict) -> tuple[str, str]:
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases",
        json={"title": "The Missing Miners", "sort_order": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return cid, resp.json()["data"]["id"]


async def test_generate_phase_description_happy_path(client: AsyncClient, auth_headers):
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    with patch(
        "app.routers.phases.generate_phase_description",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = TextResult(text="The miners vanished during a blood moon.")
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={"steer": "dark horror tone, missing people"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.json()["data"]["text"].startswith("The miners")
    mock_gen.assert_awaited_once()


async def test_generate_phase_description_augment_mode(client: AsyncClient, auth_headers):
    """existing_content is passed through to the service."""
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    with patch(
        "app.routers.phases.generate_phase_description",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = TextResult(text="augmented text")
        await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={
                "steer": "add a brewery scene",
                "existing_content": "The party arrives in town.",
            },
            headers=auth_headers,
        )
    _campaign, _phase, _prior, called_req = mock_gen.await_args.args
    assert called_req.existing_content == "The party arrives in town."


async def _create_campaign_and_npc(client: AsyncClient, auth_headers: dict) -> tuple[str, str]:
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/npcs",
        json={"name": "Garrick", "race": "Dwarf"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return cid, resp.json()["data"]["id"]


async def test_generate_npc_personality_happy_path(client: AsyncClient, auth_headers):
    _, nid = await _create_campaign_and_npc(client, auth_headers)
    with patch(
        "app.routers.npcs.generate_npc_personality",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = PersonalityResult(
            personality="Gruff but kind.", motivation="Seeks his lost brother."
        )
        resp = await client.post(
            f"/api/v1/npcs/{nid}/ai/personality",
            json={"steer": "haunted by his past"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["personality"] == "Gruff but kind."
    assert body["motivation"] == "Seeks his lost brother."


async def _create_campaign_and_pc(client: AsyncClient, auth_headers: dict) -> tuple[str, str]:
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/characters",
        json={
            "name": "Aragorn",
            "race": "Human",
            "character_class": "Ranger",
            "level": 1,
            "hp_current": 12,
            "hp_max": 12,
            "armor_class": 14,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return cid, resp.json()["data"]["id"]


async def test_generate_pc_personality_happy_path(client: AsyncClient, auth_headers):
    _, pcid = await _create_campaign_and_pc(client, auth_headers)
    with patch(
        "app.routers.player_characters.generate_pc_personality",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = PersonalityResult(
            personality="Stoic and dutiful.", motivation="Protect the weak."
        )
        resp = await client.post(
            f"/api/v1/characters/{pcid}/ai/personality",
            json={"steer": "knightly, burdened by heritage"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["motivation"] == "Protect the weak."
