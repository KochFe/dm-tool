"""Session recap streaming service (Phase 16).

Routes through the LLMProvider seam (see [[ai-providers]]) — read-only
summarization, no tool calls, no DB writes.
"""
import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import registry
from app.ai.providers.base import ChatChunk
from app.ai.prompts import de as prompts_de, en as prompts_en
from app.schemas.chat import ChatMessage
from app.schemas.language import Language
from app.services import campaign_session_notes_service as notes_svc

logger = logging.getLogger(__name__)


class NoClosedEntriesError(Exception):
    """Raised pre-stream when there are no closed entries to recap."""


def _sse_frame(chunk: ChatChunk) -> bytes:
    return f"data: {json.dumps(chunk)}\n\n".encode("utf-8")


async def stream_recap(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    *,
    provider_id: str,
    last_n: int | None,
    entry_ids: Iterable[uuid.UUID] | None,
    language: Language,
) -> AsyncIterator[bytes]:
    """Yield SSE-encoded ChatChunks for a recap of the requested closed entries.

    Pre-stream errors (no closed entries, unknown provider, unconfigured key)
    must surface via raises before the StreamingResponse opens.
    """
    entries = await notes_svc.resolve_entries_for_recap(
        db, campaign_id, last_n=last_n, entry_ids=entry_ids
    )
    if not entries:
        raise NoClosedEntriesError("No closed session notes to recap")

    prompt_mod = prompts_en if language == Language.EN else prompts_de
    system = prompt_mod.SESSION_RECAP_SYSTEM_PROMPT
    user_text = prompt_mod.build_session_recap_user_message(
        n=len(entries),
        notes_block=notes_svc.render_notes_block(entries),
    )
    messages = [ChatMessage(role="user", content=user_text)]

    provider = registry.get_provider(provider_id)
    async for chunk in provider.stream_chat(messages=messages, system=system):
        yield _sse_frame(chunk)
