from pydantic import BaseModel, Field


class DiceRollRequest(BaseModel):
    notation: str = Field(
        ...,
        description="Standard dice notation, e.g. '2d6+3', '1d20', '4d6-1'",
        examples=["2d6+3", "1d20", "4d6-1"],
    )


class DiceRollResponse(BaseModel):
    notation: str = Field(..., description="The original notation string as provided")
    count: int = Field(..., description="Number of dice rolled")
    sides: int = Field(..., description="Number of sides on each die")
    modifier: int = Field(..., description="Flat modifier added to the total (can be negative)")
    rolls: list[int] = Field(..., description="Individual result for each die roll")
    total: int = Field(..., description="Sum of all rolls plus the modifier")
