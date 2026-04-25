# backend/app/schemas/ai_assist.py
from typing import Literal
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


PhasePrepHeading = Literal[
    "Hook",
    "Key Beats",
    "DM Secrets",
    "Climax / Exit",
    "Tone & Atmosphere",
    "Complications",
]


class PhasePrepSection(BaseModel):
    """One section of the phase prep sheet: a fixed-enum heading plus 1–6 bullets."""

    heading: PhasePrepHeading
    bullets: list[str] = Field(min_length=1, max_length=6)


class PhasePrepResult(BaseModel):
    """Structured AI output for the phase-description generator.

    sections: 1–6 sections. The model omits any section it has nothing
    useful for. Section order reflects the model's choice and is preserved
    by the frontend renderer (no re-sort).
    """

    sections: list[PhasePrepSection] = Field(min_length=1, max_length=6)
