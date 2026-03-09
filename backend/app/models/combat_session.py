import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Integer, JSON, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CombatSession(Base):
    __tablename__ = "combat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    combatants: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    current_turn_index: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    round_number: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1"
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="active"
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="combat_sessions")

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'completed')", name="ck_combat_session_status"
        ),
    )
