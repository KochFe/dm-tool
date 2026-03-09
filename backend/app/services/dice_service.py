import random
import re

from fastapi import HTTPException

from app.schemas.dice import DiceRollRequest, DiceRollResponse

VALID_SIDES = {4, 6, 8, 10, 12, 20, 100}
_NOTATION_RE = re.compile(r"^(\d+)d(\d+)([+-]\d+)?$", re.IGNORECASE)


def roll_dice(request: DiceRollRequest) -> DiceRollResponse:
    """Parse dice notation and return individual rolls with total.

    Accepts standard D&D notation: <count>d<sides>[+/-<modifier>]
    Examples: '2d6+3', '1d20', '4d6-1'

    Raises HTTPException(422) on invalid or out-of-range notation.
    """
    notation = request.notation.strip()
    match = _NOTATION_RE.match(notation)
    if not match:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid dice notation '{notation}'. "
                "Expected format: <count>d<sides>[+/-<modifier>], e.g. '2d6+3' or '1d20'."
            ),
        )

    count = int(match.group(1))
    sides = int(match.group(2))
    modifier = int(match.group(3)) if match.group(3) else 0

    if count < 1 or count > 100:
        raise HTTPException(
            status_code=422,
            detail=f"Dice count must be between 1 and 100, got {count}.",
        )

    if sides not in VALID_SIDES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid die type 'd{sides}'. "
                f"Valid sides: {sorted(VALID_SIDES)}."
            ),
        )

    rolls = [random.randint(1, sides) for _ in range(count)]
    total = sum(rolls) + modifier

    return DiceRollResponse(
        notation=notation,
        count=count,
        sides=sides,
        modifier=modifier,
        rolls=rolls,
        total=total,
    )
