"""Integration tests for GET /api/v1/providers."""
from unittest.mock import patch

import pytest


@pytest.mark.asyncio
async def test_list_providers_requires_auth(client):
    res = await client.get("/api/v1/providers")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_providers_returns_configured(client, auth_headers):
    """With only GROQ configured, the response lists groq and not deepseek."""
    with patch("app.ai.providers.registry.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = "g"
        mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
        mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
        mock_settings.DEEPSEEK_API_KEY = ""
        mock_settings.DEEPSEEK_MODEL = "deepseek-reasoner"
        mock_settings.DEEPSEEK_BASE_URL = "https://api.deepseek.com"
        from app.ai.providers import registry as r
        r._reset_for_tests()
        res = await client.get("/api/v1/providers", headers=auth_headers)
    assert res.status_code == 200
    payload = res.json()
    assert payload["error"] is None
    ids = [p["id"] for p in payload["data"]]
    assert "groq" in ids
    assert "deepseek" not in ids
