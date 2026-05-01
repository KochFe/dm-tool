"""Phase Expander service: preload context + invoke graph."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.graphs.phase_expander import compile_phase_expander_graph
from app.models.campaign_phase import CampaignPhase
from app.models.npc import Npc
from app.models.location import Location
from app.schemas.language import Language
from app.schemas.phase_expander import DraftPhaseBundle


NPC_CONTEXT_CAP = 50


async def _build_state(
    db: AsyncSession,
    campaign: object,
    phase: CampaignPhase,
    user_steer: str,
) -> dict:
    """Build the initial graph state dict from DB context."""
    # Sibling phases with a lower sort_order
    prior_q = (
        select(CampaignPhase)
        .where(CampaignPhase.campaign_id == campaign.id)
        .where(CampaignPhase.sort_order < phase.sort_order)
        .order_by(CampaignPhase.sort_order)
    )
    prior = (await db.execute(prior_q)).scalars().all()

    # Locations: all campaign-level ones
    loc_q = select(Location).where(Location.campaign_id == campaign.id)
    locations = (await db.execute(loc_q)).scalars().all()

    # NPCs: campaign-wide, capped for context window
    npc_q = (
        select(Npc)
        .where(Npc.campaign_id == campaign.id)
        .order_by(Npc.created_at.desc())
        .limit(NPC_CONTEXT_CAP)
    )
    npcs = (await db.execute(npc_q)).scalars().all()

    return {
        "phase_id": phase.id,
        "phase_title": phase.title,
        "user_steer": user_steer,
        "campaign_context": {
            "name": campaign.name,
            "description": getattr(campaign, "description", None),
            "party_level": campaign.party_level,
        },
        "prior_phases": [
            {"title": p.title, "excerpt": (p.description or "")[:140]}
            for p in prior
        ],
        "existing_phase_description": phase.description,
        "existing_locations": [
            {
                "id": str(loc.id),
                "name": loc.name,
                "region": getattr(loc, "biome", None),
            }
            for loc in locations
        ],
        "existing_npcs": [
            {
                "id": str(npc.id),
                "name": npc.name,
                "role": getattr(npc, "npc_class", None),
            }
            for npc in npcs
        ],
    }


async def run_phase_expander(
    db: AsyncSession,
    campaign: object,
    phase: CampaignPhase,
    user_steer: str,
    *,
    language: Language = Language.EN,
) -> DraftPhaseBundle:
    """Preload context, invoke graph, return the final DraftPhaseBundle."""
    state = await _build_state(db, campaign, phase, user_steer)
    state["language"] = language
    graph = compile_phase_expander_graph()
    final = await graph.ainvoke(state)
    return DraftPhaseBundle(
        phase_description=final.get("phase_description"),
        draft_locations=final.get("draft_locations") or [],
        draft_npcs=final.get("draft_npcs") or [],
        draft_quests=final.get("draft_quests") or [],
        consistency_notes=final.get("consistency_notes") or [],
    )
