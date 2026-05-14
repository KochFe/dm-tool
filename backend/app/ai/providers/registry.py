"""Lazy singleton registry for LLM providers.

Provider instances are built on first access from `settings`. A provider
whose API key is empty is treated as not configured and is omitted from
`list_providers()`; `get_provider(id)` raises `ProviderNotConfigured`.
"""
from threading import Lock

from app.ai.providers.base import LLMProvider, ProviderNotConfigured
from app.ai.providers.deepseek_provider import DeepseekProvider
from app.ai.providers.groq_provider import GroqProvider
from app.config import settings

_cache: dict[str, LLMProvider] = {}
_lock = Lock()
_initialized = False
_KNOWN_IDS = ("groq", "deepseek")


def _build(provider_id: str) -> LLMProvider | None:
    """Construct a provider instance if its key is configured, else None."""
    if provider_id == "groq":
        if not settings.GROQ_API_KEY:
            return None
        return GroqProvider(
            api_key=settings.GROQ_API_KEY,
            model=settings.GROQ_MODEL,
            base_url=settings.GROQ_BASE_URL,
        )
    if provider_id == "deepseek":
        if not settings.DEEPSEEK_API_KEY:
            return None
        return DeepseekProvider(
            api_key=settings.DEEPSEEK_API_KEY,
            model=settings.DEEPSEEK_MODEL,
            base_url=settings.DEEPSEEK_BASE_URL,
        )
    return None


def _ensure_loaded() -> None:
    global _initialized
    with _lock:
        if _initialized:
            return
        for pid in _KNOWN_IDS:
            instance = _build(pid)
            if instance is not None:
                _cache[pid] = instance
        _initialized = True


def list_providers() -> list[LLMProvider]:
    _ensure_loaded()
    return list(_cache.values())


def get_provider(provider_id: str) -> LLMProvider:
    if provider_id not in _KNOWN_IDS:
        raise ValueError(f"Unknown provider id: {provider_id}")
    _ensure_loaded()
    if provider_id not in _cache:
        raise ProviderNotConfigured(provider_id)
    return _cache[provider_id]


def known_provider_ids() -> tuple[str, ...]:
    """All provider ids the registry can construct, configured or not."""
    return _KNOWN_IDS


def _reset_for_tests() -> None:
    """Clear the cache so tests can re-patch settings."""
    global _initialized
    with _lock:
        _cache.clear()
        _initialized = False
