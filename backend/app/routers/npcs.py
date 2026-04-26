import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, get_language
from app.models.npc import Npc
from app.models.user import User
from app.schemas.ai_assist import AIAssistRequest, PersonalityResult
from app.schemas.language import Language
from app.schemas.npc import NpcCreate, NpcUpdate, NpcResponse
from app.schemas.common import APIResponse
from app.services import campaign_service, npc_service
from app.services.generator_service import generate_npc_personality

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/npcs",
    response_model=APIResponse[NpcResponse],
    status_code=201,
)
async def create_npc(
    campaign_id: uuid.UUID,
    data: NpcCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new NPC scoped to a campaign."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    npc = await npc_service.create_npc(db, campaign_id, data)
    return APIResponse(data=NpcResponse.model_validate(npc))


@router.get(
    "/campaigns/{campaign_id}/npcs",
    response_model=APIResponse[list[NpcResponse]],
)
async def list_npcs(
    campaign_id: uuid.UUID,
    location_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all NPCs in a campaign, optionally filtered by location."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    npcs = await npc_service.get_npcs(db, campaign_id, location_id=location_id)
    return APIResponse(data=[NpcResponse.model_validate(npc) for npc in npcs])


@router.get("/npcs/{npc_id}", response_model=APIResponse[NpcResponse])
async def get_npc(
    npc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single NPC by ID."""
    npc = await npc_service.get_npc(db, npc_id, current_user.id)
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    return APIResponse(data=NpcResponse.model_validate(npc))


@router.patch("/npcs/{npc_id}", response_model=APIResponse[NpcResponse])
async def update_npc(
    npc_id: uuid.UUID,
    data: NpcUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update an NPC. Only provided fields are changed."""
    npc = await npc_service.get_npc(db, npc_id, current_user.id)
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    updated = await npc_service.update_npc(db, npc, data)
    return APIResponse(data=NpcResponse.model_validate(updated))


@router.delete("/npcs/{npc_id}", status_code=204)
async def delete_npc(
    npc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an NPC by ID."""
    npc = await npc_service.get_npc(db, npc_id, current_user.id)
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    await npc_service.delete_npc(db, npc)


@router.post(
    "/npcs/{npc_id}/ai/personality",
    response_model=APIResponse[PersonalityResult],
)
async def ai_npc_personality_endpoint(
    npc_id: uuid.UUID,
    request: AIAssistRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    language: Language = Depends(get_language),
) -> APIResponse[PersonalityResult]:
    """Generate or augment the NPC's personality + motivation (non-persistent)."""
    npc = await db.get(Npc, npc_id)
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    campaign = await campaign_service.get_campaign(db, npc.campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        result = await generate_npc_personality(npc, campaign, request, language=language)
    except RuntimeError:
        logger.exception("AI npc-personality error for npc %s", npc_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=result)
