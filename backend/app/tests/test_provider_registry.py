"""Tests for the provider registry — key-based filtering and lookup."""
from unittest.mock import patch

import pytest

from app.ai.providers.base import ProviderNotConfigured
from app.ai.providers import registry


@patch("app.ai.providers.registry.settings")
def test_list_providers_filters_by_configured_keys(mock_settings):
    """Providers without an API key set should not be listed."""
    mock_settings.GROQ_API_KEY = "g-key"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
    mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    mock_settings.DEEPSEEK_API_KEY = ""  # not configured
    mock_settings.DEEPSEEK_MODEL = "deepseek-reasoner"
    mock_settings.DEEPSEEK_BASE_URL = "https://api.deepseek.com"

    registry._reset_for_tests()
    listed = registry.list_providers()
    ids = [p.id for p in listed]
    assert "groq" in ids
    assert "deepseek" not in ids


@patch("app.ai.providers.registry.settings")
def test_list_providers_includes_both_when_configured(mock_settings):
    mock_settings.GROQ_API_KEY = "g-key"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
    mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    mock_settings.DEEPSEEK_API_KEY = "d-key"
    mock_settings.DEEPSEEK_MODEL = "deepseek-reasoner"
    mock_settings.DEEPSEEK_BASE_URL = "https://api.deepseek.com"

    registry._reset_for_tests()
    ids = [p.id for p in registry.list_providers()]
    assert set(ids) == {"groq", "deepseek"}


@patch("app.ai.providers.registry.settings")
def test_get_provider_raises_when_unconfigured(mock_settings):
    mock_settings.GROQ_API_KEY = "g-key"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
    mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    mock_settings.DEEPSEEK_API_KEY = ""
    mock_settings.DEEPSEEK_MODEL = "deepseek-reasoner"
    mock_settings.DEEPSEEK_BASE_URL = "https://api.deepseek.com"

    registry._reset_for_tests()
    with pytest.raises(ProviderNotConfigured):
        registry.get_provider("deepseek")


@patch("app.ai.providers.registry.settings")
def test_get_provider_unknown_id_raises_value_error(mock_settings):
    mock_settings.GROQ_API_KEY = "g-key"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
    mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    mock_settings.DEEPSEEK_API_KEY = "d-key"
    mock_settings.DEEPSEEK_MODEL = "deepseek-reasoner"
    mock_settings.DEEPSEEK_BASE_URL = "https://api.deepseek.com"

    registry._reset_for_tests()
    with pytest.raises(ValueError):
        registry.get_provider("anthropic")
