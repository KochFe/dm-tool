"""REST endpoints for per-campaign session notes (Phase 16).

Routing follows the project convention: nested for create/list/action,
flat for get/update/delete.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import registry
from app.dependencies import get_current_user, get_db, get_language
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.language import Language
from app.schemas.session_notes import (
    CampaignSessionNoteResponse,
    CampaignSessionNoteUpdate,
    RecapRequest,
    SessionNoteStatus,
)
from app.services import campaign_service, campaign_session_notes_service as notes_svc
from app.services.general_chat_service import is_provider_configured
from app.services.session_recap_service import NoClosedEntriesError, stream_recap

router = APIRouter()


def _check_provider(provider_id: str) -> None:
    if provider_id not in registry.known_provider_ids():
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider_id}")
    if not is_provider_configured(provider_id):
        raise HTTPException(
            status_code=503, detail=f"Provider '{provider_id}' is not configured"
        )


async def _load_owned_entry_or_404(
    db: AsyncSession, entry_id: uuid.UUID, user: User
):
    entry = await notes_svc.get_entry(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Session note not found")
    campaign = await campaign_service.get_campaign(db, entry.campaign_id, user.id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Session note not found")
    return entry


async def _campaign_or_404(
    db: AsyncSession, campaign_id: uuid.UUID, user: User
):
    campaign = await campaign_service.get_campaign(db, campaign_id, user.id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get(
    "/campaigns/{campaign_id}/session-notes/open",
    response_model=APIResponse[CampaignSessionNoteResponse],
)
async def get_open_entry(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await _campaign_or_404(db, campaign_id, current_user)
    entry = await notes_svc.get_or_create_open_entry(db, campaign.id)
    return APIResponse(data=CampaignSessionNoteResponse.model_validate(entry))


@router.get(
    "/campaigns/{campaign_id}/session-notes",
    response_model=APIResponse[list[CampaignSessionNoteResponse]],
)
async def list_session_notes(
    campaign_id: uuid.UUID,
    status: SessionNoteStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await _campaign_or_404(db, campaign_id, current_user)
    entries = await notes_svc.list_entries(db, campaign.id, status=status)
    return APIResponse(
        data=[CampaignSessionNoteResponse.model_validate(e) for e in entries]
    )


@router.post(
    "/campaigns/{campaign_id}/session-notes/end",
    response_model=APIResponse[CampaignSessionNoteResponse],
)
async def end_session(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await _campaign_or_404(db, campaign_id, current_user)
    new_open = await notes_svc.end_session(db, campaign.id)
    return APIResponse(data=CampaignSessionNoteResponse.model_validate(new_open))


@router.get(
    "/campaign-session-notes/{entry_id}",
    response_model=APIResponse[CampaignSessionNoteResponse],
)
async def get_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await _load_owned_entry_or_404(db, entry_id, current_user)
    return APIResponse(data=CampaignSessionNoteResponse.model_validate(entry))


@router.patch(
    "/campaign-session-notes/{entry_id}",
    response_model=APIResponse[CampaignSessionNoteResponse],
)
async def patch_entry(
    entry_id: uuid.UUID,
    body: CampaignSessionNoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await _load_owned_entry_or_404(db, entry_id, current_user)
    entry = await notes_svc.update_entry(db, entry, body)
    return APIResponse(data=CampaignSessionNoteResponse.model_validate(entry))


@router.delete(
    "/campaign-session-notes/{entry_id}",
    response_model=APIResponse[None],
)
async def delete_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await _load_owned_entry_or_404(db, entry_id, current_user)
    await notes_svc.delete_entry(db, entry)
    return APIResponse(data=None)


@router.post("/campaigns/{campaign_id}/session-notes/recap")
async def recap_session_notes(
    campaign_id: uuid.UUID,
    body: RecapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    language: Language = Depends(get_language),
) -> StreamingResponse:
    """SSE-stream a recap of closed session notes.

    Pre-stream errors (campaign 404, unknown/unconfigured provider, no closed
    entries) surface as standard envelope responses before the stream opens.
    Mid-stream errors are emitted as a single `{"type":"error",...}` ChatChunk.
    """
    campaign = await _campaign_or_404(db, campaign_id, current_user)
    _check_provider(body.provider)

    # Resolve entries eagerly so empty-set surfaces as a pre-stream 400.
    entries = await notes_svc.resolve_entries_for_recap(
        db, campaign.id, last_n=body.last_n, entry_ids=body.entry_ids
    )
    if not entries:
        raise HTTPException(
            status_code=400, detail="No closed session notes to recap"
        )

    generator = stream_recap(
        db,
        campaign.id,
        provider_id=body.provider,
        last_n=body.last_n,
        entry_ids=body.entry_ids,
        language=language,
    )
    return StreamingResponse(generator, media_type="text/event-stream")
