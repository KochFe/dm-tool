import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.player_character import (
    PlayerCharacterCreate,
    PlayerCharacterUpdate,
    PlayerCharacterResponse,
)
from app.schemas.common import APIResponse
from app.services import campaign_service, player_character_service

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/characters",
    response_model=APIResponse[PlayerCharacterResponse],
    status_code=201,
)
async def create_character(
    campaign_id: uuid.UUID,
    data: PlayerCharacterCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    pc = await player_character_service.create_player_character(db, campaign_id, data)
    return APIResponse(data=PlayerCharacterResponse.model_validate(pc))


@router.get(
    "/campaigns/{campaign_id}/characters",
    response_model=APIResponse[list[PlayerCharacterResponse]],
)
async def list_characters(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    pcs = await player_character_service.get_player_characters(db, campaign_id)
    return APIResponse(data=[PlayerCharacterResponse.model_validate(pc) for pc in pcs])


@router.get(
    "/characters/{character_id}",
    response_model=APIResponse[PlayerCharacterResponse],
)
async def get_character(
    character_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    pc = await player_character_service.get_player_character(db, character_id)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")
    return APIResponse(data=PlayerCharacterResponse.model_validate(pc))


@router.patch(
    "/characters/{character_id}",
    response_model=APIResponse[PlayerCharacterResponse],
)
async def update_character(
    character_id: uuid.UUID,
    data: PlayerCharacterUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    pc = await player_character_service.get_player_character(db, character_id)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")
    updated = await player_character_service.update_player_character(db, pc, data)
    return APIResponse(data=PlayerCharacterResponse.model_validate(updated))


@router.delete("/characters/{character_id}", status_code=204)
async def delete_character(
    character_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    pc = await player_character_service.get_player_character(db, character_id)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")
    await player_character_service.delete_player_character(db, pc)
