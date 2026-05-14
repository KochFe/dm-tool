"""Request/response shapes for the general (no-tools) chat endpoints."""
from pydantic import BaseModel, Field

from app.schemas.chat import ChatMessage


class CampaignDraft(BaseModel):
    """Partial wizard state passed when no campaign exists yet."""
    name: str | None = None
    world_description: str | None = None
    party_level: int | None = None


class GeneralChatRequest(BaseModel):
    provider: str = Field(..., description="Provider id, e.g. 'deepseek' or 'groq'")
    messages: list[ChatMessage] = Field(..., min_length=1)
    campaign_draft: CampaignDraft | None = None


class CampaignScopedChatRequest(BaseModel):
    """Same as GeneralChatRequest minus the draft (campaign context is server-loaded)."""
    provider: str = Field(...)
    messages: list[ChatMessage] = Field(..., min_length=1)


class ProviderInfo(BaseModel):
    id: str
    display_name: str
    supports_reasoning: bool
    supports_tools: bool
