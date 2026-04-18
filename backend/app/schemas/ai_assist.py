# backend/app/schemas/ai_assist.py
from pydantic import BaseModel, Field


class AIAssistRequest(BaseModel):
    """Shared request body for all single-shot AI assist endpoints.

    steer: user's prompt describing what to generate. Required.
    existing_content: current field value, if any — triggers augment-mode.
    previous_output: the previous generation result, when regenerating.
    feedback: user's tweak instruction for regeneration.
    """

    steer: str = Field(..., min_length=1, max_length=1000)
    existing_content: str | None = Field(default=None, max_length=10000)
    previous_output: str | None = Field(default=None, max_length=5000)
    feedback: str | None = Field(default=None, max_length=500)


class TextResult(BaseModel):
    """Response for single-text generators (campaign world, phase description)."""

    text: str


class PersonalityResult(BaseModel):
    """Response for character personality + motivation generators."""

    personality: str
    motivation: str
