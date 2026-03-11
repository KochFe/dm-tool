from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph, MessagesState

from app.ai.prompts import LORE_ORACLE_SYSTEM_PROMPT
from app.config import settings


def create_lore_oracle() -> StateGraph:
    """Build and compile the Lore Oracle LangGraph agent.

    Returns a compiled StateGraph. ChatGroq is instantiated at call time,
    not at module import time, to avoid import-time side effects.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set the GROQ_API_KEY environment variable or add it to .env."
        )

    llm = ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
    )

    async def oracle_node(state: MessagesState) -> MessagesState:
        """Invoke the LLM with the current message history."""
        response = await llm.ainvoke(state["messages"])
        return {"messages": [response]}

    graph = StateGraph(MessagesState)
    graph.add_node("oracle", oracle_node)
    graph.add_edge(START, "oracle")
    graph.add_edge("oracle", END)

    return graph.compile()


async def invoke_lore_oracle(messages: list[dict]) -> str:
    """Run the Lore Oracle agent on a conversation history.

    Args:
        messages: List of dicts with ``role`` ("user" or "assistant")
                  and ``content`` (str) keys.

    Returns:
        The assistant's response content as a string.
    """
    graph = create_lore_oracle()

    langchain_messages: list[SystemMessage | HumanMessage | AIMessage] = [
        SystemMessage(content=LORE_ORACLE_SYSTEM_PROMPT),
    ]

    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        if role == "user":
            langchain_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            langchain_messages.append(AIMessage(content=content))

    result = await graph.ainvoke({"messages": langchain_messages})

    last_message = result["messages"][-1]
    return last_message.content
