import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate


async def create_location(
    db: AsyncSession, campaign_id: uuid.UUID, data: LocationCreate
) -> Location:
    location = Location(campaign_id=campaign_id, **data.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


async def get_locations(db: AsyncSession, campaign_id: uuid.UUID) -> list[Location]:
    result = await db.execute(
        select(Location)
        .where(Location.campaign_id == campaign_id)
        .order_by(Location.name)
    )
    return list(result.scalars().all())


async def get_location(
    db: AsyncSession, location_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> Location | None:
    location = await db.get(Location, location_id)
    if location is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, location.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return location


async def update_location(
    db: AsyncSession, location: Location, data: LocationUpdate
) -> Location:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(location, key, value)
    await db.commit()
    await db.refresh(location)
    return location


async def delete_location(db: AsyncSession, location: Location) -> None:
    await db.delete(location)
    await db.commit()
