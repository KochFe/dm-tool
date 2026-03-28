import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.campaign_phase import PhaseCreate, PhaseLinksUpdate, PhaseResponse, PhaseUpdate
from app.schemas.common import APIResponse
from app.services import campaign_service, phase_service

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
