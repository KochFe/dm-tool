import pytest
from unittest.mock import patch, AsyncMock

from app.schemas.phase_expander import (
    DraftPhaseBundle,
    DraftLocation,
    DraftNpc,
    DraftQuest,
)

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
