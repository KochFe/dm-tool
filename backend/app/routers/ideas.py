import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.campaign_idea import IdeaCreate, IdeaResponse, IdeaUpdate
from app.schemas.common import APIResponse
from app.services import campaign_service, idea_service

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/ideas",
    response_model=APIResponse[IdeaResponse],
    status_code=201,
)
async def create_idea(
    campaign_id: uuid.UUID,
    data: IdeaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new idea for a campaign."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    idea = await idea_service.create_idea(db, campaign_id, data)
    return APIResponse(data=IdeaResponse.model_validate(idea))


@router.get(
    "/campaigns/{campaign_id}/ideas",
    response_model=APIResponse[list[IdeaResponse]],
)
async def list_ideas(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all ideas for a campaign."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    ideas = await idea_service.get_ideas(db, campaign_id)
    return APIResponse(data=[IdeaResponse.model_validate(i) for i in ideas])


@router.patch("/ideas/{idea_id}", response_model=APIResponse[IdeaResponse])
async def update_idea(
    idea_id: uuid.UUID,
    data: IdeaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update an idea."""
    idea = await idea_service.get_idea(db, idea_id, current_user.id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    updated = await idea_service.update_idea(db, idea, data)
    return APIResponse(data=IdeaResponse.model_validate(updated))


@router.delete("/ideas/{idea_id}", status_code=204)
async def delete_idea(
    idea_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an idea."""
    idea = await idea_service.get_idea(db, idea_id, current_user.id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    await idea_service.delete_idea(db, idea)
