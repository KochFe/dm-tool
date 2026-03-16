"""Read-only LangChain tools for campaign-aware database access.

These tools give the LangGraph agent the ability to query campaign data
(characters, NPCs, quests, locations) without ever writing to the database.
Each tool creates its own async session from the provided session factory.
"""

import json
from uuid import UUID

from langchain_core.tools import BaseTool, tool
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.campaign import Campaign
from app.models.location import Location
from app.models.npc import Npc
from app.models.player_character import PlayerCharacter
from app.models.quest import Quest


def create_campaign_tools(
    campaign_id: UUID, session_factory: async_sessionmaker
) -> list[BaseTool]:
    """Create all read-only campaign tools bound to a specific campaign.

    Args:
        campaign_id: The UUID of the campaign to scope queries to.
        session_factory: An async_sessionmaker for creating DB sessions.

    Returns:
        A list of LangChain BaseTool instances ready to bind to an LLM.
    """

    @tool
    async def get_party_members() -> str:
        """Get all player characters in the current campaign.

        Returns their name, race, class, level, current and max HP, and armor class.
        Use this to understand party composition, power level, and current health status.
        """
        async with session_factory() as session:
            result = await session.execute(
                select(PlayerCharacter).where(
                    PlayerCharacter.campaign_id == campaign_id
                )
            )
            characters = result.scalars().all()

            if not characters:
                return "No player characters found in this campaign."

            data = [
                {
                    "name": pc.name,
                    "race": pc.race,
                    "class": pc.character_class,
                    "level": pc.level,
                    "hp_current": pc.hp_current,
                    "hp_max": pc.hp_max,
                    "armor_class": pc.armor_class,
                }
                for pc in characters
            ]
            return json.dumps(data)

    @tool
    async def get_location_npcs(location_name: str = "") -> str:
        """Get NPCs at a specific location or the party's current location.

        If location_name is provided, finds NPCs at that location.
        If location_name is empty, uses the party's current location.
        Use this to see who the party might interact with at a given place.

        Args:
            location_name: Optional name of the location to look up. Leave empty
                          to use the party's current location.
        """
        async with session_factory() as session:
            location_id = await _resolve_location_id(
                session, campaign_id, location_name
            )
            if isinstance(location_id, str):
                return location_id  # Error message

            result = await session.execute(
                select(Npc).where(
                    Npc.campaign_id == campaign_id,
                    Npc.location_id == location_id,
                )
            )
            npcs = result.scalars().all()

            if not npcs:
                return "No NPCs found at this location."

            data = [
                {
                    "name": n.name,
                    "race": n.race,
                    "npc_class": n.npc_class,
                    "is_alive": n.is_alive,
                    "description": n.description,
                }
                for n in npcs
            ]
            return json.dumps(data)

    @tool
    async def get_location_quests(location_name: str = "") -> str:
        """Get quests associated with a specific location or the party's current location.

        If location_name is provided, finds quests at that location.
        If location_name is empty, uses the party's current location.
        Use this to see what objectives or storylines are tied to a place.

        Args:
            location_name: Optional name of the location to look up. Leave empty
                          to use the party's current location.
        """
        async with session_factory() as session:
            location_id = await _resolve_location_id(
                session, campaign_id, location_name
            )
            if isinstance(location_id, str):
                return location_id  # Error message

            result = await session.execute(
                select(Quest).where(
                    Quest.campaign_id == campaign_id,
                    Quest.location_id == location_id,
                )
            )
            quests = result.scalars().all()

            if not quests:
                return "No quests found at this location."

            data = [
                {
                    "title": q.title,
                    "status": q.status,
                    "level": q.level,
                    "description": q.description,
                }
                for q in quests
            ]
            return json.dumps(data)

    @tool
    async def get_npc_details(npc_name: str) -> str:
        """Get detailed information about a specific NPC by name.

        Performs a case-insensitive partial match on the NPC's name within this campaign.
        Returns full details including personality, secrets, motivation, and stats.
        Use this when the DM asks about a specific NPC or needs roleplay guidance.

        Args:
            npc_name: The name (or partial name) of the NPC to look up.
        """
        async with session_factory() as session:
            result = await session.execute(
                select(Npc).where(
                    Npc.campaign_id == campaign_id,
                    func.lower(Npc.name).contains(func.lower(npc_name)),
                )
            )
            npc = result.scalars().first()

            if not npc:
                return f"NPC not found matching '{npc_name}' in this campaign."

            data = {
                "name": npc.name,
                "race": npc.race,
                "npc_class": npc.npc_class,
                "description": npc.description,
                "personality": npc.personality,
                "secrets": npc.secrets,
                "motivation": npc.motivation,
                "stats": npc.stats,
                "is_alive": npc.is_alive,
            }
            return json.dumps(data)

    @tool
    async def get_quest_details(quest_title: str) -> str:
        """Get detailed information about a specific quest by title.

        Performs a case-insensitive partial match on the quest title within this campaign.
        Returns full details including description, status, reward, and recommended level.
        Use this when the DM asks about a specific quest or needs to check quest progress.

        Args:
            quest_title: The title (or partial title) of the quest to look up.
        """
        async with session_factory() as session:
            result = await session.execute(
                select(Quest).where(
                    Quest.campaign_id == campaign_id,
                    func.lower(Quest.title).contains(func.lower(quest_title)),
                )
            )
            quest = result.scalars().first()

            if not quest:
                return f"Quest not found matching '{quest_title}' in this campaign."

            data = {
                "title": quest.title,
                "description": quest.description,
                "status": quest.status,
                "reward": quest.reward,
                "level": quest.level,
            }
            return json.dumps(data)

    @tool
    async def get_all_locations() -> str:
        """Get all locations in the current campaign.

        Returns name, biome, and description for every location.
        Use this to understand the campaign's geography and available areas.
        """
        async with session_factory() as session:
            result = await session.execute(
                select(Location).where(Location.campaign_id == campaign_id)
            )
            locations = result.scalars().all()

            if not locations:
                return "No locations found in this campaign."

            data = [
                {
                    "name": loc.name,
                    "biome": loc.biome,
                    "description": loc.description,
                }
                for loc in locations
            ]
            return json.dumps(data)

    return [
        get_party_members,
        get_location_npcs,
        get_location_quests,
        get_npc_details,
        get_quest_details,
        get_all_locations,
    ]


async def _resolve_location_id(
    session, campaign_id: UUID, location_name: str
) -> UUID | str:
    """Resolve a location name to its ID, or fall back to the campaign's current location.

    Args:
        session: An active async DB session.
        campaign_id: The campaign UUID to scope the lookup.
        location_name: Location name to search for (case-insensitive). If empty,
                       uses the campaign's current_location_id.

    Returns:
        The location UUID on success, or an error message string on failure.
    """
    if location_name.strip():
        result = await session.execute(
            select(Location.id).where(
                Location.campaign_id == campaign_id,
                func.lower(Location.name) == func.lower(location_name.strip()),
            )
        )
        location_id = result.scalar_one_or_none()
        if location_id is None:
            return f"Location '{location_name}' not found in this campaign."
        return location_id
    else:
        result = await session.execute(
            select(Campaign.current_location_id).where(Campaign.id == campaign_id)
        )
        current_location_id = result.scalar_one_or_none()
        if current_location_id is None:
            return "No current location set for this campaign."
        return current_location_id
