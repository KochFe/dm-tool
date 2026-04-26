from enum import Enum


class Language(str, Enum):
    """Supported UI / AI output languages (ISO 639-1)."""

    EN = "en"
    DE = "de"

    @classmethod
    def from_header(cls, accept_language: str | None) -> "Language":
        """Parse an Accept-Language header value, falling back to EN.

        Accepts forms like 'de', 'de-DE', 'de-DE,de;q=0.9,en;q=0.8'.
        Unknown languages fall back to EN.
        """
        if not accept_language:
            return cls.EN
        primary = accept_language.split(",")[0].split(";")[0].strip()
        code = primary.split("-")[0].lower()
        try:
            return cls(code)
        except ValueError:
            return cls.EN
