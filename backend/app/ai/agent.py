from langchain_core.messages import SystemMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph, MessagesState
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode

from app.ai.prompts import build_oracle_system_prompt
from app.config import settings


def create_lore_oracle(
    campaign_context: dict,
    tools: list[BaseTool] | None = None,
) -> CompiledStateGraph:
    """Build and compile the Lore Oracle LangGraph agent with ReAct tool calling.

    Args:
        campaign_context: Dict with campaign state (location_name, biome,
            party_level, in_game_time) used to enrich the system prompt.
        tools: Optional list of LangChain tools the agent may call.
            All tools must be read-only DB queries.

    Returns:
        A compiled StateGraph. ChatGroq is instantiated at call time,
        not at module import time, to avoid import-time side effects.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set the GROQ_API_KEY environment variable or add it to .env."
        )

    tools = tools or []

    llm = ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
    )

    if tools:
        llm = llm.bind_tools(tools)

    system_prompt = build_oracle_system_prompt(campaign_context)

    async def oracle_node(state: MessagesState) -> MessagesState:
        """Invoke the LLM with the current message history."""
        messages = state["messages"]
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=system_prompt)] + messages
        response = await llm.ainvoke(messages)
        return {"messages": [response]}

    def should_continue(state: MessagesState) -> str:
        """Route to tool node if the LLM requested tool calls, otherwise end."""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    graph = StateGraph(MessagesState)
    graph.add_node("oracle", oracle_node)

    if tools:
        tool_node = ToolNode(tools)
        graph.add_node("tools", tool_node)
        graph.add_edge(START, "oracle")
        graph.add_conditional_edges(
            "oracle", should_continue, {"tools": "tools", END: END}
        )
        graph.add_edge("tools", "oracle")
    else:
        graph.add_edge(START, "oracle")
        graph.add_edge("oracle", END)

    return graph.compile()
