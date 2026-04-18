"""Phase Expander: linear 5-node LangGraph pipeline.

Nodes are isolated async functions that each take the full state and return
a partial-state update. They do NOT access the DB — context is preloaded
by phase_expander_service before graph invocation.
"""
import json
from typing import Any, TypedDict

from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel

from app.ai.prompts import (
    CHECK_CONSISTENCY_PROMPT,
    DESCRIBE_PHASE_PROMPT,
    PROPOSE_LOCATIONS_PROMPT,
    PROPOSE_NPCS_PROMPT,
    PROPOSE_QUESTS_PROMPT,
    build_expander_context,
    build_expander_policy,
)
from app.config import settings
from app.schemas.phase_expander import (
    DraftLocation,
    DraftNpc,
    DraftPhaseBundle,
    DraftQuest,
)


class PhaseExpanderState(TypedDict, total=False):
    # Inputs (set once by the service before invocation)
    phase_id: Any
    phase_title: str
    user_steer: str
    campaign_context: dict
    prior_phases: list[dict]
    existing_phase_description: str | None
    existing_locations: list[dict]
    existing_npcs: list[dict]

    # Progressive outputs
    phase_description: str | None
    draft_locations: list[DraftLocation]
    draft_npcs: list[DraftNpc]
    draft_quests: list[DraftQuest]
    consistency_notes: list[str]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_llm(temperature: float = 1.0) -> ChatGroq:
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set the GROQ_API_KEY environment variable or add it to .env."
        )
    return ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
        temperature=temperature,
    )


async def _call_structured(prompt: str, schema: type[BaseModel]) -> BaseModel:
    """Invoke LLM with structured output; retry once on failure."""
    llm = _get_llm()
    structured = llm.with_structured_output(schema)
    try:
        return await structured.ainvoke(prompt)
    except Exception:
        try:
            return await structured.ainvoke(prompt)
        except Exception as exc:
            raise RuntimeError("AI generation failed — please try again") from exc


# ---------------------------------------------------------------------------
# Node-local schemas (what each node returns from structured output)
# ---------------------------------------------------------------------------


class _DescribeOut(BaseModel):
    phase_description: str | None = None


class _LocationsOut(BaseModel):
    draft_locations: list[DraftLocation] = []


class _NpcsOut(BaseModel):
    draft_npcs: list[DraftNpc] = []


class _QuestsOut(BaseModel):
    draft_quests: list[DraftQuest] = []


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


async def describe_phase_node(state: PhaseExpanderState) -> dict:
    prompt = DESCRIBE_PHASE_PROMPT.format(
        policy=build_expander_policy(),
        context=build_expander_context(state),
    )
    out: _DescribeOut = await _call_structured(prompt, _DescribeOut)
    return {"phase_description": out.phase_description}


async def propose_locations_node(state: PhaseExpanderState) -> dict:
    prompt = PROPOSE_LOCATIONS_PROMPT.format(
        policy=build_expander_policy(),
        context=build_expander_context(state),
        phase_description=state.get("phase_description") or "(unchanged)",
    )
    out: _LocationsOut = await _call_structured(prompt, _LocationsOut)
    return {"draft_locations": out.draft_locations}


async def propose_npcs_node(state: PhaseExpanderState) -> dict:
    drafts = state.get("draft_locations") or []
    draft_loc_block = "\n".join(
        f"  {i}: {loc.name} — {loc.description[:60]}" for i, loc in enumerate(drafts)
    ) or "  (none)"

    prompt = PROPOSE_NPCS_PROMPT.format(
        policy=build_expander_policy(),
        context=build_expander_context(state),
        phase_description=state.get("phase_description") or "(unchanged)",
        draft_locations=draft_loc_block,
    )
    out: _NpcsOut = await _call_structured(prompt, _NpcsOut)
    return {"draft_npcs": out.draft_npcs}


async def propose_quests_node(state: PhaseExpanderState) -> dict:
    drafts_l = state.get("draft_locations") or []
    drafts_n = state.get("draft_npcs") or []
    draft_loc_block = "\n".join(
        f"  {i}: {loc.name}" for i, loc in enumerate(drafts_l)
    ) or "  (none)"
    draft_npc_block = "\n".join(
        f"  {i}: {npc.name} ({npc.role})" for i, npc in enumerate(drafts_n)
    ) or "  (none)"

    prompt = PROPOSE_QUESTS_PROMPT.format(
        policy=build_expander_policy(),
        context=build_expander_context(state),
        phase_description=state.get("phase_description") or "(unchanged)",
        draft_locations=draft_loc_block,
        draft_npcs=draft_npc_block,
    )
    out: _QuestsOut = await _call_structured(prompt, _QuestsOut)
    return {"draft_quests": out.draft_quests}


async def check_consistency_node(state: PhaseExpanderState) -> dict:
    current = DraftPhaseBundle(
        phase_description=state.get("phase_description"),
        draft_locations=state.get("draft_locations") or [],
        draft_npcs=state.get("draft_npcs") or [],
        draft_quests=state.get("draft_quests") or [],
        consistency_notes=[],
    )
    bundle_json = json.dumps(current.model_dump(mode="json"), indent=2, default=str)

    prompt = CHECK_CONSISTENCY_PROMPT.format(bundle_json=bundle_json)
    out: DraftPhaseBundle = await _call_structured(prompt, DraftPhaseBundle)
    return {
        "phase_description": out.phase_description,
        "draft_locations": out.draft_locations,
        "draft_npcs": out.draft_npcs,
        "draft_quests": out.draft_quests,
        "consistency_notes": out.consistency_notes,
    }


# ---------------------------------------------------------------------------
# Compile
# ---------------------------------------------------------------------------


def compile_phase_expander_graph() -> CompiledStateGraph:
    """Build and compile the linear 5-node expander graph."""
    graph = StateGraph(PhaseExpanderState)
    graph.add_node("describe", describe_phase_node)
    graph.add_node("locations", propose_locations_node)
    graph.add_node("npcs", propose_npcs_node)
    graph.add_node("quests", propose_quests_node)
    graph.add_node("consistency", check_consistency_node)

    graph.add_edge(START, "describe")
    graph.add_edge("describe", "locations")
    graph.add_edge("locations", "npcs")
    graph.add_edge("npcs", "quests")
    graph.add_edge("quests", "consistency")
    graph.add_edge("consistency", END)

    return graph.compile()
