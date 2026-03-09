import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.combat_session import (
    AddCombatantRequest,
    CombatSessionCreate,
    CombatSessionResponse,
    CombatSessionUpdate,
    UpdateCombatantRequest,
)
from app.schemas.common import APIResponse
from app.services import campaign_service, combat_session_service

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/combat-sessions",
    response_model=APIResponse[CombatSessionResponse],
    status_code=201,
)
async def create_combat_session(
    campaign_id: uuid.UUID,
    data: CombatSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new combat session for a campaign.

    Combatants are sorted by initiative descending on creation.
    Returns 404 if the campaign does not exist.
    """
    session = await combat_session_service.create_combat_session(db, campaign_id, data)
    return APIResponse(data=CombatSessionResponse.model_validate(session))


@router.get(
    "/campaigns/{campaign_id}/combat-sessions",
    response_model=APIResponse[list[CombatSessionResponse]],
)
async def list_combat_sessions(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all combat sessions for a campaign, newest first.

    Returns 404 if the campaign does not exist.
    """
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    sessions = await combat_session_service.get_combat_sessions(db, campaign_id)
    return APIResponse(
        data=[CombatSessionResponse.model_validate(s) for s in sessions]
    )


@router.get(
    "/combat-sessions/{session_id}",
    response_model=APIResponse[CombatSessionResponse],
)
async def get_combat_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single combat session by ID.

    Returns 404 if the session does not exist.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    return APIResponse(data=CombatSessionResponse.model_validate(session))


@router.patch(
    "/combat-sessions/{session_id}",
    response_model=APIResponse[CombatSessionResponse],
)
async def update_combat_session(
    session_id: uuid.UUID,
    data: CombatSessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a combat session's name or status.

    Only fields explicitly provided in the request body are updated.
    Returns 404 if the session does not exist.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    updated = await combat_session_service.update_combat_session(db, session, data)
    return APIResponse(data=CombatSessionResponse.model_validate(updated))


@router.delete("/combat-sessions/{session_id}", status_code=204)
async def delete_combat_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a combat session by ID.

    Returns 204 No Content on success.
    Returns 404 if the session does not exist.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    await combat_session_service.delete_combat_session(db, session)


@router.post(
    "/combat-sessions/{session_id}/combatants",
    response_model=APIResponse[CombatSessionResponse],
    status_code=201,
)
async def add_combatant(
    session_id: uuid.UUID,
    data: AddCombatantRequest,
    db: AsyncSession = Depends(get_db),
):
    """Append a combatant to an existing combat session.

    The combatant list is re-sorted by initiative descending after insertion.
    Returns 404 if the session does not exist.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    updated = await combat_session_service.add_combatant(db, session, data)
    return APIResponse(data=CombatSessionResponse.model_validate(updated))


@router.patch(
    "/combat-sessions/{session_id}/combatants/{index}",
    response_model=APIResponse[CombatSessionResponse],
)
async def update_combatant(
    session_id: uuid.UUID,
    index: int,
    data: UpdateCombatantRequest,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a combatant at the given list index.

    Only fields explicitly provided are updated; others remain unchanged.
    Returns 404 if the session does not exist.
    Returns 400 if the index is out of range.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    updated = await combat_session_service.update_combatant(db, session, index, data)
    return APIResponse(data=CombatSessionResponse.model_validate(updated))


@router.delete(
    "/combat-sessions/{session_id}/combatants/{index}",
    response_model=APIResponse[CombatSessionResponse],
)
async def remove_combatant(
    session_id: uuid.UUID,
    index: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove the combatant at the given list index.

    The current_turn_index is adjusted automatically if needed.
    Returns 404 if the session does not exist.
    Returns 400 if the index is out of range.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    updated = await combat_session_service.remove_combatant(db, session, index)
    return APIResponse(data=CombatSessionResponse.model_validate(updated))


@router.post(
    "/combat-sessions/{session_id}/next-turn",
    response_model=APIResponse[CombatSessionResponse],
)
async def advance_turn(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Advance the initiative tracker to the next combatant's turn.

    Wraps to index 0 and increments round_number when the last combatant's
    turn ends.
    Returns 404 if the session does not exist.
    Returns 400 if the session is completed or has no combatants.
    """
    session = await combat_session_service.get_combat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Combat session not found")
    updated = await combat_session_service.advance_turn(db, session)
    return APIResponse(data=CombatSessionResponse.model_validate(updated))
