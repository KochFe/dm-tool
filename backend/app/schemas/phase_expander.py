# backend/app/schemas/phase_expander.py
import uuid
from pydantic import BaseModel, Field


class DraftLocation(BaseModel):
    """A proposed or reused location in a phase expansion bundle."""

    name: str
    description: str
    region: str | None = None
    reuse_id: uuid.UUID | None = Field(
        default=None,
        description="If set, link this existing location instead of creating a new one.",
    )


class DraftNpc(BaseModel):
    """A proposed or reused NPC. location_index references draft_locations[i]."""

    name: str
    role: str
    personality: str
    motivation: str
    location_index: int | None = None
    reuse_id: uuid.UUID | None = None


class DraftQuest(BaseModel):
    """A proposed quest. npc_indices/location_indices reference draft arrays."""

    title: str
    description: str
    npc_indices: list[int] = []
    location_indices: list[int] = []


class DraftPhaseBundle(BaseModel):
    """Full read-only draft from the phase expander graph."""

    phase_description: str | None = Field(
        default=None,
        description="None = the steer did not ask to change the description.",
    )
    draft_locations: list[DraftLocation] = []
    draft_npcs: list[DraftNpc] = []
    draft_quests: list[DraftQuest] = []
    consistency_notes: list[str] = []


class ExpandPhaseRequest(BaseModel):
    """POST /campaigns/{id}/phases/{id}/expand body."""

    user_steer: str = Field(..., min_length=1, max_length=2000)


class ApplyPhaseBundleRequest(BaseModel):
    """POST /campaigns/{id}/phases/{id}/expand/apply body.

    Only the accepted subset is included. Draft items may have been edited
    client-side before being sent.
    """

    phase_description: str | None = None
    accepted_locations: list[DraftLocation] = []
    accepted_npcs: list[DraftNpc] = []
    accepted_quests: list[DraftQuest] = []


class ApplyPhaseBundleResponse(BaseModel):
    """Result of a successful apply — all changes committed in one transaction."""

    phase_id: uuid.UUID
    created_location_ids: list[uuid.UUID] = []
    linked_location_ids: list[uuid.UUID] = []
    created_npc_ids: list[uuid.UUID] = []
    created_quest_ids: list[uuid.UUID] = []
