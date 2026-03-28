import uuid

from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.campaign import Campaign
from app.models.campaign_phase import CampaignPhase, phase_locations, phase_quests
from app.models.location import Location
from app.models.quest import Quest
from app.schemas.campaign_phase import PhaseCreate, PhaseUpdate


async def create_phase(
    db: AsyncSession, campaign_id: uuid.UUID, data: PhaseCreate
) -> CampaignPhase:
    """Create a new phase for a campaign."""
    phase = CampaignPhase(campaign_id=campaign_id, **data.model_dump())
    db.add(phase)
    await db.commit()
    await db.refresh(phase)
    return phase


async def get_phases(
    db: AsyncSession, campaign_id: uuid.UUID
) -> list[CampaignPhase]:
    """List all phases for a campaign ordered by sort_order."""
    result = await db.execute(
        select(CampaignPhase)
        .where(CampaignPhase.campaign_id == campaign_id)
        .order_by(CampaignPhase.sort_order)
        .options(selectinload(CampaignPhase.quests), selectinload(CampaignPhase.locations))
    )
    return list(result.scalars().all())


async def get_phase(
    db: AsyncSession,
    phase_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
    populate_existing: bool = False,
) -> CampaignPhase | None:
    """Get a single phase with relationships loaded. Verify ownership if user_id given."""
    stmt = (
        select(CampaignPhase)
        .where(CampaignPhase.id == phase_id)
        .options(selectinload(CampaignPhase.quests), selectinload(CampaignPhase.locations))
    )
    if populate_existing:
        stmt = stmt.execution_options(populate_existing=True)
    result = await db.execute(stmt)
    phase = result.scalar_one_or_none()
    if phase is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, phase.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return phase


async def update_phase(
    db: AsyncSession, phase: CampaignPhase, data: PhaseUpdate
) -> CampaignPhase:
    """Partial update of a phase."""
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(phase, key, value)
    await db.commit()
    await db.refresh(phase)
    return phase


async def delete_phase(db: AsyncSession, phase: CampaignPhase) -> None:
    """Delete a phase."""
    await db.delete(phase)
    await db.commit()


async def set_phase_quests(
    db: AsyncSession, phase: CampaignPhase, quest_ids: list[uuid.UUID]
) -> CampaignPhase:
    """Replace the quests linked to a phase. All quest IDs must belong to the same campaign."""
    if quest_ids:
        result = await db.execute(
            select(Quest).where(
                Quest.id.in_(quest_ids),
                Quest.campaign_id == phase.campaign_id,
            )
        )
        found = result.scalars().all()
        if len(found) != len(quest_ids):
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="One or more quest IDs not found in this campaign",
            )

    await db.execute(delete(phase_quests).where(phase_quests.c.phase_id == phase.id))
    if quest_ids:
        await db.execute(
            insert(phase_quests),
            [{"phase_id": phase.id, "quest_id": qid} for qid in quest_ids],
        )
    await db.commit()

    refreshed = await get_phase(db, phase.id, populate_existing=True)
    return refreshed  # type: ignore[return-value]


async def set_phase_locations(
    db: AsyncSession, phase: CampaignPhase, location_ids: list[uuid.UUID]
) -> CampaignPhase:
    """Replace the locations linked to a phase. All location IDs must belong to the same campaign."""
    if location_ids:
        result = await db.execute(
            select(Location).where(
                Location.id.in_(location_ids),
                Location.campaign_id == phase.campaign_id,
            )
        )
        found = result.scalars().all()
        if len(found) != len(location_ids):
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="One or more location IDs not found in this campaign",
            )

    await db.execute(
        delete(phase_locations).where(phase_locations.c.phase_id == phase.id)
    )
    if location_ids:
        await db.execute(
            insert(phase_locations),
            [{"phase_id": phase.id, "location_id": lid} for lid in location_ids],
        )
    await db.commit()

    refreshed = await get_phase(db, phase.id, populate_existing=True)
    return refreshed  # type: ignore[return-value]
