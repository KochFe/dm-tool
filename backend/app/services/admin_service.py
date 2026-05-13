import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


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
