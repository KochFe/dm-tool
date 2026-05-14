"""Integration tests for the general-chat SSE endpoints."""
from typing import AsyncIterator
from unittest.mock import patch

import pytest

from app.ai.providers.base import ChatChunk


class FakeProvider:
    id = "deepseek"
    display_name = "Fake Deepseek"
    supports_reasoning = True
    supports_tools = False

    def __init__(self, script: list[ChatChunk]) -> None:
        self._script = script

    async def stream_chat(self, messages, system) -> AsyncIterator[ChatChunk]:
        for c in self._script:
            yield c


@pytest.mark.asyncio
async def test_chat_general_requires_auth(client):
    res = await client.post("/api/v1/chat/general", json={
        "provider": "deepseek",
        "messages": [{"role": "user", "content": "hi"}],
    })
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_chat_general_unconfigured_provider_returns_503(client, auth_headers):
    with patch("app.ai.providers.registry.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "g"
        mock_settings.GROQ_MODEL = "x"
        mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
        mock_settings.DEEPSEEK_API_KEY = ""
        mock_settings.DEEPSEEK_MODEL = "deepseek-reasoner"
        mock_settings.DEEPSEEK_BASE_URL = "https://api.deepseek.com"
        from app.ai.providers import registry as r
        r._reset_for_tests()
        res = await client.post(
            "/api/v1/chat/general",
            headers=auth_headers,
            json={
                "provider": "deepseek",
                "messages": [{"role": "user", "content": "hi"}],
            },
        )
    assert res.status_code == 503


@pytest.mark.asyncio
async def test_chat_general_unknown_provider_returns_400(client, auth_headers):
    res = await client.post(
        "/api/v1/chat/general",
        headers=auth_headers,
        json={
            "provider": "anthropic",
            "messages": [{"role": "user", "content": "hi"}],
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_chat_general_streams_chunks(client, auth_headers):
    """Provider returns three chunks; endpoint emits them as SSE frames."""
    fake = FakeProvider([
        {"type": "reasoning", "delta": "thinking..."},
        {"type": "content", "delta": "hello!"},
        {"type": "done"},
    ])
    with patch("app.ai.providers.registry.get_provider", return_value=fake):
        res = await client.post(
            "/api/v1/chat/general",
            headers=auth_headers,
            json={
                "provider": "deepseek",
                "messages": [{"role": "user", "content": "hi"}],
            },
        )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    text = res.text
    assert 'data: {"type": "reasoning"' in text
    assert 'data: {"type": "content"' in text
    assert 'data: {"type": "done"}' in text
