import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

ROLL_URL = "/api/v1/dice/roll"


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------

async def test_roll_2d6_plus_3(client: AsyncClient, auth_headers):
    """2d6+3 — verify full response structure and arithmetic."""
    resp = await client.post(ROLL_URL, json={"notation": "2d6+3"}, headers=auth_headers)
    assert resp.status_code == 200

    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None

    data = body["data"]
    assert data["notation"] == "2d6+3"
    assert data["count"] == 2
    assert data["sides"] == 6
    assert data["modifier"] == 3
    assert len(data["rolls"]) == 2
    for roll in data["rolls"]:
        assert 1 <= roll <= 6
    assert data["total"] == sum(data["rolls"]) + 3


async def test_roll_1d20_no_modifier(client: AsyncClient, auth_headers):
    """1d20 — no modifier present, modifier must default to 0."""
    resp = await client.post(ROLL_URL, json={"notation": "1d20"}, headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["notation"] == "1d20"
    assert data["count"] == 1
    assert data["sides"] == 20
    assert data["modifier"] == 0
    assert len(data["rolls"]) == 1
    assert 1 <= data["rolls"][0] <= 20
    assert data["total"] == data["rolls"][0]


async def test_roll_4d6_minus_1(client: AsyncClient, auth_headers):
    """4d6-1 — negative modifier is correctly parsed and applied."""
    resp = await client.post(ROLL_URL, json={"notation": "4d6-1"}, headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["notation"] == "4d6-1"
    assert data["count"] == 4
    assert data["sides"] == 6
    assert data["modifier"] == -1
    assert len(data["rolls"]) == 4
    for roll in data["rolls"]:
        assert 1 <= roll <= 6
    assert data["total"] == sum(data["rolls"]) - 1


async def test_roll_1d100_percentile(client: AsyncClient, auth_headers):
    """1d100 — percentile die is a valid die type."""
    resp = await client.post(ROLL_URL, json={"notation": "1d100"}, headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["notation"] == "1d100"
    assert data["count"] == 1
    assert data["sides"] == 100
    assert data["modifier"] == 0
    assert len(data["rolls"]) == 1
    assert 1 <= data["rolls"][0] <= 100
    assert data["total"] == data["rolls"][0]


async def test_roll_1d4_smallest_die(client: AsyncClient, auth_headers):
    """1d4 — smallest standard D&D die is accepted."""
    resp = await client.post(ROLL_URL, json={"notation": "1d4"}, headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["notation"] == "1d4"
    assert data["count"] == 1
    assert data["sides"] == 4
    assert data["modifier"] == 0
    assert len(data["rolls"]) == 1
    assert 1 <= data["rolls"][0] <= 4
    assert data["total"] == data["rolls"][0]


# ---------------------------------------------------------------------------
# Validation / error-path tests
# ---------------------------------------------------------------------------

async def test_roll_invalid_notation_abc(client: AsyncClient, auth_headers):
    """'abc' does not match the notation regex — must return 422."""
    resp = await client.post(ROLL_URL, json={"notation": "abc"}, headers=auth_headers)
    assert resp.status_code == 422


async def test_roll_invalid_count_zero(client: AsyncClient, auth_headers):
    """'0d6' — count of 0 is below the minimum of 1 — must return 422."""
    resp = await client.post(ROLL_URL, json={"notation": "0d6"}, headers=auth_headers)
    assert resp.status_code == 422


async def test_roll_invalid_count_too_high(client: AsyncClient, auth_headers):
    """'101d6' — count of 101 exceeds the maximum of 100 — must return 422."""
    resp = await client.post(ROLL_URL, json={"notation": "101d6"}, headers=auth_headers)
    assert resp.status_code == 422


async def test_roll_invalid_sides_unsupported(client: AsyncClient, auth_headers):
    """'2d7' — d7 is not a standard D&D die — must return 422."""
    resp = await client.post(ROLL_URL, json={"notation": "2d7"}, headers=auth_headers)
    assert resp.status_code == 422
