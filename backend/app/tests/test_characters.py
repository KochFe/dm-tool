import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

CHARACTER_DATA = {
    "name": "Gandalf",
    "race": "Human",
    "character_class": "Wizard",
    "level": 10,
    "hp_current": 45,
    "hp_max": 50,
    "armor_class": 12,
    "passive_perception": 14,
}


async def _create_campaign(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Test Campaign"})
    return resp.json()["data"]["id"]


async def test_create_character(client: AsyncClient):
    cid = await _create_campaign(client)
    resp = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Gandalf"
    assert data["campaign_id"] == cid


async def test_list_characters(client: AsyncClient):
    cid = await _create_campaign(client)
    await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    resp = await client.get(f"/api/v1/campaigns/{cid}/characters")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1


async def test_get_character(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    resp = await client.get(f"/api/v1/characters/{pid}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Gandalf"


async def test_update_character(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/characters/{pid}", json={"hp_current": 30})
    assert resp.status_code == 200
    assert resp.json()["data"]["hp_current"] == 30
    assert resp.json()["data"]["hp_max"] == 50  # unchanged


async def test_delete_character(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    resp = await client.delete(f"/api/v1/characters/{pid}")
    assert resp.status_code == 204


async def test_character_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/characters/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_character_campaign_not_found(client: AsyncClient):
    resp = await client.post(
        "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/characters",
        json=CHARACTER_DATA,
    )
    assert resp.status_code == 404


async def test_cascade_delete(client: AsyncClient):
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]
    await client.delete(f"/api/v1/campaigns/{cid}")
    resp = await client.get(f"/api/v1/characters/{pid}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Phase 3 expanded fields: ability scores, proficiency_bonus, speed,
# saving_throw_proficiencies, skill_proficiencies, spell_slots
# ---------------------------------------------------------------------------


async def test_create_character_with_ability_scores(client: AsyncClient):
    """All 6 ability scores specified explicitly come back with the correct values."""
    cid = await _create_campaign(client)
    payload = {
        **CHARACTER_DATA,
        "strength": 18,
        "dexterity": 14,
        "constitution": 16,
        "intelligence": 12,
        "wisdom": 8,
        "charisma": 10,
    }
    resp = await client.post(f"/api/v1/campaigns/{cid}/characters", json=payload)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["strength"] == 18
    assert data["dexterity"] == 14
    assert data["constitution"] == 16
    assert data["intelligence"] == 12
    assert data["wisdom"] == 8
    assert data["charisma"] == 10


async def test_create_character_default_ability_scores(client: AsyncClient):
    """Creating a character without ability scores gives all defaults of 10."""
    cid = await _create_campaign(client)
    resp = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    assert resp.status_code == 201
    data = resp.json()["data"]
    for stat in ("strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"):
        assert data[stat] == 10, f"Expected {stat}=10, got {data[stat]}"


async def test_create_character_with_proficiencies(client: AsyncClient):
    """saving_throw_proficiencies, skill_proficiencies, and spell_slots round-trip correctly."""
    cid = await _create_campaign(client)
    payload = {
        **CHARACTER_DATA,
        "saving_throw_proficiencies": ["STR", "CON"],
        "skill_proficiencies": ["Athletics", "Perception"],
        "spell_slots": {"1": 4, "2": 3},
    }
    resp = await client.post(f"/api/v1/campaigns/{cid}/characters", json=payload)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["saving_throw_proficiencies"] == ["STR", "CON"]
    assert data["skill_proficiencies"] == ["Athletics", "Perception"]
    assert data["spell_slots"] == {"1": 4, "2": 3}


async def test_update_character_ability_scores(client: AsyncClient):
    """PATCH with only strength=18 changes strength; all other ability scores remain at default."""
    cid = await _create_campaign(client)
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=CHARACTER_DATA)
    pid = create.json()["data"]["id"]

    resp = await client.patch(f"/api/v1/characters/{pid}", json={"strength": 18})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["strength"] == 18
    # All other ability scores must remain at their original defaults
    assert data["dexterity"] == 10
    assert data["constitution"] == 10
    assert data["intelligence"] == 10
    assert data["wisdom"] == 10
    assert data["charisma"] == 10


async def test_update_character_proficiencies(client: AsyncClient):
    """PATCH with a new skill_proficiencies list replaces the previous value."""
    cid = await _create_campaign(client)
    payload = {
        **CHARACTER_DATA,
        "skill_proficiencies": ["Athletics"],
    }
    create = await client.post(f"/api/v1/campaigns/{cid}/characters", json=payload)
    pid = create.json()["data"]["id"]

    resp = await client.patch(
        f"/api/v1/characters/{pid}",
        json={"skill_proficiencies": ["Stealth", "Deception", "Insight"]},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["skill_proficiencies"] == ["Stealth", "Deception", "Insight"]
    # Other proficiency fields must remain untouched
    assert data["saving_throw_proficiencies"] == []
    assert data["spell_slots"] == {}


async def test_create_character_with_speed_and_proficiency_bonus(client: AsyncClient):
    """speed and proficiency_bonus are stored and returned correctly."""
    cid = await _create_campaign(client)
    payload = {
        **CHARACTER_DATA,
        "speed": 25,
        "proficiency_bonus": 3,
    }
    resp = await client.post(f"/api/v1/campaigns/{cid}/characters", json=payload)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["speed"] == 25
    assert data["proficiency_bonus"] == 3
