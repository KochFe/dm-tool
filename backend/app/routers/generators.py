import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.dependencies import get_db
from app.models.location import Location
from app.schemas.common import APIResponse
from app.schemas.generators import (
    GenerateEncounterRequest,
    GenerateLootRequest,
    GenerateNpcRequest,
    GeneratedEncounter,
    GeneratedLoot,
    GeneratedNpc,
)
from app.services import campaign_service
from app.services.generator_service import (
    generate_encounter,
    generate_loot,
    generate_npc,
)

router = APIRouter()


async def _build_campaign_context(
    campaign_id: uuid.UUID,
    db: AsyncSession,
    location_id: uuid.UUID | None = None,
) -> tuple[object, dict]:
    """Fetch the campaign and resolve location context into a context dict.

    Args:
        campaign_id: The campaign to look up.
        db: Active database session.
        location_id: Override location ID. Falls back to the campaign's
            current_location_id when not provided.

    Returns:
        A tuple of (campaign, context_dict) where context_dict contains
        party_level, location_name, and biome.

    Raises:
        HTTPException 404: If the campaign does not exist.
    """
    campaign = await campaign_service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    resolved_location_id = location_id or campaign.current_location_id
    location_name = "Unknown"
    biome = "unknown"

    if resolved_location_id:
        location = await db.get(Location, resolved_location_id)
        if location:
            location_name = location.name
            biome = location.biome

    context: dict = {
        "party_level": campaign.party_level,
        "location_name": location_name,
        "biome": biome,
    }
    return campaign, context


@router.post(
    "/campaigns/{campaign_id}/generate/encounter",
    response_model=APIResponse[GeneratedEncounter],
)
async def generate_encounter_endpoint(
    campaign_id: uuid.UUID,
    request: GenerateEncounterRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GeneratedEncounter]:
    """Generate a D&D 5e encounter scaled to the campaign's party level and location.

    Uses the campaign's current location for biome and environment context.
    Difficulty is taken from the request body (easy / medium / hard / deadly).

    Raises HTTP 404 if the campaign is not found.
    Raises HTTP 503 if the AI service is unavailable or misconfigured.
    """
    _, context = await _build_campaign_context(campaign_id, db)

    try:
        result = await generate_encounter(context, difficulty=request.difficulty)
    except RuntimeError as exc:
        logger.exception("Generator error for campaign %s", campaign_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=result)


@router.post(
    "/campaigns/{campaign_id}/generate/npc",
    response_model=APIResponse[GeneratedNpc],
)
async def generate_npc_endpoint(
    campaign_id: uuid.UUID,
    request: GenerateNpcRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GeneratedNpc]:
    """Generate a D&D 5e NPC grounded in the campaign's location and party level.

    When request.location_id is provided it takes precedence over the campaign's
    current_location_id for biome and environment context.

    Raises HTTP 404 if the campaign is not found.
    Raises HTTP 503 if the AI service is unavailable or misconfigured.
    """
    _, context = await _build_campaign_context(
        campaign_id, db, location_id=request.location_id
    )

    try:
        result = await generate_npc(context, role=request.role)
    except RuntimeError as exc:
        logger.exception("Generator error for campaign %s", campaign_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=result)


@router.post(
    "/campaigns/{campaign_id}/generate/loot",
    response_model=APIResponse[GeneratedLoot],
)
async def generate_loot_endpoint(
    campaign_id: uuid.UUID,
    request: GenerateLootRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[GeneratedLoot]:
    """Generate a D&D 5e loot collection scaled to the campaign's party level and location.

    Uses the campaign's current location for biome context. An optional narrative
    context string (e.g. 'dragon hoard') can be supplied in the request body.

    Raises HTTP 404 if the campaign is not found.
    Raises HTTP 503 if the AI service is unavailable or misconfigured.
    """
    _, context = await _build_campaign_context(campaign_id, db)

    try:
        result = await generate_loot(context, context=request.context)
    except RuntimeError as exc:
        logger.exception("Generator error for campaign %s", campaign_id)
        raise HTTPException(status_code=503, detail="AI generation failed")

    return APIResponse(data=result)
