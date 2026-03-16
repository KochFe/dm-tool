from uuid import UUID

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.ai.agent import create_lore_oracle
from app.ai.prompts import build_oracle_system_prompt
from app.ai.tools import create_campaign_tools
from app.schemas.chat import ChatMessage, ChatResponse


async def process_chat(
    campaign_id: UUID,
    messages: list[ChatMessage],
    campaign_context: dict,
    session_factory: async_sessionmaker,
) -> ChatResponse:
    """Invoke the Lore Oracle agent with campaign context and return its reply.

    Args:
        campaign_id:      UUID of the active campaign, used to scope DB tool queries.
        messages:         Full conversation history from the client, validated by
                          ChatRequest before reaching this function.
        campaign_context: Dict with current campaign state (location_name, biome,
                          party_level, in_game_time) used to enrich the system prompt.
        session_factory:  An async_sessionmaker passed to the campaign tools so each
                          tool can open its own DB session.

    Returns:
        A ChatResponse wrapping the assistant's reply as a ChatMessage.

    Raises:
        RuntimeError: Re-raised as-is when the API key is missing.
        RuntimeError: Wrapped with "AI service error: ..." for all other failures.
    """
    try:
        tools = create_campaign_tools(campaign_id, session_factory)
        graph = create_lore_oracle(campaign_context, tools)

        system_prompt = build_oracle_system_prompt(campaign_context)
        langchain_messages: list = [SystemMessage(content=system_prompt)]
        for msg in messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            else:
                langchain_messages.append(AIMessage(content=msg.content))

        result = await graph.ainvoke({"messages": langchain_messages})
        last_message = result["messages"][-1]
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"AI service error: {exc}") from exc

    return ChatResponse(
        message=ChatMessage(role="assistant", content=last_message.content)
    )
