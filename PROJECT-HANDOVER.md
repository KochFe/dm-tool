# PROJECT-HANDOVER.md — DM Co-Pilot

> Last updated: 2026-03-09
> Read this file first when starting a new session on this project.

---

## Current Project State

Phases 1 and 2 are complete and validated. The full Docker stack is running cleanly. All 60 backend tests pass. Frontend builds clean. CRUD operations, dice rolling, and initiative tracking all work end-to-end.

**Phase 3 (Relational Data — Prep Mode) is the immediate next target.**

---

## What Works Right Now

- `docker compose up` brings up all four services cleanly
- Alembic migrations run automatically on backend startup via `backend/start.sh`
- Campaign create / list / edit / delete — frontend and API
- Player character create / list / edit / delete — scoped to a campaign
- Location create / list / edit / delete — scoped to a campaign
- Set campaign current location — stored and displayed
- **Dice engine** — `POST /api/v1/dice/roll` with D&D standard notation (d4, d6, d8, d10, d12, d20, d100)
- **Combat sessions** — full CRUD + combatant management + turn advancement (9 endpoints)
- **DiceRoller UI** — quick-roll buttons, custom notation input, roll history
- **InitiativeTracker UI** — create combat, manage combatants, HP editing, turn tracking, end combat
- All 60 pytest tests pass against SQLite in-memory
- FastAPI interactive docs available at http://localhost:8000/docs

---

## Services & Ports

| Service  | URL                    | Notes                                                                 |
|----------|------------------------|-----------------------------------------------------------------------|
| Frontend | http://localhost:3000  | Next.js dev server                                                    |
| Backend  | http://localhost:8000  | FastAPI + uvicorn --reload                                            |
| Database | localhost:5432         | PostgreSQL 16 Alpine, credentials in `.env`                           |
| Adminer  | http://localhost:8080  | DB GUI — server: `db`, user: `dmtool`, password: `dmtool_dev_password`, db: `dmtool` |

---

## Known Issues & Technical Debt

These are not Phase 1 blockers but must be addressed before shipping:

1. `passive_perception` field — no UI input; always defaults to 10.
2. Campaign `description` field — no UI; not editable or viewable.
3. No error handling on write operations in Character/Location sections — failed API calls produce unhandled promise rejections. (DiceRoller and InitiativeTracker have proper error handling.)
4. FastAPI 422 validation errors render as `[object Object]` in Character/Location sections (DiceRoller has component-level mitigation).
5. `player_character_id` on combatants is stored but not validated against the `player_characters` table — no FK check in the service layer.

---

## Immediate Next Actions: Phase 3 — Relational Data (Prep Mode)

1. **NPC model + migration** — New `npcs` table with name, race, class, stats, personality, secrets, motivation. FK to locations.
2. **Quest model + migration** — New `quests` table with title, description, status, reward. FK to locations.
3. **Full character sheet expansion** — Add ability scores (STR/DEX/CON/INT/WIS/CHA), saving throw proficiencies, skill proficiencies, proficiency bonus, speed, spell slots to `player_characters`. New migration.
4. **NPC/Quest CRUD** — Backend endpoints + service layer + frontend UI for creating and managing NPCs and quests.
5. **Location linking** — Associate NPCs and quests with locations; filter/display by campaign's current location.
6. **Tests** — Expand test suite for all new models and endpoints.

---

## Codebase Map

```
dm-tool/
├── docker-compose.yml          # All four services; backend uses start.sh entrypoint
├── .env                        # Real secrets (gitignored); see .env.example for shape
├── .env.example                # Template — copy to .env to get started
├── PROJECT-HANDOVER.md         # This file
│
├── backend/
│   ├── Dockerfile              # Copies start.sh; uses it as entrypoint
│   ├── start.sh                # Runs `alembic upgrade head` then uvicorn
│   ├── requirements.txt        # Python dependencies
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   │       ├── 001_initial_schema.py   # Initial migration (campaigns, locations, player_characters)
│   │       └── 002_combat_sessions.py  # Combat sessions table
│   └── app/
│       ├── main.py             # FastAPI app factory, CORS, router registration
│       ├── config.py           # Settings via pydantic-settings
│       ├── database.py         # Async SQLAlchemy engine + session factory
│       ├── dependencies.py     # `get_db` dependency
│       ├── models/             # SQLAlchemy ORM models
│       │   └── (campaign, player_character, location, combat_session)
│       ├── schemas/            # Pydantic request/response schemas
│       │   ├── common.py       # APIResponse[T] envelope
│       │   └── (campaign, player_character, location, combat_session, dice)
│       ├── routers/            # FastAPI route handlers
│       │   └── (campaigns, player_characters, locations, combat_sessions, dice)
│       ├── services/           # Business logic layer
│       │   └── (campaign_service, player_character_service, location_service, combat_session_service, dice_service)
│       └── tests/              # pytest async tests — 60 tests, all passing
│           └── (test_campaigns, test_characters, test_locations, test_health, test_dice, test_combat_sessions)
│
└── frontend/
    ├── Dockerfile
    ├── next.config.ts
    ├── package.json
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── campaigns/
        │   │   ├── page.tsx            # Campaign list / create / delete
        │   │   └── [id]/page.tsx       # Campaign detail, character + location sections
        ├── components/
        │   ├── CharacterSection.tsx    # Character CRUD UI
        │   ├── LocationSection.tsx     # Location CRUD UI
        │   ├── DiceRoller.tsx          # Dice roller with quick-roll buttons and history
        │   └── InitiativeTracker.tsx   # Combat session management UI
        ├── lib/
        │   └── api.ts                  # API client — 25 methods (15 CRUD + 10 Phase 2)
        └── types/
            └── index.ts                # TypeScript interfaces for all entities
```

---

## Architecture Rules to Respect

- CRUD, dice rolls, HP tracking, initiative order — **never** go through the LLM. Deterministic only.
- LangGraph (Phase 4+) gets **read-only** DB access via tool calling. It is never the execution path for state mutations.
- API responses always use the `APIResponse[T]` envelope: `{ data, error, meta }`.
- PATCH routes use `model_dump(exclude_unset=True)` — only provided fields are updated.
- Route structure: nested for create/list (`/campaigns/{id}/characters`), flat for get/update/delete (`/characters/{id}`).

---

## Environment Setup (Fresh Machine)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd dm-tool

# 2. Copy env file and fill in secrets
cp .env.example .env
# Edit .env — at minimum set POSTGRES_PASSWORD and DATABASE_URL

# 3. Start all services
docker compose up --build

# 4. Verify backend health
curl http://localhost:8000/health

# 5. Run backend tests (from host, inside backend container, or via Docker)
docker compose exec backend pytest
```

The Alembic migration runs automatically. No manual `alembic upgrade head` needed.

---

## Key Decisions Log (summary)

Full decisions log: see `docs/decisions.md` (to be created in Phase 2).

| Date       | Decision                                                                 |
|------------|--------------------------------------------------------------------------|
| 2026-03-09 | `start.sh` runs migrations automatically on container start to prevent empty-DB errors |
| 2026-03-09 | Models use generic SQLAlchemy types (`Uuid`, `JSON`) for SQLite test compat; migrations use PG-native types (`UUID`, `JSONB`) |
| 2026-03-09 | `use_alter=True` on `campaigns.current_location_id` FK to break circular dependency between campaigns and locations |
| 2026-03-09 | Python-side `default=uuid.uuid4` (not `server_default`) so UUIDs work in SQLite tests |
| 2026-03-09 | Adminer added to docker-compose for DB inspection during development |
| 2026-03-09 | Combat session combatants stored as JSON column (not separate table) — simple, sufficient for ~20 combatants per session |
| 2026-03-09 | Combat sessions are database-persisted (not ephemeral) — DM can refresh/reconnect without losing combat state |
| 2026-03-09 | Dice sides restricted to D&D standard {4, 6, 8, 10, 12, 20, 100} — no arbitrary sides |
| 2026-03-09 | Initiative tracker embedded in campaign detail page (not separate route) — minimal click effort during sessions |
| 2026-03-09 | Full character sheet expansion (ability scores, skills, etc.) deferred to Phase 3 |
