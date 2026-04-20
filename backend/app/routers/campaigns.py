import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_assist import AIAssistRequest, TextResult
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.common import APIResponse
from app.services import campaign_service
from app.services.generator_service import generate_campaign_description

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/campaigns", response_model=APIResponse[CampaignResponse], status_code=201)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.create_campaign(db, data, current_user.id)
    return APIResponse(data=CampaignResponse.model_validate(campaign))


@router.get("/campaigns", response_model=APIResponse[list[CampaignResponse]])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = await campaign_service.get_campaigns(db, current_user.id)
    return APIResponse(data=[CampaignResponse.model_validate(c) for c in campaigns])


@router.get("/campaigns/{campaign_id}", response_model=APIResponse[CampaignResponse])
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return APIResponse(data=CampaignResponse.model_validate(campaign))


@router.patch("/campaigns/{campaign_id}", response_model=APIResponse[CampaignResponse])
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updated = await campaign_service.update_campaign(db, campaign, data)
    return APIResponse(data=CampaignResponse.model_validate(updated))


@router.delete("/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await campaign_service.delete_campaign(db, campaign)


@router.post(
    "/campaigns/{campaign_id}/ai/campaign-description",
    response_model=APIResponse[TextResult],
)
async def ai_campaign_description_endpoint(
    campaign_id: uuid.UUID,
    request: AIAssistRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> APIResponse[TextResult]:
    """Generate or augment the campaign description (non-persistent)."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        result = await generate_campaign_description(campaign, request)
    except RuntimeError:
        logger.exception("AI campaign-description error for campaign %s", campaign_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=result)


@router.post(
    "/campaigns/{campaign_id}/activate",
    response_model=APIResponse[CampaignResponse],
)
async def activate_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Flip a draft campaign to active status."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Campaign is already active")
    campaign.status = "active"
    await db.commit()
    await db.refresh(campaign)
    return APIResponse(data=CampaignResponse.model_validate(campaign))
