import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.npc import NpcCreate, NpcUpdate, NpcResponse
from app.schemas.common import APIResponse
from app.services import campaign_service, npc_service

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
