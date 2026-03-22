import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.player_character import PlayerCharacter
from app.schemas.player_character import PlayerCharacterCreate, PlayerCharacterUpdate


async def create_player_character(
    db: AsyncSession, campaign_id: uuid.UUID, data: PlayerCharacterCreate
) -> PlayerCharacter:
    pc = PlayerCharacter(campaign_id=campaign_id, **data.model_dump())
    db.add(pc)
    await db.commit()
    await db.refresh(pc)
    return pc


async def get_player_characters(
    db: AsyncSession, campaign_id: uuid.UUID
) -> list[PlayerCharacter]:
    result = await db.execute(
        select(PlayerCharacter)
        .where(PlayerCharacter.campaign_id == campaign_id)
        .order_by(PlayerCharacter.name)
    )
    return list(result.scalars().all())


async def get_player_character(
    db: AsyncSession, pc_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> PlayerCharacter | None:
    pc = await db.get(PlayerCharacter, pc_id)
    if pc is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, pc.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return pc


async def update_player_character(
    db: AsyncSession, pc: PlayerCharacter, data: PlayerCharacterUpdate
) -> PlayerCharacter:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pc, key, value)
    await db.commit()
    await db.refresh(pc)
    return pc


async def delete_player_character(db: AsyncSession, pc: PlayerCharacter) -> None:
    await db.delete(pc)
    await db.commit()
