"""Ensure every language module exposes the same public surface."""
from app.ai.prompts import en, get_prompt
from app.schemas.language import Language


def _public_names(module) -> set[str]:
    return {n for n in dir(module) if not n.startswith("_")}


def test_de_module_exposes_same_names_as_en():
    from app.ai.prompts import de
    assert _public_names(de) == _public_names(en), (
        "Drift between English and German prompt modules — "
        "add the missing identifier to whichever module lacks it."
    )


def test_get_prompt_returns_german_for_de():
    en_text = get_prompt("LORE_ORACLE_SYSTEM_PROMPT", Language.EN)
    de_text = get_prompt("LORE_ORACLE_SYSTEM_PROMPT", Language.DE)
    assert en_text != de_text
    assert de_text.strip(), "DE prompt should be non-empty"


def test_german_prompts_instruct_english_dnd_terms():
    """Per spec decision 7: German prompts must keep D&D rules vocabulary in English."""
    de_text = get_prompt("LORE_ORACLE_SYSTEM_PROMPT", Language.DE)
    assert "Hit Points" in de_text or "AC" in de_text or "Wizard" in de_text, (
        "German prompts must keep D&D rules vocabulary in English. "
        "See instruction text in de.py."
    )
