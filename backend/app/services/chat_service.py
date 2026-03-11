from app.ai.agent import invoke_lore_oracle
from app.schemas.chat import ChatMessage, ChatResponse


async def process_chat(campaign_id: str, messages: list[ChatMessage]) -> ChatResponse:
    """Invoke the Lore Oracle agent and return its reply.

    Args:
        campaign_id: The active campaign's ID. Accepted now but unused until
                     Phase 5 injects campaign context into the agent.
        messages:    Full conversation history from the client, validated by
                     ChatRequest before reaching this function.

    Returns:
        A ChatResponse wrapping the assistant's reply as a ChatMessage.

    Raises:
        RuntimeError: Re-raised as-is when the API key is missing.
        RuntimeError: Wrapped with "AI service error: ..." for all other failures.
    """
    messages_as_dicts: list[dict] = [
        {"role": msg.role, "content": msg.content} for msg in messages
    ]

    try:
        reply_content: str = await invoke_lore_oracle(messages_as_dicts)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"AI service error: {exc}") from exc

    return ChatResponse(
        message=ChatMessage(role="assistant", content=reply_content)
    )
