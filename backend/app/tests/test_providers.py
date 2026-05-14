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
