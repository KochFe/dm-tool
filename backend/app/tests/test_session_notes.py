"""Tests for Phase 16 — campaign session notes (CRUD + recap)."""
import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.schemas.session_notes import RecapRequest

pytestmark = pytest.mark.asyncio


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post(
        "/api/v1/campaigns", json={"name": "Test Campaign"}, headers=auth_headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


def test_recap_request_requires_exactly_one():
    with pytest.raises(ValueError):
        RecapRequest(provider="groq")
    with pytest.raises(ValueError):
        RecapRequest(provider="groq", last_n=3, entry_ids=[uuid.uuid4()])
    RecapRequest(provider="groq", last_n=3)
    RecapRequest(provider="groq", entry_ids=[uuid.uuid4()])


def test_recap_request_clamps_last_n():
    with pytest.raises(ValueError):
        RecapRequest(provider="groq", last_n=0)
    with pytest.raises(ValueError):
        RecapRequest(provider="groq", last_n=11)
    RecapRequest(provider="groq", last_n=1)
    RecapRequest(provider="groq", last_n=10)


# ---------------------------------------------------------------------------
# CRUD + lifecycle
# ---------------------------------------------------------------------------


async def test_get_open_creates_entry(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["status"] == "open"
    assert data["campaign_id"] == cid
    assert data["closed_at"] is None


async def test_get_open_is_idempotent(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    r1 = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    r2 = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    assert r1.json()["data"]["id"] == r2.json()["data"]["id"]


async def test_patch_entry_updates_body(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    entry_id = r.json()["data"]["id"]

    p = await client.patch(
        f"/api/v1/campaign-session-notes/{entry_id}",
        json={"body": "the party explored the crypt"},
        headers=auth_headers,
    )
    assert p.status_code == 200
    assert p.json()["data"]["body"] == "the party explored the crypt"


async def test_patch_entry_partial_update_preserves_other_fields(
    client: AsyncClient, auth_headers
):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    entry_id = r.json()["data"]["id"]

    await client.patch(
        f"/api/v1/campaign-session-notes/{entry_id}",
        json={"body": "original body"},
        headers=auth_headers,
    )
    await client.patch(
        f"/api/v1/campaign-session-notes/{entry_id}",
        json={"title": "Session 1"},
        headers=auth_headers,
    )

    g = await client.get(
        f"/api/v1/campaign-session-notes/{entry_id}", headers=auth_headers
    )
    data = g.json()["data"]
    assert data["title"] == "Session 1"
    assert data["body"] == "original body"


async def test_end_session_closes_and_creates_new_open(
    client: AsyncClient, auth_headers
):
    cid = await _create_campaign(client, auth_headers)
    r1 = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    old_id = r1.json()["data"]["id"]

    end = await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/end", headers=auth_headers
    )
    assert end.status_code == 200
    new_id = end.json()["data"]["id"]
    assert new_id != old_id
    assert end.json()["data"]["status"] == "open"

    listing = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes?status=closed",
        headers=auth_headers,
    )
    closed = listing.json()["data"]
    assert len(closed) == 1
    assert closed[0]["id"] == old_id
    assert closed[0]["closed_at"] is not None


async def test_list_returns_newest_first(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    # create three closed entries by ending session three times
    await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/end", headers=auth_headers
    )
    await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/end", headers=auth_headers
    )
    await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/end", headers=auth_headers
    )

    listing = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes?status=closed",
        headers=auth_headers,
    )
    closed = listing.json()["data"]
    assert len(closed) == 3
    timestamps = [e["created_at"] for e in closed]
    assert timestamps == sorted(timestamps, reverse=True)


async def test_delete_entry(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    entry_id = r.json()["data"]["id"]

    d = await client.delete(
        f"/api/v1/campaign-session-notes/{entry_id}", headers=auth_headers
    )
    assert d.status_code == 200
    assert d.json()["data"] is None

    # Re-fetching /open should now produce a fresh entry
    r2 = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    assert r2.json()["data"]["id"] != entry_id


async def test_only_one_open_per_campaign(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    # Call open three times — invariant says they all return same row
    ids = []
    for _ in range(3):
        r = await client.get(
            f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
        )
        ids.append(r.json()["data"]["id"])
    assert len(set(ids)) == 1

    listing = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes?status=open",
        headers=auth_headers,
    )
    assert len(listing.json()["data"]) == 1


# ---------------------------------------------------------------------------
# Tenant isolation + auth
# ---------------------------------------------------------------------------


async def test_cross_tenant_get_open_returns_404(
    client: AsyncClient, auth_headers, auth_headers_b
):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers_b
    )
    assert r.status_code == 404


async def test_cross_tenant_patch_returns_404(
    client: AsyncClient, auth_headers, auth_headers_b
):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    entry_id = r.json()["data"]["id"]

    p = await client.patch(
        f"/api/v1/campaign-session-notes/{entry_id}",
        json={"body": "cross-tenant"},
        headers=auth_headers_b,
    )
    assert p.status_code == 404


async def test_unauth_returns_401(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)
    r = await client.get(f"/api/v1/campaigns/{cid}/session-notes/open")
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Recap
# ---------------------------------------------------------------------------


async def test_recap_no_closed_entries_returns_400(
    client: AsyncClient, auth_headers
):
    cid = await _create_campaign(client, auth_headers)
    r = await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/recap",
        json={"provider": "groq", "last_n": 1},
        headers=auth_headers,
    )
    assert r.status_code == 400


async def test_recap_streams_chunks(client: AsyncClient, auth_headers):
    cid = await _create_campaign(client, auth_headers)

    # Create one closed entry with body content
    r = await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    entry_id = r.json()["data"]["id"]
    await client.patch(
        f"/api/v1/campaign-session-notes/{entry_id}",
        json={"body": "Party reached Ravenholt; met Garrick the innkeeper."},
        headers=auth_headers,
    )
    await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/end", headers=auth_headers
    )

    async def fake_stream(messages, system):
        # Sanity: the user message should carry the body content
        assert "Ravenholt" in messages[0].content
        assert "Garrick" in messages[0].content
        yield {"type": "content", "delta": "The party "}
        yield {"type": "content", "delta": "reached Ravenholt."}
        yield {"type": "done"}

    fake_provider = AsyncMock()
    fake_provider.stream_chat = fake_stream

    with (
        patch(
            "app.services.session_recap_service.registry.get_provider",
            return_value=fake_provider,
        ),
        patch(
            "app.routers.session_notes.registry.known_provider_ids",
            return_value=("groq", "deepseek"),
        ),
        patch(
            "app.routers.session_notes.is_provider_configured",
            return_value=True,
        ),
    ):
        async with client.stream(
            "POST",
            f"/api/v1/campaigns/{cid}/session-notes/recap",
            json={"provider": "groq", "last_n": 1},
            headers=auth_headers,
        ) as r:
            assert r.status_code == 200
            frames: list[dict] = []
            async for line in r.aiter_lines():
                if line.startswith("data: "):
                    frames.append(json.loads(line[len("data: "):]))

    chunk_frames = [f for f in frames if f.get("type") == "content"]
    assert chunk_frames, f"expected at least one content frame, got {frames}"
    assert any(f.get("type") == "done" for f in frames)
    joined = "".join(f["delta"] for f in chunk_frames)
    assert "Ravenholt" in joined


async def test_recap_unknown_provider_returns_400(
    client: AsyncClient, auth_headers
):
    cid = await _create_campaign(client, auth_headers)
    # Create a closed entry so the "no entries" path isn't hit first
    await client.get(
        f"/api/v1/campaigns/{cid}/session-notes/open", headers=auth_headers
    )
    await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/end", headers=auth_headers
    )

    r = await client.post(
        f"/api/v1/campaigns/{cid}/session-notes/recap",
        json={"provider": "not-a-real-provider", "last_n": 1},
        headers=auth_headers,
    )
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Prompt parity (Task 6)
# ---------------------------------------------------------------------------


def test_session_recap_prompt_exists_in_both_languages():
    from app.ai.prompts import de, en

    assert hasattr(en, "SESSION_RECAP_SYSTEM_PROMPT")
    assert hasattr(de, "SESSION_RECAP_SYSTEM_PROMPT")
    assert hasattr(en, "build_session_recap_user_message")
    assert hasattr(de, "build_session_recap_user_message")


def test_session_recap_user_message_includes_notes():
    from app.ai.prompts import de, en

    for mod in (en, de):
        msg = mod.build_session_recap_user_message(
            n=2, notes_block="## Session A\nbody A\n\n## Session B\nbody B\n"
        )
        assert "Session A" in msg
        assert "Session B" in msg
