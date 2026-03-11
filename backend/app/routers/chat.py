import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
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
) -> APIResponse[ChatResponse]:
    """Send a chat message to the Lore Oracle agent scoped to a campaign.

    Validates the campaign exists, then forwards the full conversation history
    to the AI service. Returns the assistant's reply wrapped in the standard
    APIResponse envelope.

    Raises HTTP 404 if the campaign is not found.
    Raises HTTP 503 if the AI service is unavailable or misconfigured.
    """
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        result = await process_chat(str(campaign_id), request.messages)
    except RuntimeError as exc:
        if "GROQ_API_KEY" in str(exc):
            raise HTTPException(
                status_code=503, detail="AI service is not configured"
            )
        raise HTTPException(status_code=503, detail=str(exc))

    return APIResponse(data=result)
