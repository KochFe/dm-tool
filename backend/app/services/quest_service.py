import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.location import Location
from app.models.quest import Quest
from app.schemas.quest import QuestCreate, QuestUpdate


async def create_quest(
    db: AsyncSession, campaign_id: uuid.UUID, data: QuestCreate
) -> Quest:
    """Create a new quest scoped to a campaign.

    Verifies that the campaign exists and, if a location_id is provided,
    that the location also exists. Raises 404 if either is missing.
    """
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if data.location_id is not None:
        location = await db.get(Location, data.location_id)
        if location is None:
            raise HTTPException(status_code=404, detail="Location not found")

    quest = Quest(campaign_id=campaign_id, **data.model_dump())
    db.add(quest)
    await db.commit()
    await db.refresh(quest)
    return quest


async def get_quest(
    db: AsyncSession, quest_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> Quest | None:
    """Retrieve a single quest by ID.

    If user_id is provided, also verifies the quest belongs to a campaign owned
    by that user. Returns None if ownership check fails.
    """
    quest = await db.get(Quest, quest_id)
    if quest is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, quest.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return quest


async def get_quests(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    location_id: uuid.UUID | None = None,
) -> list[Quest]:
    """Retrieve all quests for a campaign, ordered by creation date descending.

    If location_id is provided, results are filtered to that location only.
    """
    query = (
        select(Quest)
        .where(Quest.campaign_id == campaign_id)
        .order_by(Quest.created_at.desc())
    )
    if location_id is not None:
        query = query.where(Quest.location_id == location_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def update_quest(
    db: AsyncSession, quest: Quest, data: QuestUpdate
) -> Quest:
    """Partially update a quest.

    Only fields explicitly provided by the caller are modified. If location_id
    is being set to a non-None value, the location's existence is verified
    first (raises 404 if missing).
    """
    update_data = data.model_dump(exclude_unset=True)

    if "location_id" in update_data and update_data["location_id"] is not None:
        location = await db.get(Location, update_data["location_id"])
        if location is None:
            raise HTTPException(status_code=404, detail="Location not found")

    for key, value in update_data.items():
        setattr(quest, key, value)

    await db.commit()
    await db.refresh(quest)
    return quest


async def delete_quest(db: AsyncSession, quest: Quest) -> None:
    """Delete a quest."""
    await db.delete(quest)
    await db.commit()
