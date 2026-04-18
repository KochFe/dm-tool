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


CAMPAIGN_WORLD_TASK = "a vivid 2-4 paragraph campaign world/setting description"
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
