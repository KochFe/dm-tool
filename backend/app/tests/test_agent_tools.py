"""Unit tests for LangChain campaign tools.

Tests call tool.ainvoke() directly against the in-memory SQLite test DB.
No LLM is involved — these are pure DB query tests.
"""

import json
import pytest

from app.ai.tools import create_campaign_tools
from app.models.campaign import Campaign
from app.models.location import Location
from app.models.player_character import PlayerCharacter
from app.models.npc import Npc
from app.models.quest import Quest
from app.tests.conftest import async_session_test

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def seeded_campaign():
    """Create a campaign with locations, PCs, NPCs, and quests."""
    async with async_session_test() as session:
        campaign = Campaign(name="Test Campaign", party_level=5)
        session.add(campaign)
        await session.flush()

        tavern = Location(
            campaign_id=campaign.id,
            name="The Rusty Tankard",
            biome="urban",
        )
        forest = Location(
            campaign_id=campaign.id,
            name="Darkwood Forest",
            biome="forest",
        )
        session.add_all([tavern, forest])
        await session.flush()

        # Set current location to the tavern
        campaign.current_location_id = tavern.id

        pc = PlayerCharacter(
            campaign_id=campaign.id,
            name="Gandalf",
            race="Human",
            character_class="Wizard",
            level=5,
            hp_current=30,
            hp_max=35,
            armor_class=12,
            passive_perception=14,
        )
        session.add(pc)

        npc = Npc(
            campaign_id=campaign.id,
            location_id=tavern.id,
            name="Barak the Barkeep",
            race="Dwarf",
            npc_class="Commoner",
            description="A stout dwarf behind the bar",
            personality="Grumpy but helpful",
            secrets="Has a hidden treasure",
            motivation="Protect his tavern",
            stats={"str": 12, "dex": 10},
            is_alive=True,
        )
        session.add(npc)

        quest = Quest(
            campaign_id=campaign.id,
            location_id=tavern.id,
            title="The Missing Merchant",
            description="Find the lost merchant",
            status="in_progress",
            reward="100 gp",
            level=5,
        )
        session.add(quest)

        await session.commit()
        return campaign.id


@pytest.fixture
async def empty_campaign():
    """Create a campaign with no PCs, NPCs, quests, or current location."""
    async with async_session_test() as session:
        campaign = Campaign(name="Empty Campaign", party_level=1)
        session.add(campaign)
        await session.commit()
        return campaign.id


# ---------------------------------------------------------------------------
# Happy path — one test per tool
# ---------------------------------------------------------------------------


async def test_get_party_members(seeded_campaign):
    """get_party_members returns seeded PC with correct fields."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_party_members"].ainvoke("")

    data = json.loads(result)
    assert isinstance(data, list)
    assert len(data) == 1

    pc = data[0]
    assert pc["name"] == "Gandalf"
    assert pc["race"] == "Human"
    assert pc["class"] == "Wizard"
    assert pc["level"] == 5
    assert pc["hp_current"] == 30
    assert pc["hp_max"] == 35
    assert pc["armor_class"] == 12


async def test_get_location_npcs_by_name(seeded_campaign):
    """get_location_npcs returns NPC when given an explicit location name."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_location_npcs"].ainvoke("The Rusty Tankard")

    data = json.loads(result)
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["name"] == "Barak the Barkeep"
    assert data[0]["race"] == "Dwarf"
    assert data[0]["npc_class"] == "Commoner"
    assert data[0]["is_alive"] is True


async def test_get_location_npcs_current(seeded_campaign):
    """get_location_npcs with empty string falls back to the campaign's current location."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_location_npcs"].ainvoke("")

    data = json.loads(result)
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["name"] == "Barak the Barkeep"


async def test_get_location_quests_by_name(seeded_campaign):
    """get_location_quests returns quest when given an explicit location name."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_location_quests"].ainvoke("The Rusty Tankard")

    data = json.loads(result)
    assert isinstance(data, list)
    assert len(data) == 1
    quest = data[0]
    assert quest["title"] == "The Missing Merchant"
    assert quest["status"] == "in_progress"
    assert quest["level"] == 5


async def test_get_npc_details(seeded_campaign):
    """get_npc_details returns full NPC data including secrets on partial name match."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_npc_details"].ainvoke("Barak")

    data = json.loads(result)
    assert data["name"] == "Barak the Barkeep"
    assert data["personality"] == "Grumpy but helpful"
    assert data["secrets"] == "Has a hidden treasure"
    assert data["motivation"] == "Protect his tavern"
    assert data["stats"] == {"str": 12, "dex": 10}
    assert data["is_alive"] is True


async def test_get_quest_details(seeded_campaign):
    """get_quest_details returns full quest data on partial title match."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_quest_details"].ainvoke("Missing")

    data = json.loads(result)
    assert data["title"] == "The Missing Merchant"
    assert data["description"] == "Find the lost merchant"
    assert data["status"] == "in_progress"
    assert data["reward"] == "100 gp"
    assert data["level"] == 5


async def test_get_all_locations(seeded_campaign):
    """get_all_locations returns both seeded locations."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_all_locations"].ainvoke("")

    data = json.loads(result)
    assert isinstance(data, list)
    assert len(data) == 2

    names = {loc["name"] for loc in data}
    assert "The Rusty Tankard" in names
    assert "Darkwood Forest" in names

    biomes = {loc["biome"] for loc in data}
    assert "urban" in biomes
    assert "forest" in biomes


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


async def test_get_party_members_empty(empty_campaign):
    """get_party_members returns a plain message string when there are no PCs."""
    tools = {t.name: t for t in create_campaign_tools(empty_campaign, async_session_test)}
    result = await tools["get_party_members"].ainvoke("")

    assert isinstance(result, str)
    assert "No player characters" in result


async def test_get_location_npcs_empty_location(seeded_campaign):
    """get_location_npcs returns a no-NPC message for a location with no NPCs."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_location_npcs"].ainvoke("Darkwood Forest")

    assert isinstance(result, str)
    assert "No NPCs found" in result


async def test_get_npc_details_not_found(seeded_campaign):
    """get_npc_details returns a not-found message for an unknown NPC name."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_npc_details"].ainvoke("Nonexistent Elf")

    assert isinstance(result, str)
    assert "not found" in result.lower()
    assert "Nonexistent Elf" in result


async def test_get_quest_details_not_found(seeded_campaign):
    """get_quest_details returns a not-found message for an unknown quest title."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_quest_details"].ainvoke("Dragon Slayer")

    assert isinstance(result, str)
    assert "not found" in result.lower()
    assert "Dragon Slayer" in result


async def test_get_location_npcs_no_current_location(empty_campaign):
    """get_location_npcs returns an error when campaign has no current location set."""
    tools = {t.name: t for t in create_campaign_tools(empty_campaign, async_session_test)}
    result = await tools["get_location_npcs"].ainvoke("")

    assert isinstance(result, str)
    assert "No current location" in result


async def test_get_location_quests_current_location(seeded_campaign):
    """get_location_quests with empty string falls back to the campaign's current location."""
    tools = {t.name: t for t in create_campaign_tools(seeded_campaign, async_session_test)}
    result = await tools["get_location_quests"].ainvoke("")

    data = json.loads(result)
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["title"] == "The Missing Merchant"


async def test_get_all_locations_empty(empty_campaign):
    """get_all_locations returns a plain message string when there are no locations."""
    tools = {t.name: t for t in create_campaign_tools(empty_campaign, async_session_test)}
    result = await tools["get_all_locations"].ainvoke("")

    assert isinstance(result, str)
    assert "No locations found" in result


async def test_tools_are_scoped_to_campaign(seeded_campaign, empty_campaign):
    """Tools scoped to one campaign cannot see data from another campaign."""
    # Tools created for the empty campaign should not see data from seeded_campaign
    tools = {t.name: t for t in create_campaign_tools(empty_campaign, async_session_test)}

    result = await tools["get_party_members"].ainvoke("")
    assert "No player characters" in result

    result = await tools["get_all_locations"].ainvoke("")
    assert "No locations found" in result
