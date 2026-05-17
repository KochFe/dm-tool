import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.combat_session import CombatSessionResponse
from app.schemas.common import APIResponse
from app.schemas.encounter_template import (
    EncounterTemplateCreate,
    EncounterTemplateResponse,
    EncounterTemplateUpdate,
    StartEncounterRequest,
)
from app.services import campaign_service, encounter_template_service

router = APIRouter()


async def _load_owned_template_or_404(
    db: AsyncSession, template_id: uuid.UUID, user: User
):
    template = await encounter_template_service.get_encounter_template(db, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Encounter template not found")
    campaign = await campaign_service.get_campaign(db, template.campaign_id, user.id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Encounter template not found")
    return template


@router.post(
    "/campaigns/{campaign_id}/encounter-templates",
    response_model=APIResponse[EncounterTemplateResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    campaign_id: uuid.UUID,
    body: EncounterTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    template = await encounter_template_service.create_encounter_template(
        db, campaign_id, body
    )
    return APIResponse(data=EncounterTemplateResponse.model_validate(template))


@router.get(
    "/campaigns/{campaign_id}/encounter-templates",
    response_model=APIResponse[list[EncounterTemplateResponse]],
)
async def list_templates(
    campaign_id: uuid.UUID,
    location_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    templates = await encounter_template_service.list_encounter_templates(
        db, campaign_id, location_id
    )
    return APIResponse(
        data=[EncounterTemplateResponse.model_validate(t) for t in templates]
    )


@router.get(
    "/encounter-templates/{template_id}",
    response_model=APIResponse[EncounterTemplateResponse],
)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await _load_owned_template_or_404(db, template_id, current_user)
    return APIResponse(data=EncounterTemplateResponse.model_validate(template))


@router.patch(
    "/encounter-templates/{template_id}",
    response_model=APIResponse[EncounterTemplateResponse],
)
async def patch_template(
    template_id: uuid.UUID,
    body: EncounterTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await _load_owned_template_or_404(db, template_id, current_user)
    template = await encounter_template_service.update_encounter_template(
        db, template, body
    )
    return APIResponse(data=EncounterTemplateResponse.model_validate(template))


@router.delete(
    "/encounter-templates/{template_id}",
    response_model=APIResponse[None],
)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await _load_owned_template_or_404(db, template_id, current_user)
    await encounter_template_service.delete_encounter_template(db, template)
    return APIResponse(data=None)


@router.post(
    "/encounter-templates/{template_id}/start",
    response_model=APIResponse[CombatSessionResponse],
    status_code=status.HTTP_201_CREATED,
)
async def start_encounter(
    template_id: uuid.UUID,
    body: StartEncounterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await _load_owned_template_or_404(db, template_id, current_user)
    try:
        session = await encounter_template_service.start_encounter(db, template, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return APIResponse(data=CombatSessionResponse.model_validate(session))
