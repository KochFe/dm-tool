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


async def test_admin_can_create_user(client: AsyncClient, admin_headers):
    response = await client.post(
        "/api/v1/admin/users",
        headers=admin_headers,
        json={
            "email": "newuser@example.com",
            "password": "newpassword123",
            "display_name": "New User",
            "role": "dm",
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "dm"
    assert data["is_active"] is True
    assert "hashed_password" not in data


async def test_create_user_duplicate_email_409(
    client: AsyncClient, admin_headers, test_user
):
    response = await client.post(
        "/api/v1/admin/users",
        headers=admin_headers,
        json={
            "email": "testuser@example.com",
            "password": "anotherpassword",
            "display_name": "Dup",
            "role": "dm",
        },
    )
    assert response.status_code == 409


async def test_non_admin_cannot_create_user(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/v1/admin/users",
        headers=auth_headers,
        json={
            "email": "x@example.com",
            "password": "password1234",
            "display_name": "X",
            "role": "dm",
        },
    )
    assert response.status_code == 403


async def test_admin_can_get_user(
    client: AsyncClient, admin_headers, test_user
):
    response = await client.get(
        f"/api/v1/admin/users/{test_user.id}", headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "testuser@example.com"


async def test_get_unknown_user_404(client: AsyncClient, admin_headers):
    import uuid
    response = await client.get(
        f"/api/v1/admin/users/{uuid.uuid4()}", headers=admin_headers
    )
    assert response.status_code == 404
