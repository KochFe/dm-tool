"""General chat service — orchestrates provider streaming into SSE frames."""
import json
import logging
from typing import AsyncIterator

from app.ai.providers import registry
from app.ai.providers.base import ChatChunk, ProviderNotConfigured
from app.ai.prompts import build_general_system_prompt
from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)


def _sse_frame(chunk: ChatChunk) -> bytes:
    """Encode a ChatChunk as a single SSE data frame."""
    return f"data: {json.dumps(chunk)}\n\n".encode("utf-8")


async def stream_general_chat(
    *,
    provider_id: str,
    messages: list[ChatMessage],
    context: dict | None,
) -> AsyncIterator[bytes]:
    """Yield SSE-encoded chunks from the requested provider.

    Caller must validate the provider before constructing this generator
    (see _check_provider in the router) — once StreamingResponse is returned,
    a pre-stream 503 is impossible because the generator body does not execute
    until SSE consumption begins.
    """
    provider = registry.get_provider(provider_id)
    system = build_general_system_prompt(context)
    async for chunk in provider.stream_chat(messages=messages, system=system):
        yield _sse_frame(chunk)


def is_provider_configured(provider_id: str) -> bool:
    try:
        registry.get_provider(provider_id)
        return True
    except (ProviderNotConfigured, ValueError):
        return False
