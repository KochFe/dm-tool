import uuid
from collections.abc import Iterable
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign_session_note import CampaignSessionNote
from app.schemas.session_notes import (
    CampaignSessionNoteUpdate,
    SessionNoteStatus,
)


def _utcnow() -> datetime:
    # Naive UTC to match the model's generic DateTime column type
    # (asyncpg rejects tz-aware values bound to TIMESTAMP WITHOUT TIME ZONE).
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def get_or_create_open_entry(
    db: AsyncSession, campaign_id: uuid.UUID
) -> CampaignSessionNote:
    """Return the campaign's open entry, creating one if none exists.

    Enforces the "at most one open per campaign" invariant in code so SQLite
    tests behave the same as the PG partial unique index in migration 016.
    """
    result = await db.execute(
        select(CampaignSessionNote).where(
            CampaignSessionNote.campaign_id == campaign_id,
            CampaignSessionNote.status == "open",
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    entry = CampaignSessionNote(
        campaign_id=campaign_id,
        status="open",
        body="",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def end_session(
    db: AsyncSession, campaign_id: uuid.UUID
) -> CampaignSessionNote:
    """Close the current open entry (creating one first if absent) and return a fresh open entry."""
    current = await get_or_create_open_entry(db, campaign_id)
    current.status = "closed"
    current.closed_at = _utcnow()
    await db.commit()
    await db.refresh(current)
    return await get_or_create_open_entry(db, campaign_id)


async def list_entries(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    *,
    status: SessionNoteStatus | None = None,
) -> list[CampaignSessionNote]:
    stmt = select(CampaignSessionNote).where(
        CampaignSessionNote.campaign_id == campaign_id
    )
    if status is not None:
        stmt = stmt.where(CampaignSessionNote.status == status)
    stmt = stmt.order_by(desc(CampaignSessionNote.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_entry(
    db: AsyncSession, entry_id: uuid.UUID
) -> CampaignSessionNote | None:
    return await db.get(CampaignSessionNote, entry_id)


async def update_entry(
    db: AsyncSession,
    entry: CampaignSessionNote,
    patch: CampaignSessionNoteUpdate,
) -> CampaignSessionNote:
    for key, value in patch.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_entry(db: AsyncSession, entry: CampaignSessionNote) -> None:
    await db.delete(entry)
    await db.commit()


async def resolve_entries_for_recap(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    *,
    last_n: int | None,
    entry_ids: Iterable[uuid.UUID] | None,
) -> list[CampaignSessionNote]:
    """Return closed entries oldest-first, ready for prompt assembly."""
    if entry_ids is not None:
        wanted = list(entry_ids)
        if not wanted:
            return []
        result = await db.execute(
            select(CampaignSessionNote)
            .where(
                CampaignSessionNote.campaign_id == campaign_id,
                CampaignSessionNote.id.in_(wanted),
                CampaignSessionNote.status == "closed",
            )
            .order_by(CampaignSessionNote.created_at)
        )
        return list(result.scalars().all())

    assert last_n is not None
    result = await db.execute(
        select(CampaignSessionNote)
        .where(
            CampaignSessionNote.campaign_id == campaign_id,
            CampaignSessionNote.status == "closed",
        )
        .order_by(desc(CampaignSessionNote.created_at))
        .limit(last_n)
    )
    rows = list(result.scalars().all())
    rows.reverse()
    return rows


def render_notes_block(entries: list[CampaignSessionNote]) -> str:
    """Render a list of session notes as a single markdown block for the recap prompt."""
    parts: list[str] = []
    for e in entries:
        if e.title:
            heading = e.title
        else:
            heading = f"Session of {e.created_at.date().isoformat()}"
        body = e.body or ""
        parts.append(f"## {heading}\n{body}\n")
    return "\n".join(parts)
