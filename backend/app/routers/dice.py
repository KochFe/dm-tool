from fastapi import APIRouter

from app.schemas.common import APIResponse
from app.schemas.dice import DiceRollRequest, DiceRollResponse
from app.services import dice_service

router = APIRouter()


@router.post("/dice/roll", response_model=APIResponse[DiceRollResponse], status_code=200)
async def roll_dice(data: DiceRollRequest) -> APIResponse[DiceRollResponse]:
    """Roll dice using standard D&D notation.

    Accepts notation such as '2d6+3', '1d20', or '4d6-1'.
    Returns each individual die result and the final total.
    No database interaction — purely deterministic RNG.
    """
    result = dice_service.roll_dice(data)
    return APIResponse(data=result)
