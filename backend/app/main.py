from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.routers import auth, campaigns, player_characters, locations, dice, combat_sessions, npcs, quests, chat, generators, ddb_import

app = FastAPI(title="DM Co-Pilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1", tags=["campaigns"])
app.include_router(player_characters.router, prefix="/api/v1", tags=["characters"])
app.include_router(locations.router, prefix="/api/v1", tags=["locations"])
app.include_router(dice.router, prefix="/api/v1", tags=["dice"])
app.include_router(combat_sessions.router, prefix="/api/v1", tags=["combat-sessions"])
app.include_router(npcs.router, prefix="/api/v1", tags=["npcs"])
app.include_router(quests.router, prefix="/api/v1", tags=["quests"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(generators.router, prefix="/api/v1", tags=["generators"])
app.include_router(ddb_import.router, prefix="/api/v1", tags=["ddb-import"])


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/health/db")
async def health_db():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}
