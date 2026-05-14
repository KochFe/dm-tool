"""GET /api/v1/providers — list configured LLM providers for the UI dropdown."""
from fastapi import APIRouter, Depends

from app.ai.providers import registry
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.general_chat import ProviderInfo

router = APIRouter()


@router.get("/providers", response_model=APIResponse[list[ProviderInfo]])
async def list_providers(
    _current_user: User = Depends(get_current_user),
) -> APIResponse[list[ProviderInfo]]:
    """List all configured LLM providers available for general chat."""
    items = [
        ProviderInfo(
            id=p.id,
            display_name=p.display_name,
            supports_reasoning=p.supports_reasoning,
            supports_tools=p.supports_tools,
        )
        for p in registry.list_providers()
    ]
    return APIResponse(data=items)
