import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

COMBATANT_GOBLIN = {
    "name": "Goblin",
    "initiative": 12,
    "hp_current": 7,
    "hp_max": 7,
    "armor_class": 15,
    "type": "monster",
}

COMBATANT_FIGHTER = {
    "name": "Thorin",
    "initiative": 18,
    "hp_current": 45,
    "hp_max": 52,
    "armor_class": 18,
    "type": "pc",
}

COMBATANT_ROGUE = {
    "name": "Silk",
    "initiative": 5,
    "hp_current": 28,
    "hp_max": 30,
    "armor_class": 14,
    "type": "pc",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Test Campaign"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_session(client: AsyncClient, campaign_id: str, auth_headers: dict, **kwargs) -> dict:
    """Create a combat session and return its data dict."""
    payload = {"combatants": []}
    payload.update(kwargs)
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/combat-sessions", json=payload, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Create combat session
# ---------------------------------------------------------------------------


async def test_create_combat_session_with_combatants(client: AsyncClient, auth_headers):
    """Create a session with combatants — verify 201 and initiative sort (DESC)."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/combat-sessions",
        json={
            "name": "Goblin Ambush",
            "combatants": [COMBATANT_GOBLIN, COMBATANT_FIGHTER, COMBATANT_ROGUE],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201

    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None

    data = body["data"]
    assert data["name"] == "Goblin Ambush"
    assert data["campaign_id"] == cid
    assert data["status"] == "active"
    assert data["round_number"] == 1
    assert data["current_turn_index"] == 0
    assert len(data["combatants"]) == 3

    # Combatants must be sorted by initiative descending
    initiatives = [c["initiative"] for c in data["combatants"]]
    assert initiatives == sorted(initiatives, reverse=True), (
        f"Expected DESC sort, got: {initiatives}"
    )
    assert initiatives[0] == 18  # Thorin
    assert initiatives[1] == 12  # Goblin
    assert initiatives[2] == 5  # Silk


async def test_create_combat_session_without_combatants(client: AsyncClient, auth_headers):
    """Create a session with no combatants — verify empty list."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/combat-sessions",
        json={"name": "Empty Fight"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["combatants"] == []
    assert data["name"] == "Empty Fight"


async def test_create_combat_session_invalid_campaign(client: AsyncClient, auth_headers):
    """Creating a session for a non-existent campaign returns 404."""
    resp = await client.post(
        "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/combat-sessions",
        json={"combatants": []},
        headers=auth_headers,
    )
    assert resp.status_code == 404


async def test_create_combat_session_name_is_optional(client: AsyncClient, auth_headers):
    """Name field is optional — omitting it should succeed with null name."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/combat-sessions",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["name"] is None


# ---------------------------------------------------------------------------
# List combat sessions
# ---------------------------------------------------------------------------


async def test_list_combat_sessions(client: AsyncClient, auth_headers):
    """List returns all sessions for a campaign."""
    cid = await _create_campaign(client, auth_headers)
    await _create_session(client, cid, auth_headers, name="Session 1")
    await _create_session(client, cid, auth_headers, name="Session 2")

    resp = await client.get(f"/api/v1/campaigns/{cid}/combat-sessions", headers=auth_headers)
    assert resp.status_code == 200

    body = resp.json()
    assert body["error"] is None
    sessions = body["data"]
    assert len(sessions) == 2
    names = {s["name"] for s in sessions}
    assert names == {"Session 1", "Session 2"}


async def test_list_combat_sessions_empty(client: AsyncClient, auth_headers):
    """Listing sessions for a campaign with none returns an empty list."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.get(f"/api/v1/campaigns/{cid}/combat-sessions", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"] == []


async def test_list_combat_sessions_invalid_campaign(client: AsyncClient, auth_headers):
    """Listing sessions for a non-existent campaign returns 404."""
    resp = await client.get(
        "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/combat-sessions",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Get combat session
# ---------------------------------------------------------------------------


async def test_get_combat_session(client: AsyncClient, auth_headers):
    """Get a session by ID — verify envelope structure and fields."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(
        client, cid, auth_headers, name="Boss Fight", combatants=[COMBATANT_FIGHTER]
    )
    sid = created["id"]

    resp = await client.get(f"/api/v1/combat-sessions/{sid}", headers=auth_headers)
    assert resp.status_code == 200

    body = resp.json()
    assert body["error"] is None
    data = body["data"]
    assert data["id"] == sid
    assert data["campaign_id"] == cid
    assert data["name"] == "Boss Fight"
    assert data["status"] == "active"
    assert data["round_number"] == 1
    assert data["current_turn_index"] == 0
    assert len(data["combatants"]) == 1
    assert data["combatants"][0]["name"] == "Thorin"


async def test_get_combat_session_not_found(client: AsyncClient, auth_headers):
    """Getting a non-existent session returns 404."""
    resp = await client.get(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update combat session
# ---------------------------------------------------------------------------


async def test_update_combat_session_name(client: AsyncClient, auth_headers):
    """PATCH name — only name is updated, status remains unchanged."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers, name="Old Name")
    sid = created["id"]

    resp = await client.patch(
        f"/api/v1/combat-sessions/{sid}", json={"name": "New Name"}, headers=auth_headers
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["name"] == "New Name"
    assert data["status"] == "active"  # unchanged


async def test_update_combat_session_status_completed(client: AsyncClient, auth_headers):
    """PATCH status to 'completed' — name remains unchanged."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers, name="Ongoing Battle")
    sid = created["id"]

    resp = await client.patch(
        f"/api/v1/combat-sessions/{sid}", json={"status": "completed"}, headers=auth_headers
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["status"] == "completed"
    assert data["name"] == "Ongoing Battle"  # unchanged


async def test_update_combat_session_not_found(client: AsyncClient, auth_headers):
    """PATCH on a non-existent session returns 404."""
    resp = await client.patch(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000",
        json={"name": "Ghost"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete combat session
# ---------------------------------------------------------------------------


async def test_delete_combat_session(client: AsyncClient, auth_headers):
    """Delete a session — returns 204 and subsequent GET returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers, name="To Delete")
    sid = created["id"]

    resp = await client.delete(f"/api/v1/combat-sessions/{sid}", headers=auth_headers)
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/combat-sessions/{sid}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_combat_session_not_found(client: AsyncClient, auth_headers):
    """DELETE on a non-existent session returns 404."""
    resp = await client.delete(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Add combatant
# ---------------------------------------------------------------------------


async def test_add_combatant_resorts_by_initiative(client: AsyncClient, auth_headers):
    """Adding a combatant re-sorts the list by initiative DESC."""
    cid = await _create_campaign(client, auth_headers)
    # Start with Goblin (initiative 12) and Silk (initiative 5)
    created = await _create_session(
        client,
        cid,
        auth_headers,
        combatants=[COMBATANT_GOBLIN, COMBATANT_ROGUE],
    )
    sid = created["id"]

    # Add Thorin with initiative 18 — should sort to front
    resp = await client.post(
        f"/api/v1/combat-sessions/{sid}/combatants", json=COMBATANT_FIGHTER, headers=auth_headers
    )
    assert resp.status_code == 201

    data = resp.json()["data"]
    assert len(data["combatants"]) == 3
    initiatives = [c["initiative"] for c in data["combatants"]]
    assert initiatives == sorted(initiatives, reverse=True)
    assert initiatives[0] == 18  # Thorin inserted at front


async def test_add_combatant_to_nonexistent_session(client: AsyncClient, auth_headers):
    """Adding a combatant to a non-existent session returns 404."""
    resp = await client.post(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000/combatants",
        json=COMBATANT_GOBLIN,
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update combatant
# ---------------------------------------------------------------------------


async def test_update_combatant_hp(client: AsyncClient, auth_headers):
    """PATCH combatant HP — only hp_current changes, other fields are unchanged."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(
        client, cid, auth_headers, combatants=[COMBATANT_GOBLIN, COMBATANT_FIGHTER]
    )
    sid = created["id"]

    # After sort: Thorin (18) is index 0, Goblin (12) is index 1
    resp = await client.patch(
        f"/api/v1/combat-sessions/{sid}/combatants/1", json={"hp_current": 0}, headers=auth_headers
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    goblin = data["combatants"][1]
    assert goblin["hp_current"] == 0
    assert goblin["hp_max"] == 7  # unchanged
    assert goblin["name"] == "Goblin"  # unchanged


async def test_update_combatant_out_of_range(client: AsyncClient, auth_headers):
    """PATCH at an out-of-range index returns 400."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers, combatants=[COMBATANT_GOBLIN])
    sid = created["id"]

    resp = await client.patch(
        f"/api/v1/combat-sessions/{sid}/combatants/99", json={"hp_current": 0}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_update_combatant_session_not_found(client: AsyncClient, auth_headers):
    """PATCH combatant on a non-existent session returns 404."""
    resp = await client.patch(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000/combatants/0",
        json={"hp_current": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Remove combatant
# ---------------------------------------------------------------------------


async def test_remove_combatant(client: AsyncClient, auth_headers):
    """DELETE combatant at index — returns updated session with one fewer combatant."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(
        client, cid, auth_headers, combatants=[COMBATANT_GOBLIN, COMBATANT_FIGHTER]
    )
    sid = created["id"]
    # After sort: Thorin (18) at 0, Goblin (12) at 1
    # Remove Goblin at index 1
    resp = await client.delete(f"/api/v1/combat-sessions/{sid}/combatants/1", headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert len(data["combatants"]) == 1
    assert data["combatants"][0]["name"] == "Thorin"


async def test_remove_combatant_out_of_range(client: AsyncClient, auth_headers):
    """DELETE at an out-of-range index returns 400."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers, combatants=[COMBATANT_GOBLIN])
    sid = created["id"]

    resp = await client.delete(f"/api/v1/combat-sessions/{sid}/combatants/5", headers=auth_headers)
    assert resp.status_code == 400


async def test_remove_combatant_session_not_found(client: AsyncClient, auth_headers):
    """DELETE combatant on a non-existent session returns 404."""
    resp = await client.delete(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000/combatants/0",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Advance turn
# ---------------------------------------------------------------------------


async def test_advance_turn_normal_progression(client: AsyncClient, auth_headers):
    """next-turn within a round: current_turn_index increments, round stays same."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(
        client,
        cid,
        auth_headers,
        combatants=[COMBATANT_FIGHTER, COMBATANT_GOBLIN, COMBATANT_ROGUE],
    )
    sid = created["id"]

    # Round 1, index 0 → advance → index 1
    resp = await client.post(f"/api/v1/combat-sessions/{sid}/next-turn", headers=auth_headers)
    assert resp.status_code == 200

    body = resp.json()
    assert body["error"] is None
    data = body["data"]
    assert data["current_turn_index"] == 1
    assert data["round_number"] == 1


async def test_advance_turn_wrap_to_next_round(client: AsyncClient, auth_headers):
    """next-turn at last combatant wraps to index 0 and increments round_number."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(
        client,
        cid,
        auth_headers,
        combatants=[COMBATANT_FIGHTER, COMBATANT_GOBLIN],
    )
    sid = created["id"]

    # Advance twice to reach index 1 (last combatant — 2 total)
    await client.post(f"/api/v1/combat-sessions/{sid}/next-turn", headers=auth_headers)
    # Now at index 1 — next advance should wrap
    resp = await client.post(f"/api/v1/combat-sessions/{sid}/next-turn", headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["current_turn_index"] == 0
    assert data["round_number"] == 2


async def test_advance_turn_completed_session_returns_400(client: AsyncClient, auth_headers):
    """Advancing a completed session returns 400."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(
        client, cid, auth_headers, combatants=[COMBATANT_GOBLIN]
    )
    sid = created["id"]

    # Mark session as completed
    await client.patch(
        f"/api/v1/combat-sessions/{sid}", json={"status": "completed"}, headers=auth_headers
    )

    resp = await client.post(f"/api/v1/combat-sessions/{sid}/next-turn", headers=auth_headers)
    assert resp.status_code == 400


async def test_advance_turn_no_combatants_returns_400(client: AsyncClient, auth_headers):
    """Advancing a session with no combatants returns 400."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers)
    sid = created["id"]

    resp = await client.post(f"/api/v1/combat-sessions/{sid}/next-turn", headers=auth_headers)
    assert resp.status_code == 400


async def test_advance_turn_session_not_found(client: AsyncClient, auth_headers):
    """next-turn on a non-existent session returns 404."""
    resp = await client.post(
        "/api/v1/combat-sessions/00000000-0000-0000-0000-000000000000/next-turn",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Cascade delete
# ---------------------------------------------------------------------------


async def test_cascade_delete_campaign_removes_combat_sessions(client: AsyncClient, auth_headers):
    """Deleting a campaign cascade-deletes its combat sessions."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_session(client, cid, auth_headers, name="Will Be Gone")
    sid = created["id"]

    # Confirm the session exists
    resp = await client.get(f"/api/v1/combat-sessions/{sid}", headers=auth_headers)
    assert resp.status_code == 200

    # Delete the campaign
    resp = await client.delete(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert resp.status_code == 204

    # The combat session must now be gone
    resp = await client.get(f"/api/v1/combat-sessions/{sid}", headers=auth_headers)
    assert resp.status_code == 404
