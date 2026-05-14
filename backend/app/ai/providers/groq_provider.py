"""Groq provider — uses OpenAI-compatible endpoint at api.groq.com.

Streams `content` chunks only; Groq's Llama 3.3 does not emit reasoning.
"""
import asyncio
import logging
from typing import AsyncIterator

from openai import AsyncOpenAI

from app.ai.providers.base import ChatChunk
from app.config import settings
from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)


class GroqProvider:
    """Streaming chat via Groq's OpenAI-compatible API."""

    id = "groq"
    display_name = "Groq Llama 3.3 (general chat)"
    supports_reasoning = False
    supports_tools = False

    def __init__(self, api_key: str, model: str, base_url: str | None = None) -> None:
        self._model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or settings.GROQ_BASE_URL,
        )

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        system: str,
    ) -> AsyncIterator[ChatChunk]:
        payload = [{"role": "system", "content": system}]
        payload.extend({"role": m.role, "content": m.content} for m in messages)

        try:
            stream = await self._client.chat.completions.create(
                model=self._model,
                messages=payload,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    yield {"type": "content", "delta": content}
            yield {"type": "done"}
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 — SSE contract requires clean close
            logger.exception("GroqProvider stream failed")
            yield {"type": "error", "message": str(exc)}
