import logging
from uuid import UUID

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.ai.agent import create_lore_oracle
from app.ai.prompts import build_oracle_system_prompt
from app.ai.tools import create_campaign_tools
from app.schemas.chat import ChatMessage, ChatResponse

logger = logging.getLogger(__name__)

MAX_RETRIES = 1


async def process_chat(
    campaign_id: UUID,
    messages: list[ChatMessage],
    campaign_context: dict,
    session_factory: async_sessionmaker,
) -> ChatResponse:
    """Invoke the Lore Oracle agent with campaign context and return its reply.

    Retries once on tool_use_failed errors, which occur when the LLM generates
    a malformed tool call (a known Groq/LLama intermittent issue).
    """
    tools = create_campaign_tools(campaign_id, session_factory)
    graph = create_lore_oracle(campaign_context, tools)

    system_prompt = build_oracle_system_prompt(campaign_context)
    langchain_messages: list = [SystemMessage(content=system_prompt)]
    for msg in messages:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        else:
            langchain_messages.append(AIMessage(content=msg.content))

    last_exc = None
    for attempt in range(1 + MAX_RETRIES):
        try:
            result = await graph.ainvoke({"messages": langchain_messages})
            last_message = result["messages"][-1]
            return ChatResponse(
                message=ChatMessage(role="assistant", content=last_message.content)
            )
        except RuntimeError:
            raise
        except Exception as exc:
            last_exc = exc
            if "tool_use_failed" in str(exc) and attempt < MAX_RETRIES:
                logger.warning("Tool call failed (attempt %d), retrying: %s", attempt + 1, exc)
                continue
            raise RuntimeError(f"AI service error: {exc}") from exc

    raise RuntimeError(f"AI service error: {last_exc}") from last_exc
