# DM Co-Pilot — D&D Dungeon Master Assistant

A comprehensive digital assistant for Dungeons & Dragons Dungeon Masters. The goal is to significantly reduce cognitive load during a campaign by combining deterministic tools (initiative tracking, dice engine, state management) with context-aware AI generation (NPC creation, encounter scaling, dialog suggestions).

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Setup & Data Modeling | Complete |
| 2 | Session Mechanics (Dice + Initiative) | Next |
| 3 | Relational Data (NPCs & Quests) | Pending |
| 4 | AI Base Integration (LLM + LangGraph) | Pending |
| 5 | LangGraph Context & Tools | Pending |
| 6 | Deployment Preparation | Pending |

## Quick Start

**Prerequisites:** Docker and Docker Compose.

```bash
# 1. Clone the repo
git clone <repo-url>
cd dm-tool

# 2. Set up environment
cp .env.example .env
# Edit .env — fill in POSTGRES_PASSWORD and any other required values

# 3. Start all services
docker compose up --build
```

The backend will automatically run database migrations on startup.

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Adminer  | http://localhost:8080 |

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy 2.0 (async) + Alembic
- **Database:** PostgreSQL 16
- **AI (Phase 4+):** LangGraph + groq API (LLama 3.3 70B)
- **Infrastructure:** Docker Compose (dev), Hetzner VPS (production)

## Architecture Principles

- **Determinism first:** Dice rolls, HP tracking, initiative order, and all CRUD operations are implemented as classic software features — they never go through the LLM.
- **AI as a worldbuilding layer:** LangGraph has read-only database access and is used exclusively for generative content (NPCs, encounters, dialog suggestions).
- **Session-optimized UX:** UI is designed for minimal clicks during an active session. Context-sensitive actions are preferred (e.g., "Generate encounter" automatically uses the party's current location and level).

## Running Tests

```bash
docker compose exec backend pytest
```

All 23 tests run against SQLite in-memory — no running database required for testing.

## Developer Documentation

- `CLAUDE.md` — Architecture rules, conventions, and full phase roadmap
- `PROJECT-HANDOVER.md` — Current state, codebase map, and immediate next actions
