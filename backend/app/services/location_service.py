import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate


async def create_location(
    db: AsyncSession, campaign_id: uuid.UUID, data: LocationCreate
) -> Location:
    """Create a new location, validating parent_id if provided."""
    if data.parent_id is not None:
        parent = await db.get(Location, data.parent_id)
        if parent is None or parent.campaign_id != campaign_id:
            raise HTTPException(
                status_code=400,
                detail="Parent location not found in this campaign",
            )
    location = Location(campaign_id=campaign_id, **data.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


async def get_locations(db: AsyncSession, campaign_id: uuid.UUID) -> list[Location]:
    """List all locations for a campaign."""
    result = await db.execute(
        select(Location)
        .where(Location.campaign_id == campaign_id)
        .order_by(Location.name)
    )
    return list(result.scalars().all())


async def get_location(
    db: AsyncSession, location_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> Location | None:
    """Get a single location. Verify ownership if user_id given."""
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
    """Partial update of a location, validating parent_id if provided."""
    update_data = data.model_dump(exclude_unset=True)

    if "parent_id" in update_data and update_data["parent_id"] is not None:
        new_parent_id = update_data["parent_id"]
        if new_parent_id == location.id:
            raise HTTPException(
                status_code=400,
                detail="A location cannot be its own parent",
            )
        parent = await db.get(Location, new_parent_id)
        if parent is None or parent.campaign_id != location.campaign_id:
            raise HTTPException(
                status_code=400,
                detail="Parent location not found in this campaign",
            )

    for key, value in update_data.items():
        setattr(location, key, value)
    await db.commit()
    await db.refresh(location)
    return location


async def delete_location(db: AsyncSession, location: Location) -> None:
    """Delete a location."""
    await db.delete(location)
    await db.commit()
