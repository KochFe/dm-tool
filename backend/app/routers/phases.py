import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db, get_language
from app.models.campaign_phase import CampaignPhase
from app.models.location import Location
from app.models.user import User
from app.schemas.ai_assist import AIAssistRequest, PhasePrepResult
from app.schemas.campaign_phase import PhaseCreate, PhaseLinksUpdate, PhaseResponse, PhaseUpdate
from app.schemas.common import APIResponse
from app.schemas.language import Language
from app.schemas.phase_expander import (
    ApplyPhaseBundleRequest,
    ApplyPhaseBundleResponse,
    DraftPhaseBundle,
    ExpandPhaseRequest,
)
from app.services import campaign_service, phase_service
from app.services.generator_service import generate_phase_description
from app.services.phase_expander_apply import apply_phase_bundle
from app.services.phase_expander_service import run_phase_expander

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/phases",
    response_model=APIResponse[PhaseResponse],
    status_code=201,
)
async def create_phase(
    campaign_id: uuid.UUID,
    data: PhaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new phase for a campaign."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    phase = await phase_service.create_phase(db, campaign_id, data)
    # Reload with relationships before serializing
    phase = await phase_service.get_phase(db, phase.id)
    return APIResponse(data=PhaseResponse.model_validate(phase))


@router.get(
    "/campaigns/{campaign_id}/phases",
    response_model=APIResponse[list[PhaseResponse]],
)
async def list_phases(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all phases for a campaign."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    phases = await phase_service.get_phases(db, campaign_id)
    return APIResponse(data=[PhaseResponse.model_validate(p) for p in phases])


@router.get("/phases/{phase_id}", response_model=APIResponse[PhaseResponse])
async def get_phase(
    phase_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single phase by ID."""
    phase = await phase_service.get_phase(db, phase_id, current_user.id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return APIResponse(data=PhaseResponse.model_validate(phase))


@router.patch("/phases/{phase_id}", response_model=APIResponse[PhaseResponse])
async def update_phase(
    phase_id: uuid.UUID,
    data: PhaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a phase."""
    phase = await phase_service.get_phase(db, phase_id, current_user.id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    updated = await phase_service.update_phase(db, phase, data)
    # Reload with relationships after update
    updated = await phase_service.get_phase(db, updated.id)
    return APIResponse(data=PhaseResponse.model_validate(updated))


@router.delete("/phases/{phase_id}", status_code=204)
async def delete_phase(
    phase_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a phase."""
    phase = await phase_service.get_phase(db, phase_id, current_user.id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    await phase_service.delete_phase(db, phase)


@router.put("/phases/{phase_id}/quests", response_model=APIResponse[PhaseResponse])
async def set_phase_quests(
    phase_id: uuid.UUID,
    body: PhaseLinksUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace the set of quests linked to a phase."""
    phase = await phase_service.get_phase(db, phase_id, current_user.id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    updated = await phase_service.set_phase_quests(db, phase, body.ids)
    return APIResponse(data=PhaseResponse.model_validate(updated))


@router.put("/phases/{phase_id}/locations", response_model=APIResponse[PhaseResponse])
async def set_phase_locations(
    phase_id: uuid.UUID,
    body: PhaseLinksUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace the set of locations linked to a phase."""
    phase = await phase_service.get_phase(db, phase_id, current_user.id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    updated = await phase_service.set_phase_locations(db, phase, body.ids)
    return APIResponse(data=PhaseResponse.model_validate(updated))


@router.post(
    "/campaigns/{campaign_id}/phases/{phase_id}/ai/description",
    response_model=APIResponse[PhasePrepResult],
)
async def ai_phase_description_endpoint(
    campaign_id: uuid.UUID,
    phase_id: uuid.UUID,
    request: AIAssistRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    language: Language = Depends(get_language),
) -> APIResponse[PhasePrepResult]:
    """Generate a structured DM prep sheet for a phase (non-persistent)."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    phase_q = (
        select(CampaignPhase)
        .where(CampaignPhase.id == phase_id)
        .options(selectinload(CampaignPhase.locations).selectinload(Location.npcs))
    )
    phase = (await db.execute(phase_q)).scalar_one_or_none()
    if not phase or phase.campaign_id != campaign_id:
        raise HTTPException(status_code=404, detail="Phase not found")

    prior_q = (
        select(CampaignPhase)
        .where(CampaignPhase.campaign_id == campaign_id)
        .where(CampaignPhase.sort_order < phase.sort_order)
        .order_by(CampaignPhase.sort_order)
    )
    prior_phases = (await db.execute(prior_q)).scalars().all()
    prior_summaries = [
        f"{p.title}: {(p.description or '')[:140]}" for p in prior_phases
    ]

    try:
        result = await generate_phase_description(
            campaign, phase, prior_summaries, request, language=language,
        )
    except RuntimeError:
        logger.exception("AI phase-description error for phase %s", phase_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=result)


@router.post(
    "/campaigns/{campaign_id}/phases/{phase_id}/expand",
    response_model=APIResponse[DraftPhaseBundle],
)
async def expand_phase_endpoint(
    campaign_id: uuid.UUID,
    phase_id: uuid.UUID,
    request: ExpandPhaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    language: Language = Depends(get_language),
) -> APIResponse[DraftPhaseBundle]:
    """Run the Phase Expander graph and return a read-only DraftPhaseBundle."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    phase = await db.get(CampaignPhase, phase_id)
    if not phase or phase.campaign_id != campaign_id:
        raise HTTPException(status_code=404, detail="Phase not found")

    try:
        bundle = await run_phase_expander(
            db, campaign, phase, request.user_steer, language=language,
        )
    except RuntimeError:
        logger.exception("Phase expander error for phase %s", phase_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=bundle)


@router.post(
    "/campaigns/{campaign_id}/phases/{phase_id}/expand/apply",
    response_model=APIResponse[ApplyPhaseBundleResponse],
)
async def apply_phase_bundle_endpoint(
    campaign_id: uuid.UUID,
    phase_id: uuid.UUID,
    request: ApplyPhaseBundleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> APIResponse[ApplyPhaseBundleResponse]:
    """Persist the accepted subset of a DraftPhaseBundle in a single transaction."""
    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    phase = await db.get(CampaignPhase, phase_id)
    if not phase or phase.campaign_id != campaign_id:
        raise HTTPException(status_code=404, detail="Phase not found")

    try:
        result = await apply_phase_bundle(db, campaign_id, phase, request)
    except Exception:
        await db.rollback()
        logger.exception("apply_phase_bundle failed for phase %s", phase_id)
        raise HTTPException(status_code=500, detail="Failed to apply phase bundle")

    return APIResponse(data=result)
