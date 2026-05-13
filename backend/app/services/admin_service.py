import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import hash_password


class AdminServiceError(Exception):
    """Raised on safety-rail violations. Carries a user-facing message."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def _count_active_admins(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(User).where(
        User.role == "admin", User.is_active.is_(True)
    )
    result = await db.execute(stmt)
    return int(result.scalar_one())


async def update_user(
    db: AsyncSession,
    target: User,
    patch: dict,
    *,
    acting_user: User,
) -> User:
    """Apply a partial update to `target`, enforcing safety rails.

    Raises `AdminServiceError` on any rail violation. `patch` is the
    output of `AdminUserUpdate.model_dump(exclude_unset=True)`.
    """
    is_self = target.id == acting_user.id
    target_was_active_admin = target.role == "admin" and target.is_active

    if "role" in patch and patch["role"] != target.role:
        if is_self and patch["role"] != "admin":
            raise AdminServiceError("An admin cannot demote themselves")
        if target_was_active_admin and patch["role"] != "admin":
            active_admins = await _count_active_admins(db)
            if active_admins <= 1:
                raise AdminServiceError(
                    "Cannot demote the last active admin"
                )

    if "is_active" in patch and patch["is_active"] != target.is_active:
        if is_self and patch["is_active"] is False:
            raise AdminServiceError("An admin cannot deactivate themselves")
        if target_was_active_admin and patch["is_active"] is False:
            active_admins = await _count_active_admins(db)
            if active_admins <= 1:
                raise AdminServiceError(
                    "Cannot deactivate the last active admin"
                )

    for field, value in patch.items():
        setattr(target, field, value)

    await db.commit()
    await db.refresh(target)
    return target


async def reset_password(
    db: AsyncSession, target: User, new_password: str
) -> User:
    """Replace the user's password hash with a new one."""
    target.hashed_password = hash_password(new_password)
    await db.commit()
    await db.refresh(target)
    return target
