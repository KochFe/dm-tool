from langchain_groq import ChatGroq

from app.ai.prompts import (
    ENCOUNTER_GENERATOR_PROMPT,
    LOOT_GENERATOR_PROMPT,
    NPC_GENERATOR_PROMPT,
)
from app.config import settings
from app.schemas.generators import GeneratedEncounter, GeneratedLoot, GeneratedNpc


def _get_llm() -> ChatGroq:
    """Instantiate ChatGroq at call time to avoid import-side effects.

    Raises:
        RuntimeError: If GROQ_API_KEY is not configured.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set the GROQ_API_KEY environment variable or add it to .env."
        )
    return ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY)


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
    llm = _get_llm()
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
    llm = _get_llm()
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
    llm = _get_llm()
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
