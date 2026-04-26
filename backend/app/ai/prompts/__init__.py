"""Prompt registry — language-aware accessors over per-language prompt modules.

This package exposes both:

1. Language-aware accessors (`get_prompt`, `build_oracle_system_prompt`, ...)
   that take a `language` argument and dispatch to the right module.
2. Backwards-compatible re-exports of the English constants and builders at
   the package level, so existing imports of the form
   `from app.ai.prompts import ENCOUNTER_GENERATOR_PROMPT` keep working until
   every caller has been migrated to `get_prompt(...)`.

The re-exports are TEMPORARY and will be removed once all callers route
through the language-aware accessors.
"""

from __future__ import annotations

from app.schemas.language import Language

from . import en

try:  # pragma: no cover - de module ships in a later task
    from . import de  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover
    de = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Module dispatch
# ---------------------------------------------------------------------------


def _module_for(language: Language):
    """Return the prompt module for the requested language, falling back to EN."""
    if language == Language.EN:
        return en
    if language == Language.DE and de is not None:
        return de
    return en


# ---------------------------------------------------------------------------
# Backwards-compatible re-exports (English).
# Remove after every caller has been migrated to `get_prompt(...)`.
# ---------------------------------------------------------------------------

_REEXPORT_NAMES = (
    "LORE_ORACLE_SYSTEM_PROMPT",
    "ENCOUNTER_GENERATOR_PROMPT",
    "NPC_GENERATOR_PROMPT",
    "LOOT_GENERATOR_PROMPT",
    "DESCRIBE_PHASE_PROMPT",
    "PROPOSE_LOCATIONS_PROMPT",
    "PROPOSE_NPCS_PROMPT",
    "PROPOSE_QUESTS_PROMPT",
    "CHECK_CONSISTENCY_PROMPT",
    "CAMPAIGN_DESCRIPTION_TASK",
    "PHASE_DESCRIPTION_TASK",
    "PERSONALITY_TASK",
    "TEXT_SCHEMA_HINT",
    "PERSONALITY_SCHEMA_HINT",
    "PHASE_PREP_TASK",
    "PHASE_PREP_SCHEMA_HINT",
    "PHASE_PREP_RESTRUCTURE_ADDENDUM",
)

for _name in _REEXPORT_NAMES:
    globals()[_name] = getattr(en, _name)
del _name


# ---------------------------------------------------------------------------
# Language-aware accessors
# ---------------------------------------------------------------------------


def get_prompt(name: str, language: Language = Language.EN) -> str:
    """Return a prompt constant by name in the requested language."""
    module = _module_for(language)
    try:
        return getattr(module, name)
    except AttributeError as exc:
        # Fall back to English if the localized module is missing the constant.
        if module is not en:
            return getattr(en, name)
        raise AttributeError(f"Unknown prompt constant: {name}") from exc


def build_oracle_system_prompt(
    campaign_context: dict,
    language: Language = Language.EN,
) -> str:
    return _module_for(language).build_oracle_system_prompt(campaign_context)


def build_ai_assist_prompt(
    task_description: str,
    context_block: str,
    steer: str,
    existing_content: str | None,
    previous_output: str | None,
    feedback: str | None,
    output_schema_hint: str,
    language: Language = Language.EN,
) -> str:
    return _module_for(language).build_ai_assist_prompt(
        task_description,
        context_block,
        steer,
        existing_content,
        previous_output,
        feedback,
        output_schema_hint,
    )


def build_expander_policy(language: Language = Language.EN) -> str:
    return _module_for(language).build_expander_policy()


def build_expander_context(state: dict, language: Language = Language.EN) -> str:
    return _module_for(language).build_expander_context(state)


def build_phase_prep_sections_block(language: Language = Language.EN) -> str:
    return _module_for(language).build_phase_prep_sections_block()


def build_phase_entity_context(phase, language: Language = Language.EN) -> str:
    return _module_for(language).build_phase_entity_context(phase)


__all__ = (
    "Language",
    "get_prompt",
    "build_oracle_system_prompt",
    "build_ai_assist_prompt",
    "build_expander_policy",
    "build_expander_context",
    "build_phase_prep_sections_block",
    "build_phase_entity_context",
    *_REEXPORT_NAMES,
)
