LORE_ORACLE_SYSTEM_PROMPT = (
    "You are the Lore Oracle, an ancient and learned sage of the Forgotten Realms "
    "well-versed in Dungeons & Dragons 5th Edition rules, lore, and worldbuilding. "
    "You assist Dungeon Masters during sessions and campaign prep with rules "
    "clarifications, encounter design advice, NPC inspiration, and creative "
    "worldbuilding ideas. Answer concisely and practically, favoring actionable "
    "advice a DM can use at the table."
)


def build_oracle_system_prompt(campaign_context: dict) -> str:
    """Return the Lore Oracle system prompt enriched with live campaign context."""
    location_name = campaign_context.get("location_name")
    biome = campaign_context.get("biome")
    party_level = campaign_context.get("party_level")
    in_game_time = campaign_context.get("in_game_time")

    if location_name and biome:
        location_line = f"- Location: {location_name} ({biome})"
    elif location_name:
        location_line = f"- Location: {location_name}"
    else:
        location_line = "- Location: Unknown (no current location set)"

    context_block = (
        "\n\n## Current Campaign Context\n"
        f"{location_line}\n"
        f"- Party Level: {party_level}\n"
        f"- In-Game Time: {in_game_time}\n"
        "\n"
        "Use the available tools to look up NPCs, quests, party members, and locations when relevant."
    )

    return LORE_ORACLE_SYSTEM_PROMPT + context_block


ENCOUNTER_GENERATOR_PROMPT = (
    "Generate a D&D 5e encounter for a party of level {party_level} characters.\n"
    "Current location: {location_name} ({biome}).\n"
    "Target difficulty: {difficulty}.\n\n"
    "Respond with a JSON object matching this exact structure:\n"
    "{{\n"
    '  "description": "<flavourful scene-setting sentence>",\n'
    '  "monsters": [\n'
    '    {{"name": "<monster name>", "cr": "<cr>", "hp": <int>, "ac": <int>, "count": <int>}}\n'
    "  ],\n"
    '  "tactical_notes": "<brief tactical advice for the DM>",\n'
    '  "difficulty": "{difficulty}"\n'
    "}}\n\n"
    "Scale monster CR and count to the party level. Include 1-4 distinct monster types. "
    "Use monsters that fit the {biome} environment.\n"
    "Be inventive — avoid generic goblin/bandit encounters. "
    "Use surprising creature combinations, unusual terrain features, or unexpected motivations."
)

NPC_GENERATOR_PROMPT = (
    "Generate a D&D 5e NPC for a party of level {party_level} characters.\n"
    "Current location: {location_name} ({biome}).\n"
    "Requested role or archetype: {role}.\n\n"
    "Respond with a JSON object matching this exact structure:\n"
    "{{\n"
    '  "name": "<full name>",\n'
    '  "race": "<D&D 5e race>",\n'
    '  "npc_class": "<class or occupation, or null>",\n'
    '  "description": "<physical appearance in 1-2 sentences>",\n'
    '  "personality": "<personality traits and mannerisms in 1-2 sentences>",\n'
    '  "secrets": "<one secret this NPC holds>",\n'
    '  "motivation": "<what this NPC wants or needs>",\n'
    '  "stats": {{"str": <int>, "dex": <int>, "con": <int>, "int": <int>, "wis": <int>, "cha": <int>}}\n'
    "}}\n\n"
    "Make the NPC feel grounded in the {biome} setting and interesting to roleplay.\n"
    "Be wildly creative — use unusual names, unexpected backgrounds, and distinctive quirks. "
    "Never repeat common fantasy tropes."
)

LOOT_GENERATOR_PROMPT = (
    "Generate a D&D 5e loot collection appropriate for a party of level {party_level} characters.\n"
    "Current location: {location_name} ({biome}).\n"
    "Loot context: {context}.\n\n"
    "Respond with a JSON object matching this exact structure:\n"
    "{{\n"
    '  "items": [\n'
    '    {{\n'
    '      "name": "<item name>",\n'
    '      "description": "<brief description>",\n'
    '      "rarity": "<common|uncommon|rare|very_rare|legendary>",\n'
    '      "value": "<value in gp, sp, or cp>"\n'
    '    }}\n'
    "  ],\n"
    '  "total_value": "<sum of all items in gp>",\n'
    '  "context": "<one sentence describing where this loot was found>"\n'
    "}}\n\n"
    "Include 3-6 items. Scale rarity and gold value to party level {party_level}. "
    "Favour items that fit the {biome} environment and the provided context.\n"
    "Be inventive — avoid plain gold coins or generic potions as the only rewards. "
    "Include at least one item with a flavourful name or unusual property."
)


# ---------------------------------------------------------------------------
# AI Assist prompts (Track 1 — single-shot field generators)
# ---------------------------------------------------------------------------

# All AI assist prompts follow the same structure:
#   1. Context block (campaign tone / party level / etc.)
#   2. Mode instruction (generate-fresh vs. augment-existing)
#   3. User steer
#   4. Regeneration block (if previous_output + feedback present)
#   5. Output schema reminder

_AUGMENT_INSTRUCTION = (
    "The user has already written content for this field. You MUST preserve "
    "what should stay and only augment/revise per their steer. Return the full "
    "new text including preserved portions. Do NOT silently delete content the "
    "user did not ask to remove."
)

_FRESH_INSTRUCTION = (
    "The field is currently empty. Generate content from scratch based on the "
    "user's steer."
)

_REGEN_INSTRUCTION = (
    "Your previous output is included below along with the user's feedback. "
    "Produce a revised version that addresses the feedback. Do not merely "
    "apologize or reference the previous attempt — output the new result only."
)


def build_ai_assist_prompt(
    task_description: str,
    context_block: str,
    steer: str,
    existing_content: str | None,
    previous_output: str | None,
    feedback: str | None,
    output_schema_hint: str,
) -> str:
    """Assemble a single-shot AI assist prompt from its parts.

    task_description: one-line statement of what is being generated, e.g.
        "a 2-3 paragraph campaign world description".
    context_block: pre-formatted campaign/phase/character context.
    output_schema_hint: a reminder of the expected JSON shape for structured output.
    """
    mode = _AUGMENT_INSTRUCTION if existing_content else _FRESH_INSTRUCTION

    parts = [
        f"Task: Generate {task_description}.",
        "",
        context_block,
        "",
        mode,
    ]

    if existing_content:
        parts += ["", "## Existing content", existing_content]

    parts += ["", "## User steer", steer]

    if previous_output and feedback:
        parts += [
            "",
            _REGEN_INSTRUCTION,
            "",
            "## Previous output",
            previous_output,
            "",
            "## User feedback",
            feedback,
        ]

    parts += ["", output_schema_hint]
    return "\n".join(parts)


CAMPAIGN_DESCRIPTION_TASK = (
    "a vivid 2-4 paragraph campaign description covering the central premise, "
    "the player hook (why the party is involved), the core conflict or stakes, "
    "and any recent background that frames the opening. Focus on story, not "
    "world lore — avoid pantheon/geography/setting exposition unless directly "
    "relevant to the hook."
)
PHASE_DESCRIPTION_TASK = (
    "a 2-4 paragraph phase description covering setup, key beats, and the "
    "climax hook, grounded in the campaign tone"
)
PERSONALITY_TASK = (
    "personality traits (2-3 sentences) and a motivation (1-2 sentences) for "
    "this character, consistent with their existing fields"
)

TEXT_SCHEMA_HINT = 'Return JSON: { "text": "<generated text>" }.'
PERSONALITY_SCHEMA_HINT = (
    'Return JSON: { "personality": "<...>", "motivation": "<...>" }.'
)


# ---------------------------------------------------------------------------
# Phase Expander prompts (Track 2 — multi-agent graph)
# ---------------------------------------------------------------------------

# Shared policy injected into every node. The "zero output is valid" clause is
# critical to the additive, steer-driven design (see spec §2).
_EXPANDER_POLICY = (
    "## Policy\n"
    "- The user's steer is authoritative. Only produce what the steer asks for.\n"
    "- Existing entities in the phase/campaign are PRESERVED — never replace "
    "or remove them. You are ADDING to them.\n"
    "- Returning an empty list is valid and expected when the steer does not "
    "request your entity type.\n"
    "- If an existing entity satisfies the steer, reuse it (set reuse_id) "
    "instead of inventing a new one.\n"
)


def _expander_context_block(state: dict) -> str:
    """Build the shared context block shown to every node."""
    prior_phases = "\n".join(
        f"  - {p['title']}: {p['excerpt']}" for p in state.get("prior_phases", [])
    ) or "  (none)"
    existing_locations = "\n".join(
        f"  - {loc['id']}: {loc['name']} ({loc.get('region') or 'no region'})"
        for loc in state.get("existing_locations", [])
    ) or "  (none)"
    existing_npcs = "\n".join(
        f"  - {n['id']}: {n['name']} — {n.get('role') or 'unspecified'}"
        for n in state.get("existing_npcs", [])
    ) or "  (none)"

    return (
        "## Campaign\n"
        f"- Name: {state['campaign_context']['name']}\n"
        f"- Description: {state['campaign_context']['description'] or '(none)'}\n"
        f"- Party level: {state['campaign_context']['party_level']}\n"
        "\n## This phase\n"
        f"- Title: {state['phase_title']}\n"
        f"- Existing description: {state.get('existing_phase_description') or '(none)'}\n"
        "\n## Prior phases\n"
        f"{prior_phases}\n"
        "\n## Locations already in this phase or campaign\n"
        f"{existing_locations}\n"
        "\n## NPCs already in this campaign\n"
        f"{existing_npcs}\n"
        "\n## User steer\n"
        f"{state['user_steer']}\n"
    )


DESCRIBE_PHASE_PROMPT = (
    "You are the Phase Describer in a multi-agent pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Your task\n"
    "Decide whether the user's steer asks you to change the phase description.\n"
    "- If yes: produce the FULL new description (2-4 paragraphs). Preserve the "
    "existing description where appropriate — only augment or revise per the steer.\n"
    "- If no: return null.\n\n"
    'Return JSON: {{ "phase_description": "<full new text or null>" }}'
)

PROPOSE_LOCATIONS_PROMPT = (
    "You are the Location Proposer in a multi-agent pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Current phase description (possibly updated by prior node)\n"
    "{phase_description}\n\n"
    "## Your task\n"
    "Propose only locations the steer explicitly requests. For each:\n"
    "- If the steer matches an existing location listed above, set reuse_id to "
    "that UUID and copy its name/description.\n"
    "- Otherwise, invent a new location with a vivid description.\n"
    "Return [] if the steer does not request any locations.\n\n"
    'Return JSON: {{ "draft_locations": [ {{ "name": ..., "description": ..., '
    '"region": ..., "reuse_id": ... }}, ... ] }}'
)

PROPOSE_NPCS_PROMPT = (
    "You are the NPC Proposer in a multi-agent pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Phase description\n"
    "{phase_description}\n\n"
    "## Locations proposed in this bundle (index -> summary)\n"
    "{draft_locations}\n\n"
    "## Your task\n"
    "Propose only NPCs the steer explicitly requests. For each:\n"
    "- Set location_index to the index in the draft_locations list above if "
    "the NPC belongs in one of those places. Otherwise leave null.\n"
    "- If the steer points at an existing NPC (listed in the campaign NPCs "
    "above), set reuse_id.\n"
    "Return [] if the steer does not request any NPCs.\n\n"
    'Return JSON: {{ "draft_npcs": [ {{ "name": ..., "role": ..., "personality": ..., '
    '"motivation": ..., "location_index": ..., "reuse_id": ... }}, ... ] }}'
)

PROPOSE_QUESTS_PROMPT = (
    "You are the Quest Proposer in a multi-agent pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Phase description\n"
    "{phase_description}\n\n"
    "## Locations proposed in this bundle\n"
    "{draft_locations}\n\n"
    "## NPCs proposed in this bundle\n"
    "{draft_npcs}\n\n"
    "## Your task\n"
    "Propose only quests the steer explicitly requests. Each quest may "
    "reference NPCs and/or locations from this bundle by index.\n"
    "Return [] if the steer does not request any quests.\n\n"
    'Return JSON: {{ "draft_quests": [ {{ "title": ..., "description": ..., '
    '"npc_indices": [...], "location_indices": [...] }}, ... ] }}'
)

CHECK_CONSISTENCY_PROMPT = (
    "You are the Consistency Checker in a multi-agent pipeline.\n\n"
    "Your job is a final sanity pass. Review the proposed bundle for:\n"
    "- NPC.location_index values that reference missing locations\n"
    "- Quest.npc_indices / location_indices that reference missing entries\n"
    "- Contradictions between phase description and proposed entities\n\n"
    "You MAY edit the draft fields to fix these issues. Add a short note "
    "to consistency_notes for each fix or warning.\n"
    "If everything is empty or already consistent, return the bundle "
    "unchanged with consistency_notes = [].\n\n"
    "## Current bundle\n"
    "{bundle_json}\n\n"
    'Return JSON matching the DraftPhaseBundle shape.'
)


def build_expander_policy() -> str:
    return _EXPANDER_POLICY


def build_expander_context(state: dict) -> str:
    return _expander_context_block(state)


# ---------------------------------------------------------------------------
# Phase Prep Sheet prompts (Track 3 — structured prep-sheet generator)
# ---------------------------------------------------------------------------

PHASE_PREP_TASK = (
    "a DM prep sheet for a campaign phase, organized as scannable sections "
    "with short bullet lists. This is read by the DM at the table — it is NOT "
    "read-aloud text for players. Prefer concrete verbs and named specifics "
    "over atmosphere."
)

PHASE_PREP_SCHEMA_HINT = (
    'Return JSON: { "sections": [{ "heading": "<one of: Hook, Key Beats, '
    'DM Secrets, Climax / Exit, Tone & Atmosphere, Complications>", '
    '"bullets": ["<string>", ...] }] }. '
    'Include a section only if you have genuine content for it. '
    'Each section must have at least one bullet (1–6 bullets per section). '
    'Return between 1 and 6 sections total.'
)

PHASE_PREP_RESTRUCTURE_ADDENDUM = (
    "You are RESTRUCTURING the existing description into the section format "
    "above. Preserve concrete facts (names, places, specific events). "
    "Reorganize as sections. Drop filler adjectives and repetition. Add new "
    "beats only if the user's steer asks for them."
)


def build_phase_prep_sections_block() -> str:
    """Return the static section-semantics + bullet-style block for the prep-sheet prompt."""
    return (
        "## Sections (include only those you have real content for — omit the rest)\n"
        "- Hook — how this phase kicks off for the party. 1–2 bullets.\n"
        "- Key Beats — 3–5 bullets, plot points you want to land during this phase, "
        "in roughly the order they'd occur. Each bullet = one concrete event or scene.\n"
        "- DM Secrets — 2–4 bullets of information the players do NOT know yet "
        "(hidden motives, true identities, what's really going on).\n"
        "- Climax / Exit — 1–2 bullets. How the phase ends and what transitions to "
        "the next phase.\n"
        "- Tone & Atmosphere — 1–2 bullets. Tonal notes for the DM (pacing, mood, "
        "recurring imagery). Skip if it doesn't add anything beyond the campaign tone.\n"
        "- Complications — 2–3 bullets. \"If the party does X / if Y goes sideways\" "
        "contingencies.\n"
        "\n"
        "## Bullet style\n"
        "- 1–2 sentences, ~20–40 words per bullet.\n"
        "- Lead with the concrete *what*, then the DM-facing *why it matters* if needed.\n"
        "- Do NOT start every bullet with \"The party...\" — vary sentence openings."
    )


def build_phase_entity_context(phase) -> str:
    """Return the linked-locations + NPCs-at-those-locations block, or ''
    when the phase has no linked locations.

    Arg:
        phase: a CampaignPhase with `.locations` eagerly loaded. Each location
            is expected to have `.npcs` eagerly loaded as well.

    The constraints at the end of the block tell the model it may reference
    these entities by name but must not invent new named entities.
    """
    locations = list(getattr(phase, "locations", []) or [])
    if not locations:
        return ""

    lines = ["## Locations linked to this phase"]
    for loc in locations:
        desc = (loc.description or "").strip().replace("\n", " ")
        short = (desc[:140] + "…") if len(desc) > 140 else desc
        lines.append(f"- {loc.name}: {short or '(no description)'}")

    npc_lines: list[str] = []
    for loc in locations:
        for npc in list(getattr(loc, "npcs", []) or []):
            role = npc.npc_class or "resident"
            desc = (npc.description or "").strip().replace("\n", " ")
            short = (desc[:100] + "…") if len(desc) > 100 else desc
            npc_lines.append(
                f"- {npc.name} ({npc.race}, {role} at {loc.name})"
                + (f": {short}" if short else "")
            )

    if npc_lines:
        lines.append("")
        lines.append("## NPCs at those locations")
        lines.extend(npc_lines)

    lines.append("")
    lines.append(
        "You MAY reference these by name when a bullet naturally belongs there. "
        "You MUST NOT invent new named locations or NPCs. Generic roles are fine "
        "(\"a smuggler contact\", \"a coastal shrine\") when no named entity fits."
    )
    return "\n".join(lines)
