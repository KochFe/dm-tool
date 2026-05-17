"""German prompt catalogue.

Mirrors en.py 1:1 in public symbol names and signatures. The parity test in
test_prompt_registry.py enforces this — any new public name added to en.py
must be added here too.

D&D rules terminology (Hit Points, AC, Wizard, Spell Save DC, monster names,
class names, spell names, Initiative, Saving Throw) STAYS IN ENGLISH per
spec decision 7. The German prose frames those English terms.
"""

_GERMAN_DND_TERM_INSTRUCTION = (
    "Verwende englische D&D-Begriffe (Hit Points, AC, Wizard, Spell Save DC, "
    "Monster-, Klassen- und Zaubernamen). Übersetze Regelterminologie nicht."
)


LORE_ORACLE_SYSTEM_PROMPT = (
    "Du bist das Lore Oracle, ein uralter und gelehrter Weiser der Forgotten "
    "Realms, bewandert in den Regeln, der Lore und dem Worldbuilding von "
    "Dungeons & Dragons 5th Edition. Du unterstützt Dungeon Master während "
    "der Sessions und bei der Kampagnenvorbereitung mit Regelklarstellungen, "
    "Encounter-Design-Tipps, NPC-Inspiration und kreativen Worldbuilding-"
    "Ideen. Antworte knapp und praxisnah — bevorzuge handlungsfähige "
    "Hinweise, die ein DM direkt am Tisch nutzen kann.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
)


def build_oracle_system_prompt(campaign_context: dict) -> str:
    """German variant of the Lore Oracle system prompt with live campaign context."""
    location_name = campaign_context.get("location_name")
    biome = campaign_context.get("biome")
    party_level = campaign_context.get("party_level")
    in_game_time = campaign_context.get("in_game_time")

    if location_name and biome:
        location_line = f"- Ort: {location_name} ({biome})"
    elif location_name:
        location_line = f"- Ort: {location_name}"
    else:
        location_line = "- Ort: Unbekannt (kein aktueller Ort gesetzt)"

    context_block = (
        "\n\n## Aktueller Kampagnenkontext\n"
        f"{location_line}\n"
        f"- Party Level: {party_level}\n"
        f"- Spielzeit: {in_game_time}\n"
        "\n"
        "Nutze die verfügbaren Tools, um NPCs, Quests, Party-Mitglieder und "
        "Orte nachzuschlagen, wenn relevant."
    )

    return LORE_ORACLE_SYSTEM_PROMPT + context_block


ENCOUNTER_GENERATOR_PROMPT = (
    "Erzeuge ein D&D-5e-Encounter für eine Gruppe von Charakteren auf Level "
    "{party_level}.\n"
    "Aktueller Ort: {location_name} ({biome}).\n"
    "Ziel-Difficulty: {difficulty}.\n\n"
    "Antworte mit einem JSON-Objekt, das exakt dieser Struktur entspricht:\n"
    "{{\n"
    '  "description": "<atmosphärischer Einleitungssatz>",\n'
    '  "monsters": [\n'
    '    {{"name": "<monster name>", "cr": "<cr>", "hp": <int>, "ac": <int>, "count": <int>}}\n'
    "  ],\n"
    '  "tactical_notes": "<kurze taktische Hinweise für den DM>",\n'
    '  "difficulty": "{difficulty}"\n'
    "}}\n\n"
    "Skaliere Monster-CR und Anzahl an das Party Level. Verwende 1–4 "
    "verschiedene Monstertypen, die in die {biome}-Umgebung passen.\n"
    "Sei einfallsreich — vermeide generische Goblin-/Banditen-Encounter. "
    "Setze überraschende Kreaturenkombinationen, ungewöhnliche Geländemerkmale "
    "oder unerwartete Motive ein.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
)

NPC_GENERATOR_PROMPT = (
    "Erzeuge einen D&D-5e-NPC für eine Gruppe von Charakteren auf Level "
    "{party_level}.\n"
    "Aktueller Ort: {location_name} ({biome}).\n"
    "Gewünschte Rolle oder Archetyp: {role}.\n\n"
    "Antworte mit einem JSON-Objekt, das exakt dieser Struktur entspricht:\n"
    "{{\n"
    '  "name": "<vollständiger Name>",\n'
    '  "race": "<D&D 5e race>",\n'
    '  "npc_class": "<class or occupation, or null>",\n'
    '  "description": "<äußere Erscheinung in 1–2 Sätzen>",\n'
    '  "personality": "<Persönlichkeitszüge und Manierismen in 1–2 Sätzen>",\n'
    '  "secrets": "<ein Geheimnis, das dieser NPC hütet>",\n'
    '  "motivation": "<was dieser NPC will oder braucht>",\n'
    '  "stats": {{"str": <int>, "dex": <int>, "con": <int>, "int": <int>, "wis": <int>, "cha": <int>}}\n'
    "}}\n\n"
    "Verankere den NPC im {biome}-Setting und mach ihn interessant zum "
    "Ausspielen.\n"
    "Sei ungewöhnlich kreativ — verwende ungewöhnliche Namen, unerwartete "
    "Hintergründe und markante Eigenheiten. Wiederhole keine abgegriffenen "
    "Fantasy-Klischees.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
)

from app.schemas.generators import LootAmount, LootTier

TIER_GUIDANCE_DE: dict[LootTier, str] = {
    LootTier.mundane: (
        "Der Loot ist alltäglich — ausschließlich Common-Gegenstände, geringer "
        "Geldwert, überwiegend praktische Gebrauchsgegenstände. Keine magischen Items."
    ),
    LootTier.standard: (
        "Der Loot ist solide — überwiegend Common mit ein bis zwei Uncommon-Items, "
        "Wert passend zum Party Level."
    ),
    LootTier.valuable: (
        "Der Loot ist wertvoll — Uncommon- bis Rare-Items, mindestens ein Rare-Item, "
        "Goldwert über dem Party-Level-Durchschnitt."
    ),
    LootTier.legendary: (
        "Der Loot ist legendär — mindestens ein Very-Rare- oder Legendary-Item, "
        "der Rest Rare oder Uncommon, herausragender Goldwert. Behandle ihn als "
        "Höhepunkt einer großen Begegnung."
    ),
}

AMOUNT_RANGE_DE: dict[LootAmount, str] = {
    LootAmount.few: "Inkludiere 1–2 Gegenstände.",
    LootAmount.some: "Inkludiere 3–4 Gegenstände.",
    LootAmount.several: "Inkludiere 5–7 Gegenstände.",
    LootAmount.hoard: "Inkludiere 8–12 Gegenstände.",
}

LOOT_GENERATOR_PROMPT = (
    "Erzeuge eine D&D-5e-Loot-Sammlung passend für eine Gruppe auf Level "
    "{party_level}.\n"
    "Aktueller Ort: {location_name} ({biome}).\n"
    "Loot-Kontext: {context}.\n\n"
    "Antworte mit einem JSON-Objekt, das exakt dieser Struktur entspricht:\n"
    "{{\n"
    '  "items": [\n'
    '    {{\n'
    '      "name": "<item name>",\n'
    '      "description": "<kurze Beschreibung>",\n'
    '      "rarity": "<common|uncommon|rare|very_rare|legendary>",\n'
    '      "value": "<Wert in gp, sp oder cp>"\n'
    '    }}\n'
    "  ],\n"
    '  "total_value": "<Summe aller Gegenstände in gp>",\n'
    '  "context": "<ein Satz, wo dieser Loot gefunden wurde>"\n'
    "}}\n\n"
    "Inkludiere 3–6 Items. Skaliere Rarity und Goldwert ans Party Level "
    "{party_level}. Bevorzuge Gegenstände, die zur {biome}-Umgebung und zum "
    "angegebenen Kontext passen.\n"
    "Sei einfallsreich — vermeide reine Goldmünzen oder generische Tränke "
    "als einzige Belohnung. Inkludiere mindestens einen Gegenstand mit "
    "stimmungsvollem Namen oder ungewöhnlicher Eigenschaft.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
)


# ---------------------------------------------------------------------------
# AI Assist prompts (Track 1 — single-shot field generators)
# ---------------------------------------------------------------------------

_AUGMENT_INSTRUCTION = (
    "Der User hat bereits Inhalt für dieses Feld geschrieben. Du MUSST "
    "erhalten, was bleiben soll, und nur gemäß seinem Steer ergänzen oder "
    "überarbeiten. Gib den vollständigen neuen Text zurück, inklusive der "
    "übernommenen Teile. Lösche NICHT stillschweigend Inhalt, den der User "
    "nicht zur Entfernung markiert hat."
)

_FRESH_INSTRUCTION = (
    "Das Feld ist derzeit leer. Erzeuge Inhalt von Grund auf basierend auf "
    "dem Steer des Users."
)

_REGEN_INSTRUCTION = (
    "Deine vorige Ausgabe steht unten zusammen mit dem Feedback des Users. "
    "Erzeuge eine überarbeitete Version, die das Feedback adressiert. "
    "Entschuldige dich nicht und verweise nicht auf den vorigen Versuch — "
    "gib nur das neue Ergebnis aus."
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
    """Assemble a single-shot AI assist prompt from its parts (German)."""
    mode = _AUGMENT_INSTRUCTION if existing_content else _FRESH_INSTRUCTION

    parts = [
        f"Aufgabe: Erzeuge {task_description}.",
        "",
        context_block,
        "",
        mode,
    ]

    if existing_content:
        parts += ["", "## Bestehender Inhalt", existing_content]

    parts += ["", "## User-Steer", steer]

    if previous_output and feedback:
        parts += [
            "",
            _REGEN_INSTRUCTION,
            "",
            "## Vorige Ausgabe",
            previous_output,
            "",
            "## User-Feedback",
            feedback,
        ]

    parts += ["", output_schema_hint]
    return "\n".join(parts)


CAMPAIGN_DESCRIPTION_TASK = (
    "eine lebendige Kampagnenbeschreibung von 2–4 Absätzen, die die zentrale "
    "Prämisse, den Player Hook (warum die Party involviert ist), den "
    "Hauptkonflikt bzw. die Einsätze und einen aktuellen Hintergrund umfasst, "
    "der den Auftakt rahmt. Fokussiere auf Geschichte, nicht auf "
    "Welt-Lore — vermeide Pantheon-/Geografie-/Setting-Exposition, sofern "
    "nicht direkt für den Hook relevant. "
    + _GERMAN_DND_TERM_INSTRUCTION
)
PHASE_DESCRIPTION_TASK = (
    "eine Phasenbeschreibung von 2–4 Absätzen mit Setup, Key Beats und "
    "Climax-Hook, verankert im Ton der Kampagne. "
    + _GERMAN_DND_TERM_INSTRUCTION
)
PERSONALITY_TASK = (
    "Persönlichkeitszüge (2–3 Sätze) und eine Motivation (1–2 Sätze) für "
    "diesen Charakter, konsistent mit den bestehenden Feldern. "
    + _GERMAN_DND_TERM_INSTRUCTION
)

TEXT_SCHEMA_HINT = 'Gib JSON zurück: { "text": "<erzeugter Text>" }.'
PERSONALITY_SCHEMA_HINT = (
    'Gib JSON zurück: { "personality": "<...>", "motivation": "<...>" }.'
)


# ---------------------------------------------------------------------------
# Phase Expander prompts (Track 2 — multi-agent graph)
# ---------------------------------------------------------------------------

_EXPANDER_POLICY = (
    "## Policy\n"
    "- Der Steer des Users ist maßgeblich. Erzeuge nur, was der Steer "
    "verlangt.\n"
    "- Bestehende Entitäten in der Phase/Kampagne werden BEWAHRT — ersetze "
    "oder entferne sie nie. Du fügst HINZU.\n"
    "- Eine leere Liste zurückzugeben ist gültig und erwartet, wenn der "
    "Steer deinen Entitätstyp nicht anfordert.\n"
    "- Wenn eine bestehende Entität den Steer erfüllt, verwende sie wieder "
    "(setze reuse_id), statt eine neue zu erfinden.\n"
)


def _expander_context_block(state: dict) -> str:
    """Build the shared German context block shown to every node."""
    prior_phases = "\n".join(
        f"  - {p['title']}: {p['excerpt']}" for p in state.get("prior_phases", [])
    ) or "  (keine)"
    existing_locations = "\n".join(
        f"  - {loc['id']}: {loc['name']} ({loc.get('region') or 'keine Region'})"
        for loc in state.get("existing_locations", [])
    ) or "  (keine)"
    existing_npcs = "\n".join(
        f"  - {n['id']}: {n['name']} — {n.get('role') or 'unspezifiziert'}"
        for n in state.get("existing_npcs", [])
    ) or "  (keine)"

    return (
        "## Kampagne\n"
        f"- Name: {state['campaign_context']['name']}\n"
        f"- Beschreibung: {state['campaign_context']['description'] or '(keine)'}\n"
        f"- Party Level: {state['campaign_context']['party_level']}\n"
        "\n## Diese Phase\n"
        f"- Titel: {state['phase_title']}\n"
        f"- Bestehende Beschreibung: {state.get('existing_phase_description') or '(keine)'}\n"
        "\n## Vorherige Phasen\n"
        f"{prior_phases}\n"
        "\n## Orte bereits in dieser Phase oder Kampagne\n"
        f"{existing_locations}\n"
        "\n## NPCs bereits in dieser Kampagne\n"
        f"{existing_npcs}\n"
        "\n## User-Steer\n"
        f"{state['user_steer']}\n"
    )


DESCRIBE_PHASE_PROMPT = (
    "Du bist der Phase Describer in einer Multi-Agent-Pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Deine Aufgabe\n"
    "Entscheide, ob der User-Steer eine Änderung der Phasenbeschreibung "
    "verlangt.\n"
    "- Wenn ja: produziere die VOLLSTÄNDIGE neue Beschreibung (2–4 Absätze). "
    "Bewahre die bestehende Beschreibung, wo angemessen — ergänze oder "
    "überarbeite nur gemäß Steer.\n"
    "- Wenn nein: gib null zurück.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
    + "\n\n"
    'Gib JSON zurück: {{ "phase_description": "<voller neuer Text oder null>" }}'
)

PROPOSE_LOCATIONS_PROMPT = (
    "Du bist der Location Proposer in einer Multi-Agent-Pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Aktuelle Phasenbeschreibung (ggf. von einem vorigen Knoten aktualisiert)\n"
    "{phase_description}\n\n"
    "## Deine Aufgabe\n"
    "Schlage nur Orte vor, die der Steer ausdrücklich verlangt. Für jeden:\n"
    "- Wenn der Steer einen oben gelisteten existierenden Ort meint, setze "
    "reuse_id auf dessen UUID und übernimm Name/Beschreibung.\n"
    "- Andernfalls erfinde einen neuen Ort mit lebendiger Beschreibung.\n"
    "Gib [] zurück, wenn der Steer keine Orte verlangt.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
    + "\n\n"
    'Gib JSON zurück: {{ "draft_locations": [ {{ "name": ..., "description": ..., '
    '"region": ..., "reuse_id": ... }}, ... ] }}'
)

PROPOSE_NPCS_PROMPT = (
    "Du bist der NPC Proposer in einer Multi-Agent-Pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Phasenbeschreibung\n"
    "{phase_description}\n\n"
    "## In diesem Bundle vorgeschlagene Orte (Index -> Zusammenfassung)\n"
    "{draft_locations}\n\n"
    "## Deine Aufgabe\n"
    "Schlage nur NPCs vor, die der Steer ausdrücklich verlangt. Für jeden:\n"
    "- Setze location_index auf den Index in der draft_locations-Liste oben, "
    "wenn der NPC zu einem dieser Orte gehört. Sonst null lassen.\n"
    "- Wenn der Steer auf einen bestehenden NPC zeigt (oben in den "
    "Kampagnen-NPCs gelistet), setze reuse_id.\n"
    "Gib [] zurück, wenn der Steer keine NPCs verlangt.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
    + "\n\n"
    'Gib JSON zurück: {{ "draft_npcs": [ {{ "name": ..., "role": ..., "personality": ..., '
    '"motivation": ..., "location_index": ..., "reuse_id": ... }}, ... ] }}'
)

PROPOSE_QUESTS_PROMPT = (
    "Du bist der Quest Proposer in einer Multi-Agent-Pipeline.\n\n"
    "{policy}\n\n"
    "{context}\n\n"
    "## Phasenbeschreibung\n"
    "{phase_description}\n\n"
    "## In diesem Bundle vorgeschlagene Orte\n"
    "{draft_locations}\n\n"
    "## In diesem Bundle vorgeschlagene NPCs\n"
    "{draft_npcs}\n\n"
    "## Deine Aufgabe\n"
    "Schlage nur Quests vor, die der Steer ausdrücklich verlangt. Jede "
    "Quest darf NPCs und/oder Orte aus diesem Bundle per Index "
    "referenzieren.\n"
    "Gib [] zurück, wenn der Steer keine Quests verlangt.\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
    + "\n\n"
    'Gib JSON zurück: {{ "draft_quests": [ {{ "title": ..., "description": ..., '
    '"npc_indices": [...], "location_indices": [...] }}, ... ] }}'
)

CHECK_CONSISTENCY_PROMPT = (
    "Du bist der Consistency Checker in einer Multi-Agent-Pipeline.\n\n"
    "Deine Aufgabe ist ein abschließender Sanity-Check. Prüfe das "
    "vorgeschlagene Bundle auf:\n"
    "- NPC.location_index-Werte, die fehlende Orte referenzieren\n"
    "- Quest.npc_indices / location_indices, die fehlende Einträge "
    "referenzieren\n"
    "- Widersprüche zwischen Phasenbeschreibung und vorgeschlagenen "
    "Entitäten\n\n"
    "Du DARFST die Draft-Felder bearbeiten, um diese Probleme zu beheben. "
    "Hänge eine kurze Notiz an consistency_notes für jede Korrektur oder "
    "Warnung.\n"
    "Wenn alles leer oder bereits konsistent ist, gib das Bundle "
    "unverändert zurück mit consistency_notes = [].\n\n"
    + _GERMAN_DND_TERM_INSTRUCTION
    + "\n\n"
    "## Aktuelles Bundle\n"
    "{bundle_json}\n\n"
    "Gib JSON passend zur DraftPhaseBundle-Form zurück."
)


def build_expander_policy() -> str:
    return _EXPANDER_POLICY


def build_expander_context(state: dict) -> str:
    return _expander_context_block(state)


# ---------------------------------------------------------------------------
# Phase Prep Sheet prompts (Track 3 — structured prep-sheet generator)
# ---------------------------------------------------------------------------

PHASE_PREP_TASK = (
    "ein DM-Prep-Sheet für eine Kampagnenphase, organisiert als überfliegbare "
    "Sections mit kurzen Bullet-Listen. Das liest der DM am Tisch — es ist "
    "KEIN Vorlesetext für die Spieler. Bevorzuge konkrete Verben und "
    "namentliche Spezifika über Atmosphäre. "
    + _GERMAN_DND_TERM_INSTRUCTION
)

# IMPORTANT: the heading enum values stay English — the Pydantic
# PhasePrepSection.heading literal in app/schemas/ai_assist.py validates
# against these exact strings. Translating them breaks validation.
PHASE_PREP_SCHEMA_HINT = (
    'Gib JSON zurück: { "sections": [{ "heading": "<eines von: Hook, Key Beats, '
    'DM Secrets, Climax / Exit, Tone & Atmosphere, Complications>", '
    '"bullets": ["<string>", ...] }] }. '
    'Inkludiere eine Section nur, wenn du echten Inhalt dafür hast. '
    'Jede Section muss mindestens einen Bullet haben (1–6 Bullets pro Section). '
    'Gib zwischen 1 und 6 Sections insgesamt zurück.'
)

PHASE_PREP_RESTRUCTURE_ADDENDUM = (
    "Du STRUKTURIERST die bestehende Beschreibung in das obige Section-Format "
    "UM. Bewahre konkrete Fakten (Namen, Orte, spezifische Ereignisse). "
    "Reorganisiere als Sections. Streiche Füll-Adjektive und Wiederholungen. "
    "Füge neue Beats nur hinzu, wenn der User-Steer das verlangt."
)


def build_phase_prep_sections_block() -> str:
    """Return the static section-semantics + bullet-style block for the German prep-sheet prompt."""
    return (
        "## Sections (inkludiere nur jene, für die du echten Inhalt hast — den Rest weglassen)\n"
        "- Hook — wie diese Phase für die Party startet. 1–2 Bullets.\n"
        "- Key Beats — 3–5 Bullets, Plot-Punkte, die du in dieser Phase "
        "landen willst, etwa in der Reihenfolge ihres Auftretens. Jeder "
        "Bullet = ein konkretes Ereignis oder eine Szene.\n"
        "- DM Secrets — 2–4 Bullets mit Informationen, die die Spieler noch "
        "NICHT wissen (verborgene Motive, wahre Identitäten, was wirklich vorgeht).\n"
        "- Climax / Exit — 1–2 Bullets. Wie die Phase endet und was zur "
        "nächsten überleitet.\n"
        "- Tone & Atmosphere — 1–2 Bullets. Tonale Notizen für den DM "
        "(Pacing, Stimmung, wiederkehrende Bilder). Weglassen, wenn es "
        "nichts über den Kampagnenton hinaus beiträgt.\n"
        "- Complications — 2–3 Bullets. \"Wenn die Party X tut / wenn Y "
        "schiefläuft\"-Eventualitäten.\n"
        "\n"
        "## Bullet-Stil\n"
        "- 1–2 Sätze, ~20–40 Wörter pro Bullet.\n"
        "- Beginne mit dem konkreten *Was*, dann das DM-seitige *warum es "
        "wichtig ist*, falls nötig.\n"
        "- Beginne NICHT jeden Bullet mit \"Die Party...\" — variiere die "
        "Satzanfänge."
    )


def build_phase_entity_context(phase) -> str:
    """Return the linked-locations + NPCs-at-those-locations block in German,
    or '' when the phase has no linked locations.
    """
    locations = list(getattr(phase, "locations", []) or [])
    if not locations:
        return ""

    lines = ["## Mit dieser Phase verknüpfte Orte"]
    for loc in locations:
        desc = (loc.description or "").strip().replace("\n", " ")
        short = (desc[:140] + "…") if len(desc) > 140 else desc
        lines.append(f"- {loc.name}: {short or '(keine Beschreibung)'}")

    npc_lines: list[str] = []
    for loc in locations:
        for npc in list(getattr(loc, "npcs", []) or []):
            role = npc.npc_class or "Bewohner"
            desc = (npc.description or "").strip().replace("\n", " ")
            short = (desc[:100] + "…") if len(desc) > 100 else desc
            npc_lines.append(
                f"- {npc.name} ({npc.race}, {role} bei {loc.name})"
                + (f": {short}" if short else "")
            )

    if npc_lines:
        lines.append("")
        lines.append("## NPCs an diesen Orten")
        lines.extend(npc_lines)

    lines.append("")
    lines.append(
        "Du DARFST diese namentlich referenzieren, wenn ein Bullet natürlich "
        "dort hingehört. Du DARFST KEINE neuen namentlichen Orte oder NPCs "
        "erfinden. Generische Rollen sind okay (\"ein Schmuggler-Kontakt\", "
        "\"ein Küstenschrein\"), wenn keine namentliche Entität passt."
    )
    return "\n".join(lines)
