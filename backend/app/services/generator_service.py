from langchain_groq import ChatGroq
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import (
    build_ai_assist_prompt,
    build_phase_entity_context,
    build_phase_prep_sections_block,
    get_prompt,
)
from app.config import settings
from app.schemas.ai_assist import (
    AIAssistRequest,
    PersonalityResult,
    PhasePrepResult,
    TextResult,
)
from app.schemas.generators import GeneratedEncounter, GeneratedLoot, GeneratedNpc
from app.schemas.language import Language


def _get_llm(temperature: float = 1.0) -> ChatGroq:
    """Instantiate ChatGroq at call time to avoid import-side effects.

    Raises:
        RuntimeError: If GROQ_API_KEY is not configured.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set the GROQ_API_KEY environment variable or add it to .env."
        )
    return ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=temperature)


async def generate_encounter(
    campaign_context: dict,
    difficulty: str = "medium",
    *,
    language: Language = Language.EN,
) -> GeneratedEncounter:
    """Generate a D&D 5e encounter scaled to the campaign context.

    Args:
        campaign_context: Dict with keys party_level (int), location_name (str),
            and biome (str).
        difficulty: One of easy, medium, hard, or deadly.

    Returns:
        A GeneratedEncounter with description, monsters, tactical_notes, and
        difficulty fields populated by the LLM.

    Raises:
        RuntimeError: If GROQ_API_KEY is missing or structured output fails
            after one retry.
    """
    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(GeneratedEncounter)
    prompt = get_prompt("ENCOUNTER_GENERATOR_PROMPT", language).format(
        party_level=campaign_context["party_level"],
        location_name=campaign_context["location_name"],
        biome=campaign_context["biome"],
        difficulty=difficulty,
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc

    return result


async def generate_campaign_description(
    campaign: object,  # app.models.campaign.Campaign
    req: AIAssistRequest,
    db: AsyncSession,
    *,
    language: Language = Language.EN,
) -> TextResult:
    """Generate or augment a campaign description (premise/hook/background)."""
    from app.services.campaign_service import compute_party_level

    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(TextResult)

    party_level = await compute_party_level(db, campaign.id)
    context_block = (
        "## Campaign context\n"
        f"- Name: {campaign.name}\n"
        f"- Party level: {party_level}\n"
    )

    prompt = build_ai_assist_prompt(
        task_description=get_prompt("CAMPAIGN_DESCRIPTION_TASK", language),
        context_block=context_block,
        steer=req.steer,
        existing_content=req.existing_content,
        previous_output=req.previous_output,
        feedback=req.feedback,
        output_schema_hint=get_prompt("TEXT_SCHEMA_HINT", language),
        language=language,
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc
    return result


async def generate_npc(
    campaign_context: dict,
    role: str | None = None,
    *,
    language: Language = Language.EN,
) -> GeneratedNpc:
    """Generate a D&D 5e NPC scaled to the campaign context.

    Args:
        campaign_context: Dict with keys party_level (int), location_name (str),
            and biome (str).
        role: Optional role or archetype hint, e.g. 'blacksmith' or 'bandit captain'.
            Defaults to 'any' when not provided.

    Returns:
        A GeneratedNpc with name, race, class, description, personality, secrets,
        motivation, and stats fields populated by the LLM.

    Raises:
        RuntimeError: If GROQ_API_KEY is missing or structured output fails
            after one retry.
    """
    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(GeneratedNpc)
    prompt = get_prompt("NPC_GENERATOR_PROMPT", language).format(
        party_level=campaign_context["party_level"],
        location_name=campaign_context["location_name"],
        biome=campaign_context["biome"],
        role=role or "any",
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc

    return result


async def generate_phase_description(
    campaign: object,
    phase: object,  # app.models.campaign_phase.CampaignPhase with .locations eagerly loaded
    prior_phase_summaries: list[str],
    req: AIAssistRequest,
    db: AsyncSession,
    *,
    language: Language = Language.EN,
) -> PhasePrepResult:
    """Generate a structured DM prep sheet for a campaign phase.

    Returns a PhasePrepResult with 1–6 sections, each containing 1–6 bullets.
    The model may reference locations and NPCs already linked to the phase by
    name, but must not invent new named entities.

    prior_phase_summaries: list of 'Title: description-excerpt' for phases
        with lower sort_order than this one. Used for arc continuity.
    phase: must have .locations eagerly loaded; each location should have
        .npcs eagerly loaded.
    """
    from app.services.campaign_service import compute_party_level

    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(PhasePrepResult)

    party_level = await compute_party_level(db, campaign.id)
    prior_block = "\n".join(f"- {s}" for s in prior_phase_summaries) or "- (none)"

    base_context = (
        "## Campaign context\n"
        f"- Name: {campaign.name}\n"
        f"- Party level: {party_level}\n"
        "\n## This phase\n"
        f"- Title: {phase.title}\n"
        f"- Position: phase #{phase.sort_order + 1}\n"
        "\n## Prior phases (for arc continuity)\n"
        f"{prior_block}\n"
    )

    entity_block = build_phase_entity_context(phase, language=language)
    sections_block = build_phase_prep_sections_block(language=language)

    pieces = [base_context, sections_block]
    if entity_block:
        pieces.append(entity_block)
    if req.existing_content:
        pieces.append(get_prompt("PHASE_PREP_RESTRUCTURE_ADDENDUM", language))
    context_block = "\n\n".join(pieces)

    prompt = build_ai_assist_prompt(
        task_description=get_prompt("PHASE_PREP_TASK", language),
        context_block=context_block,
        steer=req.steer,
        existing_content=req.existing_content,
        previous_output=req.previous_output,
        feedback=req.feedback,
        output_schema_hint=get_prompt("PHASE_PREP_SCHEMA_HINT", language),
        language=language,
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc
    return result


async def generate_loot(
    campaign_context: dict,
    context: str | None = None,
    *,
    language: Language = Language.EN,
) -> GeneratedLoot:
    """Generate a D&D 5e loot collection scaled to the campaign context.

    Args:
        campaign_context: Dict with keys party_level (int), location_name (str),
            and biome (str).
        context: Optional narrative context, e.g. 'dragon hoard' or 'bandit chest'.
            Defaults to 'general treasure' when not provided.

    Returns:
        A GeneratedLoot with items, total_value, and context fields populated
        by the LLM.

    Raises:
        RuntimeError: If GROQ_API_KEY is missing or structured output fails
            after one retry.
    """
    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(GeneratedLoot)
    prompt = get_prompt("LOOT_GENERATOR_PROMPT", language).format(
        party_level=campaign_context["party_level"],
        location_name=campaign_context["location_name"],
        biome=campaign_context["biome"],
        context=context or "general treasure",
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc

    return result


async def generate_npc_personality(
    npc: object,      # app.models.npc.Npc
    campaign: object,
    req: AIAssistRequest,
    db: AsyncSession,
    *,
    language: Language = Language.EN,
) -> PersonalityResult:
    """Generate or augment NPC personality + motivation based on user steer."""
    from app.services.campaign_service import compute_party_level

    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(PersonalityResult)

    party_level = await compute_party_level(db, campaign.id)
    context_block = (
        "## Campaign context\n"
        f"- Name: {campaign.name}\n"
        f"- Party level: {party_level}\n"
        "\n## This NPC\n"
        f"- Name: {npc.name}\n"
        f"- Race: {getattr(npc, 'race', None) or '(unspecified)'}\n"
        f"- Class / role: {getattr(npc, 'npc_class', None) or '(unspecified)'}\n"
        f"- Description: {getattr(npc, 'description', None) or '(unspecified)'}\n"
    )

    prompt = build_ai_assist_prompt(
        task_description=get_prompt("PERSONALITY_TASK", language),
        context_block=context_block,
        steer=req.steer,
        existing_content=req.existing_content,
        previous_output=req.previous_output,
        feedback=req.feedback,
        output_schema_hint=get_prompt("PERSONALITY_SCHEMA_HINT", language),
        language=language,
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc
    return result
