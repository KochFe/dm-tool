import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.ddb_import import DDBImportRequest, DDBImportPreview
from app.services import campaign_service
from app.services.ddb_service import (
    DDBImportError,
    extract_character_id,
    fetch_ddb_character,
    map_ddb_character,
)

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/characters/import/ddb",
    response_model=APIResponse[DDBImportPreview],
)
async def import_ddb_character(
    campaign_id: uuid.UUID,
    data: DDBImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        char_id = extract_character_id(data.url)
        raw = await fetch_ddb_character(char_id)
        character_dict, ddb_id, warnings, unmapped = map_ddb_character(raw)
    except DDBImportError as e:
        raise HTTPException(status_code=422, detail=str(e))

    from app.schemas.player_character import PlayerCharacterCreate

    preview = PlayerCharacterCreate(**character_dict)

    return APIResponse(
        data=DDBImportPreview(
            preview=preview,
            ddb_id=ddb_id,
            ddb_name=preview.name,
            warnings=warnings,
            unmapped_data=unmapped,
        )
    )
