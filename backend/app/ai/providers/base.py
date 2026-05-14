"""LLMProvider protocol and shared types for the new multi-provider chat layer.

This module is intentionally light. The protocol covers only the portable
surface (streaming chat without tools). Tool-bound usage stays in agent.py
for now — see ADR 011 for the rationale.
"""
from typing import AsyncIterator, Literal, NotRequired, Protocol, TypedDict, runtime_checkable

from app.schemas.chat import ChatMessage


class ChatChunk(TypedDict, total=False):
    """One streamed event from a provider.

    - `reasoning` and `content` carry an incremental `delta` string.
    - `done` signals normal end of stream.
    - `error` carries a `message` and is the last chunk before close.
    """
    type: Literal["reasoning", "content", "done", "error"]
    delta: NotRequired[str]
    message: NotRequired[str]


class ProviderNotConfigured(RuntimeError):
    """Raised when a requested provider has no API key configured.

    The router maps this to HTTP 503 before the stream opens.
    """
    def __init__(self, provider_id: str) -> None:
        super().__init__(f"Provider '{provider_id}' is not configured")
        self.provider_id = provider_id


@runtime_checkable
class LLMProvider(Protocol):
    """Streaming chat provider. Implementations live in this package."""

    id: str
    display_name: str
    supports_reasoning: bool
    supports_tools: bool

    def stream_chat(
        self,
        messages: list[ChatMessage],
        system: str,
    ) -> AsyncIterator[ChatChunk]:
        """Async-generator returning chunks; never raises mid-stream."""
        ...
