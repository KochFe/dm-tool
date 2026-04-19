from langchain_groq import ChatGroq

from app.ai.prompts import (
    CAMPAIGN_WORLD_TASK,
    ENCOUNTER_GENERATOR_PROMPT,
    LOOT_GENERATOR_PROMPT,
    NPC_GENERATOR_PROMPT,
    PERSONALITY_TASK,
    PHASE_DESCRIPTION_TASK,
    PERSONALITY_SCHEMA_HINT,
    TEXT_SCHEMA_HINT,
    build_ai_assist_prompt,
)
from app.config import settings
from app.schemas.ai_assist import AIAssistRequest, PersonalityResult, TextResult
from app.schemas.generators import GeneratedEncounter, GeneratedLoot, GeneratedNpc


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
    prompt = ENCOUNTER_GENERATOR_PROMPT.format(
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


async def generate_world_description(
    campaign: object,  # app.models.campaign.Campaign
    req: AIAssistRequest,
) -> TextResult:
    """Generate or augment a campaign world description based on user steer."""
    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(TextResult)

    context_block = (
        "## Campaign context\n"
        f"- Name: {campaign.name}\n"
        f"- Party level: {campaign.party_level}\n"
    )

    prompt = build_ai_assist_prompt(
        task_description=CAMPAIGN_WORLD_TASK,
        context_block=context_block,
        steer=req.steer,
        existing_content=req.existing_content,
        previous_output=req.previous_output,
        feedback=req.feedback,
        output_schema_hint=TEXT_SCHEMA_HINT,
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
    prompt = NPC_GENERATOR_PROMPT.format(
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
    phase: object,  # app.models.campaign_phase.CampaignPhase
    prior_phase_summaries: list[str],
    req: AIAssistRequest,
) -> TextResult:
    """Generate or augment a phase description based on user steer.

    prior_phase_summaries: list of 'Title: description-excerpt' for phases
        with lower sort_order than this one. Used for arc continuity.
    """
    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(TextResult)

    prior_block = "\n".join(f"- {s}" for s in prior_phase_summaries) or "- (none)"

    context_block = (
        "## Campaign context\n"
        f"- Name: {campaign.name}\n"
        f"- Party level: {campaign.party_level}\n"
        "\n## This phase\n"
        f"- Title: {phase.title}\n"
        f"- Position: phase #{phase.sort_order + 1}\n"
        "\n## Prior phases (for arc continuity)\n"
        f"{prior_block}\n"
    )

    prompt = build_ai_assist_prompt(
        task_description=PHASE_DESCRIPTION_TASK,
        context_block=context_block,
        steer=req.steer,
        existing_content=req.existing_content,
        previous_output=req.previous_output,
        feedback=req.feedback,
        output_schema_hint=TEXT_SCHEMA_HINT,
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
    prompt = LOOT_GENERATOR_PROMPT.format(
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
) -> PersonalityResult:
    """Generate or augment NPC personality + motivation based on user steer."""
    llm = _get_llm(temperature=1.0)
    structured_llm = llm.with_structured_output(PersonalityResult)

    context_block = (
        "## Campaign context\n"
        f"- Name: {campaign.name}\n"
        f"- Party level: {campaign.party_level}\n"
        "\n## This NPC\n"
        f"- Name: {npc.name}\n"
        f"- Race: {getattr(npc, 'race', None) or '(unspecified)'}\n"
        f"- Class / role: {getattr(npc, 'npc_class', None) or '(unspecified)'}\n"
        f"- Description: {getattr(npc, 'description', None) or '(unspecified)'}\n"
    )

    prompt = build_ai_assist_prompt(
        task_description=PERSONALITY_TASK,
        context_block=context_block,
        steer=req.steer,
        existing_content=req.existing_content,
        previous_output=req.previous_output,
        feedback=req.feedback,
        output_schema_hint=PERSONALITY_SCHEMA_HINT,
    )

    try:
        result = await structured_llm.ainvoke(prompt)
    except Exception:
        try:
            result = await structured_llm.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc
    return result
