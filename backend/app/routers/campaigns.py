import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.common import APIResponse
from app.services import campaign_service

router = APIRouter()


@router.post("/campaigns", response_model=APIResponse[CampaignResponse], status_code=201)
async def create_campaign(
    data: CampaignCreate, db: AsyncSession = Depends(get_db)
):
    campaign = await campaign_service.create_campaign(db, data)
    return APIResponse(data=CampaignResponse.model_validate(campaign))


@router.get("/campaigns", response_model=APIResponse[list[CampaignResponse]])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    campaigns = await campaign_service.get_campaigns(db)
    return APIResponse(data=[CampaignResponse.model_validate(c) for c in campaigns])


@router.get("/campaigns/{campaign_id}", response_model=APIResponse[CampaignResponse])
async def get_campaign(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return APIResponse(data=CampaignResponse.model_validate(campaign))


@router.patch("/campaigns/{campaign_id}", response_model=APIResponse[CampaignResponse])
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updated = await campaign_service.update_campaign(db, campaign, data)
    return APIResponse(data=CampaignResponse.model_validate(updated))


@router.delete("/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await campaign_service.delete_campaign(db, campaign)
