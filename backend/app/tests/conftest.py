import os

# Must be set before app modules are imported so Settings() validation passes.
os.environ.setdefault("GROQ_API_KEY", "test-key-not-used")

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.services.auth_service import create_user, create_access_token

TEST_DATABASE_URL = "sqlite+aiosqlite://"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
async_session_test = async_sessionmaker(
    engine_test, class_=AsyncSession, expire_on_commit=False
)


# Enable foreign keys for SQLite (required for CASCADE / SET NULL)
@event.listens_for(engine_test.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_test() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
async def test_user(setup_db):
    """Create a test user and return the User object."""
    async with async_session_test() as db:
        user = await create_user(
            db,
            email="testuser@example.com",
            password="testpassword123",
            display_name="Test User",
            role="dm",
        )
        return user


@pytest.fixture
def auth_headers(test_user):
    """Return Authorization headers with a valid access token."""
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
