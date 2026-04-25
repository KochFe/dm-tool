import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from app.schemas.ai_assist import PersonalityResult, PhasePrepResult, TextResult

pytestmark = pytest.mark.asyncio


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post(
        "/api/v1/campaigns",
        json={"name": "AI Assist Test Campaign"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def test_generate_campaign_description_happy_path(client: AsyncClient, auth_headers):
    """POST /campaigns/{id}/ai/campaign-description returns 200 with text in envelope."""
    cid = await _create_campaign(client, auth_headers)
    with patch(
        "app.routers.campaigns.generate_campaign_description",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = TextResult(text="A heist against a corrupt merchant prince.")
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/ai/campaign-description",
            json={"steer": "political heist, stolen relic"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["text"] == "A heist against a corrupt merchant prince."
    mock_gen.assert_awaited_once()


async def test_generate_campaign_description_requires_steer(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/ai/campaign-description",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_generate_campaign_description_404_for_unknown_campaign(client: AsyncClient, auth_headers):
    resp = await client.post(
        "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/ai/campaign-description",
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
        mock_gen.return_value = PhasePrepResult.model_validate(
            {
                "sections": [
                    {"heading": "Hook", "bullets": ["An old friend slips them a map."]},
                    {
                        "heading": "Key Beats",
                        "bullets": ["The lighthouse hums at dusk.", "Mist rolls in."],
                    },
                ]
            }
        )
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={"steer": "lighthouse shrouded in mist"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert isinstance(body["sections"], list)
    assert body["sections"][0]["heading"] == "Hook"
    assert body["sections"][1]["bullets"] == [
        "The lighthouse hums at dusk.",
        "Mist rolls in.",
    ]
    mock_gen.assert_awaited_once()


async def test_generate_phase_description_augment_mode(client: AsyncClient, auth_headers):
    """existing_content is passed through to the service (return type: PhasePrepResult)."""
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    with patch(
        "app.routers.phases.generate_phase_description",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = PhasePrepResult.model_validate(
            {"sections": [{"heading": "Hook", "bullets": ["augmented"]}]}
        )
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


# --- PhasePrepResult schema ---

def test_phase_prep_result_rejects_invalid_heading():
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        PhasePrepResult.model_validate(
            {"sections": [{"heading": "Conclusion", "bullets": ["x"]}]}
        )


def test_phase_prep_result_rejects_empty_bullets():
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        PhasePrepResult.model_validate(
            {"sections": [{"heading": "Hook", "bullets": []}]}
        )


def test_phase_prep_result_rejects_no_sections():
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        PhasePrepResult.model_validate({"sections": []})


def test_phase_prep_result_accepts_valid_shape():
    result = PhasePrepResult.model_validate(
        {
            "sections": [
                {"heading": "Hook", "bullets": ["An old friend slips them a map."]},
                {
                    "heading": "Key Beats",
                    "bullets": ["Beat 1.", "Beat 2."],
                },
            ]
        }
    )
    assert result.sections[0].heading == "Hook"
    assert result.sections[1].bullets == ["Beat 1.", "Beat 2."]


# --- Prompt integration tests ---

async def test_phase_description_prompt_includes_linked_entities(
    client: AsyncClient, auth_headers
):
    """When the phase has linked locations + NPCs, their names appear in the prompt."""
    cid, pid = await _create_campaign_and_phase(client, auth_headers)

    # Create a location in the campaign.
    loc_resp = await client.post(
        f"/api/v1/campaigns/{cid}/locations",
        json={"name": "The Salted Lantern", "description": "A coastal tavern", "biome": "urban"},
        headers=auth_headers,
    )
    assert loc_resp.status_code == 201
    lid = loc_resp.json()["data"]["id"]

    # Create an NPC at that location.
    npc_resp = await client.post(
        f"/api/v1/campaigns/{cid}/npcs",
        json={"name": "Old Finn", "race": "Human", "location_id": lid},
        headers=auth_headers,
    )
    assert npc_resp.status_code == 201

    # Link the location to the phase.
    link_resp = await client.put(
        f"/api/v1/phases/{pid}/locations",
        json={"ids": [lid]},
        headers=auth_headers,
    )
    assert link_resp.status_code == 200

    captured_prompts: list[str] = []

    async def fake_ainvoke(prompt):
        captured_prompts.append(prompt)
        return PhasePrepResult.model_validate(
            {"sections": [{"heading": "Hook", "bullets": ["ok"]}]}
        )

    with patch("app.services.generator_service._get_llm") as mock_llm:
        structured = AsyncMock()
        structured.ainvoke = AsyncMock(side_effect=fake_ainvoke)
        mock_llm.return_value.with_structured_output.return_value = structured

        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={"steer": "lighthouse plot"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

    assert len(captured_prompts) == 1
    prompt = captured_prompts[0]
    assert "Locations linked to this phase" in prompt
    assert "The Salted Lantern" in prompt
    assert "Old Finn" in prompt
    assert "MUST NOT invent new named" in prompt


async def test_phase_description_prompt_omits_entity_block_when_unlinked(
    client: AsyncClient, auth_headers
):
    """Phases with no linked locations get no entity block in the prompt."""
    cid, pid = await _create_campaign_and_phase(client, auth_headers)

    captured_prompts: list[str] = []

    async def fake_ainvoke(prompt):
        captured_prompts.append(prompt)
        return PhasePrepResult.model_validate(
            {"sections": [{"heading": "Hook", "bullets": ["ok"]}]}
        )

    with patch("app.services.generator_service._get_llm") as mock_llm:
        structured = AsyncMock()
        structured.ainvoke = AsyncMock(side_effect=fake_ainvoke)
        mock_llm.return_value.with_structured_output.return_value = structured

        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={"steer": "something"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

    prompt = captured_prompts[0]
    assert "Locations linked to this phase" not in prompt
    assert "MUST NOT invent new named" not in prompt


async def test_phase_description_prompt_restructure_addendum_in_augment_mode(
    client: AsyncClient, auth_headers
):
    """When existing_content is provided, the restructure addendum is in the prompt."""
    cid, pid = await _create_campaign_and_phase(client, auth_headers)

    captured_prompts: list[str] = []

    async def fake_ainvoke(prompt):
        captured_prompts.append(prompt)
        return PhasePrepResult.model_validate(
            {"sections": [{"heading": "Hook", "bullets": ["ok"]}]}
        )

    with patch("app.services.generator_service._get_llm") as mock_llm:
        structured = AsyncMock()
        structured.ainvoke = AsyncMock(side_effect=fake_ainvoke)
        mock_llm.return_value.with_structured_output.return_value = structured

        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={
                "steer": "restructure this",
                "existing_content": "Some prose about a lighthouse.",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

    prompt = captured_prompts[0]
    assert "RESTRUCTURING the existing description" in prompt


async def test_phase_description_retries_once_on_structured_output_failure(
    client: AsyncClient, auth_headers
):
    """First structured-output exception triggers a retry; second failure returns 503."""
    cid, pid = await _create_campaign_and_phase(client, auth_headers)

    call_count = {"n": 0}

    async def always_fail(prompt):
        call_count["n"] += 1
        raise ValueError("simulated structured-output failure")

    with patch("app.services.generator_service._get_llm") as mock_llm:
        structured = AsyncMock()
        structured.ainvoke = AsyncMock(side_effect=always_fail)
        mock_llm.return_value.with_structured_output.return_value = structured

        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/ai/description",
            json={"steer": "anything"},
            headers=auth_headers,
        )

    assert resp.status_code == 503
    assert call_count["n"] == 2  # one initial + one retry
