"""Prompt registry — language-aware accessors over per-language prompt modules.

Callers ask for prompts by name + `Language`; the accessors below dispatch to
the matching module (`en`, `de`, ...). Each language module exposes the same
public surface; a parity test enforces that.
"""

from __future__ import annotations

from app.schemas.language import Language

from . import en

try:  # pragma: no cover - de module ships in a later task
    from . import de  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover
    de = None  # type: ignore[assignment]


def _module_for(language: Language):
    """Return the prompt module for the requested language, falling back to EN."""
    if language == Language.EN:
        return en
    if language == Language.DE and de is not None:
        return de
    return en


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
)
