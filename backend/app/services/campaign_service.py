import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate, CampaignUpdate


async def create_campaign(
    db: AsyncSession, data: CampaignCreate, user_id: uuid.UUID
) -> Campaign:
    campaign = Campaign(**data.model_dump(), user_id=user_id)
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def get_campaigns(db: AsyncSession, user_id: uuid.UUID) -> list[Campaign]:
    result = await db.execute(
        select(Campaign)
        .where(Campaign.user_id == user_id)
        .order_by(Campaign.created_at.desc())
    )
    return list(result.scalars().all())


async def get_campaign(
    db: AsyncSession, campaign_id: uuid.UUID, user_id: uuid.UUID
) -> Campaign | None:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.user_id != user_id:
        return None
    return campaign


async def update_campaign(
    db: AsyncSession, campaign: Campaign, data: CampaignUpdate
) -> Campaign:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def delete_campaign(db: AsyncSession, campaign: Campaign) -> None:
    await db.delete(campaign)
    await db.commit()
