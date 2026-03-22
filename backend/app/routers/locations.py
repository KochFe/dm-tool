import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.schemas.common import APIResponse
from app.services import campaign_service, location_service

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/locations",
    response_model=APIResponse[LocationResponse],
    status_code=201,
)
async def create_location(
    campaign_id: uuid.UUID,
    data: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    location = await location_service.create_location(db, campaign_id, data)
    return APIResponse(data=LocationResponse.model_validate(location))


@router.get(
    "/campaigns/{campaign_id}/locations",
    response_model=APIResponse[list[LocationResponse]],
)
async def list_locations(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    locations = await location_service.get_locations(db, campaign_id)
    return APIResponse(data=[LocationResponse.model_validate(loc) for loc in locations])


@router.get("/locations/{location_id}", response_model=APIResponse[LocationResponse])
async def get_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    location = await location_service.get_location(db, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return APIResponse(data=LocationResponse.model_validate(location))


@router.patch(
    "/locations/{location_id}", response_model=APIResponse[LocationResponse]
)
async def update_location(
    location_id: uuid.UUID,
    data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    location = await location_service.get_location(db, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    updated = await location_service.update_location(db, location, data)
    return APIResponse(data=LocationResponse.model_validate(updated))


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    location = await location_service.get_location(db, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    await location_service.delete_location(db, location)
