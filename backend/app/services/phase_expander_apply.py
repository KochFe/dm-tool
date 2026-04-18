"""Deterministic writer: persists an approved DraftPhaseBundle in one transaction.

LangGraph is read-only by project rule; all DB writes live here.
"""
import uuid

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign_phase import (
    CampaignPhase,
    phase_locations,
    phase_quests,
)
from app.models.location import Location
from app.models.npc import Npc
from app.models.quest import Quest
from app.schemas.phase_expander import (
    ApplyPhaseBundleRequest,
    ApplyPhaseBundleResponse,
)


async def apply_phase_bundle(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    phase: CampaignPhase,
    req: ApplyPhaseBundleRequest,
) -> ApplyPhaseBundleResponse:
    """Persist accepted drafts in a single transaction. Rolls back on any error."""
    created_location_ids: list[uuid.UUID] = []
    linked_location_ids: list[uuid.UUID] = []
    created_npc_ids: list[uuid.UUID] = []
    created_quest_ids: list[uuid.UUID] = []

    # 1. Update phase description if provided
    if req.phase_description is not None:
        phase.description = req.phase_description

    # 2. Create/reuse locations; track index -> actual UUID for cross-refs
    location_uuids: list[uuid.UUID] = []
    for draft in req.accepted_locations:
        if draft.reuse_id is not None:
            location_uuids.append(draft.reuse_id)
            linked_location_ids.append(draft.reuse_id)
            # Ensure M2M link exists between phase and this existing location.
            # Use SELECT-then-INSERT to avoid SQLite "OR IGNORE" / Postgres dialect mismatch.
            existing_link = await db.execute(
                select(phase_locations).where(
                    phase_locations.c.phase_id == phase.id,
                    phase_locations.c.location_id == draft.reuse_id,
                )
            )
            if existing_link.first() is None:
                await db.execute(
                    insert(phase_locations).values(
                        phase_id=phase.id, location_id=draft.reuse_id
                    )
                )
        else:
            loc = Location(
                campaign_id=campaign_id,
                name=draft.name,
                description=draft.description,
                # DraftLocation exposes region; Location model stores biome
                biome=draft.region or "unknown",
            )
            db.add(loc)
            await db.flush()
            location_uuids.append(loc.id)
            created_location_ids.append(loc.id)
            await db.execute(
                insert(phase_locations).values(phase_id=phase.id, location_id=loc.id)
            )

    # 3. Create NPCs; resolve location_index -> UUID
    npc_uuids: list[uuid.UUID] = []
    for draft in req.accepted_npcs:
        if draft.reuse_id is not None:
            npc_uuids.append(draft.reuse_id)
            continue

        loc_id: uuid.UUID | None = None
        if draft.location_index is not None and 0 <= draft.location_index < len(location_uuids):
            loc_id = location_uuids[draft.location_index]

        npc = Npc(
            campaign_id=campaign_id,
            name=draft.name,
            # Npc model uses npc_class; DraftNpc schema exposes role
            npc_class=draft.role,
            personality=draft.personality,
            motivation=draft.motivation,
            location_id=loc_id,
            # race is NOT NULL with no server_default — supply a sentinel value
            race="unknown",
        )
        db.add(npc)
        await db.flush()
        npc_uuids.append(npc.id)
        created_npc_ids.append(npc.id)

    # 4. Create quests and link to phase
    for draft in req.accepted_quests:
        # Embed cross-references in the description until a direct
        # quest <-> npc / quest <-> location M2M exists.
        refs: list[str] = []
        if draft.npc_indices:
            ref_names = [
                f"npc[{i}]" for i in draft.npc_indices if 0 <= i < len(npc_uuids)
            ]
            if ref_names:
                refs.append("NPCs: " + ", ".join(ref_names))
        if draft.location_indices:
            ref_names = [
                f"location[{i}]"
                for i in draft.location_indices
                if 0 <= i < len(location_uuids)
            ]
            if ref_names:
                refs.append("Locations: " + ", ".join(ref_names))

        full_desc = draft.description
        if refs:
            full_desc += "\n\n---\nReferences: " + "; ".join(refs)

        quest = Quest(
            campaign_id=campaign_id,
            title=draft.title,
            description=full_desc,
        )
        db.add(quest)
        await db.flush()
        created_quest_ids.append(quest.id)
        await db.execute(
            insert(phase_quests).values(phase_id=phase.id, quest_id=quest.id)
        )

    await db.commit()

    return ApplyPhaseBundleResponse(
        phase_id=phase.id,
        created_location_ids=created_location_ids,
        linked_location_ids=linked_location_ids,
        created_npc_ids=created_npc_ids,
        created_quest_ids=created_quest_ids,
    )
