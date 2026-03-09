# PROJECT-HANDOVER.md — DM Co-Pilot

> Last updated: 2026-03-09
> Read this file first when starting a new session on this project.

---

## Current Project State

Phase 1 is complete and validated. The full Docker stack is running cleanly. All 23 backend tests pass. CRUD operations for campaigns, player characters, and locations work end-to-end through the frontend.

**Phase 2 (Session Mechanics) is the immediate next target.**

---

## What Works Right Now

- `docker compose up` brings up all four services cleanly
- Alembic migrations run automatically on backend startup via `backend/start.sh`
- Campaign create / list / edit / delete — frontend and API
- Player character create / list / edit / delete — scoped to a campaign
- Location create / list / edit / delete — scoped to a campaign
- Set campaign current location — stored and displayed
- All 23 pytest tests pass against SQLite in-memory
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
3. No error handling on write operations in the frontend — failed API calls produce unhandled promise rejections.
4. FastAPI 422 validation errors render as `[object Object]` in the frontend because `body.detail` is an array (needs `JSON.stringify` or a proper error parser).

---

## Immediate Next Actions: Phase 2 — Session Mechanics

1. **Dice Engine (backend)** — `POST /api/v1/dice/roll` accepting `{ dice: "2d6+3" }` or structured `{ count, sides, modifier }`. Pure deterministic RNG, no LLM involvement. Add to a new router `backend/app/routers/dice.py`.
2. **Dice Engine (frontend)** — Dice roller UI component, probably a persistent panel or sidebar widget.
3. **Initiative Tracker (backend)** — Stateful combat session: ordered list of combatants (players + monsters), HP tracking per monster, round counter. Likely ephemeral (in-memory or a new DB table `combat_sessions`).
4. **Initiative Tracker (frontend)** — Combat UI: drag-to-reorder or auto-sort by initiative roll, HP editing inline, "next turn" button.
5. **Tests** — Add pytest tests for dice router and initiative logic before wiring up frontend.

---

## Codebase Map

```
dm-tool/
├── docker-compose.yml          # All four services; backend uses start.sh entrypoint
├── .env                        # Real secrets (gitignored); see .env.example for shape
├── .env.example                # Template — copy to .env to get started
├── CLAUDE.md                   # Project vision, architecture rules, phase roadmap
├── PROJECT-HANDOVER.md         # This file
│
├── backend/
│   ├── Dockerfile              # Copies start.sh; uses it as entrypoint
│   ├── start.sh                # Runs `alembic upgrade head` then uvicorn
│   ├── requirements.txt        # Python dependencies
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   │       └── 001_initial_schema.py   # Initial migration (campaigns, locations, player_characters)
│   └── app/
│       ├── main.py             # FastAPI app factory, CORS, router registration
│       ├── config.py           # Settings via pydantic-settings
│       ├── database.py         # Async SQLAlchemy engine + session factory
│       ├── dependencies.py     # `get_db` dependency
│       ├── models/             # SQLAlchemy ORM models
│       │   └── (campaign, player_character, location)
│       ├── schemas/            # Pydantic request/response schemas
│       │   ├── common.py       # APIResponse[T] envelope
│       │   └── (campaign, player_character, location)
│       ├── routers/            # FastAPI route handlers
│       │   └── (campaigns, player_characters, locations)
│       ├── services/           # Business logic layer (thin, ready to grow)
│       │   └── (campaign_service, player_character_service, location_service)
│       └── tests/              # pytest async tests — 23 tests, all passing
│           └── (test_campaigns, test_characters, test_locations, test_health)
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
        │   └── LocationSection.tsx     # Location CRUD UI
        ├── lib/
        │   └── api.ts                  # API client — all 15 CRUD methods
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
