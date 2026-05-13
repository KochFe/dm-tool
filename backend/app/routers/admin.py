import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.models.user import User
from app.schemas.admin import AdminUserCreate, AdminUserOut
from app.schemas.common import APIResponse
from app.services import admin_service
from app.services.auth_service import create_user, get_user_by_email

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=APIResponse[list[AdminUserOut]])
async def list_users(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users. Requires admin role."""
    users = await admin_service.list_users(db)
    return APIResponse(
        data=[AdminUserOut.model_validate(u) for u in users]
    )


@router.post(
    "/users",
    response_model=APIResponse[AdminUserOut],
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_user(
    payload: AdminUserCreate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user account. Requires admin role."""
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists",
        )
    try:
        user = await create_user(
            db,
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
            role=payload.role,
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists",
        )
    return APIResponse(data=AdminUserOut.model_validate(user))


@router.get("/users/{user_id}", response_model=APIResponse[AdminUserOut])
async def get_admin_user(
    user_id: uuid.UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single user by ID. Requires admin role."""
    user = await admin_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return APIResponse(data=AdminUserOut.model_validate(user))
