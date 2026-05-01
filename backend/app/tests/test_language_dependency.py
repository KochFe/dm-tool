import pytest

from app.schemas.language import Language


@pytest.mark.parametrize(
    "header,expected",
    [
        ("de", Language.DE),
        ("DE", Language.DE),
        ("de-DE", Language.DE),
        ("de-DE,de;q=0.9,en;q=0.8", Language.DE),
        ("en", Language.EN),
        ("en-US", Language.EN),
        ("fr", Language.EN),
        ("", Language.EN),
        (None, Language.EN),
    ],
)
def test_language_from_header_parses_correctly(header, expected):
    assert Language.from_header(header) == expected
