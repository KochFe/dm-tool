import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth_service import create_access_token, create_user
from app.tests.conftest import async_session_test

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def admin_user(setup_db):
    async with async_session_test() as db:
        return await create_user(
            db,
            email="admin@example.com",
            password="adminpassword123",
            display_name="Admin",
            role="admin",
        )


@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token(admin_user.id)
    return {"Authorization": f"Bearer {token}"}


async def test_non_admin_cannot_list_users(
    client: AsyncClient, auth_headers
):
    response = await client.get("/api/v1/admin/users", headers=auth_headers)
    assert response.status_code == 403


async def test_admin_can_list_users(
    client: AsyncClient, admin_headers, test_user
):
    response = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert response.status_code == 200
