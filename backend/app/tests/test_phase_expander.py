import pytest
from unittest.mock import patch, AsyncMock

from app.schemas.phase_expander import (
    DraftPhaseBundle,
    DraftLocation,
    DraftNpc,
    DraftQuest,
)

from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


def _base_state() -> dict:
    return {
        "phase_id": "00000000-0000-0000-0000-000000000001",
        "phase_title": "The Missing Miners",
        "user_steer": "Add a brewery location with 2 NPCs, and a quest to find a missing miner.",
        "campaign_context": {
            "name": "Shadowvale",
            "description": "A grim mining town.",
            "party_level": 3,
        },
        "prior_phases": [],
        "existing_phase_description": None,
        "existing_locations": [],
        "existing_npcs": [],
    }


async def test_graph_runs_all_nodes_in_order():
    """The compiled graph invokes describe → locations → npcs → quests → consistency."""
    from app.ai.graphs.phase_expander import compile_phase_expander_graph

    node_order: list[str] = []

    async def fake_describe(state):
        node_order.append("describe")
        return {"phase_description": "The miners vanished."}

    async def fake_locations(state):
        node_order.append("locations")
        return {"draft_locations": [DraftLocation(name="Brewery", description="Smells of hops.")]}

    async def fake_npcs(state):
        node_order.append("npcs")
        return {"draft_npcs": [DraftNpc(name="Hilda", role="brewer",
                                          personality="Curt.", motivation="Survive.",
                                          location_index=0)]}

    async def fake_quests(state):
        node_order.append("quests")
        return {"draft_quests": [DraftQuest(title="Find the miner",
                                              description="Go look.", npc_indices=[0])]}

    async def fake_consistency(state):
        node_order.append("consistency")
        return {"consistency_notes": []}

    with patch("app.ai.graphs.phase_expander.describe_phase_node", side_effect=fake_describe), \
         patch("app.ai.graphs.phase_expander.propose_locations_node", side_effect=fake_locations), \
         patch("app.ai.graphs.phase_expander.propose_npcs_node", side_effect=fake_npcs), \
         patch("app.ai.graphs.phase_expander.propose_quests_node", side_effect=fake_quests), \
         patch("app.ai.graphs.phase_expander.check_consistency_node", side_effect=fake_consistency):
        graph = compile_phase_expander_graph()
        result = await graph.ainvoke(_base_state())

    assert node_order == ["describe", "locations", "npcs", "quests", "consistency"]
    assert result["phase_description"] == "The miners vanished."
    assert result["draft_locations"][0].name == "Brewery"
    assert result["draft_npcs"][0].name == "Hilda"
    assert result["draft_quests"][0].title == "Find the miner"


async def _create_campaign_and_phase(client: AsyncClient, auth_headers: dict) -> tuple[str, str]:
    cresp = await client.post(
        "/api/v1/campaigns",
        json={"name": "Expander Test"},
        headers=auth_headers,
    )
    assert cresp.status_code == 201
    cid = cresp.json()["data"]["id"]
    presp = await client.post(
        f"/api/v1/campaigns/{cid}/phases",
        json={"title": "Act I", "sort_order": 0},
        headers=auth_headers,
    )
    assert presp.status_code == 201
    return cid, presp.json()["data"]["id"]


async def test_expand_endpoint_happy_path(client: AsyncClient, auth_headers):
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    fake_bundle = DraftPhaseBundle(
        phase_description="New desc.",
        draft_locations=[DraftLocation(name="Brewery", description="Hops.")],
        draft_npcs=[],
        draft_quests=[],
        consistency_notes=[],
    )
    with patch(
        "app.routers.phases.run_phase_expander",
        new_callable=AsyncMock,
    ) as mock_run:
        mock_run.return_value = fake_bundle
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/phases/{pid}/expand",
            json={"user_steer": "add a brewery"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["phase_description"] == "New desc."
    assert data["draft_locations"][0]["name"] == "Brewery"


async def test_expand_endpoint_requires_steer(client: AsyncClient, auth_headers):
    cid, pid = await _create_campaign_and_phase(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases/{pid}/expand",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_expand_endpoint_404_for_unknown_phase(client: AsyncClient, auth_headers):
    cresp = await client.post(
        "/api/v1/campaigns",
        json={"name": "X"},
        headers=auth_headers,
    )
    cid = cresp.json()["data"]["id"]
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/phases/00000000-0000-0000-0000-000000000000/expand",
        json={"user_steer": "anything"},
        headers=auth_headers,
    )
    assert resp.status_code == 404
