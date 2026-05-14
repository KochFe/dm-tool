"""Tests for the LLMProvider protocol surface and provider implementations."""
import pytest

from app.ai.providers.base import ChatChunk, LLMProvider, ProviderNotConfigured


def test_chat_chunk_accepts_known_types():
    """ChatChunk is a TypedDict — these should construct without error."""
    a: ChatChunk = {"type": "reasoning", "delta": "thinking..."}
    b: ChatChunk = {"type": "content", "delta": "answer"}
    c: ChatChunk = {"type": "done"}
    d: ChatChunk = {"type": "error", "message": "boom"}
    assert a["type"] == "reasoning"
    assert b["delta"] == "answer"
    assert c["type"] == "done"
    assert d["message"] == "boom"


def test_provider_not_configured_is_runtime_error():
    """ProviderNotConfigured is a typed subclass usable in except clauses."""
    with pytest.raises(ProviderNotConfigured):
        raise ProviderNotConfigured("deepseek")


from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.ai.providers.groq_provider import GroqProvider
from app.schemas.chat import ChatMessage


def _make_openai_chunk(content: str | None = None, reasoning: str | None = None):
    """Build a faux OpenAI streaming chunk with a single choice/delta."""
    delta = SimpleNamespace(content=content, reasoning_content=reasoning)
    choice = SimpleNamespace(delta=delta, finish_reason=None)
    return SimpleNamespace(choices=[choice])


async def _aiter(items):
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_groq_provider_emits_content_chunks_and_done():
    """GroqProvider yields only content chunks (no reasoning) plus a final done."""
    fake_stream = _aiter([
        _make_openai_chunk(content="Hello "),
        _make_openai_chunk(content="world"),
    ])

    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_stream)

    provider = GroqProvider(api_key="fake-key", model="llama-3.3-70b-versatile")
    with patch.object(provider, "_client", fake_client):
        chunks = []
        async for chunk in provider.stream_chat(
            messages=[ChatMessage(role="user", content="hi")],
            system="You are helpful.",
        ):
            chunks.append(chunk)

    assert chunks[0] == {"type": "content", "delta": "Hello "}
    assert chunks[1] == {"type": "content", "delta": "world"}
    assert chunks[-1] == {"type": "done"}


@pytest.mark.asyncio
async def test_groq_provider_emits_error_chunk_on_exception():
    """When the SDK raises, the provider emits an error chunk and closes."""
    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(side_effect=RuntimeError("boom"))

    provider = GroqProvider(api_key="fake-key", model="llama-3.3-70b-versatile")
    with patch.object(provider, "_client", fake_client):
        chunks = []
        async for chunk in provider.stream_chat(
            messages=[ChatMessage(role="user", content="hi")],
            system="sys",
        ):
            chunks.append(chunk)

    assert chunks[-1]["type"] == "error"
    assert "boom" in chunks[-1]["message"]


def test_groq_provider_capability_flags():
    p = GroqProvider(api_key="k", model="llama-3.3-70b-versatile")
    assert p.id == "groq"
    assert p.display_name
    assert p.supports_reasoning is False
    assert p.supports_tools is False
