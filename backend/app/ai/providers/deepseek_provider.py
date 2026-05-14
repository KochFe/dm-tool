"""Deepseek provider — uses OpenAI-compatible endpoint at api.deepseek.com.

The `deepseek-reasoner` model emits a `reasoning_content` field alongside
`content` in each streaming delta. We forward them as separate chunk types
so the client can present the reasoning trace in a collapsed block.
"""
import asyncio
import logging
from typing import AsyncIterator

from openai import AsyncOpenAI

from app.ai.providers.base import ChatChunk
from app.config import settings
from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)


class DeepseekProvider:
    """Streaming chat with reasoning trace via Deepseek."""

    id = "deepseek"
    display_name = "Deepseek Reasoner"
    supports_reasoning = True
    supports_tools = False

    def __init__(self, api_key: str, model: str, base_url: str | None = None) -> None:
        self._model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or settings.DEEPSEEK_BASE_URL,
            timeout=60.0,
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
                reasoning = getattr(delta, "reasoning_content", None)
                if reasoning:
                    yield {"type": "reasoning", "delta": reasoning}
                content = getattr(delta, "content", None)
                if content:
                    yield {"type": "content", "delta": content}
            yield {"type": "done"}
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 — SSE contract requires clean close
            logger.exception("DeepseekProvider stream failed")
            yield {"type": "error", "message": str(exc)}
