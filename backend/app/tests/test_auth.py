import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


async def test_login_success(client: AsyncClient, test_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "testpassword123"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, test_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


async def test_get_me(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "testuser@example.com"
    assert data["display_name"] == "Test User"
    assert data["role"] == "dm"


async def test_get_me_no_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403


async def test_get_me_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


async def test_refresh_token(client: AsyncClient, test_user):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "testpassword123"},
    )
    refresh_token = login_response.json()["data"]["refresh_token"]
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data


async def test_refresh_with_access_token_fails(client: AsyncClient, test_user):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "testpassword123"},
    )
    access_token = login_response.json()["data"]["access_token"]
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert response.status_code == 401


async def test_protected_route_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/campaigns")
    assert response.status_code == 403


async def test_protected_route_with_auth(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/campaigns", headers=auth_headers)
    assert response.status_code == 200


async def test_health_no_auth_required(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
