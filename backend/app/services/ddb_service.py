import re
from typing import Any

import httpx

DDB_API_URL = "https://character-service.dndbeyond.com/character/v5/character"
DDB_URL_PATTERN = re.compile(r"dndbeyond\.com/characters/(\d+)")

STAT_MAP = {1: "strength", 2: "dexterity", 3: "constitution",
            4: "intelligence", 5: "wisdom", 6: "charisma"}


class DDBImportError(Exception):
    """Raised when a DDB import fails with a user-facing message."""
    pass


def extract_character_id(url: str) -> int:
    match = DDB_URL_PATTERN.search(url)
    if not match:
        raise DDBImportError(
            "Invalid D&D Beyond URL. Expected format: "
            "https://www.dndbeyond.com/characters/12345"
        )
    return int(match.group(1))


async def fetch_ddb_character(character_id: int) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{DDB_API_URL}/{character_id}")

        if resp.status_code != 200:
            raise DDBImportError("D&D Beyond API is unavailable. Please try again later.")

        body = resp.json()
        if not body.get("success"):
            msg = body.get("message", "")
            if "not found" in msg.lower():
                raise DDBImportError(
                    "Character not found. It may be private — ask the player to "
                    "set it to Public in D&D Beyond privacy settings."
                )
            raise DDBImportError(f"D&D Beyond API error: {msg}")

        return body["data"]


def calculate_ability_score(stat_id: int, data: dict) -> int:
    override = data["overrideStats"][stat_id - 1]["value"]
    if override is not None:
        return override

    base = data["stats"][stat_id - 1]["value"]
    bonus = data["bonusStats"][stat_id - 1]["value"] or 0

    stat_key = STAT_MAP[stat_id]
    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            if mod.get("type") == "bonus" and mod.get("subType") == f"{stat_key}-score":
                bonus += mod.get("value") or 0

    return base + bonus


def calculate_hp(data: dict) -> tuple[int, int]:
    con_score = calculate_ability_score(3, data)
    con_mod = (con_score - 10) // 2
    total_level = sum(c["level"] for c in data["classes"])

    base = (
        data["overrideHitPoints"]
        if data.get("overrideHitPoints") is not None
        else data["baseHitPoints"]
    )
    bonus = data.get("bonusHitPoints") or 0

    per_level_bonus = 0
    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            if mod.get("type") == "bonus" and mod.get("subType") == "hit-points-per-level":
                per_level_bonus += mod.get("value") or 0

    hp_max = base + bonus + ((con_mod + per_level_bonus) * total_level)
    hp_current = hp_max - (data.get("removedHitPoints") or 0)
    return max(hp_max, 1), max(hp_current, 0)


def calculate_ac(data: dict) -> int:
    dex_mod = (calculate_ability_score(2, data) - 10) // 2
    base_ac = 10 + dex_mod

    equipped_armor = None
    shield_bonus = 0

    for item in data.get("inventory", []):
        if not item.get("equipped"):
            continue
        defn = item.get("definition") or {}
        ac = defn.get("armorClass")
        if ac is None:
            continue
        armor_type = defn.get("armorTypeId")

        if armor_type == 4:
            shield_bonus = max(shield_bonus, ac)
        elif armor_type == 3:
            equipped_armor = ac
        elif armor_type == 2:
            equipped_armor = ac + min(dex_mod, 2)
        elif armor_type == 1:
            equipped_armor = ac + dex_mod

    if equipped_armor is not None:
        base_ac = equipped_armor

    ac_bonus = 0
    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            if mod.get("type") == "bonus" and mod.get("subType") == "armor-class":
                ac_bonus += mod.get("value") or 0

    return base_ac + shield_bonus + ac_bonus


def proficiency_bonus_by_level(level: int) -> int:
    return (level - 1) // 4 + 2


SAVE_MAP = {
    "strength-saving-throws": "STR",
    "dexterity-saving-throws": "DEX",
    "constitution-saving-throws": "CON",
    "intelligence-saving-throws": "INT",
    "wisdom-saving-throws": "WIS",
    "charisma-saving-throws": "CHA",
}

SKILL_SUBTYPES = {
    "acrobatics", "animal-handling", "arcana", "athletics", "deception",
    "history", "insight", "intimidation", "investigation", "medicine",
    "nature", "perception", "performance", "persuasion", "religion",
    "sleight-of-hand", "stealth", "survival",
}

SKILL_DISPLAY = {s: s.replace("-", " ").title() for s in SKILL_SUBTYPES}


def calculate_passive_perception(data: dict) -> int:
    wis_mod = (calculate_ability_score(5, data) - 10) // 2
    total_level = sum(c["level"] for c in data["classes"])
    prof_bonus = proficiency_bonus_by_level(total_level)

    perception_prof = False
    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            if mod.get("type") == "proficiency" and mod.get("subType") == "perception":
                perception_prof = True

    pp = 10 + wis_mod
    if perception_prof:
        pp += prof_bonus

    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            if mod.get("type") == "bonus" and mod.get("subType") == "passive-perception":
                pp += mod.get("value") or 0

    return pp


def extract_saving_throw_proficiencies(data: dict) -> list[str]:
    saves: list[str] = []
    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            if mod.get("type") == "proficiency" and mod.get("subType") in SAVE_MAP:
                key = SAVE_MAP[mod["subType"]]
                if key not in saves:
                    saves.append(key)
    return saves


def extract_skill_proficiencies(data: dict) -> list[str]:
    skills: list[str] = []
    for source in data.get("modifiers", {}).values():
        if source is None:
            continue
        for mod in source:
            sub = mod.get("subType")
            if mod.get("type") == "proficiency" and sub in SKILL_SUBTYPES:
                display = SKILL_DISPLAY[sub]
                if display not in skills:
                    skills.append(display)
    return sorted(skills)


FULL_CASTER_SLOTS = {
    1: {1: 2}, 2: {1: 3}, 3: {1: 4, 2: 2}, 4: {1: 4, 2: 3},
    5: {1: 4, 2: 3, 3: 2}, 6: {1: 4, 2: 3, 3: 3},
    7: {1: 4, 2: 3, 3: 3, 4: 1}, 8: {1: 4, 2: 3, 3: 3, 4: 2},
    9: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1}, 10: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2},
    11: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
    12: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
    13: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
    14: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
    15: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
    16: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
    17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1},
    18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1},
    19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1},
    20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1},
}

FULL_CASTERS = {"Bard", "Cleric", "Druid", "Sorcerer", "Wizard"}
HALF_CASTERS = {"Paladin", "Ranger", "Artificer"}


def extract_spell_slots(data: dict) -> dict[str, int]:
    classes = data["classes"]

    pact_slots: dict[str, int] = {}
    warlock_level = 0
    for cl in classes:
        if cl["definition"]["name"] == "Warlock":
            warlock_level = cl["level"]

    if warlock_level > 0:
        pact_count = 1 if warlock_level == 1 else (2 if warlock_level <= 10 else (3 if warlock_level <= 16 else 4))
        pact_level = min((warlock_level + 1) // 2, 5)
        pact_slots[str(pact_level)] = pact_count

    caster_level = 0
    for cl in classes:
        name = cl["definition"]["name"]
        sub = cl.get("subclassDefinition") or {}
        sub_name = sub.get("name", "") if sub else ""
        if name in FULL_CASTERS:
            caster_level += cl["level"]
        elif name in HALF_CASTERS:
            caster_level += cl["level"] // 2
        elif name == "Fighter" and "Eldritch Knight" in sub_name:
            caster_level += cl["level"] // 3
        elif name == "Rogue" and "Arcane Trickster" in sub_name:
            caster_level += cl["level"] // 3

    slots: dict[str, int] = {}
    if caster_level > 0:
        level_slots = FULL_CASTER_SLOTS.get(min(caster_level, 20), {})
        slots = {str(k): v for k, v in level_slots.items()}

    for level, count in pact_slots.items():
        slots[level] = slots.get(level, 0) + count

    return slots


def extract_inventory(data: dict) -> list[dict]:
    items = []
    for item in data.get("inventory", []):
        defn = item.get("definition") or {}
        items.append({
            "name": defn.get("name", "Unknown Item"),
            "quantity": item.get("quantity", 1),
            "equipped": item.get("equipped", False),
            "type": defn.get("type") or defn.get("filterType") or "Item",
            "weight": defn.get("weight"),
            "rarity": defn.get("rarity"),
            "magic": defn.get("magic", False),
            "description": defn.get("snippet") or defn.get("description", ""),
        })

    currencies = data.get("currencies") or {}
    coin_parts = []
    for coin in ["pp", "gp", "ep", "sp", "cp"]:
        if currencies.get(coin, 0) > 0:
            coin_parts.append(f"{currencies[coin]} {coin}")
    if coin_parts:
        items.append({
            "name": "Coin Purse",
            "quantity": 1,
            "equipped": True,
            "type": "Currency",
            "description": ", ".join(coin_parts),
        })

    return items


def map_ddb_character(data: dict) -> tuple[dict, int, list[str], dict]:
    """
    Map DDB character data to our schema fields.

    Returns: (character_dict, ddb_id, warnings, unmapped_data)
    The character_dict contains all fields compatible with PlayerCharacterCreate.
    """
    ddb_id = data["id"]
    warnings: list[str] = []

    name = data.get("name") or "Unnamed Character"
    race = (data.get("race") or {}).get("fullName") or "Unknown"

    classes = sorted(data.get("classes", []), key=lambda c: c["level"], reverse=True)
    if not classes:
        raise DDBImportError("Character has no class data.")
    class_str = " / ".join(f"{c['definition']['name']} {c['level']}" for c in classes)
    total_level = sum(c["level"] for c in classes)
    total_level = max(1, min(total_level, 20))

    if len(classes) > 1:
        warnings.append(f"Multiclass character: levels shown as '{class_str}'")

    scores = {}
    for stat_id, stat_name in STAT_MAP.items():
        score = calculate_ability_score(stat_id, data)
        scores[stat_name] = max(1, min(score, 30))

    hp_max, hp_current = calculate_hp(data)

    ac = calculate_ac(data)
    if ac < 0:
        ac = 10
    warnings.append(f"AC calculated as {ac} — verify if character has special AC features (Unarmored Defense, etc.)")

    speed_data = data.get("race", {}).get("weightSpeeds", {}).get("normal", {})
    speed = speed_data.get("walk", 30) if speed_data else 30

    prof_bonus = proficiency_bonus_by_level(total_level)
    pp = calculate_passive_perception(data)
    save_profs = extract_saving_throw_proficiencies(data)
    skill_profs = extract_skill_proficiencies(data)
    spell_slots = extract_spell_slots(data)
    inventory = extract_inventory(data)

    character_dict = {
        "name": name,
        "race": race,
        "character_class": class_str,
        "level": total_level,
        "hp_current": hp_current,
        "hp_max": hp_max,
        "armor_class": ac,
        "passive_perception": pp,
        "strength": scores["strength"],
        "dexterity": scores["dexterity"],
        "constitution": scores["constitution"],
        "intelligence": scores["intelligence"],
        "wisdom": scores["wisdom"],
        "charisma": scores["charisma"],
        "proficiency_bonus": prof_bonus,
        "speed": speed,
        "saving_throw_proficiencies": save_profs,
        "skill_proficiencies": skill_profs,
        "spell_slots": spell_slots,
        "inventory": inventory,
        "ddb_id": ddb_id,
    }

    # Unmapped data
    unmapped: dict[str, Any] = {}

    spells = []
    for spell_source in data.get("classSpells", []):
        for spell in spell_source.get("spells", []):
            defn = spell.get("definition") or {}
            spells.append(defn.get("name", "Unknown"))
    if spells:
        unmapped["spells"] = spells

    feats = []
    for feat in data.get("feats", []):
        defn = feat.get("definition") or {}
        feats.append(defn.get("name", "Unknown"))
    if feats:
        unmapped["feats"] = feats

    bg = data.get("background", {})
    if bg:
        bg_defn = bg.get("definition") or {}
        bg_name = bg_defn.get("name")
        if bg_name:
            unmapped["background"] = bg_name

    for cl in classes:
        sub = cl.get("subclassDefinition")
        if sub and sub.get("name"):
            unmapped.setdefault("subclasses", []).append(
                f"{cl['definition']['name']}: {sub['name']}"
            )

    return character_dict, ddb_id, warnings, unmapped
