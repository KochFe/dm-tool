import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.location import Location
from app.models.npc import Npc
from app.schemas.npc import NpcCreate, NpcUpdate


async def create_npc(
    db: AsyncSession, campaign_id: uuid.UUID, data: NpcCreate
) -> Npc:
    """Create a new NPC scoped to a campaign.

    Verifies the campaign exists. If a location_id is supplied, verifies the
    location exists and belongs to the same campaign. Raises 404 on either
    missing resource.
    """
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if data.location_id is not None:
        location = await db.get(Location, data.location_id)
        if location is None:
            raise HTTPException(status_code=404, detail="Location not found")

    npc_data = data.model_dump(exclude={"stats"})
    npc = Npc(
        campaign_id=campaign_id,
        **npc_data,
        stats=data.stats,
    )
    db.add(npc)
    await db.commit()
    await db.refresh(npc)
    return npc


async def get_npc(
    db: AsyncSession, npc_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> Npc | None:
    """Retrieve a single NPC by primary key. Returns None if not found.

    If user_id is provided, also verifies the NPC belongs to a campaign owned
    by that user. Returns None if ownership check fails.
    """
    npc = await db.get(Npc, npc_id)
    if npc is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, npc.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return npc


async def get_npcs(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    location_id: uuid.UUID | None = None,
) -> list[Npc]:
    """Retrieve all NPCs for a campaign, ordered by creation date descending.

    If location_id is provided, only NPCs assigned to that location are returned.
    """
    query = (
        select(Npc)
        .where(Npc.campaign_id == campaign_id)
        .order_by(Npc.created_at.desc())
    )
    if location_id is not None:
        query = query.where(Npc.location_id == location_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def update_npc(db: AsyncSession, npc: Npc, data: NpcUpdate) -> Npc:
    """Partially update an NPC.

    Only fields explicitly sent by the client are updated. If location_id is
    being set to a non-None value, the location is verified to exist (404 if
    not). Setting location_id to None is allowed without verification.
    """
    update_data = data.model_dump(exclude_unset=True)

    if "location_id" in update_data and update_data["location_id"] is not None:
        location = await db.get(Location, update_data["location_id"])
        if location is None:
            raise HTTPException(status_code=404, detail="Location not found")

    for key, value in update_data.items():
        setattr(npc, key, value)

    await db.commit()
    await db.refresh(npc)
    return npc


async def delete_npc(db: AsyncSession, npc: Npc) -> None:
    """Delete an NPC and commit the transaction."""
    await db.delete(npc)
    await db.commit()
