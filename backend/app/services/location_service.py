import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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


async def get_location(db: AsyncSession, location_id: uuid.UUID) -> Location | None:
    return await db.get(Location, location_id)


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
