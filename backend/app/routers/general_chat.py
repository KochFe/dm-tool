"""POST /chat/general (wizard) and /campaigns/{id}/chat/general (scoped) — SSE."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers.base import ProviderNotConfigured
from app.dependencies import get_current_user, get_db
from app.models.location import Location
from app.models.user import User
from app.schemas.general_chat import CampaignScopedChatRequest, GeneralChatRequest
from app.services import campaign_service
from app.services.general_chat_service import is_provider_configured, stream_general_chat

logger = logging.getLogger(__name__)
router = APIRouter()

_VALID_PROVIDER_IDS = ("groq", "deepseek")


def _check_provider(provider_id: str) -> None:
    if provider_id not in _VALID_PROVIDER_IDS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider_id}")
    if not is_provider_configured(provider_id):
        raise HTTPException(status_code=503, detail=f"Provider '{provider_id}' is not configured")


@router.post("/chat/general")
async def chat_general(
    request: GeneralChatRequest,
    _current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Wizard-mode general chat. Optional `campaign_draft` provides light context."""
    _check_provider(request.provider)

    context: dict | None = None
    if request.campaign_draft:
        context = request.campaign_draft.model_dump(exclude_none=True) or None

    try:
        generator = stream_general_chat(
            provider_id=request.provider,
            messages=request.messages,
            context=context,
        )
    except ProviderNotConfigured:
        raise HTTPException(status_code=503, detail="Provider not configured")

    return StreamingResponse(generator, media_type="text/event-stream")


@router.post("/campaigns/{campaign_id}/chat/general")
async def chat_general_for_campaign(
    campaign_id: uuid.UUID,
    request: CampaignScopedChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Campaign-scoped general chat. Light context auto-loaded from DB."""
    _check_provider(request.provider)

    campaign = await campaign_service.get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    location_name = None
    if campaign.current_location_id:
        location = await db.get(Location, campaign.current_location_id)
        if location:
            location_name = location.name

    context = {
        "name": campaign.name,
        "world_description": campaign.description,
        "party_level": campaign.party_level,
        "location_name": location_name,
    }
    context = {k: v for k, v in context.items() if v is not None}

    try:
        generator = stream_general_chat(
            provider_id=request.provider,
            messages=request.messages,
            context=context or None,
        )
    except ProviderNotConfigured:
        raise HTTPException(status_code=503, detail="Provider not configured")

    return StreamingResponse(generator, media_type="text/event-stream")
