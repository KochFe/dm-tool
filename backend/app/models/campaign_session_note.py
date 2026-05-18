import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.campaign import Campaign


class CampaignSessionNote(Base):
    __tablename__ = "campaign_session_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="open"
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="session_notes")
