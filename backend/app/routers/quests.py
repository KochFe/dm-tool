import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.quest import QuestCreate, QuestUpdate, QuestResponse
from app.schemas.common import APIResponse
from app.services import campaign_service, quest_service

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/quests",
    response_model=APIResponse[QuestResponse],
    status_code=201,
)
async def create_quest(
    campaign_id: uuid.UUID,
    data: QuestCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new quest scoped to a campaign."""
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    quest = await quest_service.create_quest(db, campaign_id, data)
    return APIResponse(data=QuestResponse.model_validate(quest))


@router.get(
    "/campaigns/{campaign_id}/quests",
    response_model=APIResponse[list[QuestResponse]],
)
async def list_quests(
    campaign_id: uuid.UUID,
    location_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all quests for a campaign, optionally filtered by location."""
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    quests = await quest_service.get_quests(db, campaign_id, location_id=location_id)
    return APIResponse(data=[QuestResponse.model_validate(q) for q in quests])


@router.get("/quests/{quest_id}", response_model=APIResponse[QuestResponse])
async def get_quest(quest_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve a single quest by ID."""
    quest = await quest_service.get_quest(db, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    return APIResponse(data=QuestResponse.model_validate(quest))


@router.patch("/quests/{quest_id}", response_model=APIResponse[QuestResponse])
async def update_quest(
    quest_id: uuid.UUID,
    data: QuestUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a quest. Only provided fields are modified."""
    quest = await quest_service.get_quest(db, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    updated = await quest_service.update_quest(db, quest, data)
    return APIResponse(data=QuestResponse.model_validate(updated))


@router.delete("/quests/{quest_id}", status_code=204)
async def delete_quest(quest_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a quest by ID."""
    quest = await quest_service.get_quest(db, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    await quest_service.delete_quest(db, quest)
