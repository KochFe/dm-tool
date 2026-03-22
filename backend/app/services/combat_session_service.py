import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.combat_session import CombatSession
from app.schemas.combat_session import (
    AddCombatantRequest,
    CombatSessionCreate,
    CombatSessionUpdate,
    UpdateCombatantRequest,
)


async def create_combat_session(
    db: AsyncSession, campaign_id: uuid.UUID, data: CombatSessionCreate
) -> CombatSession:
    """Create a new combat session for a campaign.

    Verifies the campaign exists, sorts the provided combatants by initiative
    descending, and persists the session.
    """
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    sorted_combatants = sorted(
        [c.model_dump(mode="json") for c in data.combatants],
        key=lambda c: c["initiative"],
        reverse=True,
    )

    session = CombatSession(
        campaign_id=campaign_id,
        name=data.name,
        combatants=sorted_combatants,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_combat_session(
    db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> CombatSession | None:
    """Retrieve a single combat session by ID.

    If user_id is provided, also verifies the session belongs to a campaign
    owned by that user. Returns None if ownership check fails.
    """
    session = await db.get(CombatSession, session_id)
    if session is None:
        return None
    if user_id is not None:
        campaign = await db.get(Campaign, session.campaign_id)
        if campaign is None or campaign.user_id != user_id:
            return None
    return session


async def get_combat_sessions(
    db: AsyncSession, campaign_id: uuid.UUID
) -> list[CombatSession]:
    """Retrieve all combat sessions for a campaign, newest first."""
    result = await db.execute(
        select(CombatSession)
        .where(CombatSession.campaign_id == campaign_id)
        .order_by(CombatSession.created_at.desc())
    )
    return list(result.scalars().all())


async def update_combat_session(
    db: AsyncSession, session: CombatSession, data: CombatSessionUpdate
) -> CombatSession:
    """Partially update a combat session's name or status."""
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(session, key, value)
    await db.commit()
    await db.refresh(session)
    return session


async def delete_combat_session(db: AsyncSession, session: CombatSession) -> None:
    """Delete a combat session."""
    await db.delete(session)
    await db.commit()


async def add_combatant(
    db: AsyncSession, session: CombatSession, data: AddCombatantRequest
) -> CombatSession:
    """Append a combatant to the session and re-sort by initiative descending.

    A new list is assigned (rather than mutating in place) so SQLAlchemy detects
    the change on the JSON column.
    """
    new_combatant = data.model_dump(mode="json")
    updated = sorted(
        list(session.combatants) + [new_combatant],
        key=lambda c: c["initiative"],
        reverse=True,
    )
    session.combatants = updated
    await db.commit()
    await db.refresh(session)
    return session


async def remove_combatant(
    db: AsyncSession, session: CombatSession, index: int
) -> CombatSession:
    """Remove the combatant at the given index.

    Adjusts current_turn_index so it remains valid after removal.
    Raises 400 if the index is out of range.
    """
    combatants = list(session.combatants)
    if index < 0 or index >= len(combatants):
        raise HTTPException(
            status_code=400,
            detail=f"Combatant index {index} is out of range (0–{len(combatants) - 1})",
        )

    combatants.pop(index)

    # Keep current_turn_index valid after removal
    if len(combatants) == 0:
        session.current_turn_index = 0
    elif session.current_turn_index >= len(combatants):
        session.current_turn_index = len(combatants) - 1

    session.combatants = combatants
    await db.commit()
    await db.refresh(session)
    return session


async def update_combatant(
    db: AsyncSession,
    session: CombatSession,
    index: int,
    data: UpdateCombatantRequest,
) -> CombatSession:
    """Partially update fields on the combatant at the given index.

    A new list is assigned so SQLAlchemy detects the change on the JSON column.
    Raises 400 if the index is out of range.
    """
    combatants = list(session.combatants)
    if index < 0 or index >= len(combatants):
        raise HTTPException(
            status_code=400,
            detail=f"Combatant index {index} is out of range (0–{len(combatants) - 1})",
        )

    updated_combatant = dict(combatants[index])
    for key, value in data.model_dump(exclude_unset=True).items():
        updated_combatant[key] = value

    combatants[index] = updated_combatant
    session.combatants = combatants
    await db.commit()
    await db.refresh(session)
    return session


async def advance_turn(db: AsyncSession, session: CombatSession) -> CombatSession:
    """Advance the tracker to the next combatant's turn.

    When the last combatant's turn ends, wraps to index 0 and increments
    round_number.  Raises 400 if there are no combatants or the session is
    already completed.
    """
    if session.status == "completed":
        raise HTTPException(
            status_code=400, detail="Cannot advance turn on a completed combat session"
        )
    if not session.combatants:
        raise HTTPException(
            status_code=400, detail="Cannot advance turn: no combatants in session"
        )

    next_index = session.current_turn_index + 1
    if next_index >= len(session.combatants):
        session.current_turn_index = 0
        session.round_number = session.round_number + 1
    else:
        session.current_turn_index = next_index

    await db.commit()
    await db.refresh(session)
    return session
