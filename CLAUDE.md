# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Context: D&D DM Assistant ("DM Co-Pilot")

## 1. Project Vision
Development of a comprehensive digital Dungeon Master (DM) assistant for Dungeons & Dragons. The goal is to significantly reduce the DM's cognitive load during a campaign. The system combines deterministic tools (state management, initiative tracking, databases) with context-sensitive, generative AI features (LangGraph-based assistance).

## 2. Tech Stack & Infrastructure
* **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS — port 3000
* **Backend:** Python (FastAPI) + SQLAlchemy 2.0 (async) + Alembic + LangGraph (for AI orchestration) — port 8000
* **Database:** PostgreSQL 16 Alpine — port 5432
* **DB Admin:** Adminer — port 8080 (server: `db`, user: `dmtool`, password: `dmtool_dev_password`, db: `dmtool`)
* **AI Provider:** groq API / LLama 3.3 70B
* **Testing:** pytest + aiosqlite (SQLite in-memory)
* **Infrastructure & Deployment:** Docker & Docker Compose. The final deployment will be fully containerized on a Hetzner VPS CX33 Cloud Server (Linux).

## 3. Architecture Principles & Rules for Claude Code
* **Strict Separation of Determinism and AI:** CRUD operations, initiative calculations, state updates (location, time, HP), and dice rolls must **not** run through the LLM. These are to be implemented as classic, deterministic software features in the backend/frontend.
* **LangGraph as a Router:** AI is used exclusively for "worldbuilding on the fly". LangGraph acts as a stateful agent that has *read-only access* to the PostgreSQL database via tool calling to incorporate the current context (location, party level, existing NPCs) into its generation.
* **UX Focus (Session vs. Prep):** The UI must be optimized for minimal click effort during an active session. Context-sensitive actions (e.g., "Generate forest encounter" when the global state is set to "Location: Forest") are preferred.
* **Iterative Development:** Build features strictly according to the phase model below. Test increments in isolation before adding AI complexity.

## 4. Core Features & Requirements

### 4.1 Deterministic Tools (Foundation)
* **Campaign & State Tracking:** Global management of the party's current location, in-game time, and party level.
* **Character Persistence:** CRUD management of player characters (base stats, HP, AC, passive perception, inventory).
* **Initiative Tracker:** UI for managing combat order (manual entry for players, auto-roll for monsters, HP tracking for enemies).
* **Dice Engine:** Reliable RNG (random number generator) for all standard D&D dice (d4 to d100).
* **Database for Lore & Prep:** Management and assignment of NPCs and quests to specific locations/biomes.

### 4.2 AI-Powered Tools (DM Assistance)
* **Context Awareness:** Automatic display of relevant NPCs and quests based on the players' current location.
* **Lore Oracle:** Chat interface for quick answers to D&D rule questions and lore.
* **Dynamic Generators:**
  * **NPC Generator:** Creation of NPCs (stats, appearance, motivation, secrets) at the push of a button.
  * **Loot & Encounter Generator:** Creation of appropriate encounters and loot, strictly scaled according to the current party level and location.
* **Dialog Engine:** AI-generated suggestions for NPC roleplay/responses, based on their stored database personality and the current game situation.

## 5. Development Roadmap (Increments)

* **Phase 1: Setup & Data Modeling** — COMPLETE (2026-03-09)
  * Init Next.js, FastAPI, PostgreSQL via Docker.
  * Design database schema (campaign, players, locations).
  * Basic CRUD API for player characters and locations.
  * All 23 backend tests pass. Frontend CRUD fully wired.
* **Phase 2: Session Mechanics** — COMPLETE (2026-03-09)
  * Dice engine (`POST /api/v1/dice/roll`) with D&D standard notation parsing.
  * Initiative tracker: `combat_sessions` table, 9 API endpoints, full frontend integration.
  * DiceRoller and InitiativeTracker components embedded in campaign detail page.
  * All 60 backend tests pass. Frontend builds clean.
* **Phase 3: Relational Data (Prep Mode)** — next
  * Database expansion: NPCs and quests.
  * Full character sheet fields: ability scores (STR/DEX/CON/INT/WIS/CHA), saving throw proficiencies, skill proficiencies, proficiency bonus, speed, spell slots — migrate `player_characters` table.
  * Logic for linking NPCs/quests to locations.
  * UI filtering based on the global campaign state.
* **Phase 4: AI Base Integration**
  * Integration of the LLM API into FastAPI.
  * Setup LangGraph base agent.
  * UI: Chat interface (right sidebar).
* **Phase 5: LangGraph Context & Tools (The Core AI)**
  * Tool calling for the LangGraph agent (read-only DB access).
  * API routes for context-based generators (encounter, loot, NPCs).
  * Frontend: "Smart prompts" and context-sensitive buttons.
* **Phase 6: Deployment Preparation**
  * Finalization of the `docker-compose.yml` for the production Hetzner Linux environment.

---

## 6. Implemented Architecture Details

### API Conventions
* API prefix: `/api/v1/`
* Response envelope: `{ data, error, meta }` via `APIResponse[T]` (defined in `backend/app/schemas/common.py`)
* Nested routes for create/list: `POST /campaigns/{id}/characters`, `GET /campaigns/{id}/characters`
* Flat routes for get/update/delete: `GET /characters/{id}`, `PATCH /characters/{id}`, `DELETE /characters/{id}`
* PATCH uses `model_dump(exclude_unset=True)` — only provided fields are updated

### Database & Migration Patterns
* Alembic runs automatically on container start via `backend/start.sh` (`alembic upgrade head` before uvicorn)
* Models use generic SQLAlchemy types (`Uuid`, `JSON`) so tests run on SQLite; migrations use PG-native types (`UUID`, `JSONB`)
* UUIDs generated Python-side with `default=uuid.uuid4` (not `server_default`) for SQLite test compat
* `use_alter=True` on `campaigns.current_location_id` FK to break circular dependency with locations
* SQLite tests require `PRAGMA foreign_keys=ON` for CASCADE/SET NULL to work

### Docker Services
| Service  | Port | Image/Build         |
|----------|------|---------------------|
| db       | 5432 | postgres:16-alpine  |
| backend  | 8000 | ./backend (FastAPI) |
| frontend | 3000 | ./frontend (Next.js)|
| adminer  | 8080 | adminer             |

### Known Frontend Gaps
* `passive_perception` has no UI input — defaults to 10
* Campaign `description` field has no UI
* No error handling on write operations in Character/Location sections — failures produce unhandled promise rejections (DiceRoller and InitiativeTracker have proper error handling)
* FastAPI 422 errors render as `[object Object]` (need to serialize `detail` array) — DiceRoller has component-level mitigation

---

## 7. Documentation Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | This file — architecture rules, tech stack, roadmap, conventions (gitignored, local only) |
| `PROJECT-HANDOVER.md` | Session continuity doc — current state, codebase map, immediate next actions |
| `README.md` | Public-facing project overview and quick start |