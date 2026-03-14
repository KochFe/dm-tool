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
