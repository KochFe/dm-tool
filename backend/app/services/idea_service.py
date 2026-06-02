import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.campaign_idea import CampaignIdea
from app.schemas.campaign_idea import IdeaCreate, IdeaReorderItem, IdeaUpdate


async def create_idea(
    db: AsyncSession, campaign_id: uuid.UUID, data: IdeaCreate
) -> CampaignIdea:
    """Create a new idea for a campaign."""
    idea = CampaignIdea(campaign_id=campaign_id, **data.model_dump())
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return idea


async def get_ideas(db: AsyncSession, campaign_id: uuid.UUID) -> list[CampaignIdea]:
    """List all ideas for a campaign ordered by sort_order."""
    result = await db.execute(
        select(CampaignIdea)
        .where(CampaignIdea.campaign_id == campaign_id)
        .order_by(CampaignIdea.sort_order)
    )
    return list(result.scalars().all())


async def get_idea(
    db: AsyncSession,
    idea_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> CampaignIdea | None:
    """Get a single idea. Verify ownership if user_id given."""
    idea = await db.get(CampaignIdea, idea_id)
    if idea is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, idea.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return idea


async def update_idea(
    db: AsyncSession, idea: CampaignIdea, data: IdeaUpdate
) -> CampaignIdea:
    """Partial update of an idea."""
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(idea, key, value)
    await db.commit()
    await db.refresh(idea)
    return idea


async def reorder_ideas(
    db: AsyncSession, campaign_id: uuid.UUID, items: list[IdeaReorderItem]
) -> list[CampaignIdea] | None:
    """Atomically rewrite sort_order + tag for the given ideas.

    Returns the refreshed ordered list, or None if any id does not belong
    to the campaign (caller maps None -> 404).
    """
    ids = [item.id for item in items]
    result = await db.execute(
        select(CampaignIdea).where(
            CampaignIdea.campaign_id == campaign_id,
            CampaignIdea.id.in_(ids),
        )
    )
    found = {idea.id: idea for idea in result.scalars().all()}
    if len(found) != len(set(ids)):
        return None
    for item in items:
        idea = found[item.id]
        idea.sort_order = item.sort_order
        idea.tag = item.tag
    await db.commit()
    return await get_ideas(db, campaign_id)


async def delete_idea(db: AsyncSession, idea: CampaignIdea) -> None:
    """Delete an idea."""
    await db.delete(idea)
    await db.commit()
