from typing import Any

from pydantic import BaseModel, Field

from app.schemas.player_character import PlayerCharacterCreate


class DDBImportRequest(BaseModel):
    url: str = Field(
        ...,
        min_length=1,
        description="D&D Beyond character URL, e.g. https://www.dndbeyond.com/characters/12345",
    )


class DDBImportPreview(BaseModel):
    preview: PlayerCharacterCreate
    ddb_id: int
    ddb_name: str
    warnings: list[str] = Field(default_factory=list)
    unmapped_data: dict[str, Any] = Field(default_factory=dict)
