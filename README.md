# DM Co-Pilot — D&D Dungeon Master Assistant

A comprehensive digital assistant for Dungeons & Dragons Dungeon Masters. The goal is to significantly reduce cognitive load during a campaign by combining deterministic tools (initiative tracking, dice engine, state management) with context-aware AI generation (NPC creation, encounter scaling, dialog suggestions).

**Live at:** [https://dm.kochfe.de](https://dm.kochfe.de)

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Setup & Data Modeling | Complete |
| 2 | Session Mechanics (Dice + Initiative) | Complete |
| 3 | Relational Data (NPCs & Quests) | Complete |
| 4 | AI Base Integration (LLM + LangGraph) | Complete |
| 5 | LangGraph Context & Tools | Complete |
| 6 | Deployment & CI/CD | Complete |
| 7 | App-Level Authentication | Complete |
| 8 | Multi-Tenancy | Complete |
| 9 | D&D Beyond Character Import | Complete |
| 10 | Campaign Builder | Complete |

## Quick Start (Development)

**Prerequisites:** Docker and Docker Compose.

```bash
# 1. Clone the repo
git clone https://github.com/KochFe/dm-tool.git
cd dm-tool

# 2. Set up environment
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, GROQ_API_KEY (for AI features), and any other required values

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

## Production

The app is deployed on a Hetzner VPS with automatic CI/CD:

- **URL:** `https://dm.kochfe.de` (Caddy reverse proxy, auto-HTTPS via Let's Encrypt)
- **Auth:** JWT-based app-level authentication with per-user data isolation
- **CI/CD:** Push to `main` → GitHub Actions CI (tests + build) → auto-deploy to VPS
- **Stack:** `docker-compose.prod.yml` with Caddy, FastAPI (2 workers), Next.js (standalone), PostgreSQL


## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy 2.0 (async) + Alembic
- **Database:** PostgreSQL 16
- **AI:** LangGraph + Groq API (LLama 3.3 70B)
- **Infrastructure:** Docker Compose (dev), Hetzner VPS with Caddy (production)
- **CI/CD:** GitHub Actions (CI gates Deploy via `workflow_run`)

## Architecture Principles

- **Determinism first:** Dice rolls, HP tracking, initiative order, and all CRUD operations are implemented as classic software features — they never go through the LLM.
- **AI as a worldbuilding layer:** LangGraph has read-only database access and is used exclusively for generative content (NPCs, encounters, dialog suggestions).
- **Session-optimized UX:** UI is designed for minimal clicks during an active session. Context-sensitive actions are preferred (e.g., "Generate encounter" automatically uses the party's current location and level).

## Running Tests

```bash
docker compose exec backend pytest
```

All 258 tests run against SQLite in-memory — no running database required for testing.
