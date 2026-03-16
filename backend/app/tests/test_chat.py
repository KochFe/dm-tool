import uuid

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

pytestmark = pytest.mark.asyncio

NULL_UUID = "00000000-0000-0000-0000-000000000000"

CHAT_URL = "/api/v1/campaigns/{campaign_id}/chat"


async def _create_campaign(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/campaigns", json={"name": "Chat Test Campaign"})
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


async def test_chat_happy_path(client: AsyncClient):
    """Valid campaign + valid user message returns 200 with assistant reply."""
    from app.schemas.chat import ChatMessage, ChatResponse

    cid = await _create_campaign(client)
    mock_response = ChatResponse(
        message=ChatMessage(role="assistant", content="The ancient dragon sleeps beneath the mountain.")
    )
    with patch(
        "app.routers.chat.process_chat", new_callable=AsyncMock
    ) as mock_oracle:
        mock_oracle.return_value = mock_response
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "Where is the dragon?"}]},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["message"]["role"] == "assistant"
    assert body["data"]["message"]["content"] == "The ancient dragon sleeps beneath the mountain."
    mock_oracle.assert_awaited_once()


# ---------------------------------------------------------------------------
# Not found
# ---------------------------------------------------------------------------


async def test_chat_campaign_not_found(client: AsyncClient):
    """Requesting chat for a non-existent campaign returns 404."""
    resp = await client.post(
        CHAT_URL.format(campaign_id=NULL_UUID),
        json={"messages": [{"role": "user", "content": "Hello?"}]},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Validation (no mock needed — Pydantic rejects before hitting the service)
# ---------------------------------------------------------------------------


async def test_chat_empty_messages(client: AsyncClient):
    """An empty messages list is rejected with 422."""
    cid = await _create_campaign(client)
    resp = await client.post(
        CHAT_URL.format(campaign_id=cid),
        json={"messages": []},
    )
    assert resp.status_code == 422


async def test_chat_invalid_role(client: AsyncClient):
    """A message with role 'system' is rejected with 422."""
    cid = await _create_campaign(client)
    resp = await client.post(
        CHAT_URL.format(campaign_id=cid),
        json={"messages": [{"role": "system", "content": "You are a dragon."}]},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# AI service errors
# ---------------------------------------------------------------------------


async def test_chat_missing_api_key(client: AsyncClient):
    """When process_chat raises a GROQ_API_KEY RuntimeError, the endpoint returns 503."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.chat.process_chat", new_callable=AsyncMock
    ) as mock_oracle:
        mock_oracle.side_effect = RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set the GROQ_API_KEY environment variable or add it to .env."
        )
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "Tell me a secret."}]},
        )

    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"].lower()


async def test_chat_ai_service_error(client: AsyncClient):
    """When process_chat raises a generic RuntimeError, the endpoint returns 503 with the message."""
    cid = await _create_campaign(client)
    with patch(
        "app.routers.chat.process_chat", new_callable=AsyncMock
    ) as mock_oracle:
        mock_oracle.side_effect = RuntimeError("AI service error: connection timeout")
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "What lurks in the dark?"}]},
        )

    assert resp.status_code == 503
    assert "connection timeout" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Response envelope structure
# ---------------------------------------------------------------------------


async def test_chat_response_envelope(client: AsyncClient):
    """The response always has the data/error/meta envelope with correct message fields."""
    from app.schemas.chat import ChatMessage, ChatResponse

    cid = await _create_campaign(client)
    mock_response = ChatResponse(
        message=ChatMessage(role="assistant", content="Roll a d20 for perception.")
    )
    with patch(
        "app.routers.chat.process_chat", new_callable=AsyncMock
    ) as mock_oracle:
        mock_oracle.return_value = mock_response
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={
                "messages": [
                    {"role": "user", "content": "Do I notice anything unusual?"}
                ]
            },
        )

    assert resp.status_code == 200
    body = resp.json()

    # Envelope keys must be present
    assert "data" in body
    assert "error" in body
    assert "meta" in body

    # error must be null on success
    assert body["error"] is None

    # message shape
    message = body["data"]["message"]
    assert "role" in message
    assert "content" in message
    assert message["role"] == "assistant"
    assert message["content"] == "Roll a d20 for perception."


# ---------------------------------------------------------------------------
# Context injection
# ---------------------------------------------------------------------------


async def test_chat_context_includes_campaign_data(client: AsyncClient):
    """campaign_context passed to process_chat includes location and party_level when set."""
    from app.schemas.chat import ChatMessage, ChatResponse

    cid = await _create_campaign(client)

    # Create a location and attach it to the campaign
    loc_resp = await client.post(
        f"/api/v1/campaigns/{cid}/locations",
        json={"name": "Waterdeep", "biome": "urban"},
    )
    assert loc_resp.status_code == 201
    loc_id = loc_resp.json()["data"]["id"]

    patch_resp = await client.patch(
        f"/api/v1/campaigns/{cid}",
        json={"current_location_id": loc_id, "party_level": 7},
    )
    assert patch_resp.status_code == 200

    mock_response = ChatResponse(message=ChatMessage(role="assistant", content="Hello!"))
    with patch("app.routers.chat.process_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_response
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "Where are we?"}]},
        )

    assert resp.status_code == 200
    args, _kwargs = mock_chat.call_args
    # process_chat(campaign_id, messages, campaign_context, session_factory)
    campaign_context = args[2]
    assert campaign_context["location_name"] == "Waterdeep"
    assert campaign_context["biome"] == "urban"
    assert campaign_context["party_level"] == 7


async def test_chat_context_no_location(client: AsyncClient):
    """campaign_context has None for location fields when campaign has no current location."""
    from app.schemas.chat import ChatMessage, ChatResponse

    cid = await _create_campaign(client)
    # Do not set current_location_id — it defaults to None

    mock_response = ChatResponse(message=ChatMessage(role="assistant", content="Anywhere!"))
    with patch("app.routers.chat.process_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_response
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "Where am I?"}]},
        )

    assert resp.status_code == 200
    args, _kwargs = mock_chat.call_args
    campaign_context = args[2]
    assert campaign_context["location_name"] is None
    assert campaign_context["biome"] is None


async def test_chat_campaign_id_is_uuid(client: AsyncClient):
    """The campaign_id argument forwarded to process_chat is a uuid.UUID, not a string."""
    from app.schemas.chat import ChatMessage, ChatResponse

    cid = await _create_campaign(client)

    mock_response = ChatResponse(message=ChatMessage(role="assistant", content="Indeed."))
    with patch("app.routers.chat.process_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_response
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "Hello?"}]},
        )

    assert resp.status_code == 200
    args, _kwargs = mock_chat.call_args
    forwarded_id = args[0]
    assert isinstance(forwarded_id, uuid.UUID), (
        f"Expected uuid.UUID, got {type(forwarded_id)}"
    )


async def test_chat_passes_session_factory(client: AsyncClient):
    """The session_factory argument forwarded to process_chat is app.database.async_session."""
    from app.schemas.chat import ChatMessage, ChatResponse
    from app.database import async_session as expected_factory

    cid = await _create_campaign(client)

    mock_response = ChatResponse(message=ChatMessage(role="assistant", content="Sure."))
    with patch("app.routers.chat.process_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_response
        resp = await client.post(
            CHAT_URL.format(campaign_id=cid),
            json={"messages": [{"role": "user", "content": "Test."}]},
        )

    assert resp.status_code == 200
    args, _kwargs = mock_chat.call_args
    # process_chat(campaign_id, messages, campaign_context, session_factory)
    session_factory = args[3]
    assert session_factory is expected_factory
