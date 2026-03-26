"""
Comprehensive tests for the DDB character import service and endpoint.
Covers URL parsing, ability score calculation, HP, AC, passive perception,
proficiency bonus, spell slots, saving throws, skills, inventory, and
the full mapper/endpoint integration.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.services.ddb_service import (
    DDBImportError,
    extract_character_id,
    calculate_ability_score,
    calculate_hp,
    calculate_ac,
    calculate_passive_perception,
    proficiency_bonus_by_level,
    extract_saving_throw_proficiencies,
    extract_skill_proficiencies,
    extract_spell_slots,
    extract_inventory,
    map_ddb_character,
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _base_data(**overrides):
    """Return a minimal DDB character data dict (Fighter 5, STR 16 … CHA 8)."""
    data = {
        "id": 12345,
        "name": "Thorin",
        "race": {"fullName": "Mountain Dwarf", "weightSpeeds": {"normal": {"walk": 25}}},
        "classes": [
            {
                "level": 5,
                "definition": {"name": "Fighter"},
                "subclassDefinition": {"name": "Champion"},
            }
        ],
        "stats": [
            {"value": 16},  # STR
            {"value": 12},  # DEX
            {"value": 14},  # CON
            {"value": 10},  # INT
            {"value": 13},  # WIS
            {"value": 8},   # CHA
        ],
        "bonusStats": [{"value": None}] * 6,
        "overrideStats": [{"value": None}] * 6,
        "modifiers": {
            "race": [],
            "class": [],
            "background": [],
            "item": [],
            "feat": [],
        },
        "baseHitPoints": 33,
        "bonusHitPoints": None,
        "overrideHitPoints": None,
        "removedHitPoints": 0,
        "temporaryHitPoints": 0,
        "inventory": [],
        "currencies": {"cp": 0, "sp": 0, "gp": 50, "ep": 0, "pp": 0},
        "classSpells": [],
        "feats": [],
        "background": {"definition": {"name": "Soldier"}},
    }
    data.update(overrides)
    return data


# ---------------------------------------------------------------------------
# 1. URL parsing
# ---------------------------------------------------------------------------

class TestExtractCharacterId:
    def test_standard_url(self):
        url = "https://www.dndbeyond.com/characters/12345"
        assert extract_character_id(url) == 12345

    def test_url_without_www(self):
        url = "https://dndbeyond.com/characters/67890"
        assert extract_character_id(url) == 67890

    def test_url_with_trailing_slash(self):
        url = "https://www.dndbeyond.com/characters/99999/"
        assert extract_character_id(url) == 99999

    def test_invalid_url_raises(self):
        with pytest.raises(DDBImportError):
            extract_character_id("https://example.com/not-a-character")

    def test_url_with_no_id_raises(self):
        with pytest.raises(DDBImportError):
            extract_character_id("https://www.dndbeyond.com/characters/")

    def test_plain_string_raises(self):
        with pytest.raises(DDBImportError):
            extract_character_id("not-a-url-at-all")


# ---------------------------------------------------------------------------
# 2. Ability scores
# ---------------------------------------------------------------------------

class TestCalculateAbilityScore:
    def test_base_strength(self):
        data = _base_data()
        assert calculate_ability_score(1, data) == 16

    def test_base_dexterity(self):
        data = _base_data()
        assert calculate_ability_score(2, data) == 12

    def test_with_bonus_stat(self):
        data = _base_data()
        data["bonusStats"][0] = {"value": 2}  # STR bonus
        assert calculate_ability_score(1, data) == 18

    def test_with_override(self):
        data = _base_data()
        data["overrideStats"][0] = {"value": 20}  # override STR to 20
        assert calculate_ability_score(1, data) == 20

    def test_override_ignores_base_and_bonus(self):
        data = _base_data()
        data["overrideStats"][1] = {"value": 14}
        data["bonusStats"][1] = {"value": 4}
        # override wins; base DEX 12 + bonus 4 is irrelevant
        assert calculate_ability_score(2, data) == 14

    def test_with_racial_modifier_bonus(self):
        data = _base_data()
        data["modifiers"]["race"] = [
            {"type": "bonus", "subType": "constitution-score", "value": 2}
        ]
        assert calculate_ability_score(3, data) == 16  # CON 14 + 2

    def test_modifier_for_different_stat_not_applied(self):
        data = _base_data()
        data["modifiers"]["race"] = [
            {"type": "bonus", "subType": "strength-score", "value": 2}
        ]
        # DEX should be unchanged
        assert calculate_ability_score(2, data) == 12


# ---------------------------------------------------------------------------
# 3. HP
# ---------------------------------------------------------------------------

class TestCalculateHp:
    def test_basic_hp(self):
        # CON 14 -> mod +2; level 5; baseHitPoints 33
        # hp_max = 33 + (2 * 5) = 43
        data = _base_data()
        hp_max, hp_current = calculate_hp(data)
        assert hp_max == 43
        assert hp_current == 43

    def test_hp_with_damage(self):
        data = _base_data(removedHitPoints=10)
        hp_max, hp_current = calculate_hp(data)
        assert hp_max == 43
        assert hp_current == 33

    def test_hp_with_tough_feat_bonus(self):
        # Tough feat gives +1 hit point per level bonus
        data = _base_data()
        data["modifiers"]["feat"] = [
            {"type": "bonus", "subType": "hit-points-per-level", "value": 1}
        ]
        # hp_max = 33 + (2+1)*5 = 33 + 15 = 48
        hp_max, _ = calculate_hp(data)
        assert hp_max == 48

    def test_hp_with_override(self):
        data = _base_data(overrideHitPoints=100)
        # When override is set, CON mod per level still applies
        hp_max, _ = calculate_hp(data)
        assert hp_max == 110  # 100 + (2*5)

    def test_hp_with_bonus_hit_points(self):
        data = _base_data(bonusHitPoints=5)
        hp_max, _ = calculate_hp(data)
        assert hp_max == 48  # 33 + 5 + (2*5)


# ---------------------------------------------------------------------------
# 4. AC
# ---------------------------------------------------------------------------

class TestCalculateAc:
    def test_unarmored_ac(self):
        # DEX 12 -> mod +1; no armor -> 10 + 1 = 11
        data = _base_data()
        assert calculate_ac(data) == 11

    def test_light_armor(self):
        # armorTypeId 1 = light armor (AC + full DEX mod)
        data = _base_data(inventory=[{
            "equipped": True,
            "definition": {"armorClass": 11, "armorTypeId": 1},
        }])
        # 11 + DEX mod 1 = 12
        assert calculate_ac(data) == 12

    def test_heavy_armor(self):
        # armorTypeId 3 = heavy armor (flat AC, no DEX)
        data = _base_data(inventory=[{
            "equipped": True,
            "definition": {"armorClass": 18, "armorTypeId": 3},
        }])
        assert calculate_ac(data) == 18

    def test_shield_stacking(self):
        # armorTypeId 4 = shield; stacks on top of base_ac
        data = _base_data(inventory=[{
            "equipped": True,
            "definition": {"armorClass": 2, "armorTypeId": 4},
        }])
        # 11 (unarmored) + 2 (shield) = 13
        assert calculate_ac(data) == 13

    def test_medium_armor_dex_cap(self):
        # armorTypeId 2 = medium armor (AC + min(DEX mod, 2))
        # DEX 12 -> mod +1; cap at 2, so full +1 applies
        data = _base_data(inventory=[{
            "equipped": True,
            "definition": {"armorClass": 14, "armorTypeId": 2},
        }])
        assert calculate_ac(data) == 15  # 14 + min(1, 2)

    def test_medium_armor_dex_cap_capped(self):
        # High DEX (20 -> mod +5) should be capped at +2 for medium armor
        data = _base_data()
        data["stats"][1] = {"value": 20}  # DEX 20
        data["inventory"] = [{
            "equipped": True,
            "definition": {"armorClass": 14, "armorTypeId": 2},
        }]
        assert calculate_ac(data) == 16  # 14 + min(5, 2) = 14 + 2

    def test_unequipped_armor_ignored(self):
        data = _base_data(inventory=[{
            "equipped": False,
            "definition": {"armorClass": 18, "armorTypeId": 3},
        }])
        assert calculate_ac(data) == 11  # still unarmored


# ---------------------------------------------------------------------------
# 5. Passive perception
# ---------------------------------------------------------------------------

class TestCalculatePassivePerception:
    def test_without_proficiency(self):
        # WIS 13 -> mod +1; no proficiency -> 10 + 1 = 11
        data = _base_data()
        assert calculate_passive_perception(data) == 11

    def test_with_perception_proficiency(self):
        # level 5 -> prof bonus 3; 10 + 1 + 3 = 14
        data = _base_data()
        data["modifiers"]["class"] = [
            {"type": "proficiency", "subType": "perception"}
        ]
        assert calculate_passive_perception(data) == 14


# ---------------------------------------------------------------------------
# 6. Proficiency bonus
# ---------------------------------------------------------------------------

class TestProficiencyBonusByLevel:
    def test_level_1(self):
        assert proficiency_bonus_by_level(1) == 2

    def test_level_4(self):
        assert proficiency_bonus_by_level(4) == 2

    def test_level_5(self):
        assert proficiency_bonus_by_level(5) == 3

    def test_level_8(self):
        assert proficiency_bonus_by_level(8) == 3

    def test_level_9(self):
        assert proficiency_bonus_by_level(9) == 4

    def test_level_13(self):
        assert proficiency_bonus_by_level(13) == 5

    def test_level_17(self):
        assert proficiency_bonus_by_level(17) == 6

    def test_level_20(self):
        assert proficiency_bonus_by_level(20) == 6


# ---------------------------------------------------------------------------
# 7. Spell slots
# ---------------------------------------------------------------------------

class TestExtractSpellSlots:
    def test_fighter_champion_no_slots(self):
        data = _base_data()
        slots = extract_spell_slots(data)
        assert slots == {}

    def test_full_caster_wizard_level5(self):
        data = _base_data(classes=[{
            "level": 5,
            "definition": {"name": "Wizard"},
            "subclassDefinition": None,
        }])
        slots = extract_spell_slots(data)
        # Level 5 full caster: {1:4, 2:3, 3:2}
        assert slots == {"1": 4, "2": 3, "3": 2}

    def test_warlock_pact_magic_level3(self):
        data = _base_data(classes=[{
            "level": 3,
            "definition": {"name": "Warlock"},
            "subclassDefinition": None,
        }])
        slots = extract_spell_slots(data)
        # Level 3 warlock: pact level = min((3+1)//2, 5) = 2; count = 2
        assert slots.get("2") == 2

    def test_half_caster_paladin_level4(self):
        data = _base_data(classes=[{
            "level": 4,
            "definition": {"name": "Paladin"},
            "subclassDefinition": None,
        }])
        slots = extract_spell_slots(data)
        # Paladin level 4 -> caster_level = 4 // 2 = 2 -> {1:3}
        assert slots == {"1": 3}

    def test_eldritch_knight_fighter(self):
        data = _base_data(classes=[{
            "level": 6,
            "definition": {"name": "Fighter"},
            "subclassDefinition": {"name": "Eldritch Knight"},
        }])
        slots = extract_spell_slots(data)
        # caster_level = 6 // 3 = 2 -> {1:3}
        assert slots == {"1": 3}


# ---------------------------------------------------------------------------
# 8. Saving throws and skills
# ---------------------------------------------------------------------------

class TestExtractSavingThrowProficiencies:
    def test_no_saves(self):
        data = _base_data()
        assert extract_saving_throw_proficiencies(data) == []

    def test_str_and_con_saves(self):
        data = _base_data()
        data["modifiers"]["class"] = [
            {"type": "proficiency", "subType": "strength-saving-throws"},
            {"type": "proficiency", "subType": "constitution-saving-throws"},
        ]
        saves = extract_saving_throw_proficiencies(data)
        assert "STR" in saves
        assert "CON" in saves
        assert len(saves) == 2

    def test_no_duplicates(self):
        data = _base_data()
        data["modifiers"]["class"] = [
            {"type": "proficiency", "subType": "wisdom-saving-throws"},
        ]
        data["modifiers"]["background"] = [
            {"type": "proficiency", "subType": "wisdom-saving-throws"},
        ]
        saves = extract_saving_throw_proficiencies(data)
        assert saves.count("WIS") == 1


class TestExtractSkillProficiencies:
    def test_no_skills(self):
        data = _base_data()
        assert extract_skill_proficiencies(data) == []

    def test_two_skills(self):
        data = _base_data()
        data["modifiers"]["class"] = [
            {"type": "proficiency", "subType": "athletics"},
            {"type": "proficiency", "subType": "perception"},
        ]
        skills = extract_skill_proficiencies(data)
        assert "Athletics" in skills
        assert "Perception" in skills

    def test_skills_are_sorted(self):
        data = _base_data()
        data["modifiers"]["class"] = [
            {"type": "proficiency", "subType": "stealth"},
            {"type": "proficiency", "subType": "acrobatics"},
        ]
        skills = extract_skill_proficiencies(data)
        assert skills == sorted(skills)

    def test_no_duplicate_skills(self):
        data = _base_data()
        data["modifiers"]["class"] = [
            {"type": "proficiency", "subType": "arcana"},
        ]
        data["modifiers"]["background"] = [
            {"type": "proficiency", "subType": "arcana"},
        ]
        skills = extract_skill_proficiencies(data)
        assert skills.count("Arcana") == 1


# ---------------------------------------------------------------------------
# 9. Inventory
# ---------------------------------------------------------------------------

class TestExtractInventory:
    def test_empty_inventory_with_gold(self):
        data = _base_data()
        # Default base data has 50 gp; should produce a coin purse entry
        items = extract_inventory(data)
        coin = next((i for i in items if i["name"] == "Coin Purse"), None)
        assert coin is not None
        assert "50 gp" in coin["description"]

    def test_basic_item(self):
        data = _base_data(inventory=[{
            "equipped": True,
            "quantity": 1,
            "definition": {
                "name": "Longsword",
                "type": "Weapon",
                "filterType": None,
                "weight": 3.0,
                "rarity": "Common",
                "magic": False,
                "snippet": "A standard longsword.",
            },
        }])
        items = extract_inventory(data)
        sword = next((i for i in items if i["name"] == "Longsword"), None)
        assert sword is not None
        assert sword["equipped"] is True
        assert sword["quantity"] == 1
        assert sword["type"] == "Weapon"

    def test_no_coin_purse_when_all_zero(self):
        data = _base_data(currencies={"cp": 0, "sp": 0, "gp": 0, "ep": 0, "pp": 0})
        items = extract_inventory(data)
        assert not any(i["name"] == "Coin Purse" for i in items)

    def test_multiple_currencies_in_purse(self):
        data = _base_data(currencies={"cp": 10, "sp": 5, "gp": 100, "ep": 0, "pp": 2})
        items = extract_inventory(data)
        coin = next(i for i in items if i["name"] == "Coin Purse")
        assert "100 gp" in coin["description"]
        assert "2 pp" in coin["description"]
        assert "5 sp" in coin["description"]
        assert "10 cp" in coin["description"]
        assert "ep" not in coin["description"]


# ---------------------------------------------------------------------------
# 10. Full mapper — end-to-end
# ---------------------------------------------------------------------------

class TestMapDdbCharacter:
    def test_basic_mapping(self):
        data = _base_data()
        char, ddb_id, warnings, unmapped = map_ddb_character(data)

        assert ddb_id == 12345
        assert char["name"] == "Thorin"
        assert char["race"] == "Mountain Dwarf"
        assert char["character_class"] == "Fighter 5"
        assert char["level"] == 5
        assert char["strength"] == 16
        assert char["dexterity"] == 12
        assert char["constitution"] == 14
        assert char["intelligence"] == 10
        assert char["wisdom"] == 13
        assert char["charisma"] == 8
        assert char["hp_max"] == 43
        assert char["hp_current"] == 43
        assert char["armor_class"] == 11
        assert char["passive_perception"] == 11
        assert char["proficiency_bonus"] == 3
        assert char["speed"] == 25

    def test_unmapped_background(self):
        data = _base_data()
        _, _, _, unmapped = map_ddb_character(data)
        assert unmapped.get("background") == "Soldier"

    def test_unmapped_subclass(self):
        data = _base_data()
        _, _, _, unmapped = map_ddb_character(data)
        assert "Fighter: Champion" in unmapped.get("subclasses", [])

    def test_multiclass_warning(self):
        data = _base_data(classes=[
            {"level": 3, "definition": {"name": "Fighter"}, "subclassDefinition": None},
            {"level": 2, "definition": {"name": "Rogue"}, "subclassDefinition": None},
        ])
        _, _, warnings, _ = map_ddb_character(data)
        assert any("Multiclass" in w for w in warnings)

    def test_ac_warning_always_present(self):
        data = _base_data()
        _, _, warnings, _ = map_ddb_character(data)
        assert any("AC calculated" in w for w in warnings)

    def test_no_classes_raises(self):
        data = _base_data(classes=[])
        with pytest.raises(DDBImportError, match="no class data"):
            map_ddb_character(data)

    def test_spells_in_unmapped(self):
        data = _base_data(classSpells=[{
            "spells": [
                {"definition": {"name": "Fireball"}},
                {"definition": {"name": "Shield"}},
            ]
        }])
        _, _, _, unmapped = map_ddb_character(data)
        assert "Fireball" in unmapped.get("spells", [])
        assert "Shield" in unmapped.get("spells", [])

    def test_feats_in_unmapped(self):
        data = _base_data(feats=[{"definition": {"name": "Tough"}}])
        _, _, _, unmapped = map_ddb_character(data)
        assert "Tough" in unmapped.get("feats", [])

    def test_ddb_id_stored(self):
        data = _base_data()
        char, _, _, _ = map_ddb_character(data)
        assert char["ddb_id"] == 12345


# ---------------------------------------------------------------------------
# 11. Endpoint integration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestDdbImportEndpoint:
    async def test_success(self, client: AsyncClient, auth_headers):
        # Create a campaign first
        resp = await client.post(
            "/api/v1/campaigns",
            json={"name": "Test Campaign"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        campaign_id = resp.json()["data"]["id"]

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True, "data": _base_data()}

        with patch("app.services.ddb_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            resp = await client.post(
                f"/api/v1/campaigns/{campaign_id}/characters/import/ddb",
                json={"url": "https://www.dndbeyond.com/characters/12345"},
                headers=auth_headers,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["ddb_id"] == 12345
        assert body["data"]["ddb_name"] == "Thorin"
        assert body["data"]["preview"]["name"] == "Thorin"

    async def test_invalid_url_returns_422(self, client: AsyncClient, auth_headers):
        resp = await client.post(
            "/api/v1/campaigns",
            json={"name": "Another Campaign"},
            headers=auth_headers,
        )
        campaign_id = resp.json()["data"]["id"]

        resp = await client.post(
            f"/api/v1/campaigns/{campaign_id}/characters/import/ddb",
            json={"url": "https://example.com/not-a-character"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    async def test_private_character_returns_422(self, client: AsyncClient, auth_headers):
        resp = await client.post(
            "/api/v1/campaigns",
            json={"name": "Campaign"},
            headers=auth_headers,
        )
        campaign_id = resp.json()["data"]["id"]

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": False,
            "message": "Character not found",
        }

        with patch("app.services.ddb_service.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            resp = await client.post(
                f"/api/v1/campaigns/{campaign_id}/characters/import/ddb",
                json={"url": "https://www.dndbeyond.com/characters/99999"},
                headers=auth_headers,
            )

        assert resp.status_code == 422
        assert "private" in resp.json()["detail"].lower() or "not found" in resp.json()["detail"].lower()

    async def test_auth_required(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/campaigns/00000000-0000-0000-0000-000000000001/characters/import/ddb",
            json={"url": "https://www.dndbeyond.com/characters/12345"},
        )
        assert resp.status_code in (401, 403)

    async def test_campaign_not_found_returns_404(self, client: AsyncClient, auth_headers):
        resp = await client.post(
            "/api/v1/campaigns/00000000-0000-0000-0000-000000000001/characters/import/ddb",
            json={"url": "https://www.dndbeyond.com/characters/12345"},
            headers=auth_headers,
        )
        assert resp.status_code == 404
