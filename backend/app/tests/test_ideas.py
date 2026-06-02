import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"


async def _create_campaign(client: AsyncClient, auth_headers: dict) -> str:
    resp = await client.post(
        "/api/v1/campaigns", json={"name": "Idea Test Campaign"}, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _create_idea(client: AsyncClient, campaign_id: str, data: dict, auth_headers: dict) -> dict:
    resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/ideas", json=data, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def test_create_idea(client: AsyncClient, auth_headers):
    """Creating an idea returns 201 with correct fields and is_done=False."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/ideas",
        json={"text": "Dragon terrorizing region", "tag": "story"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "data" in body
    assert "error" in body
    assert "meta" in body
    assert body["error"] is None
    data = body["data"]
    assert data["text"] == "Dragon terrorizing region"
    assert data["tag"] == "story"
    assert data["is_done"] is False
    assert data["campaign_id"] == cid


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


async def test_list_ideas_ordered(client: AsyncClient, auth_headers):
    """Ideas are returned ordered by sort_order ascending."""
    cid = await _create_campaign(client, auth_headers)
    await _create_idea(
        client, cid, {"text": "Second idea", "tag": "location", "sort_order": 2}, auth_headers
    )
    await _create_idea(
        client, cid, {"text": "First idea", "tag": "story", "sort_order": 1}, auth_headers
    )

    resp = await client.get(f"/api/v1/campaigns/{cid}/ideas", headers=auth_headers)
    assert resp.status_code == 200
    ideas = resp.json()["data"]
    assert len(ideas) == 2
    assert ideas[0]["sort_order"] <= ideas[1]["sort_order"]
    assert ideas[0]["text"] == "First idea"
    assert ideas[1]["text"] == "Second idea"


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def test_update_idea_toggle_done(client: AsyncClient, auth_headers):
    """PATCH is_done=True marks the idea as complete."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_idea(
        client, cid, {"text": "Complete this idea", "tag": "character"}, auth_headers
    )
    idea_id = created["id"]
    assert created["is_done"] is False

    resp = await client.patch(
        f"/api/v1/ideas/{idea_id}", json={"is_done": True}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_done"] is True
    # text unchanged
    assert data["text"] == "Complete this idea"


async def test_update_idea_change_tag(client: AsyncClient, auth_headers):
    """PATCH tag from 'story' to 'character' changes the tag."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_idea(
        client, cid, {"text": "Rethink this idea", "tag": "story"}, auth_headers
    )
    idea_id = created["id"]

    resp = await client.patch(
        f"/api/v1/ideas/{idea_id}", json={"tag": "character"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["tag"] == "character"
    # text unchanged
    assert data["text"] == "Rethink this idea"


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def test_delete_idea(client: AsyncClient, auth_headers):
    """Deleting an idea returns 204 and subsequent PATCH returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_idea(
        client, cid, {"text": "Short-lived idea", "tag": "location"}, auth_headers
    )
    idea_id = created["id"]

    resp = await client.delete(f"/api/v1/ideas/{idea_id}", headers=auth_headers)
    assert resp.status_code == 204

    patch_resp = await client.patch(
        f"/api/v1/ideas/{idea_id}", json={"is_done": True}, headers=auth_headers
    )
    assert patch_resp.status_code == 404


# ---------------------------------------------------------------------------
# Not found
# ---------------------------------------------------------------------------


async def test_idea_not_found(client: AsyncClient, auth_headers):
    """PATCH with a non-existent idea ID returns 404."""
    resp = await client.patch(
        f"/api/v1/ideas/{NULL_UUID}", json={"is_done": True}, headers=auth_headers
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


async def test_invalid_tag_rejected(client: AsyncClient, auth_headers):
    """POST with an unrecognised tag value returns 422."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/ideas",
        json={"text": "Bad tag idea", "tag": "invalid_tag"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_create_idea_missing_text_rejected(client: AsyncClient, auth_headers):
    """POST without required text field returns 422."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/ideas",
        json={"tag": "story"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_create_idea_missing_tag_rejected(client: AsyncClient, auth_headers):
    """POST without required tag field returns 422."""
    cid = await _create_campaign(client, auth_headers)
    resp = await client.post(
        f"/api/v1/campaigns/{cid}/ideas",
        json={"text": "No tag here"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_all_valid_tags_accepted(client: AsyncClient, auth_headers):
    """All three valid tag values are accepted by the create endpoint."""
    cid = await _create_campaign(client, auth_headers)
    for tag in ("story", "location", "character"):
        resp = await client.post(
            f"/api/v1/campaigns/{cid}/ideas",
            json={"text": f"Idea with tag {tag}", "tag": tag},
            headers=auth_headers,
        )
        assert resp.status_code == 201, f"Expected 201 for tag={tag!r}"
        assert resp.json()["data"]["tag"] == tag


# ---------------------------------------------------------------------------
# Cascade delete
# ---------------------------------------------------------------------------


async def test_idea_cascade_delete(client: AsyncClient, auth_headers):
    """Deleting a campaign cascades and subsequent PATCH on the idea returns 404."""
    cid = await _create_campaign(client, auth_headers)
    created = await _create_idea(
        client, cid, {"text": "Ephemeral idea", "tag": "story"}, auth_headers
    )
    idea_id = created["id"]

    # Delete the campaign
    del_resp = await client.delete(f"/api/v1/campaigns/{cid}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Idea should now be gone
    patch_resp = await client.patch(
        f"/api/v1/ideas/{idea_id}", json={"is_done": True}, headers=auth_headers
    )
    assert patch_resp.status_code == 404


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------


async def test_reorder_ideas_rewrites_order(client: AsyncClient, auth_headers):
    """PATCH .../ideas/reorder rewrites sort_order and is reflected by GET."""
    cid = await _create_campaign(client, auth_headers)
    a = await _create_idea(client, cid, {"text": "A", "tag": "story", "sort_order": 0}, auth_headers)
    b = await _create_idea(client, cid, {"text": "B", "tag": "story", "sort_order": 1}, auth_headers)

    resp = await client.patch(
        f"/api/v1/campaigns/{cid}/ideas/reorder",
        json={"items": [
            {"id": b["id"], "sort_order": 0, "tag": "story"},
            {"id": a["id"], "sort_order": 1, "tag": "story"},
        ]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    ordered = resp.json()["data"]
    assert [i["text"] for i in ordered] == ["B", "A"]

    get_resp = await client.get(f"/api/v1/campaigns/{cid}/ideas", headers=auth_headers)
    assert [i["text"] for i in get_resp.json()["data"]] == ["B", "A"]


async def test_reorder_changes_tag(client: AsyncClient, auth_headers):
    """Reordering can move an idea to a new tag (cross-group drag)."""
    cid = await _create_campaign(client, auth_headers)
    idea = await _create_idea(client, cid, {"text": "Move me", "tag": "story"}, auth_headers)

    resp = await client.patch(
        f"/api/v1/campaigns/{cid}/ideas/reorder",
        json={"items": [{"id": idea["id"], "sort_order": 0, "tag": "character"}]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"][0]["tag"] == "character"


async def test_reorder_rejects_foreign_idea(client: AsyncClient, auth_headers):
    """An idea id from another campaign is rejected with 404."""
    cid_a = await _create_campaign(client, auth_headers)
    cid_b = await _create_campaign(client, auth_headers)
    foreign = await _create_idea(client, cid_b, {"text": "Other", "tag": "story"}, auth_headers)

    resp = await client.patch(
        f"/api/v1/campaigns/{cid_a}/ideas/reorder",
        json={"items": [{"id": foreign["id"], "sort_order": 0, "tag": "story"}]},
        headers=auth_headers,
    )
    assert resp.status_code == 404


async def test_reorder_unknown_campaign_404(client: AsyncClient, auth_headers):
    """Reordering under a non-existent campaign returns 404."""
    resp = await client.patch(
        f"/api/v1/campaigns/{NULL_UUID}/ideas/reorder",
        json={"items": []},
        headers=auth_headers,
    )
    assert resp.status_code == 404
