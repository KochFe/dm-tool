import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.database import async_session
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.location import Location
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import APIResponse
from app.services import campaign_service
from app.services.chat_service import process_chat

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/chat",
    response_model=APIResponse[ChatResponse],
)
async def chat(
    campaign_id: uuid.UUID,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> APIResponse[ChatResponse]:
    """Send a chat message to the Lore Oracle agent scoped to a campaign.

    Fetches the campaign and its current location to build a context dict that
    enriches the system prompt and is passed to the LangGraph agent. Validates
    the campaign exists before forwarding the conversation history to the AI service.

    Raises HTTP 404 if the campaign is not found.
    Raises HTTP 503 if the AI service is unavailable or misconfigured.
    """
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    location_name = None
    biome = None
    if campaign.current_location_id:
        location = await db.get(Location, campaign.current_location_id)
        if location:
            location_name = location.name
            biome = location.biome

    campaign_context = {
        "location_name": location_name,
        "biome": biome,
        "party_level": campaign.party_level,
        "in_game_time": campaign.in_game_time,
    }

    try:
        result = await process_chat(
            campaign_id, request.messages, campaign_context, async_session
        )
    except RuntimeError as exc:
        if "GROQ_API_KEY" in str(exc):
            raise HTTPException(
                status_code=503, detail="AI service is not configured"
            )
        logger.exception("Chat service error for campaign %s", campaign_id)
        raise HTTPException(status_code=503, detail="AI service error")

    return APIResponse(data=result)
